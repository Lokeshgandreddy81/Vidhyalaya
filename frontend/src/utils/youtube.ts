/** Extract a clean 11-character YouTube video ID from any URL or string. */
export function sanitizeVideoId(idOrUrl: string): string {
  if (!idOrUrl || typeof idOrUrl !== 'string') return '';
  const clean = idOrUrl.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;
  const match = clean.match(
    /(?:youtube\.com\/(?:[^/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts|live)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : '';
}

/** Score topic relevance between a video title and module topic (0–100). */
export function scoreVideoMatch(
  videoTitle: string,
  channel: string,
  moduleTitle: string,
  keyConcepts: string[] = []
): number {
  const haystack = `${videoTitle} ${channel}`.toLowerCase();
  const keywords = [
    ...moduleTitle.toLowerCase().split(/\s+/),
    ...keyConcepts.flatMap(c => c.toLowerCase().split(/\s+/)),
  ].filter(w => w.length > 2);

  if (keywords.length === 0) return 50;

  let score = 40;
  const unique = [...new Set(keywords)];
  for (const kw of unique) {
    if (haystack.includes(kw)) score += 10;
  }
  if (haystack.includes(moduleTitle.toLowerCase())) score += 20;

  const authority = ['freecodecamp', 'traversy', 'mosh', 'fireship', 'simplified', 'academind', '3blue1brown', 'mit'];
  if (authority.some(ch => haystack.includes(ch))) score += 8;

  return Math.min(99, score);
}
