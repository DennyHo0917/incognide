/**
 * Seeds the demo INCOGNIDE_HOME and fixture workspace used by capture.ts.
 * Deterministic: everything is generated, no network calls.
 *
 *   npx tsx scripts/screenshots/seed.ts
 */
import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const HOME = path.resolve(__dirname, 'fixtures/home');
const WS = path.resolve(__dirname, 'fixtures/workspace');

async function main() {
  await fs.rm(HOME, { recursive: true, force: true });
  await fs.rm(WS, { recursive: true, force: true });

  /* ------------------------------ demo home ------------------------------ */
  const home = (p: string) => path.join(HOME, p);
  await fs.mkdir(home('npc_team/jinxes'), { recursive: true });
  await fs.mkdir(home('npc_team/npcs'), { recursive: true });
  await fs.mkdir(home('knowledge_graphs'), { recursive: true });
  await fs.mkdir(home('cron_jobs'), { recursive: true });

  // user_profile.json: wizard complete, tutorial skipped, no AI required.
  await fs.writeFile(home('user_profile.json'), JSON.stringify({
    path: 'none', aiEnabled: true, extras: 'local',
    tutorialComplete: true, setupComplete: true,
  }, null, 2));

  // A demo jinx
  await fs.writeFile(home('npc_team/jinxes/analyze_sales.jinx'), `
jinx_name: analyze_sales
description: Aggregate sales CSV into region totals.
inputs:
  - csv_path
steps:
  - code: |
      import pandas as pd
      df = pd.read_csv("{{ csv_path }}")
      print(df.groupby("region").total.sum().sort_values(ascending=False))
`.trimStart());

  // A demo NPC
  await fs.writeFile(home('npc_team/npcs/demobot.npc'), `
name: demobot
primary_directive: You are demobot, a friendly data assistant for screenshots.
model: llama3.2
provider: ollama
`.trimStart());

  // team ctx
  await fs.writeFile(home('npc_team/team.ctx'), `name: demo
forem: demo
description: Demo team for screenshots
`);

  // Cron job file (picked up by cron daemon panel)
  await fs.writeFile(home('cron_jobs/nightly_kg.job'), JSON.stringify({
    name: 'nightly_kg',
    schedule: '0 3 * * *',
    command: '/run_jinx kg_extract',
    created_at: '2026-10-20T03:00:00Z',
  }, null, 2));

  // Memories (flat yaml store — memory_crud reads these)
  await fs.writeFile(home('.knowledge.yaml'), `
memories:
  - id: m1
    content: User prefers dark theme and vim keybindings.
    created_at: 2026-10-15T09:12:00Z
    type: preference
  - id: m2
    content: Project incognide uses Electron + React + Flask.
    created_at: 2026-10-18T14:41:00Z
    type: fact
  - id: m3
    content: Screenshots are regenerated automatically on release.
    created_at: 2026-10-22T17:00:00Z
    type: decision
knowledge: []
`);

  // window_state.json → 1600x1000, non-maximized, centered-ish
  await fs.writeFile(home('window_state.json'), JSON.stringify({
    width: 1600, height: 1000, x: 120, y: 60, maximized: false,
  }));

  // open_workspaces.json → point to demo workspace
  await fs.writeFile(home('open_workspaces.json'), JSON.stringify([WS]));

  /* --------------------------- fixture workspace -------------------------- */
  const ws = (p: string) => path.join(WS, p);
  await fs.mkdir(ws('docs'), { recursive: true });
  await fs.mkdir(ws('data'), { recursive: true });
  await fs.mkdir(ws('models'), { recursive: true });

  // demo_run.py — code editor + script execution shot
  await fs.writeFile(ws('demo_run.py'), `"""Demo script for screenshots."""
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

t = np.linspace(0, 4 * np.pi, 400)
y = np.sin(t) * np.exp(-t / 4)

plt.figure(figsize=(6, 3.5))
plt.plot(t, y, lw=2, color="#8be9fd")
plt.title("Damped sine")
plt.tight_layout()
plt.savefig("damped_sine.png", dpi=110)
print("Wrote damped_sine.png")
`);

  // sales.csv
  const rng = mulberry32(42);
  let csv = 'id,region,product,units,total\n';
  const regions = ['North', 'South', 'East', 'West'];
  const products = ['Alpha', 'Beta', 'Gamma'];
  for (let i = 1; i <= 60; i++) {
    const r = regions[Math.floor(rng() * 4)];
    const p = products[Math.floor(rng() * 3)];
    const u = 1 + Math.floor(rng() * 20);
    const tot = (u * (10 + rng() * 90)).toFixed(2);
    csv += `${i},${r},${p},${u},${tot}\n`;
  }
  await fs.writeFile(ws('data/sales.csv'), csv);

  // paper.tex
  await fs.writeFile(ws('docs/paper.tex'), `\\documentclass{article}
\\usepackage{amsmath}
\\title{Incognide Demo}
\\author{Levi}
\\begin{document}
\\maketitle
\\section{Hello}
The Euler identity: $e^{i\\pi} + 1 = 0$.
\\end{document}
`);

  // DOCX / PPTX / PDF / STL / XLSX via python libs available in the venv or pip fallback
  const py = `
import sys, subprocess, os
os.makedirs("${ws('docs')}", exist_ok=True)
os.makedirs("${ws('models')}", exist_ok=True)
def pip(pkg):
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-q', pkg])
# DOCX
try:
    from docx import Document
except ImportError:
    pip('python-docx'); from docx import Document
doc = Document()
doc.add_heading('Quarterly Report', 0)
doc.add_paragraph('Incognide lets you edit Word documents right next to your chats, code, and browsers.')
t = doc.add_table(rows=3, cols=3)
for i, h in enumerate(['Region','Units','Revenue']):
    t.rows[0].cells[i].text = h
for i, row in enumerate([['North','128','$4,820'],['South','94','$3,110']], start=1):
    for j, v in enumerate(row):
        t.rows[i].cells[j].text = v
doc.add_paragraph('Highlights persist with formatting, tables, and inline images.')
doc.save("${ws('docs/demo.docx')}")

# PPTX
try:
    from pptx import Presentation
except ImportError:
    pip('python-pptx'); from pptx import Presentation
prs = Presentation()
s = prs.slides.add_slide(prs.slide_layouts[0])
s.shapes.title.text = 'Incognide'
s.placeholders[1].text = 'Explore the unknown'
s2 = prs.slides.add_slide(prs.slide_layouts[1])
s2.shapes.title.text = 'One workspace'
s2.placeholders[1].text = 'Chat, code, docs, web — tiled'
prs.save("${ws('docs/slides.pptx')}")

# PDF
try:
    from reportlab.pdfgen import canvas
except ImportError:
    pip('reportlab'); from reportlab.pdfgen import canvas
c = canvas.Canvas("${ws('docs/paper.pdf')}")
c.setTitle('Incognide Demo PDF')
c.drawString(100, 780, 'Incognide — PDF highlighting demo')
c.drawString(100, 750, 'Select this sentence to highlight it inside the PDF viewer.')
for i in range(20):
    c.drawString(100, 700 - 22*i, 'Line %02d of the demo document.' % i)
c.save()

# STL (simple pyramid, ASCII STL)
stl = '''solid demo
 facet normal 0 0 -1
  outer loop
   vertex 0 0 0
   vertex 1 0 0
   vertex 0 1 0
  endloop
 endfacet
 facet normal 0.57 0.57 0.57
  outer loop
   vertex 0 0 0
   vertex 1 0 0
   vertex 0.5 0.5 1
  endloop
 endfacet
 facet normal -0.57 0.57 0.57
  outer loop
   vertex 0 0 0
   vertex 0 1 0
   vertex 0.5 0.5 1
  endloop
 endfacet
 facet normal 0.57 -0.57 0.57
  outer loop
   vertex 1 0 0
   vertex 1 1 0
   vertex 0.5 0.5 1
  endloop
 endfacet
 facet normal -0.57 -0.57 0.57
  outer loop
   vertex 0 1 0
   vertex 1 1 0
   vertex 0.5 0.5 1
  endloop
 endfacet
 facet normal 0 0 -1
  outer loop
   vertex 1 0 0
   vertex 1 1 0
   vertex 0 1 0
  endloop
 endfacet
endsolid demo
'''
open("${ws('models/demo.stl')}", 'w').write(stl)
print('seed-ok')
`;

  execSync(`python3 - << 'PYEOF'\n${py}\nPYEOF`, { stdio: 'inherit' });

  console.log(`Seeded ${HOME} and ${WS}`);
}

/** Deterministic PRNG so seeded CSV never changes across runs. */
function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

main().catch((e) => { console.error(e); process.exit(1); });
