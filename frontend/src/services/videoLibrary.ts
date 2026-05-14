/**
 * Curated library of verified, always-embeddable educational YouTube videos.
 * Every video here has been manually confirmed to have playable_in_embed: true.
 * Channels selected: freeCodeCamp, Fireship, Traversy Media, Web Dev Simplified,
 * Programming with Mosh, Kevin Powell, Academind, The Coding Train, MIT, etc.
 */

export interface CuratedVideo {
  id: string;
  title: string;
  channel: string;
  tags: string[]; // Keywords for topic matching
  durationMins: number;
  difficulty?: number; // 1-10 (1=Beginner, 10=PhD)
  alignment?: string;  // e.g., "MIT 6.006", "Stanford CS101"
  voiceType?: 'theoretical' | 'practical' | 'hybrid';
  densityMap?: number[]; // Concept density across the video timeline (0-1)
}

export const CURATED_VIDEO_LIBRARY: CuratedVideo[] = [
  // ── JAVASCRIPT ──────────────────────────────────────────────────────────────
  { id: 'PkZNo7MFNFg', title: 'Learn JavaScript - Full Course for Beginners', channel: 'freeCodeCamp.org', tags: ['javascript', 'js', 'web', 'programming', 'scripting', 'es6', 'frontend'], durationMins: 212, difficulty: 2, alignment: 'WebDev 101' },
  { id: 'DHjqpvDnNGE', title: 'JavaScript in 100 Seconds', channel: 'Fireship', tags: ['javascript', 'js', 'web', 'overview'], durationMins: 2, difficulty: 3 },
  { id: 'hdI2bqOjy3c', title: 'JavaScript Crash Course for Beginners', channel: 'Traversy Media', tags: ['javascript', 'js', 'crash course', 'beginner', 'web'], durationMins: 93, difficulty: 2 },
  { id: 'W6NZfCO5SIk', title: 'JavaScript Tutorial for Beginners', channel: 'Programming with Mosh', tags: ['javascript', 'js', 'beginner', 'tutorial'], durationMins: 48, difficulty: 2 },
  { id: 'Mus_vwhS6zY', title: 'JavaScript ES6 and Beyond', channel: 'Academind', tags: ['javascript', 'es6', 'es2015', 'modern js', 'arrow functions'], durationMins: 60, difficulty: 4 },

  // ── TYPESCRIPT ──────────────────────────────────────────────────────────────
  { id: 'zJSY8tbf_ys', title: 'TypeScript - The Complete Developer Guide', channel: 'freeCodeCamp.org', tags: ['typescript', 'ts', 'types', 'interface', 'generics', 'static typing'], durationMins: 168, difficulty: 4 },
  { id: 'BwuLxPt4FnQ', title: 'TypeScript Tutorial for Beginners', channel: 'Programming with Mosh', tags: ['typescript', 'ts', 'beginner'], durationMins: 59, difficulty: 3 },
  { id: 'SpwzRDdsj1n', title: 'TypeScript in 100 Seconds', channel: 'Fireship', tags: ['typescript', 'ts', 'overview'], durationMins: 2, difficulty: 3 },

  // ── REACT & NEXT.JS ─────────────────────────────────────────────────────────
  { id: 'nu_pCVPKzTk', title: 'React JS - Full Course for Beginners', channel: 'freeCodeCamp.org', tags: ['react', 'reactjs', 'frontend', 'hooks', 'jsx', 'component', 'spa'], durationMins: 295, difficulty: 3, alignment: 'Frontend Architecture' },
  { id: 'w7ejDZ8SWv8', title: 'React JS Crash Course', channel: 'Traversy Media', tags: ['react', 'reactjs', 'frontend', 'hooks', 'crash course'], durationMins: 105, difficulty: 3 },
  { id: 'SqcY0GlETPk', title: 'React Query in 100 Seconds', channel: 'Fireship', tags: ['react', 'react query', 'tanstack', 'data fetching', 'cache'], durationMins: 2, difficulty: 5 },
  { id: 'CvAQkFJqXQQ', title: 'React Hooks Tutorial', channel: 'Web Dev Simplified', tags: ['react', 'hooks', 'usestate', 'useeffect', 'usecontext', 'state management'], durationMins: 38, difficulty: 4 },
  { id: 'ZVnjOPwW4ZA', title: 'Next.js App Router Crash Course', channel: 'Traversy Media', tags: ['nextjs', 'react', 'ssr', 'app router', 'server components', 'frontend'], durationMins: 120, difficulty: 5 },
  { id: 'Sklc_fQBmcs', title: 'Next.js in 100 Seconds', channel: 'Fireship', tags: ['nextjs', 'react', 'ssr', 'overview'], durationMins: 2, difficulty: 4 },

  // ── CSS / HTML / UI ─────────────────────────────────────────────────────────
  { id: 'qz0aGYrrlhU', title: 'HTML Tutorial for Beginners: HTML Crash Course', channel: 'Programming with Mosh', tags: ['html', 'html5', 'web', 'markup', 'frontend', 'beginner'], durationMins: 67, difficulty: 1 },
  { id: '1Rs2ND1ryYc', title: 'CSS Tutorial - Zero to Hero', channel: 'freeCodeCamp.org', tags: ['css', 'css3', 'styling', 'frontend', 'web design', 'flexbox', 'grid'], durationMins: 382, difficulty: 2 },
  { id: 'FqmB-Zj2-PA', title: 'CSS Crash Course for Beginners', channel: 'Traversy Media', tags: ['css', 'css3', 'styling', 'crash course', 'beginner'], durationMins: 90, difficulty: 1 },
  { id: 'G3e-cpL7ofc', title: 'HTML & CSS Full Course - Beginner to Pro', channel: 'SuperSimpleDev', tags: ['html', 'css', 'web', 'frontend', 'beginner', 'full course'], durationMins: 696, difficulty: 2 },
  { id: 'c9B4TPnak1A', title: 'UI/UX Design Course', channel: 'freeCodeCamp.org', tags: ['ui', 'ux', 'design', 'figma', 'user interface', 'user experience'], durationMins: 330, difficulty: 3, alignment: 'Design Fundamentals' },

  // ── PYTHON & DATA SCIENCE ───────────────────────────────────────────────────
  { id: 'rfscVS0vtbw', title: 'Learn Python - Full Course for Beginners', channel: 'freeCodeCamp.org', tags: ['python', 'programming', 'beginner', 'data science', 'automation', 'scripting'], durationMins: 281, difficulty: 2, alignment: 'CS101' },
  { id: '_uQrJ0TkZlc', title: 'Python Tutorial - Python Full Course for Beginners', channel: 'Programming with Mosh', tags: ['python', 'beginner', 'tutorial', 'programming'], durationMins: 360, difficulty: 2 },
  { id: 'kqtD5dpn9C8', title: 'Python for Everybody - Full University Python Course', channel: 'freeCodeCamp.org', tags: ['python', 'university', 'beginner', 'data', 'programming'], durationMins: 1400, difficulty: 2, alignment: 'U-Mich CS' },
  { id: 'LHBE6Q9XlzI', title: 'Python Pandas Tutorial', channel: 'Programming with Mosh', tags: ['python', 'pandas', 'data analysis', 'data science', 'dataframe'], durationMins: 60, difficulty: 4 },

  // ── DATA STRUCTURES & ALGORITHMS ────────────────────────────────────────────
  { id: 'RBSGKlAvoiM', title: 'Data Structures - Full Course', channel: 'freeCodeCamp.org', tags: ['data structures', 'algorithms', 'dsa', 'computer science', 'linked list', 'tree', 'graph'], durationMins: 460, difficulty: 6, alignment: 'MIT 6.006' },
  { id: 'toL1tVkrVEk', title: 'Algorithms and Data Structures Tutorial', channel: 'freeCodeCamp.org', tags: ['algorithms', 'data structures', 'sorting', 'searching', 'big o', 'complexity'], durationMins: 200, difficulty: 5, alignment: 'Stanford CS161' },
  { id: '8hly31xKli0', title: 'Dynamic Programming - Learn to Solve Algorithmic Problems', channel: 'freeCodeCamp.org', tags: ['dynamic programming', 'dp', 'algorithms', 'memoization', 'optimization'], durationMins: 300, difficulty: 8, alignment: 'Advanced Algorithms' },

  // ── SQL / DATABASES ──────────────────────────────────────────────────────────
  { id: 'HXV3zeQKqGY', title: 'SQL Full Course - Learn SQL in 4 Hours', channel: 'freeCodeCamp.org', tags: ['sql', 'database', 'mysql', 'postgresql', 'query', 'relational'], durationMins: 240, difficulty: 3 },
  { id: 'p3qvj9hO_Bo', title: 'MongoDB Crash Course', channel: 'Traversy Media', tags: ['mongodb', 'nosql', 'database', 'document', 'atlas', 'mongoose'], durationMins: 60, difficulty: 4 },
  { id: 'ofme2o29ngU', title: 'MySQL Tutorial for Beginners', channel: 'Programming with Mosh', tags: ['mysql', 'sql', 'database', 'relational', 'beginner'], durationMins: 188, difficulty: 3 },
  { id: 'WpD8bN1cwR0', title: 'PostgreSQL Tutorial', channel: 'freeCodeCamp.org', tags: ['postgresql', 'sql', 'database', 'relational', 'postgres'], durationMins: 260, difficulty: 4 },

  // ── GIT & DEVOPS ─────────────────────────────────────────────────────────────
  { id: 'RGOj5yH7evk', title: 'Git and GitHub for Beginners - Crash Course', channel: 'freeCodeCamp.org', tags: ['git', 'github', 'version control', 'devops', 'collaboration'], durationMins: 69, difficulty: 2 },
  { id: 'vLnPwxZdW4Y', title: 'Git Tutorial for Beginners', channel: 'Programming with Mosh', tags: ['git', 'version control', 'branching', 'merge', 'beginner'], durationMins: 59, difficulty: 2 },

  // ── NODE.JS & BACKEND ────────────────────────────────────────────────────────
  { id: 'Oe421EPjeBE', title: 'Node.js and Express.js - Full Course', channel: 'freeCodeCamp.org', tags: ['nodejs', 'node', 'express', 'backend', 'api', 'server', 'rest'], durationMins: 420, difficulty: 5 },
  { id: '32M1al-Y6Ag', title: 'Node.js Tutorial for Beginners', channel: 'Programming with Mosh', tags: ['nodejs', 'node', 'backend', 'javascript', 'server'], durationMins: 60, difficulty: 4 },
  { id: 'ENrzD9HAZK4', title: 'Node.js in 100 Seconds', channel: 'Fireship', tags: ['nodejs', 'node', 'backend', 'overview'], durationMins: 2, difficulty: 4 },

  // ── GO & RUST ────────────────────────────────────────────────────────────────
  { id: 'YS4e4q9oBaU', title: 'Go Programming – Golang Course with Bonus Projects', channel: 'freeCodeCamp.org', tags: ['go', 'golang', 'backend', 'systems', 'programming'], durationMins: 450, difficulty: 5, alignment: 'Go Mastery' },
  { id: '446E-r0rXIE', title: 'Go in 100 Seconds', channel: 'Fireship', tags: ['go', 'golang', 'backend', 'overview'], durationMins: 2, difficulty: 4 },
  { id: 'BpPEoZW5IiY', title: 'Rust Programming Course for Beginners', channel: 'freeCodeCamp.org', tags: ['rust', 'systems', 'memory safety', 'programming', 'backend'], durationMins: 860, difficulty: 7, alignment: 'Systems Programming' },
  { id: '5C_HPTJg5ek', title: 'Rust in 100 Seconds', channel: 'Fireship', tags: ['rust', 'overview', 'systems'], durationMins: 2, difficulty: 6 },

  // ── COMPUTER SCIENCE FUNDAMENTALS ────────────────────────────────────────────
  { id: 'zOjov-2OZ0E', title: 'Introduction to Programming and Computer Science', channel: 'freeCodeCamp.org', tags: ['computer science', 'programming', 'fundamentals', 'introduction', 'cs', 'basics'], durationMins: 75, difficulty: 1, alignment: 'CS101 Intro' },
  { id: 'tpIctyqH29Q', title: 'Map of Computer Science', channel: 'Domain of Science', tags: ['computer science', 'overview', 'map', 'fields', 'cs'], durationMins: 11, difficulty: 3 },
  { id: '8JJ101D3knE', title: 'Python for Beginners', channel: 'Programming with Mosh', tags: ['programming', 'beginner', 'introduction', 'basics', 'logic'], durationMins: 75, difficulty: 2 },

  // ── DESIGN PATTERNS ──────────────────────────────────────────────────────────
  { id: 'tv-_1er1mWI', title: 'Design Patterns in Plain English', channel: 'Programming with Mosh', tags: ['design patterns', 'oop', 'software design', 'architecture', 'solid', 'factory', 'observer', 'singleton'], durationMins: 80, difficulty: 6, alignment: 'Gang of Four' },
  { id: 'AGmY9P-yKDQ', title: 'SOLID Design Principles', channel: 'Web Dev Simplified', tags: ['solid', 'design principles', 'oop', 'software design', 'clean code'], durationMins: 34, difficulty: 5 },

  // ── WEB PERFORMANCE ──────────────────────────────────────────────────────────
  { id: 'H9K_E54E4ks', title: 'Web Performance Fundamentals', channel: 'freeCodeCamp.org', tags: ['web performance', 'optimization', 'loading', 'core web vitals', 'speed'], durationMins: 60, difficulty: 5 },

  // ── EVENT LOOP / ASYNC ───────────────────────────────────────────────────────
  { id: '8aGhZQkoFbQ', title: 'What the heck is the event loop?', channel: 'JSConf', tags: ['event loop', 'javascript', 'async', 'callback', 'concurrency', 'runtime'], durationMins: 26, difficulty: 6 },
  { id: 'PoRJizOs7zs', title: 'JavaScript Promises - Explained for Beginners', channel: 'Web Dev Simplified', tags: ['promises', 'async', 'await', 'asynchronous', 'javascript', 'fetch'], durationMins: 24, difficulty: 4 },

  // ── MACHINE LEARNING, MATH & AI ──────────────────────────────────────────────
  { id: 'KNAWp2S3w94', title: 'Machine Learning for Everybody', channel: 'freeCodeCamp.org', tags: ['machine learning', 'ml', 'ai', 'artificial intelligence', 'model', 'data science'], durationMins: 214, difficulty: 5, alignment: 'ML Intro' },
  { id: 'aircAruvnKk', title: 'But what is a neural network?', channel: '3Blue1Brown', tags: ['neural network', 'deep learning', 'machine learning', 'ai', 'backpropagation'], durationMins: 19, difficulty: 7, alignment: 'Deep Learning' },
  { id: 'fNk_zzaMoEs', title: 'Essence of Linear Algebra', channel: '3Blue1Brown', tags: ['linear algebra', 'math', 'vectors', 'matrices', 'determinant', 'eigenvalues', 'calculus'], durationMins: 15, difficulty: 6, alignment: 'Math for ML' },
  { id: 'k7RM-yulbDY', title: 'Vectors | Essence of Linear Algebra', channel: '3Blue1Brown', tags: ['linear algebra', 'vectors', 'math', 'coordinate system', 'ml'], durationMins: 11, difficulty: 5 },
  { id: 'WUvTyaaNkzM', title: 'Essence of Calculus', channel: '3Blue1Brown', tags: ['calculus', 'math', 'derivatives', 'integrals', 'essence', 'limits'], durationMins: 17, difficulty: 6 },
  { id: '7UJt_KqYrFY', title: 'MIT Linear Algebra Lectures', channel: 'MIT OpenCourseWare', tags: ['linear algebra', 'math', 'matrices', 'vectors', 'systems of equations', 'mit'], durationMins: 45, difficulty: 7, alignment: 'MIT 18.06' },

  // ── LINUX / BASH ─────────────────────────────────────────────────────────────
  { id: 'oxuRxtrO2Ag', title: 'Linux Command Line Full Course', channel: 'freeCodeCamp.org', tags: ['linux', 'bash', 'command line', 'terminal', 'shell', 'unix'], durationMins: 280 },

  // ── NETWORKING ───────────────────────────────────────────────────────────────
  { id: '9GZlVOafYTg', title: 'Computer Networking Full Course', channel: 'freeCodeCamp.org', tags: ['networking', 'tcp/ip', 'http', 'dns', 'protocol', 'internet', 'network'], durationMins: 396 },

  // ── DOCKER, KUBERNETES & AWS CLOUD ───────────────────────────────────────────
  { id: 'JiD78s_fI-I', title: 'AWS in 100 Seconds', channel: 'Fireship', tags: ['aws', 'cloud', 'amazon', 'overview', 'infrastructure', 'cloud practitioner'], durationMins: 2 },
  { id: '3hLmDS179YE', title: 'AWS Certified Cloud Practitioner Certification Course', channel: 'freeCodeCamp.org', tags: ['aws', 'cloud', 'amazon web services', 'practitioner', 'sysops', 'devops'], durationMins: 380 },
  { id: 'fqMOX6JJhGo', title: 'Docker Tutorial for Beginners - Full Course', channel: 'freeCodeCamp.org', tags: ['docker', 'containers', 'devops', 'containerization', 'deployment'], durationMins: 180 },
  { id: 'Pz5cMtbAMu0', title: 'Kubernetes in 100 Seconds', channel: 'Fireship', tags: ['kubernetes', 'k8s', 'cloud', 'containers', 'devops'], durationMins: 2 },
  { id: '4D3X6Xlh5_Q', title: 'Google Cloud Platform in 100 Seconds', channel: 'Fireship', tags: ['gcp', 'google cloud', 'cloud', 'infrastructure', 'devops'], durationMins: 2 },
  { id: 'Y07G3N9_L_0', title: 'Microsoft Azure in 100 Seconds', channel: 'Fireship', tags: ['azure', 'cloud', 'microsoft', 'infrastructure', 'devops'], durationMins: 2 },

  // ── VUE / ANGULAR ────────────────────────────────────────────────────────────
  { id: '4deVCNJq3qc', title: 'Vue JS Crash Course', channel: 'Traversy Media', tags: ['vue', 'vuejs', 'frontend', 'framework', 'javascript'], durationMins: 110 },
  { id: 'k5E2AVpwsko', title: 'Angular Tutorial for Beginners', channel: 'Programming with Mosh', tags: ['angular', 'frontend', 'framework', 'typescript', 'spa'], durationMins: 120 },

  // ── JAVA ────────────────────────────────────────────────────────────────────
  { id: 'eIrMbAQSU34', title: 'Java Tutorial for Beginners', channel: 'Programming with Mosh', tags: ['java', 'oop', 'object-oriented', 'programming', 'beginner'], durationMins: 150 },

  // ── SYSTEM DESIGN ────────────────────────────────────────────────────────────
  { id: 'm8Icp_Cid5o', title: 'System Design for Beginners', channel: 'freeCodeCamp.org', tags: ['system design', 'scalability', 'architecture', 'load balancer', 'microservices', 'distributed'], durationMins: 60 },

  // ── OPERATING SYSTEMS ────────────────────────────────────────────────────────
  { id: 'vBURTt97EkA', title: 'Operating Systems - Full Course', channel: 'freeCodeCamp.org', tags: ['operating system', 'os', 'processes', 'threads', 'memory', 'scheduling'], durationMins: 420 },

  // ── TESTING ──────────────────────────────────────────────────────────────────
  { id: 'FgnxcUQ5vho', title: 'JavaScript Testing Tutorial', channel: 'Web Dev Simplified', tags: ['testing', 'jest', 'javascript', 'unit testing', 'tdd'], durationMins: 45 },
  { id: '7r4xVDI2vho', title: 'Cypress End-to-End Testing', channel: 'freeCodeCamp.org', tags: ['testing', 'cypress', 'e2e', 'automation', 'qa'], durationMins: 180 },
];

