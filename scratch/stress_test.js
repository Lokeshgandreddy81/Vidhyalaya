const { performance } = require('perf_hooks');

const estimateRowHeight = (lineText, viewportWidth) => {
  if (!lineText) return 22;
  const cleanText = lineText.replace(/\x1b\[[0-9;]*m/g, '');
  const charWidth = 7.2;
  const padding = 32;
  const availableWidth = Math.max(100, viewportWidth - padding);
  const charsPerLine = Math.floor(availableWidth / charWidth);

  const subLines = cleanText.split('\n');
  let totalHeight = 0;
  for (const subLine of subLines) {
    const len = subLine.length || 1;
    const linesCount = Math.ceil(len / charsPerLine);
    totalHeight += linesCount * 22;
  }
  return totalHeight;
};

const findStartIndex = (offsets, scrollTop) => {
  let low = 0;
  let high = offsets.length - 1;
  let ans = 0;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (offsets[mid] <= scrollTop) {
      ans = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return Math.max(0, ans - 10);
};

const findEndIndex = (offsets, targetY) => {
  let low = 0;
  let high = offsets.length - 1;
  let ans = offsets.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (offsets[mid] >= targetY) {
      ans = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  return Math.min(offsets.length - 1, ans + 10);
};

function generateLogs(count) {
  const templates = [
    'lokeshgandreddy@MacBook-Pro Vidhyalaya % npm run dev',
    '  VITE v6.0.2  ready in 180 ms',
    '  ➜  Local:   http://localhost:3000/',
    ' ✓ exercises/quiz.test.ts (3 tests passed)',
    'ERROR: SyntaxError: Unexpected token < in JSON at position 0 at JSON.parse (<anonymous>)',
    'zsh: command not found: unknown_cmd',
    'Successfully parsed and executed exercises.ts.'
  ];
  const logs = [];
  for (let i = 0; i < count; i++) {
    logs.push(templates[i % templates.length] + ' - log index ' + i);
  }
  return logs;
}

function runBenchmark(count) {
  if (global.gc) global.gc();
  const beforeMem = process.memoryUsage().heapUsed;

  const startGen = performance.now();
  const history = generateLogs(count);
  const endGen = performance.now();

  const midMem = process.memoryUsage().heapUsed;
  const memoryUsedArray = midMem - beforeMem;

  // Calculate heights and offsets
  const viewportWidth = 800;
  const startOffsetCalc = performance.now();
  const heights = [];
  const offsets = [];
  let accumulated = 0;
  for (let i = 0; i < history.length; i++) {
    const h = estimateRowHeight(history[i], viewportWidth);
    heights.push(h);
    offsets.push(accumulated);
    accumulated += h;
  }
  const endOffsetCalc = performance.now();
  const offsetCalcTime = endOffsetCalc - startOffsetCalc;

  // Measure virtualization binary search scroll indexing
  const iterations = 1000;
  const startScrollSim = performance.now();
  for (let i = 0; i < iterations; i++) {
    // Simulate scrolling by moving scrollTop from 0 to max total height
    const scrollTop = (i / iterations) * Math.max(0, accumulated - 400);
    const startIdx = findStartIndex(offsets, scrollTop);
    const endIdx = findEndIndex(offsets, scrollTop + 400);
    const slice = history.slice(startIdx, endIdx + 1);
  }
  const endScrollSim = performance.now();
  const avgScrollIndexingTime = (endScrollSim - startScrollSim) / iterations;

  const postMem = process.memoryUsage().heapUsed;
  const totalHeapUsed = postMem - beforeMem;

  console.log(`\n========================================`);
  console.log(`Stress Test: ${count.toLocaleString()} Lines`);
  console.log(`========================================`);
  console.log(`History Generation Time: ${(endGen - startGen).toFixed(2)} ms`);
  console.log(`Row Heights & Offsets Calc Time: ${offsetCalcTime.toFixed(2)} ms`);
  console.log(`Memory footprint of logs array: ${(memoryUsedArray / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Avg Scroll Slice Indexing Time: ${(avgScrollIndexingTime * 1000).toFixed(4)} μs (${avgScrollIndexingTime.toFixed(4)} ms)`);
  console.log(`Estimated Max FPS during scrolling: ${(1000 / avgScrollIndexingTime).toFixed(1)} FPS`);
  console.log(`Input Caret / Render Latency: ${avgScrollIndexingTime.toFixed(4)} ms`);
}

console.log("Running Terminal Virtualization Stress Benchmarks...");
runBenchmark(100000);
runBenchmark(250000);
runBenchmark(500000);
