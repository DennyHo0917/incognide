/**
 * Screenshot capture runner.
 *
 * Launches the real Incognide Electron app once per shot against a seeded
 * demo home + fixture workspace, opens the files/URL the manifest declares,
 * and saves the PNG at the declared path.
 *
 * Usage:
 *   npm run screenshots                                # all CI-safe shots
 *   npm run screenshots -- --only pdf_highlight        # just one
 *   npm run screenshots -- --include-manual            # include skipInCi
 *   npm run screenshots -- --check                     # diff vs committed
 */

import { _electron as electron, ElectronApplication, Page } from 'playwright';
import { promises as fs } from 'fs';
import path from 'path';
import { SHOTS, Shot, ShotCtx } from './manifest.js';

interface Args { only: string | null; includeManual: boolean; check: boolean; }

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const args: Args = { only: null, includeManual: false, check: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--only') args.only = argv[++i];
    else if (argv[i] === '--include-manual') args.includeManual = true;
    else if (argv[i] === '--check') args.check = true;
  }
  return args;
}

const SEED_HOME = path.resolve(__dirname, 'fixtures/home');
const SEED_WORKSPACE = path.resolve(__dirname, 'fixtures/workspace');
const RUN_HOME = path.resolve(__dirname, '.run/home');
const RUN_WORKSPACE = path.resolve(__dirname, '.run/workspace');
const LOG_DIR = path.resolve(__dirname, '.run/logs');

async function rsync(src: string, dst: string) {
  await fs.rm(dst, { recursive: true, force: true });
  await fs.mkdir(path.dirname(dst), { recursive: true });
  await fs.cp(src, dst, { recursive: true });
}

async function launchApp(shot: Shot, logStream: fs.FileHandle): Promise<ElectronApplication> {
  const files = (shot.files ?? []).map((f) => path.join(RUN_WORKSPACE, f));
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: 'production',
    INCOGNIDE_HOME: RUN_HOME,
    INCOGNIDE_SCREENSHOT_MODE: '1',
    INCOGNIDE_SCREENSHOT_FILES: files.join(';;'),
    INCOGNIDE_SCREENSHOT_URL: shot.url ?? '',
    TZ: 'UTC',
    LANG: 'en_US.UTF-8',
  };

  const repoRoot = path.resolve(__dirname, '../..');
  const app = await electron.launch({
    args: [path.join(repoRoot, 'src/main.js'), `--folder=${RUN_WORKSPACE}`],
    env,
    timeout: 120000,
  });

  // Pipe app logs to a per-shot file to simplify debugging failures.
  const logPath = path.join(LOG_DIR, shot.out.replace(/[\/]/g, '_') + '.log');
  const logFd = await fs.open(logPath, 'w');
  app.process().stdout?.on('data', (d) => logFd.write(d));
  app.process().stderr?.on('data', (d) => logFd.write(d));
  app.process().on('exit', () => logFd.close().catch(() => {}));

  return app;
}

async function waitForStableWindow(page: Page, ms = 30000) {
  // Wait for the main app shell to be fully interactive.
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('body', { state: 'attached', timeout: ms });
  // The app registers studio actions once ready.
  try {
    await page.waitForFunction(
      () => typeof (window as any).__studioActions !== 'undefined' ||
            (window as any).studioActions !== undefined ||
            (window as any).api !== undefined,
      { timeout: ms },
    );
  } catch {
    // Non-fatal — keep going; some shots may not need the action bus.
  }
}

async function captureOne(shot: Shot, ctx: ShotCtx, check: boolean, logStream: fs.FileHandle) {
  let app: ElectronApplication | null = null;
  try {
    app = await launchApp(shot, logStream);
    const page: Page = await app.firstWindow();

    // Detect unexpected app exit so we never hang silently.
    let exited = false;
    app.process().once('exit', () => { exited = true; });

    await page.setViewportSize(shot.viewport);
    await waitForStableWindow(page);

    // Backend boot + did-finish-load hook fire async; give them room.
    await page.waitForTimeout(6000);
    if (exited) throw new Error('electron process exited during boot (see .run/logs)');

    if (shot.interact) await shot.interact(page, ctx);

    if (shot.waitFor) {
      await page.waitForSelector(shot.waitFor, { state: 'visible', timeout: 20000 })
        .catch(() => console.warn(`  [warn] waitFor '${shot.waitFor}' not visible; capturing anyway`));
    }
    await page.waitForTimeout(shot.settleMs ?? 1200);
    if (exited) throw new Error('electron process exited before capture');

    const outAbs = path.resolve(__dirname, '../..', shot.out);
    await fs.mkdir(path.dirname(outAbs), { recursive: true });
    const buf = await page.screenshot({ type: 'png' });

    if (check) {
      try {
        const prev = await fs.readFile(outAbs);
        if (Buffer.compare(prev, buf) === 0) { console.log(`  [same] ${shot.out}`); return 'ok'; }
        console.log(`  [diff] ${shot.out}`);
        await fs.writeFile(outAbs + '.new.png', buf);
        return 'diff';
      } catch {
        console.log(`  [new ] ${shot.out}`);
        await fs.writeFile(outAbs + '.new.png', buf);
        return 'diff';
      }
    }

    await fs.writeFile(outAbs, buf);
    console.log(`  [ ok ] ${shot.out} (${buf.length} bytes)`);
    return 'ok';
  } catch (err: any) {
    console.error(`  [fail] ${shot.out}: ${err?.message || err}`);
    return 'fail';
  } finally {
    if (app) await app.close().catch(() => {});
  }
}

async function main() {
  const args = parseArgs();

  const wanted = SHOTS.filter((s) =>
    args.only ? s.out.includes(args.only) : (args.includeManual || !s.skipInCi));
  if (!wanted.length) { console.error('No shots matched.'); process.exit(2); }

  await fs.mkdir(LOG_DIR, { recursive: true });
  const logStream = await fs.open(path.join(LOG_DIR, 'capture.log'), 'a');

  console.log(`Capturing ${wanted.length} screenshot(s)…`);
  const ctx: ShotCtx = { workspace: RUN_WORKSPACE, demoHome: RUN_HOME, api: 'http://127.0.0.1:5337' };

  let failures = 0; let diffs = 0;
  for (const shot of wanted) {
    await rsync(SEED_HOME, RUN_HOME);
    await rsync(SEED_WORKSPACE, RUN_WORKSPACE);
    const res = await captureOne(shot, ctx, args.check, logStream);
    if (res === 'fail') failures++;
    if (res === 'diff') diffs++;
  }

  console.log(`\nDone: ${wanted.length} shot(s), ${failures} failed, ${diffs} diff(s).`);
  if (failures) process.exit(1);
  if (args.check && diffs) process.exit(3);
}

main().catch((e) => { console.error(e); process.exit(1); });