const SYNONYM_MAP: Record<string, string[]> = {
  'ml': ['machine learning', 'artificial intelligence', 'ai', 'neural network'],
  'ai': ['machine learning', 'ml', 'neural network', 'deep learning'],
  'js': ['javascript', 'es6'],
  'ts': ['typescript'],
  'k8s': ['kubernetes'],
  'ui': ['user interface', 'design', 'ux', 'css'],
  'ux': ['user experience', 'design', 'ui'],
  'oop': ['object oriented', 'object-oriented', 'classes', 'java', 'c++'],
  'dsa': ['data structures', 'algorithms'],
  'api': ['rest', 'backend', 'server', 'nodejs', 'express'],
  'rest': ['api', 'backend', 'express'],
  'db': ['database', 'sql', 'nosql', 'mongodb', 'postgresql'],
  'frontend': ['react', 'vue', 'angular', 'html', 'css', 'javascript', 'nextjs'],
  'backend': ['nodejs', 'express', 'python', 'go', 'java', 'sql', 'api'],
  'serverless': ['aws', 'lambda', 'cloud', 'functions'],
};

// Pre-processed library for performance
const PROCESSED_LIBRARY = CURATED_VIDEO_LIBRARY.map(video => {
  const titleLower = video.title.toLowerCase();
  const tagsLower = video.tags.map(t => t.toLowerCase());
  return {
    original: video,
    titleLower,
    tagsLower,
    tagsLowerSet: new Set(tagsLower),
    titleWordsSet: new Set(titleLower.split(/[\s\-():&]+/)),
    tagsJoinedLower: tagsLower.join(' ')
  };
});

