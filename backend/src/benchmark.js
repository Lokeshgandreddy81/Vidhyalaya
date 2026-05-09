import { performance } from 'perf_hooks';

// Setup mock data
const panels = [{
  engagementPanelSectionListRenderer: {
    content: {
      macroMarkersListRenderer: {
        contents: []
      }
    }
  }
}];
for (let i = 0; i < 1000; i++) {
  panels[0].engagementPanelSectionListRenderer.content.macroMarkersListRenderer.contents.push({
    macroMarkersListItemRenderer: {
      title: { simpleText: `Chapter ${i}` },
      onTap: {
        commandMetadata: {
          webCommandMetadata: {
            url: `/watch?v=123&t=${i * 10}s`
          }
        }
      }
    }
  });
}

function runBenchmark(name, fn) {
  let result;
  const start = performance.now();
  for (let i = 0; i < 1000; i++) {
    result = fn();
  }
  const end = performance.now();
  const duration = end - start;
  console.log(`${name}: ${duration.toFixed(2)} ms`);
  return duration;
}

function before() {
  for (const panel of panels) {
    const chapters = panel?.engagementPanelSectionListRenderer?.content?.macroMarkersListRenderer?.contents;
    if (chapters && Array.isArray(chapters)) {
      return chapters
        .map(c => {
          const renderer = c.macroMarkersListItemRenderer;
          if (!renderer) return null;
          return {
            title: renderer.title?.simpleText || renderer.title?.runs?.[0]?.text || '',
            startSecs: Math.floor(parseInt(renderer.onTap?.commandMetadata?.webCommandMetadata?.url?.match(/t=(\d+)s/)?.[1] || '0')),
          };
        })
        .filter(c => c && c.title);
    }
  }
}

function after() {
  for (const panel of panels) {
    const chapters = panel?.engagementPanelSectionListRenderer?.content?.macroMarkersListRenderer?.contents;
    if (chapters && Array.isArray(chapters)) {
      const result = [];
      for (const c of chapters) {
        const renderer = c.macroMarkersListItemRenderer;
        if (!renderer) continue;

        const title = renderer.title?.simpleText || renderer.title?.runs?.[0]?.text || '';
        if (!title) continue;

        let startSecs = 0;
        const url = renderer.onTap?.commandMetadata?.webCommandMetadata?.url;
        if (url) {
            const tIndex = url.indexOf('t=');
            if (tIndex !== -1) {
                const sIndex = url.indexOf('s', tIndex + 2);
                if (sIndex !== -1) {
                    const timeStr = url.substring(tIndex + 2, sIndex);
                    const parsed = parseInt(timeStr, 10);
                    if (!isNaN(parsed)) {
                        startSecs = Math.floor(parsed);
                    }
                }
            }
        }

        result.push({ title, startSecs });
      }
      return result;
    }
  }
}

const timeBefore = runBenchmark('before', before);
const timeAfter = runBenchmark('after', after);
const improvement = ((timeBefore - timeAfter) / timeBefore * 100).toFixed(2);
console.log(`\nImprovement: ${improvement}% faster`);
