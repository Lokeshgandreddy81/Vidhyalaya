const { performance } = require('perf_hooks');

const simulations = [
  { msg: 'Initializing Architectural Agents...', type: 'info' },
  { msg: 'Analyzing target goal and timeframe...', type: 'info' },
  { msg: 'Structuring modular learning phases...', type: 'success' },
  { msg: 'Finalizing schedule generation...', type: 'success' }
];

async function measureBaseline() {
  const promises = [];
  for (let i = 0; i < 10000; i++) {
    let simActive = true;
    promises.push((async () => {
      for (let s of simulations) {
        if (!simActive) break;
        await new Promise(r => setTimeout(r, 0));
      }
    })());
  }
  await Promise.all(promises);
}

function measureOptimized() {
  const promises = [];
  for (let i = 0; i < 10000; i++) {
    let simActive = true;
    promises.push(new Promise(resolve => {
        let completed = 0;
        simulations.forEach((s, idx) => {
          setTimeout(() => {
            if (!simActive) return;
            completed++;
            if (completed === simulations.length) resolve();
          }, idx * 0);
        });
    }));
  }
  return Promise.all(promises);
}

async function run() {
  // GC before start if available
  if (global.gc) global.gc();
  const startMemBaseline = process.memoryUsage().heapUsed;
  const startBaseline = performance.now();
  await measureBaseline();
  const endBaseline = performance.now();
  const endMemBaseline = process.memoryUsage().heapUsed;

  if (global.gc) global.gc();
  const startMemOpt = process.memoryUsage().heapUsed;
  const startOpt = performance.now();
  await measureOptimized();
  const endOpt = performance.now();
  const endMemOpt = process.memoryUsage().heapUsed;

  console.log(`Baseline Execution: ${endBaseline - startBaseline} ms, Memory Diff: ${endMemBaseline - startMemBaseline} bytes`);
  console.log(`Optimized Execution: ${endOpt - startOpt} ms, Memory Diff: ${endMemOpt - startMemOpt} bytes`);
}

run();