const STOPWORDS = new Set(['for', 'and', 'the', 'with', 'from', 'your', 'this', 'that', 'its', 'how', 'what', 'why', 'who', 'get', 'can', 'are', 'not', 'you', 'our', 'out', 'off', 'has', 'had', 'was', 'were', 'but', 'into', 'than', 'then', 'them', 'they', 'some', 'any', 'new', 'old', 'one', 'two', 'use', 'via', 'how', 'why', 'who', 'few', 'own', 'now', 'all']);

// Hard blocklist logic to enforce topic lock
const TECH_FAMILIES = [
  { key: 'python', blocks: ['javascript', 'js', 'react', 'css', 'html', 'angular', 'vue', 'java', 'typescript', 'ts', 'node'] },
  { key: 'javascript', blocks: ['python', 'java', 'c++', 'ruby', 'php', 'go', 'rust'] },
  { key: 'js', blocks: ['python', 'java', 'c++', 'ruby', 'php', 'go', 'rust'] },
  { key: 'react', blocks: ['python', 'angular', 'vue', 'java', 'c++', 'go', 'rust'] },
  { key: 'html', blocks: ['python', 'java', 'c++', 'sql', 'database', 'go', 'rust'] },
  { key: 'css', blocks: ['python', 'java', 'c++', 'sql', 'database', 'go', 'rust'] },
  { key: 'sql', blocks: ['html', 'css', 'react', 'javascript', 'js'] },
  { key: 'aws', blocks: ['javascript', 'js', 'react', 'css', 'html', 'angular', 'vue', 'java', 'typescript', 'ts', 'node', 'python'] },
  { key: 'cloud', blocks: ['javascript', 'js', 'react', 'css', 'html', 'angular', 'vue', 'java', 'typescript', 'ts', 'node', 'python'] },
  { key: 'go', blocks: ['python', 'javascript', 'js', 'react', 'html', 'css'] },
  { key: 'rust', blocks: ['python', 'javascript', 'js', 'react', 'html', 'css'] },
];

