const { performance } = require('perf_hooks');

const simulations = [
  { msg: 'Initializing Architectural Agents...', type: 'info' },
  { msg: 'Analyzing target goal and timeframe...', type: 'info' },
  { msg: 'Structuring modular learning phases...', type: 'success' },
  { msg: 'Finalizing schedule generation...', type: 'success' }
];

async function measureBaseline() {
  const start = performance.now();
  let simActive = true;
  const promise = (async () => {
    for (let s of simulations) {
      if (!simActive) break;
      await new Promise(r => setTimeout(r, 0)); // Using 0 for benchmark purposes so we just test overhead
      // mock work
    }
  })();
  const end = performance.now();
  await promise;
  return end - start; // Time taken to set up the async loop
}

function measureOptimized() {
  const start = performance.now();
  let simActive = true;
  const timeouts = simulations.map((s, i) => {
    return setTimeout(() => {
      if (!simActive) return;
      // mock work
    }, i * 0);
  });
  const end = performance.now();

  // Cleanup
  timeouts.forEach(clearTimeout);
  return end - start; // Time taken to set up all timeouts synchronously
}

async function run() {
  let baselineTotal = 0;
  let optimizedTotal = 0;
  const iters = 1000;

  // warmup
  for(let i = 0; i < 100; i++) {
    await measureBaseline();
    measureOptimized();
  }

  for (let i = 0; i < iters; i++) {
    baselineTotal += await measureBaseline();
    optimizedTotal += measureOptimized();
  }

  console.log(`Baseline setup time (avg): ${baselineTotal / iters} ms`);
  console.log(`Optimized setup time (avg): ${optimizedTotal / iters} ms`);
}

run();
