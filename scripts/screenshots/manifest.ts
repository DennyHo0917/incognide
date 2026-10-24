/**
 * Screenshot manifest — declarative spec for every README / app-store image.
 *
 * Each entry describes one screenshot: where it's written, what the window
 * should look like, and what the app should open before the shutter fires.
 *
 * Determinism comes from the [SCREENSHOT-HOOK] in src/main.js:
 * `files` are opened via the same `open-file-from-os` pipeline a user
 * double-clicking in Finder/Explorer would hit. `url` opens a browser pane.
 *
 *   - `out` is repo-relative. `gh_images/*` feeds README.md;
 *     `app_store_screenshots/*` feeds store listings.
 *   - `viewport` is the window content size.
 *   - `interact(page)` is optional extra driving (selection, clicks) after
 *     the app settles, e.g. drag-selecting PDF text before capture.
 *   - `waitFor` is an optional selector that must be visible before capture.
 *   - `skipInCi: true` = needs a live model/backend; captured manually.
 */

import type { Page } from '@playwright/test';

export interface ShotCtx {
  workspace: string;
  demoHome: string;
  api: string;
}

export interface Shot {
  out: string;
  viewport: { width: number; height: number };
  /** Rel paths (from fixture workspace) of files to open, in order. */
  files?: string[];
  /** URL to open in a browser pane. */
  url?: string;
  /** Optional extra UI driving after open, before capture. */
  interact?: (page: Page, ctx: ShotCtx) => Promise<void>;
  waitFor?: string;
  settleMs?: number;
  skipInCi?: boolean;
  notes?: string;
}

const FULL: Shot['viewport'] = { width: 1600, height: 1000 };

export const SHOTS: Shot[] = [
  /* ============================ README / gh_images ============================ */

  {
    out: 'gh_images/docx.png',
    viewport: FULL,
    files: ['docs/demo.docx'],
    settleMs: 2500,
  },
  {
    out: 'gh_images/csv.png',
    viewport: FULL,
    files: ['data/sales.csv'],
    settleMs: 2000,
  },
  {
    out: 'gh_images/pptx.png',
    viewport: FULL,
    files: ['docs/slides.pptx'],
    settleMs: 2500,
  },
  {
    out: 'gh_images/pdf_highlight.png',
    viewport: FULL,
    files: ['docs/paper.pdf'],
    settleMs: 3000,
    interact: async (page) => {
      // Drag-select a line of text so the highlight affordance shows.
      const box = await page.locator('.rpv-core__viewer, [class*="pdf"]').first()
        .boundingBox().catch(() => null);
      if (box) {
        await page.mouse.move(box.x + 90, box.y + 120);
        await page.mouse.down();
        await page.mouse.move(box.x + 560, box.y + 145, { steps: 14 });
        await page.mouse.up();
        await page.waitForTimeout(400);
      }
    },
  },
  {
    out: 'gh_images/folder_explorer.png',
    viewport: FULL,
    // Opening the dir itself yields a folder pane; the file tree is visible regardless.
    files: ['docs/demo.docx', 'data/sales.csv', 'docs/paper.tex'],
    settleMs: 2500,
  },
  {
    out: 'gh_images/disk_usage_2.png',
    viewport: FULL,
    skipInCi: true,
    settleMs: 2500,
    notes: 'Needs folder-context dropdown; capture manually.',
  },
  {
    out: 'gh_images/disk_usage_1.png',
    viewport: { width: 1042, height: 576 },
    skipInCi: true,
    notes: 'Dropdown mid-open; capture manually with disk_usage_2.',
  },
  {
    out: 'gh_images/browse_and_chat.png',
    viewport: FULL,
    url: 'https://enpisi.com/incognide',
    settleMs: 5000,
    skipInCi: true, // needs internet; flip on with --include-manual
  },
  {
    out: 'gh_images/script_execution.png',
    viewport: FULL,
    files: ['demo_run.py'],
    waitFor: '.cm-content',
    settleMs: 2000,
    interact: async (page) => {
      // Run the script so inline output is visible in the shot.
      const runBtn = page.getByRole('button', { name: /run/i }).first();
      if (await runBtn.isVisible().catch(() => false)) {
        await runBtn.click();
        await page.waitForTimeout(4000);
      }
    },
  },
  {
    out: 'gh_images/latex.png',
    viewport: FULL,
    files: ['docs/paper.tex'],
    settleMs: 3000,
  },
  {
    out: 'gh_images/git_manager.png',
    viewport: { width: 1288, height: 1256 },
    skipInCi: true,
    settleMs: 1500,
    notes: 'Needs .git in fixture workspace; enable once seed inits a repo.',
  },
  {
    out: 'gh_images/stl_viewer.png',
    viewport: FULL,
    files: ['models/demo.stl'],
    settleMs: 3000,
  },

  /* ------- AI/agent views — depend on backend + seeded demo home ------- */

  { out: 'gh_images/kg_inspector.png',   viewport: FULL, skipInCi: true, notes: 'Seeded KG; open Knowledge Graph pane manually for now.' },
  { out: 'gh_images/memory_crud.png',    viewport: FULL, skipInCi: true, notes: 'Opens Memory Manager from Settings.' },
  { out: 'gh_images/memories.png',       viewport: FULL, skipInCi: true },
  { out: 'gh_images/agent_editor.png',   viewport: FULL, skipInCi: true, notes: 'NPC editor with demo NPC preselected.' },
  { out: 'gh_images/npc_history.png',    viewport: FULL, skipInCi: true },
  { out: 'gh_images/team_management.png',viewport: FULL, skipInCi: true },
  { out: 'gh_images/jinx.png',           viewport: FULL, skipInCi: true },
  { out: 'gh_images/jinx_execution.png', viewport: FULL, skipInCi: true },
  { out: 'gh_images/sql_jinx.png',       viewport: FULL, skipInCi: true },
  { out: 'gh_images/nql.png',            viewport: FULL, skipInCi: true },
  { out: 'gh_images/cron_daemon.png',    viewport: FULL, skipInCi: true },
  { out: 'gh_images/settings1.png',      viewport: FULL, skipInCi: true },

  /* ============================ App store ============================ */

  {
    out: 'app_store_screenshots/03_code_editor.png',
    viewport: FULL,
    files: ['demo_run.py'],
    waitFor: '.cm-content',
    settleMs: 2000,
  },
  {
    out: 'app_store_screenshots/06_latex.png',
    viewport: FULL,
    files: ['docs/paper.tex'],
    settleMs: 3000,
  },
  { out: 'app_store_screenshots/01_tiled_chat_ai.png',    viewport: FULL, skipInCi: true },
  { out: 'app_store_screenshots/02_tiled_pdf_browser.png',viewport: FULL, skipInCi: true },
  { out: 'app_store_screenshots/04_browse_and_chat.png',  viewport: FULL, skipInCi: true },
  { out: 'app_store_screenshots/05_chat.png',             viewport: FULL, skipInCi: true },
  { out: 'app_store_screenshots/07_jinx_manager.png',     viewport: FULL, skipInCi: true },
  { out: 'app_store_screenshots/08_memories.png',         viewport: FULL, skipInCi: true },
  { out: 'app_store_screenshots/09_kg_inspector.png',     viewport: FULL, skipInCi: true },
  { out: 'app_store_screenshots/10_db_tool_data_dash.png',viewport: FULL, skipInCi: true },
];