const ELITE_SCHOLARLY_CHANNELS = new Set([
  '3Blue1Brown', 'MIT OpenCourseWare', 'Domain of Science', 'JSConf', 'Computerphile', 'Two Minute Papers'
]);

// Helper to expand keywords with synonyms
function expandKeywords(keywords: string[]): string[] {
  const expanded = new Set(keywords);
  keywords.forEach(kw => {
    if (SYNONYM_MAP[kw]) {
      SYNONYM_MAP[kw].forEach(syn => expanded.add(syn));
    }
  });
  return Array.from(expanded);
}

function searchLibrary(
  keywords: string[],
  t: string,
  loweredInterests: string[],
  complexity: string,
  blocklist: string[]
): { video: CuratedVideo; score: number }[] {
  return PROCESSED_LIBRARY.map(pv => {
    const video = pv.original;
    let score = 0;
    const title = pv.titleLower;
    const tags = pv.tagsJoinedLower;

    // STRICT BLOCKLIST ENFORCEMENT
    let isBlocked = false;
    for (let i = 0; i < blocklist.length; i++) {
      const blocked = blocklist[i];
      if (tags.includes(blocked) || title.includes(blocked)) {
        isBlocked = true;
        break;
      }
    }

    if (isBlocked) {
      for (let i = 0; i < keywords.length; i++) {
        if (title.includes(keywords[i])) {
          isBlocked = false;
          break;
        }
      }
    }

    if (isBlocked) return { video, score: -1 };

    // Focused Phrase Match (+15)
    if (t && title.indexOf(t) !== -1) score += 15;

    // Strict keyword match required
    let keywordMatch = false;
    let titleWords: string[] | null = null;
    let loweredTags: string[] | null = null;

    for (let i = 0; i < keywords.length; i++) {
      const kw = keywords[i];
      const isShort = kw.length <= 2;
      
      let matchesTitle = false;
      if (isShort) {
        if (!titleWords) titleWords = title.split(/[\s\-():&]+/);
        matchesTitle = titleWords.includes(kw);
      } else {
        matchesTitle = title.includes(kw);
      }

      let matchesTag = false;
      if (!loweredTags) {
        loweredTags = Array.from(pv.tagsLowerSet);
      }
      if (isShort) {
        matchesTag = loweredTags.includes(kw);
      } else {
        for (let j = 0; j < loweredTags.length; j++) {
          if (loweredTags[j].includes(kw)) {
            matchesTag = true;
            break;
          }
        }
      }

      if (matchesTitle) {
        score += 10;
        keywordMatch = true;
      } else if (matchesTag) {
        score += 8; // Increased subtopic matching weight
        keywordMatch = true;
      }
    }

    // Interest alignment
    let interestBoost = 0;
    for (let i = 0; i < loweredInterests.length; i++) {
      const interest = loweredInterests[i];
      if (title.includes(interest) || tags.includes(interest)) {
        interestBoost += 5; // Reduced slightly so interests don't overpower direct matches
      }
    }

    if (keywordMatch || (t && title.includes(t))) {
      score += interestBoost;
    } else {
      score = 0;
    }

    // Pedagogical Accuracy Sync
    if (score > 0) {
      // 1. Complexity-Aware Difficulty Match
      if (video.difficulty) {
        if (complexity === 'spark' || complexity === 'snapshot') {
          if (video.difficulty <= 3) score *= 1.6; // Heavy boost for easy intros
          if (video.difficulty >= 7) score *= 0.4; // Heavy penalty for overly advanced
        } else if (complexity === 'mastery' || complexity === 'infinite') {
          if (video.difficulty >= 6) score *= 1.6; // Heavy boost for deep dives
          if (video.difficulty <= 2) score *= 0.5; // Penalty for too basic
        }
      }

      // 2. Duration Suitability
      if (complexity === 'spark' || complexity === 'snapshot') {
        if (video.durationMins <= 5) score *= 1.3;
        if (video.durationMins > 45) score *= 0.6;
      } else if (complexity === 'mastery' || complexity === 'infinite') {
        if (video.durationMins >= 45) score *= 1.4;
        if (video.durationMins < 10) score *= 0.6;
      }

      // 3. Curriculum Alignment Boost
      if (video.alignment) {
        score *= 1.25; // Academic alignment is a strong quality signal
      }

      // 4. Elite Channel Weighting
      if (ELITE_SCHOLARLY_CHANNELS.has(video.channel)) {
        score *= 1.3;
      }
    }

    return { video, score };
  });
}

