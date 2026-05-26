import { spawn } from 'node:child_process';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const imageDir = resolve(root, 'frontend/public/images');
const blueFieldUrl = `file://${resolve(imageDir, 'cortex-blue-field.png')}`;
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const shell = (content) => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      html, body {
        width: 1426px;
        height: 874px;
        margin: 0;
        overflow: hidden;
        font-family: Inter, Arial, sans-serif;
        color: #0b1020;
      }
      body {
        background: #2f20c7;
      }
      .stage {
        position: relative;
        width: 1426px;
        height: 874px;
        overflow: hidden;
        border-radius: 34px;
        background-image: url('${blueFieldUrl}');
        background-size: cover;
        background-position: center;
      }
      .stage::before {
        content: "";
        position: absolute;
        inset: 0;
        background:
          radial-gradient(ellipse 58% 38% at 70% 22%, rgba(130, 189, 255, .34), rgba(105, 157, 255, 0) 62%),
          radial-gradient(ellipse 42% 32% at 22% 78%, rgba(78, 91, 255, .36), rgba(78, 91, 255, 0) 70%),
          linear-gradient(180deg, rgba(255,255,255,.1), rgba(0,22,120,.05));
        z-index: 0;
      }
      .stage::after {
        content: "";
        position: absolute;
        left: -80px;
        right: -80px;
        top: 402px;
        height: 6px;
        border-radius: 999px;
        background: rgba(255,255,255,.78);
        transform: rotate(8deg);
        filter: blur(.15px);
        z-index: 1;
      }
      .window {
        position: absolute;
        inset: 58px 70px 64px;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,.58);
        border-radius: 34px;
        background: linear-gradient(135deg, rgba(255,255,255,.95), rgba(237,246,255,.88));
        box-shadow: 0 40px 104px rgba(3, 13, 70, .36), inset 0 1px 0 rgba(255,255,255,.82);
        z-index: 2;
      }
      .bar {
        height: 68px;
        display: flex;
        align-items: center;
        padding: 0 34px;
        border-bottom: 1px solid rgba(112,128,162,.18);
        background: rgba(255,255,255,.66);
      }
      .dot { width: 13px; height: 13px; border-radius: 50%; margin-right: 11px; }
      .brand {
        margin-left: auto;
        font-size: 18px;
        font-weight: 850;
        color: #111827;
      }
      .pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        height: 34px;
        padding: 0 15px;
        border-radius: 999px;
        background: rgba(241,245,249,.84);
        color: #64748b;
        font-size: 12px;
        font-weight: 820;
      }
      .dark-pill {
        background: #101827;
        color: white;
      }
      .mini-label {
        color: #68758c;
        font-size: 12px;
        font-weight: 850;
        letter-spacing: 3px;
        text-transform: uppercase;
      }
      .muted { color: #6b7891; }
      ${content}
    </style>
  </head>
  <body><div class="stage">${content.includes('learning-root') ? learningMarkup : buildersMarkup}</div></body>
</html>`;

const learningStyles = `
  .learning-root { position: absolute; inset: 0; }
  .learning-root .window { left: 66px; right: 66px; top: 52px; bottom: 62px; }
  .learning-root .main {
    height: calc(100% - 68px);
    padding: 42px 54px 44px;
    display: grid;
    grid-template-columns: 1fr 292px;
    gap: 34px;
  }
  .learning-root .builder {
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .learning-root .phase { text-align: center; }
  .learning-root h2 {
    margin: 20px 0 34px;
    text-align: center;
    font-size: 58px;
    line-height: 1;
  }
  .learning-root .cards {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 22px;
    width: 746px;
    margin: 0 auto;
  }
  .learning-root .card {
    display: flex;
    align-items: center;
    min-height: 88px;
    padding: 20px 24px;
    border: 1px solid rgba(145,162,195,.32);
    border-radius: 20px;
    background: rgba(255,255,255,.86);
    box-shadow: 0 16px 34px rgba(14,31,72,.1);
  }
  .learning-root .icon {
    width: 46px;
    height: 46px;
    display: grid;
    place-items: center;
    margin-right: 18px;
    border-radius: 14px;
    background: #eeeaff;
    color: #6157ff;
    font-size: 26px;
    font-weight: 900;
  }
  .learning-root .card strong { display: block; font-size: 22px; }
  .learning-root .card span { display: block; margin-top: 4px; color: #718096; font-size: 16px; font-weight: 700; }
  .learning-root .chips {
    display: flex;
    justify-content: center;
    gap: 18px;
    margin: 52px 0 24px;
  }
  .learning-root .command {
    display: flex;
    align-items: center;
    width: 846px;
    height: 72px;
    margin: 0 auto;
    padding: 0 18px 0 34px;
    border: 1px solid rgba(145,162,195,.32);
    border-radius: 999px;
    background: rgba(255,255,255,.82);
    box-shadow: 0 18px 38px rgba(14,31,72,.1);
  }
  .learning-root .placeholder { color: #8794aa; font-size: 20px; font-weight: 760; }
  .learning-root .go { margin-left: auto; width: 50px; height: 50px; border-radius: 50%; background: #0d1324; color: white; display: grid; place-items: center; font-size: 26px; font-weight: 900; }
  .learning-root .context {
    position: relative;
    display: grid;
    align-content: center;
    gap: 18px;
  }
  .learning-root .context-card {
    border: 1px solid rgba(145,162,195,.25);
    border-radius: 24px;
    padding: 22px;
    background: rgba(255,255,255,.72);
    box-shadow: 0 18px 42px rgba(14,31,72,.08);
  }
  .learning-root .context-card strong {
    display: block;
    margin-top: 10px;
    color: #111827;
    font-size: 18px;
    line-height: 1.18;
  }
  .learning-root .context-card p {
    margin: 9px 0 0;
    color: #6b7891;
    font-size: 13px;
    font-weight: 740;
    line-height: 1.45;
  }
  .learning-root .meter {
    height: 9px;
    margin-top: 17px;
    border-radius: 999px;
    background: #e7edf8;
    overflow: hidden;
  }
  .learning-root .meter span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #685dff, #1594f2);
  }
`;

const learningMarkup = `
  <div class="learning-root">
    <section class="window">
      <div class="bar">
        <span class="dot" style="background:#ff6b5f"></span>
        <span class="dot" style="background:#f7bd3a"></span>
        <span class="dot" style="background:#27c65a"></span>
        <span class="brand">cortex.app</span>
      </div>
      <div class="main">
        <div class="builder">
          <div class="phase mini-label">Phase 1 of 2</div>
          <h2>Choose your mastery path</h2>
          <div class="cards">
            <div class="card"><div class="icon">*</div><div><strong>Fullstack Systems</strong><span>React, Node, databases</span></div></div>
            <div class="card"><div class="icon">⌘</div><div><strong>AI Architecture</strong><span>LLMs, vectors, agents</span></div></div>
            <div class="card"><div class="icon">∑</div><div><strong>Data Science</strong><span>Python, ML, analytics</span></div></div>
            <div class="card"><div class="icon">☁</div><div><strong>Cloud Infrastructure</strong><span>AWS, Docker, K8s</span></div></div>
          </div>
          <div class="chips">
            <span class="pill">Depth <b>Expert</b></span>
            <span class="pill">Timeline <b>30d at 45m/day</b></span>
            <span class="pill">Level <b>Beginner</b></span>
            <span class="pill">For <b>Project</b></span>
          </div>
          <div class="command"><span class="placeholder">Describe what Cortex should build...</span><span class="go">→</span></div>
        </div>
        <div class="context">
          <div class="context-card">
            <span class="mini-label">Source context</span>
            <strong>Docs, notes, links, and constraints attached</strong>
            <p>Cortex uses real operating context before it builds the path.</p>
            <div class="meter"><span style="width:82%"></span></div>
          </div>
          <div class="context-card">
            <span class="mini-label">Review queue</span>
            <strong>4 modules ready for inspection</strong>
            <p>Every artifact is staged before the learner commits.</p>
            <div class="meter"><span style="width:64%"></span></div>
          </div>
        </div>
      </div>
    </section>
  </div>
`;

const buildersStyles = `
  .builders-root .window { inset: 52px 64px 60px; }
  .builders-root .main {
    display: grid;
    grid-template-columns: 258px 1fr 258px;
    gap: 30px;
    height: calc(100% - 68px);
    padding: 34px;
  }
  .builders-root .side, .builders-root .agent {
    border: 1px solid rgba(145,162,195,.25);
    border-radius: 26px;
    background: rgba(247,250,255,.78);
    padding: 28px;
    box-shadow: 0 18px 42px rgba(14,31,72,.06);
  }
  .builders-root .side h3, .builders-root .agent h3 { margin: 0 0 22px; font-size: 20px; }
  .builders-root .nav { display: grid; gap: 18px; color: #6d7890; font-size: 15px; font-weight: 800; }
  .builders-root .nav b { color: #111827; }
  .builders-root .content {
    padding: 18px 12px;
  }
  .builders-root .topline { display: flex; justify-content: space-between; align-items: center; }
  .builders-root h1 { margin: 34px 0 14px; font-size: 47px; line-height: 1.05; }
  .builders-root .lead { width: 580px; margin: 0 0 34px; color: #58677f; font-size: 18px; line-height: 1.5; font-weight: 650; }
  .builders-root .panel {
    border: 1px solid rgba(145,162,195,.28);
    border-radius: 24px;
    background: rgba(255,255,255,.78);
    padding: 28px;
    box-shadow: 0 18px 36px rgba(14,31,72,.08);
  }
  .builders-root .bars { display: grid; gap: 24px; margin-top: 26px; }
  .builders-root .barrow { display: grid; grid-template-columns: 90px 1fr; gap: 20px; align-items: center; font-weight: 850; color: #64748b; }
  .builders-root .track { height: 12px; border-radius: 999px; background: #e8eef8; overflow: hidden; }
  .builders-root .fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, #675cff, #1688e8); }
  .builders-root .agent { display: flex; flex-direction: column; align-items: center; text-align: center; }
  .builders-root .orb { width: 86px; height: 86px; margin: 48px 0 24px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #ffffff, #dfe8ff 42%, #675cff); box-shadow: 0 20px 46px rgba(79,70,229,.22); }
  .builders-root .agent p { color: #6b7891; font-size: 14px; line-height: 1.45; font-weight: 700; }
  .builders-root .action { width: 100%; height: 43px; margin-top: 18px; border-radius: 999px; background: white; border: 1px solid #dbe5f3; display: grid; place-items: center; font-size: 12px; font-weight: 900; letter-spacing: 1px; color: #334155; text-transform: uppercase; }
  .builders-root .timeline {
    margin-top: 24px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
  }
  .builders-root .tile {
    border: 1px solid rgba(145,162,195,.25);
    border-radius: 18px;
    padding: 18px;
    background: rgba(255,255,255,.7);
  }
  .builders-root .tile b {
    display: block;
    margin-top: 8px;
    font-size: 17px;
  }
`;

const buildersMarkup = `
  <div class="builders-root">
    <section class="window">
      <div class="bar">
        <span class="dot" style="background:#ff6b5f"></span>
        <span class="dot" style="background:#f7bd3a"></span>
        <span class="dot" style="background:#27c65a"></span>
        <span class="brand">cortex.app</span>
      </div>
      <div class="main">
        <aside class="side">
          <h3>Frontend Engineering</h3>
          <div class="nav">
            <b>Web Mechanics</b>
            <span>Semantic HTML5</span>
            <span>Responsive Design</span>
            <span>JavaScript Runtime</span>
            <span>Browser APIs</span>
            <span>Tooling & QA</span>
          </div>
        </aside>
        <main class="content">
          <div class="topline"><span class="mini-label">Whiteboard</span><span class="pill dark-pill">Live session</span></div>
          <h1>Web Mechanics &amp; HTTP Protocol</h1>
          <p class="lead">Cortex assembles the lesson, source context, examples, checks, and review plan into one inspectable learning surface.</p>
          <div class="panel">
            <span class="mini-label">The architectural foundation</span>
            <div class="bars">
              <div class="barrow"><span>stdin</span><div class="track"><div class="fill" style="width:62%"></div></div></div>
              <div class="barrow"><span>stdout</span><div class="track"><div class="fill" style="width:82%"></div></div></div>
              <div class="barrow"><span>stderr</span><div class="track"><div class="fill" style="width:74%"></div></div></div>
            </div>
          </div>
          <div class="timeline">
            <div class="tile"><span class="mini-label">Quiz</span><b>6 checks</b></div>
            <div class="tile"><span class="mini-label">Notes</span><b>12 cards</b></div>
            <div class="tile"><span class="mini-label">Review</span><b>Ready</b></div>
          </div>
        </main>
        <aside class="agent">
          <span class="mini-label">Sara copilot</span>
          <div class="orb"></div>
          <h3>Intelligence link established</h3>
          <p>Summarize, explain, quiz, and prepare the next step without losing the learning context.</p>
          <div class="action">Summarize path</div>
          <div class="action">Pinpoint essentials</div>
        </aside>
      </div>
    </section>
  </div>
`;

const assets = [
  { name: 'learning', styles: learningStyles, marker: 'learning-root', output: 'cortex-use-learning.png' },
  { name: 'builders', styles: buildersStyles, marker: 'builders-root', output: 'cortex-use-builders.png' },
];

const renderWithChrome = async (htmlPath, outputPath, profileName) => {
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=/private/tmp/${profileName}`,
    '--window-size=1426,874',
    `--screenshot=${outputPath}`,
    `file://${htmlPath}`,
  ];
  const child = spawn(chrome, args, { stdio: 'ignore' });
  await new Promise((resolveRun) => {
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      resolveRun();
    }, 8000);
    child.on('exit', () => {
      clearTimeout(timer);
      resolveRun();
    });
  });
  await stat(outputPath);
};

await mkdir('/private/tmp/cortex-ways-assets', { recursive: true });

for (const asset of assets) {
  const html = shell(`${asset.styles}\n.${asset.marker} { position: absolute; inset: 0; }`);
  const htmlPath = `/private/tmp/cortex-ways-assets/${asset.name}.html`;
  const outputPath = resolve(imageDir, asset.output);
  await writeFile(htmlPath, html);
  await renderWithChrome(htmlPath, outputPath, `cortex-ways-${asset.name}-profile`);
  console.log(`${asset.output} written`);
}
