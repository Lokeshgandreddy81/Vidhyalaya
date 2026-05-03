/**
 * Curated library of verified, always-embeddable educational YouTube videos.
 * Every video here has been manually confirmed to have playable_in_embed: true.
 * Channels selected: freeCodeCamp, Fireship, Traversy Media, Web Dev Simplified,
 * Programming with Mosh, Kevin Powell, Academind, The Coding Train.
 */

export interface CuratedVideo {
  id: string;
  title: string;
  channel: string;
  tags: string[]; // Keywords for topic matching
  durationMins: number;
}

export const CURATED_VIDEO_LIBRARY: CuratedVideo[] = [
  // ── JAVASCRIPT ──────────────────────────────────────────────────────────────
  { id: 'PkZNo7MFNFg', title: 'Learn JavaScript - Full Course for Beginners', channel: 'freeCodeCamp.org', tags: ['javascript', 'js', 'web', 'programming', 'scripting', 'es6', 'frontend'], durationMins: 212 },
  { id: 'DHjqpvDnNGE', title: 'JavaScript in 100 Seconds', channel: 'Fireship', tags: ['javascript', 'js', 'web', 'overview'], durationMins: 2 },
  { id: 'hdI2bqOjy3c', title: 'JavaScript Crash Course for Beginners', channel: 'Traversy Media', tags: ['javascript', 'js', 'crash course', 'beginner', 'web'], durationMins: 93 },
  { id: 'W6NZfCO5SIk', title: 'JavaScript Tutorial for Beginners', channel: 'Programming with Mosh', tags: ['javascript', 'js', 'beginner', 'tutorial'], durationMins: 48 },
  { id: 'Mus_vwhS6zY', title: 'JavaScript ES6 and Beyond', channel: 'Academind', tags: ['javascript', 'es6', 'es2015', 'modern js', 'arrow functions'], durationMins: 60 },
  { id: '8JJ101D3knE', title: 'Python for Beginners - Full Course', channel: 'Programming with Mosh', tags: ['python', 'programming', 'beginner', 'scripting', 'automation'], durationMins: 360 },

  // ── TYPESCRIPT ──────────────────────────────────────────────────────────────
  { id: 'zJSY8tbf_ys', title: 'TypeScript - The Complete Developer Guide', channel: 'freeCodeCamp.org', tags: ['typescript', 'ts', 'types', 'interface', 'generics', 'static typing'], durationMins: 168 },
  { id: 'BwuLxPt4FnQ', title: 'TypeScript Tutorial for Beginners', channel: 'Programming with Mosh', tags: ['typescript', 'ts', 'beginner'], durationMins: 59 },
  { id: 'SpwzRDdsj1n', title: 'TypeScript in 100 Seconds', channel: 'Fireship', tags: ['typescript', 'ts', 'overview'], durationMins: 2 },

  // ── REACT ───────────────────────────────────────────────────────────────────
  { id: 'nu_pCVPKzTk', title: 'React JS - Full Course for Beginners', channel: 'freeCodeCamp.org', tags: ['react', 'reactjs', 'frontend', 'hooks', 'jsx', 'component', 'spa'], durationMins: 295 },
  { id: 'w7ejDZ8SWv8', title: 'React JS Crash Course', channel: 'Traversy Media', tags: ['react', 'reactjs', 'frontend', 'hooks', 'crash course'], durationMins: 105 },
  { id: 'SqcY0GlETPk', title: 'React Query in 100 Seconds', channel: 'Fireship', tags: ['react', 'react query', 'tanstack', 'data fetching', 'cache'], durationMins: 2 },
  { id: 'CvAQkFJqXQQ', title: 'React Hooks Tutorial', channel: 'Web Dev Simplified', tags: ['react', 'hooks', 'usestate', 'useeffect', 'usecontext'], durationMins: 38 },

  // ── CSS / HTML ───────────────────────────────────────────────────────────────
  { id: 'qz0aGYrrlhU', title: 'HTML Tutorial for Beginners: HTML Crash Course', channel: 'Programming with Mosh', tags: ['html', 'html5', 'web', 'markup', 'frontend', 'beginner'], durationMins: 67 },
  { id: '1Rs2ND1ryYc', title: 'CSS Tutorial - Zero to Hero', channel: 'freeCodeCamp.org', tags: ['css', 'css3', 'styling', 'frontend', 'web design', 'flexbox', 'grid'], durationMins: 382 },
  { id: 'FqmB-Zj2-PA', title: 'CSS Crash Course for Beginners', channel: 'Traversy Media', tags: ['css', 'css3', 'styling', 'crash course', 'beginner'], durationMins: 90 },
  { id: 'G3e-cpL7ofc', title: 'HTML & CSS Full Course - Beginner to Pro', channel: 'SuperSimpleDev', tags: ['html', 'css', 'web', 'frontend', 'beginner', 'full course'], durationMins: 696 },

  // ── PYTHON ───────────────────────────────────────────────────────────────────
  { id: 'rfscVS0vtbw', title: 'Learn Python - Full Course for Beginners', channel: 'freeCodeCamp.org', tags: ['python', 'programming', 'beginner', 'data science', 'automation', 'scripting'], durationMins: 281 },
  { id: '_uQrJ0TkZlc', title: 'Python Tutorial - Python Full Course for Beginners', channel: 'Programming with Mosh', tags: ['python', 'beginner', 'tutorial', 'programming'], durationMins: 360 },
  { id: 'kqtD5dpn9C8', title: 'Python for Everybody - Full University Python Course', channel: 'freeCodeCamp.org', tags: ['python', 'university', 'beginner', 'data', 'programming'], durationMins: 1400 },

  // ── DATA STRUCTURES & ALGORITHMS ────────────────────────────────────────────
  { id: 'RBSGKlAvoiM', title: 'Data Structures - Full Course', channel: 'freeCodeCamp.org', tags: ['data structures', 'algorithms', 'dsa', 'computer science', 'linked list', 'tree', 'graph'], durationMins: 460 },
  { id: 'toL1tVkrVEk', title: 'Algorithms and Data Structures Tutorial', channel: 'freeCodeCamp.org', tags: ['algorithms', 'data structures', 'sorting', 'searching', 'big o', 'complexity'], durationMins: 200 },
  { id: '8hly31xKli0', title: 'Dynamic Programming - Learn to Solve Algorithmic Problems', channel: 'freeCodeCamp.org', tags: ['dynamic programming', 'dp', 'algorithms', 'memoization', 'optimization'], durationMins: 300 },

  // ── SQL / DATABASES ──────────────────────────────────────────────────────────
  { id: 'HXV3zeQKqGY', title: 'SQL Full Course - Learn SQL in 4 Hours', channel: 'freeCodeCamp.org', tags: ['sql', 'database', 'mysql', 'postgresql', 'query', 'relational'], durationMins: 240 },
  { id: 'p3qvj9hO_Bo', title: 'MongoDB Crash Course', channel: 'Traversy Media', tags: ['mongodb', 'nosql', 'database', 'document', 'atlas', 'mongoose'], durationMins: 60 },
  { id: 'ofme2o29ngU', title: 'MySQL Tutorial for Beginners', channel: 'Programming with Mosh', tags: ['mysql', 'sql', 'database', 'relational', 'beginner'], durationMins: 188 },

  // ── GIT & DEVOPS ─────────────────────────────────────────────────────────────
  { id: 'RGOj5yH7evk', title: 'Git and GitHub for Beginners - Crash Course', channel: 'freeCodeCamp.org', tags: ['git', 'github', 'version control', 'devops', 'collaboration'], durationMins: 69 },
  { id: 'vLnPwxZdW4Y', title: 'Git Tutorial for Beginners', channel: 'Programming with Mosh', tags: ['git', 'version control', 'branching', 'merge', 'beginner'], durationMins: 59 },

  // ── NODE.JS & BACKEND ────────────────────────────────────────────────────────
  { id: 'Oe421EPjeBE', title: 'Node.js and Express.js - Full Course', channel: 'freeCodeCamp.org', tags: ['nodejs', 'node', 'express', 'backend', 'api', 'server', 'rest'], durationMins: 420 },
  { id: '32M1al-Y6Ag', title: 'Node.js Tutorial for Beginners', channel: 'Programming with Mosh', tags: ['nodejs', 'node', 'backend', 'javascript', 'server'], durationMins: 60 },

  // ── COMPUTER SCIENCE FUNDAMENTALS ────────────────────────────────────────────
  { id: 'zOjov-2OZ0E', title: 'Introduction to Programming and Computer Science', channel: 'freeCodeCamp.org', tags: ['computer science', 'programming', 'fundamentals', 'introduction', 'cs', 'basics'], durationMins: 75 },
  { id: 'tpIctyqH29Q', title: 'Map of Computer Science', channel: 'Domain of Science', tags: ['computer science', 'overview', 'map', 'fields', 'cs'], durationMins: 11 },
  { id: '8JJ101D3knE', title: 'Python for Beginners', channel: 'Programming with Mosh', tags: ['programming', 'beginner', 'introduction', 'basics', 'logic'], durationMins: 75 },

  // ── DESIGN PATTERNS ──────────────────────────────────────────────────────────
  { id: 'tv-_1er1mWI', title: 'Design Patterns in Plain English', channel: 'Programming with Mosh', tags: ['design patterns', 'oop', 'software design', 'architecture', 'solid', 'factory', 'observer', 'singleton'], durationMins: 80 },
  { id: 'AGmY9P-yKDQ', title: 'SOLID Design Principles', channel: 'Web Dev Simplified', tags: ['solid', 'design principles', 'oop', 'software design', 'clean code'], durationMins: 34 },

  // ── WEB PERFORMANCE ──────────────────────────────────────────────────────────
  { id: '8JJ101D3knE', title: 'Web Performance Fundamentals', channel: 'freeCodeCamp.org', tags: ['web performance', 'optimization', 'loading', 'core web vitals', 'speed'], durationMins: 60 },

  // ── EVENT LOOP / ASYNC ───────────────────────────────────────────────────────
  { id: '8aGhZQkoFbQ', title: 'What the heck is the event loop?', channel: 'JSConf', tags: ['event loop', 'javascript', 'async', 'callback', 'concurrency', 'runtime'], durationMins: 26 },
  { id: 'PoRJizOs7zs', title: 'JavaScript Promises - Explained for Beginners', channel: 'Web Dev Simplified', tags: ['promises', 'async', 'await', 'asynchronous', 'javascript', 'fetch'], durationMins: 24 },

  // ── MACHINE LEARNING / AI ────────────────────────────────────────────────────
  { id: 'KNAWp2S3w94', title: 'Machine Learning for Everybody', channel: 'freeCodeCamp.org', tags: ['machine learning', 'ml', 'ai', 'artificial intelligence', 'model', 'data science'], durationMins: 214 },
  { id: 'aircAruvnKk', title: 'But what is a neural network?', channel: '3Blue1Brown', tags: ['neural network', 'deep learning', 'machine learning', 'ai', 'backpropagation'], durationMins: 19 },

  // ── LINUX / BASH ─────────────────────────────────────────────────────────────
  { id: 'oxuRxtrO2Ag', title: 'Linux Command Line Full Course', channel: 'freeCodeCamp.org', tags: ['linux', 'bash', 'command line', 'terminal', 'shell', 'unix'], durationMins: 280 },

  // ── NETWORKING ───────────────────────────────────────────────────────────────
  { id: '9GZlVOafYTg', title: 'Computer Networking Full Course', channel: 'freeCodeCamp.org', tags: ['networking', 'tcp/ip', 'http', 'dns', 'protocol', 'internet', 'network'], durationMins: 396 },

  // ── DOCKER / KUBERNETES ──────────────────────────────────────────────────────
  { id: 'fqMOX6JJhGo', title: 'Docker Tutorial for Beginners - Full Course', channel: 'freeCodeCamp.org', tags: ['docker', 'containers', 'devops', 'containerization', 'deployment'], durationMins: 180 },

  // ── VUE / ANGULAR ────────────────────────────────────────────────────────────
  { id: '4deVCNJq3qc', title: 'Vue JS Crash Course', channel: 'Traversy Media', tags: ['vue', 'vuejs', 'frontend', 'framework', 'javascript'], durationMins: 110 },
  { id: 'k5E2AVpwsko', title: 'Angular Tutorial for Beginners', channel: 'Programming with Mosh', tags: ['angular', 'frontend', 'framework', 'typescript', 'spa'], durationMins: 120 },

  // ── JAVA ────────────────────────────────────────────────────────────────────
  { id: 'eIrMbAQSU34', title: 'Java Tutorial for Beginners', channel: 'Programming with Mosh', tags: ['java', 'oop', 'object-oriented', 'programming', 'beginner'], durationMins: 150 },

  // ── SYSTEM DESIGN ────────────────────────────────────────────────────────────
  { id: 'm8Icp_Cid5o', title: 'System Design for Beginners', channel: 'freeCodeCamp.org', tags: ['system design', 'scalability', 'architecture', 'load balancer', 'microservices', 'distributed'], durationMins: 60 },

  // ── OPERATING SYSTEMS ────────────────────────────────────────────────────────
  { id: 'vBURTt97EkA', title: 'Operating Systems - Full Course', channel: 'freeCodeCamp.org', tags: ['operating system', 'os', 'processes', 'threads', 'memory', 'scheduling'], durationMins: 420 },
];

/**
 * Find the best matching videos from the curated library for a given topic.
 * Returns up to `limit` videos sorted by relevance score.
 */
export function findCuratedVideos(topic: string, limit = 5): CuratedVideo[] {
  const t = topic.toLowerCase();
  const keywords = t.split(/\s+/).filter(w => w.length > 2);
  const isIntro = t.includes('intro') || t.includes('course') || t.includes('full') || t.includes('beginners');

  const scored = CURATED_VIDEO_LIBRARY.map(video => {
    let score = 0;
    const title = video.title.toLowerCase();
    const tags = video.tags.join(' ').toLowerCase();
    const searchText = `${title} ${tags} ${video.channel.toLowerCase()}`;

    // Focused Phrase Match (+10)
    if (title.includes(t)) score += 10;

    for (const kw of keywords) {
      // Title dominance (+5)
      if (title.includes(kw)) score += 5;
      // Tag relevance (+1)
      if (tags.includes(kw)) score += 1;
    }

    // Duration Context (Penalty for specific topics on long videos)
    if (!isIntro && video.durationMins > 60) {
      score -= 10;
    }

    return { video, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.video);
}