export function getVideosByTopic(
  topic: string, 
  limit = 5, 
  userInterests: string[] = [], 
  complexity: string = 'overview',
  preferredVoice?: 'theoretical' | 'practical'
): CuratedVideo[] {
  if (!topic || !topic.trim()) {
    return [];
  }
  const t = topic.toLowerCase();
  let keywords = t.split(/[\s-]+/).filter(w => w.length >= 2 && !STOPWORDS.has(w));
  
  // Apply synonym expansion
  keywords = expandKeywords(keywords);

  const keywordSet = new Set(keywords);

  // Use Set to avoid duplicates and fast lookup
  const blocklistSet = new Set<string>();
  for (const family of TECH_FAMILIES) {
    if (keywordSet.has(family.key) || t.includes(family.key)) {
      for (const block of family.blocks) {
        blocklistSet.add(block);
      }
    }
  }
  const blocklist = Array.from(blocklistSet);
  const loweredInterests = userInterests.map(i => i.toLowerCase());

  let scored = searchLibrary(keywords, t, loweredInterests, complexity, blocklist);
  let results = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score);

  // Semantic Fallback Broadening: If 0 results, try dropping the least important keywords
  if (results.length === 0 && keywords.length > 1) {
    // Try matching with just the first keyword (usually the primary tech, e.g., "react" from "react suspense")
    const fallbackKeywords = [keywords[0]];
    const fallbackScored = searchLibrary(fallbackKeywords, fallbackKeywords[0], loweredInterests, complexity, blocklist);
    results = fallbackScored.filter(s => s.score > 0).sort((a, b) => b.score - a.score);
  }

  // Second Fallback: If still 0 results, see if any of the keywords trigger a TECH_FAMILY and just return top results for that family
  if (results.length === 0) {
     for(const kw of keywords) {
       const family = TECH_FAMILIES.find(f => f.key === kw);
       if(family) {
         const familyScored = searchLibrary([family.key], family.key, loweredInterests, complexity, blocklist);
         results = familyScored.filter(s => s.score > 0).sort((a, b) => b.score - a.score);
         break;
       }
     }
  }

  return results
    .slice(0, limit)
    .map(s => s.video);
}
