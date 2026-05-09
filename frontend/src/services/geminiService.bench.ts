import { bench, describe } from 'vitest';

const curated = Array.from({ length: 50 }, (_, i) => ({ id: `curatedId${i}`, title: `Curated Title ${i}` }));
const aiResults = Array.from({ length: 100 }, (_, i) => ({ title: `AI Title ${i}`, content: `https://www.youtube.com/watch?v=aiId${i}` }))
  .concat(Array.from({ length: 100 }, (_, i) => ({ title: `AI Title short ${i}`, content: `https://youtu.be/aiId${i}` })));

describe('scoutResources loop optimization', () => {
  bench('original implementation', () => {
    const combined = [
      ...curated.map(v => ({ title: v.title, content: `https://www.youtube.com/watch?v=${v.id}` })),
      ...aiResults
    ];

    const uniqueIds = new Set();
    const finalCandidates = [];
    for (const item of combined) {
      if (!item || !item.content) continue;
      const vid = item.content?.match(/v=([^&]+)/)?.[1] || item.content?.split('/').pop();
      if (vid && vid.length >= 10 && !uniqueIds.has(vid)) {
        uniqueIds.add(vid);
        finalCandidates.push({ ...item, videoId: vid });
      }
    }
  });

  const ytRegex = /[?&]v=([^&]+)/;

  bench('optimized implementation', () => {
    const uniqueIds = new Set();
    const finalCandidates = [];

    // Process curated explicitly to avoid map/spread overhead and regex matching
    for (let i = 0; i < curated.length; i++) {
      const item = curated[i];
      const vid = item.id;
      if (vid && vid.length >= 10 && !uniqueIds.has(vid)) {
        uniqueIds.add(vid);
        finalCandidates.push({
          title: item.title,
          content: `https://www.youtube.com/watch?v=${vid}`,
          videoId: vid
        });
      }
    }

    // Process AI results avoiding full array concatenation
    for (let i = 0; i < aiResults.length; i++) {
      const item = aiResults[i];
      if (!item || !item.content) continue;

      let vid;
      const match = ytRegex.exec(item.content);
      if (match) {
        vid = match[1];
      } else {
        const lastSlash = item.content.lastIndexOf('/');
        if (lastSlash !== -1) {
          vid = item.content.substring(lastSlash + 1);
        }
      }

      if (vid && vid.length >= 10 && !uniqueIds.has(vid)) {
        uniqueIds.add(vid);
        finalCandidates.push({ ...item, videoId: vid });
      }
    }
  });
});
