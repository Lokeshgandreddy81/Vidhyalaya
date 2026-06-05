export interface PreviewModule {
  title: string;
  description: string;
}

export interface PreviewPhase {
  title: string;
  description: string;
  modules: PreviewModule[];
}

export interface RoadmapPreview {
  title: string;
  description: string;
  phases: PreviewPhase[];
  metadata: {
    duration: string;
    level: string;
    modulesCount: number;
  };
}

export const roadmapPreviews: Record<string, RoadmapPreview> = {
  'Frontend': {
    title: 'Frontend Developer Roadmap',
    description: 'Master the art of building highly interactive, accessible, and performant user interfaces from scratch using React, TypeScript, and modern styling architectures.',
    metadata: { duration: '120 Hours', level: 'Beginner to Advanced', modulesCount: 9 },
    phases: [
      {
        title: 'Phase 1: Modern Web Core',
        description: 'Establish absolute fluency in browser mechanics and vanilla language structures.',
        modules: [
          { title: 'HTML5 Semantic Architecture', description: 'Semantic structure, SEO, schema tags, and WAI-ARIA accessibility foundation.' },
          { title: 'CSS Layouts & Responsive Systems', description: 'Grid, Flexbox, layout flow, responsive media queries, and Tailwind CSS utility workflows.' },
          { title: 'Modern JavaScript (ES6+)', description: 'Closures, prototype chain, event loop, Promises, async/await, and DOM manipulation.' }
        ]
      },
      {
        title: 'Phase 2: React Component Engineering',
        description: 'Transition from vanilla scripts to reactive state-driven interfaces.',
        modules: [
          { title: 'React Core Principles', description: 'Virtual DOM, component lifecycles, JSX compilation, and props/state dynamics.' },
          { title: 'Advanced React Hooks', description: 'Custom hook creation, memoization (useMemo, useCallback), and state coordination via Context/Zustand.' },
          { title: 'Single Page Routing & Build Tools', description: 'Declarative routing (React Router) and bundler mechanics (Vite, Rollup).' }
        ]
      },
      {
        title: 'Phase 3: Production & Performance',
        description: 'Optimize Web Vitals, compile for scaling production, and enforce static types.',
        modules: [
          { title: 'TypeScript Integration', description: 'Strict typing interfaces, generics, discriminated unions, and React typings.' },
          { title: 'Performance Optimization & Core Web Vitals', description: 'Lazy loading, code splitting, image optimization, CLS, LCP, and FID analysis.' },
          { title: 'Testing & Validation Systems', description: 'Component unit testing with Vitest/Jest and end-to-end user flows with Playwright.' }
        ]
      }
    ]
  },
  'Backend': {
    title: 'Backend Developer Roadmap',
    description: 'Architect scale-resilient, secure APIs and servers. Master Go, database optimization, caching layers, and microservice communications.',
    metadata: { duration: '150 Hours', level: 'Intermediate to Advanced', modulesCount: 9 },
    phases: [
      {
        title: 'Phase 1: Architecture & Language',
        description: 'Master backend fundamentals, concurrency models, and clean server setups.',
        modules: [
          { title: 'Backend Runtime Selection', description: 'Language characteristics of Go/Node.js, standard libraries, and dependency managers.' },
          { title: 'Concurreny & Parallelism', description: 'Goroutines, channels, thread safety, event loop concurrency, and job queues.' },
          { title: 'RESTful API & Routing Standards', description: 'Router design, middleware design patterns, CORS, and request validations.' }
        ]
      },
      {
        title: 'Phase 2: Data Persistence & Engines',
        description: 'Design robust database layouts, optimize indexes, and enforce transactions.',
        modules: [
          { title: 'Relational Database Schema Design', description: 'Data normalization, SQL keys, indexing, and EXPLAIN query analysis.' },
          { title: 'Database Transactions & Integrity', description: 'ACID properties, isolation levels (Read Committed, Serializable), and deadlock resolution.' },
          { title: 'NoSQL & Document Stores', description: 'Key-value stores (Redis), document structures (MongoDB), and horizontal sharding.' }
        ]
      },
      {
        title: 'Phase 3: APIs, Caching & Scaling',
        description: 'Secure, cache, and scale data transmission layers.',
        modules: [
          { title: 'Backend Caching Strategies', description: 'Cache-aside, write-through patterns, TTL management, and Redis cluster deployment.' },
          { title: 'API Security & Cryptography', description: 'JWT signature mechanics, Bcrypt hashing, OAuth2 workflows, and rate limiting.' },
          { title: 'Message Brokers & Queues', description: 'Event-driven architectures using RabbitMQ/Kafka for decoupled microservice pipelines.' }
        ]
      }
    ]
  },
  'DevOps': {
    title: 'DevOps & Platform Engineering Roadmap',
    description: 'Bridge the gap between deployment and development. Master Docker, Kubernetes, CI/CD pipelines, and Infrastructure as Code.',
    metadata: { duration: '180 Hours', level: 'Intermediate to Expert', modulesCount: 9 },
    phases: [
      {
        title: 'Phase 1: Infrastructure Foundations',
        description: 'Learn system administration, virtualization, and containerization.',
        modules: [
          { title: 'Linux Systems & Scripting', description: 'File permissions, process management, bash scripting, and networking configurations.' },
          { title: 'Containerization with Docker', description: 'Dockerfile design, multi-stage builds, layers caching, and Docker Compose environments.' },
          { title: 'CI/CD Pipeline Automation', description: 'GitHub Actions, GitLab CI, artifact registries, and automated test runners.' }
        ]
      },
      {
        title: 'Phase 2: Orchestration & Scaling',
        description: 'Deploy workloads dynamically using enterprise-grade cluster managers.',
        modules: [
          { title: 'Kubernetes Core Concepts', description: 'Pods, ReplicaSets, Deployments, Services, and cluster control-plane mechanics.' },
          { title: 'Kubernetes Ingress & Configs', description: 'ConfigMaps, Secrets, Ingress controllers (Nginx, Traefik), and Persistent Volumes.' },
          { title: 'Helm Package Manager', description: 'Template structures, values configuration, chart dependencies, and release controls.' }
        ]
      },
      {
        title: 'Phase 3: Infrastructure as Code & Observability',
        description: 'Automate physical architectures and build deep monitoring coverage.',
        modules: [
          { title: 'Terraform IaC', description: 'Declarative configs, state management, backend locking, providers, and modules.' },
          { title: 'Metrics Monitoring & Prometheus', description: 'PromQL, metric exporters, Alertmanager rules, and Grafana dashboard design.' },
          { title: 'Log Aggregation & Distributed Tracing', description: 'Log collection (Fluentbit/Loki) and telemetry tracing with OpenTelemetry.' }
        ]
      }
    ]
  },
  'AI Engineer': {
    title: 'AI Engineer Roadmap',
    description: 'Transform generative intelligence models into production solutions. Master LLM prompts, Vector Databases, RAG pipelines, and AI Agents.',
    metadata: { duration: '140 Hours', level: 'Intermediate to Advanced', modulesCount: 9 },
    phases: [
      {
        title: 'Phase 1: ML & Python Foundations',
        description: 'Formulate core statistical thinking and computational mechanics.',
        modules: [
          { title: 'Python for AI & Math Vectors', description: 'NumPy array calculations, Pandas data structures, and mathematical matrices.' },
          { title: 'Supervised & Unsupervised Learning', description: 'Linear regression, classification models, clustering, and evaluation metrics.' },
          { title: 'Deep Learning Core Principles', description: 'Neural networks, activation functions, backpropagation, and PyTorch basics.' }
        ]
      },
      {
        title: 'Phase 2: Large Language Models & Grounding',
        description: 'Leverage LLMs and connect them to dynamic external databases.',
        modules: [
          { title: 'Prompt Engineering & System Directives', description: 'Few-shot learning, Chain of Thought prompting, and structure enforcement.' },
          { title: 'Vector Embeddings & Embed Database Systems', description: 'Cosine similarity, embedding models, and Vector DBs (ChromaDB, Pinecone, pgvector).' },
          { title: 'Retrieval Augmented Generation (RAG)', description: 'Semantic search, document splitting strategies, indexing, and reranking pipelines.' }
        ]
      },
      {
        title: 'Phase 3: AI Agents & Deployment',
        description: 'Construct autonomous decision loops that invoke external tools.',
        modules: [
          { title: 'Agentic Frameworks (LangChain & LlamaIndex)', description: 'Chains, memory structures, router components, and callback systems.' },
          { title: 'Tool Calling & ReAct Loops', description: 'Instructing models to output structured API arguments and parse returns.' },
          { title: 'AI Orchestration & Guardrails', description: 'Input/output validation, toxic content filters, rate limit handling, and cost monitoring.' }
        ]
      }
    ]
  },
  'System Design': {
    title: 'System Design & Software Architect Roadmap',
    description: 'Learn to design web applications at hyper-scale. Master caching topologies, sharding, message queuing, and service isolation.',
    metadata: { duration: '160 Hours', level: 'Advanced to Expert', modulesCount: 9 },
    phases: [
      {
        title: 'Phase 1: High Availability Core',
        description: 'Learn basic components that manage scaling loads.',
        modules: [
          { title: 'Load Balancing & Gateway Routing', description: 'DNS round-robin, proxy models, load balancing algorithms, and API gateway routing.' },
          { title: 'Caching Topologies', description: 'Cache-aside, write-through, CDN edge networks, and cache eviction policies (LRU).' },
          { title: 'Database Sharding & Replication', description: 'Horizontal sharding, master-slave replication, consistent hashing, and split-brain resolution.' }
        ]
      },
      {
        title: 'Phase 2: Distributed Synchronization',
        description: 'Govern state, coordinate pipelines, and align asynchronous event streams.',
        modules: [
          { title: 'Distributed Messaging & Event Streaming', description: 'Message brokers (RabbitMQ) vs log-structured streams (Apache Kafka).' },
          { title: 'CAP Theorem & Consistency Models', description: 'ACID vs BASE, strong consistency vs eventual consistency, and Paxos/Raft consensus.' },
          { title: 'Distributed ID Generation & Unique Keys', description: 'UUIDs, Snowflake algorithms, and database auto-increment offsets.' }
        ]
      },
      {
        title: 'Phase 3: Microservice Resilience',
        description: 'Architect failure isolation and trace performance bottlenecks.',
        modules: [
          { title: 'Fault Tolerance & Isolation', description: 'Circuit breakers, rate limiting, token bucket algorithms, and graceful degradation.' },
          { title: 'Distributed Transactions & Saga Pattern', description: 'Two-phase commit, orchestrator Saga vs choreographic Saga.' },
          { title: 'Distributed Tracing & Service Mesh', description: 'Jaeger logs tracking, sidecar proxy models (Envoy, Istio), and circuit health metrics.' }
        ]
      }
    ]
  },
  'SQL': {
    title: 'SQL & Database Design Roadmap',
    description: 'Learn query language, relational schemas, indexing optimization, and transaction mechanics.',
    metadata: { duration: '90 Hours', level: 'Beginner to Intermediate', modulesCount: 6 },
    phases: [
      {
        title: 'Phase 1: Relational Basics',
        description: 'Learn schemas, table relations, and basic querying.',
        modules: [
          { title: 'Relational Database Schema Design', description: 'Primary keys, foreign keys, normalization (1NF, 2NF, 3NF), and schemas.' },
          { title: 'Query syntax & CRUD operations', description: 'SELECT, INSERT, UPDATE, DELETE statements, and basic JOIN types.' },
          { title: 'Aggregate functions & grouping', description: 'GROUP BY, HAVING, COUNT, SUM, AVG, and sorting filters.' }
        ]
      },
      {
        title: 'Phase 2: Advanced Queries',
        description: 'Master complex queries, subqueries, and window functions.',
        modules: [
          { title: 'Subqueries & CTEs', description: 'Correlated subqueries, nested SELECTs, and Common Table Expressions (WITH statements).' },
          { title: 'Window Functions', description: 'ROW_NUMBER(), RANK(), DENSE_RANK(), and partition filters.' },
          { title: 'Database Optimization & Indexes', description: 'EXPLAIN plans, indexes (B-Tree, Hash), and query optimization.' }
        ]
      }
    ]
  }
};
