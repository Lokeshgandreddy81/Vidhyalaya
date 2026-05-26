import React from 'react';
import {
  ArrowRight,
} from 'lucide-react';

const imageBase = '/images/';

const navItems = [
  { label: 'About', id: 'ways' },
  { label: 'Features', id: 'work' },
  { label: 'Learn', id: 'learning' },
  { label: 'Cortex', id: 'surfaces' },
  { label: 'Business', id: 'teams' },
  { label: 'Pricing', id: 'learning' },
  { label: 'Download', id: 'final' },
];

const trustItems = ['Students', 'Builders', 'Educators', 'Campuses'];

const agentWays = [
  {
    title: 'Built to drive real learning work',
    body: 'From a single goal to a full path, Cortex turns syllabi, notes, sources, and constraints into reviewable learning work.',
  },
  {
    title: 'Designed for multi-agent learning workflows',
    body: 'Coordinate research, planning, source review, synthesis, assessment, and follow-up without losing the learner context.',
  },
  {
    title: 'Adapts to how your team learns',
    body: 'Use one command surface across students, builders, educators, campuses, and teams working from different standards.',
  },
  {
    title: 'Made for always-on background learning work',
    body: 'Let Cortex refresh context, find gaps, prepare next steps, and keep important learning work moving between sessions.',
  },
  {
    title: 'Turns builders into faster learners',
    body: 'Prototype lessons, study systems, whiteboards, docs, and practice flows while keeping every artifact tied to the path.',
  },
  {
    title: 'Raises the bar across your learning team',
    body: 'Cortex makes planning, review, verification, and reuse visible, so every session raises the baseline for the next one.',
  },
];

const workItems = [
  {
    title: 'Your research assistant',
    body: 'Give Cortex the syllabus, notes, links, decisions, and constraints behind the task. It works from the materials that actually shape the learning job.',
    image: `${imageBase}cortex-prerequisite-alignment.png`,
    imageAlt: 'Cortex planning scene with prerequisite alignment',
    imageFit: 'contain',
  },
  {
    title: 'Get finished learning work back',
    body: 'Create study guides, worksheets, briefs, visuals, quizzes, messages, plans, and path changes that are ready to review and use.',
    image: `${imageBase}cortex-study-guide-jsx.png`,
    imageAlt: 'Cortex generated study guide artifact for JSX and components',
    imageFit: 'contain',
  },
  {
    title: 'Make good learning work repeatable',
    body: 'For recurring learning work, Cortex gathers the latest context and turns proven workflows into updates, summaries, follow-ups, and reusable changes.',
    image: `${imageBase}cortex-archive-books.png`,
    imageAlt: 'Cortex archive capacity and mastery bookshelf scene',
    imageFit: 'contain',
  },
  {
    title: 'For the work learners do every day',
    body: 'Use Cortex for syllabus breakdowns, exam prep, project paths, technical deep dives, classroom updates, concept maps, quizzes, and follow-ups.',
    image: `${imageBase}cortex-learners-every-day.png`,
    imageAlt: 'Cortex learner work surface with whiteboard, neural map, and chat panel',
    imageFit: 'contain',
  },
  {
    title: 'You stay in control',
    body: 'Cortex keeps sources, assumptions, changes, and next steps visible so learners, teachers, and teams can review the work before it moves forward.',
    image: `${imageBase}cortex-grounded-sources.png`,
    imageAlt: 'Cortex grounded sources and operating context scene',
    imageFit: 'contain',
  },
];

const workspaceModes = [
  {
    title: 'Plus',
    body: 'Includes Cortex usage for focused learning sessions each week.',
    price: '₹1,999',
    meta: '/ month',
    cta: 'Get Plus',
  },
  {
    title: 'Pro',
    body: 'Higher usage limits to power full study days across multiple paths.',
    prefix: 'From',
    price: '₹10,699',
    meta: '/ month',
    cta: 'Get Pro',
  },
  {
    title: 'Business',
    body: 'Secure, shared workspace with admin controls and flexible pricing for teams using Cortex across learning systems.',
    price: '₹2,250',
    meta: '/ user / month',
    cta: 'Try Cortex Business',
  },
];

const surfaceCards = [
  {
    title: 'Start in the Cortex app',
    body: 'Plan, inspect, and continue learning paths from one command surface.',
    image: `${imageBase}codex-surface-app.png`,
  },
  {
    title: 'Move to your editor',
    body: 'Turn active study into whiteboards, notes, quizzes, and reviewable changes.',
    image: `${imageBase}codex-surface-classroom.png`,
  },
  {
    title: 'Keep going in the terminal',
    body: 'Preserve sources, artifacts, and next steps so context follows the work.',
    image: `${imageBase}codex-surface-archive.png`,
  },
];

const teamCards = [
  {
    mark: '>_learn|',
    title: 'Ship better learning, faster',
    body: 'Automate path reviews and continuously scan for knowledge gaps.',
  },
  {
    title: 'Built for how your team works',
    body: 'Run agent workflows locally, in the cloud, or plug into your existing learning tools.',
  },
  {
    title: 'Enterprise-ready',
    body: 'Advanced analytics, integrations, and full security controls.',
  },
];

const footerGroups = [
  {
    title: 'Cortex',
    links: ['Research', 'Safety', 'API', 'News'],
  },
  {
    title: 'Terms & Policies',
    links: ['Terms of Use', 'Privacy Policy', 'Usage Policy', 'Other policies'],
  },
];

const openApp = () => {
  window.location.hash = '/dashboard';
};

const scrollTo = (id) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const CortexLogoMark = ({ className = '' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="10" strokeDasharray="3 3" className="cortex-logo-orbit" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    <path d="M2 12a15.3 15.3 0 0 1 10-4 15.3 15.3 0 0 1 10 4 15.3 15.3 0 0 1-10 4 15.3 15.3 0 0 1-10-4z" />
    <circle cx="12" cy="12" r="2.2" className="cortex-logo-core" />
  </svg>
);

const Logo = () => (
  <button className="landing-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
    <span className="landing-logo-symbol">
      <CortexLogoMark className="landing-logo-mark" />
    </span>
    <span>Cortex</span>
  </button>
);

const AgentWayCard = ({ card, index }) => (
  <article className="agent-way-card">
    <span>{String(index + 1).padStart(2, '0')}</span>
    <h3>{card.title}</h3>
    <p>{card.body}</p>
  </article>
);

const WorkItem = ({ item, index }) => (
  <section className={`work-story ${index % 2 === 1 ? 'work-story-reverse' : ''}`}>
    <div className="work-story-copy">
      <h3>{item.title}</h3>
      <p>{item.body}</p>
    </div>
    <div className={`work-story-visual ${item.imageFit === 'contain' ? 'work-story-visual-contain' : ''}`}>
      <img src={item.image} alt={item.imageAlt} />
    </div>
  </section>
);

const Home = () => (
  <div className="codex-page">
    <header className="landing-header">
      <Logo />
      <nav className="landing-nav" aria-label="Main navigation">
        {navItems.map((item) => (
          <button key={item.label} onClick={() => scrollTo(item.id)}>
            {item.label}
          </button>
        ))}
      </nav>
      <div className="header-actions">
        <button className="ghost-pill" onClick={() => scrollTo('teams')}>Contact sales</button>
        <button className="dark-pill" onClick={openApp}>Log in</button>
      </div>
    </header>

    <main>
      <section className="hero-shell">
        <div className="hero-content">
          <div className="hero-app-icon" aria-hidden="true">
            <CortexLogoMark className="hero-logo-mark" />
          </div>
          <h1>Cortex</h1>
          <p>Your AI assistant for learning.</p>
          <div className="hero-actions" aria-label="Primary Cortex actions">
            <button className="hero-primary" onClick={openApp}>
              Start learning
              <ArrowRight size={15} />
            </button>
          </div>
          <div className="hero-loading" aria-label="Cortex product preview loading">Loading</div>
          <div className="trusted-section hero-trust" aria-label="Trusted learning teams">
            <p>Trusted by top learning teams</p>
            <div className="trust-row">
              {trustItems.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="ways" className="ways-section">
        <h2>The best way to learn with agents</h2>
        <div className="agent-way-grid">
          {agentWays.map((card, index) => (
            <AgentWayCard key={card.title} card={card} index={index} />
          ))}
        </div>
      </section>

      <section id="work" className="work-section">
        <h2>Get work done faster</h2>
        {workItems.map((item, index) => (
          <WorkItem key={item.title} item={item} index={index} />
        ))}
      </section>

      <section id="learning" className="pricing-section">
        <h2>Choose a Cortex plan to get started</h2>
        <div className="plan-grid">
          {workspaceModes.map((mode) => (
            <article className="plan-card" key={mode.title}>
              <h3>{mode.title}</h3>
              <p>{mode.body}</p>
              <div className="plan-price">
                {mode.prefix && <span className="plan-prefix">{mode.prefix}</span>}
                <strong>{mode.price}</strong>
                <em>{mode.meta}</em>
              </div>
              <button onClick={openApp}>{mode.cta}</button>
            </article>
          ))}
        </div>
      </section>

      <section id="surfaces" className="surfaces-section">
        <h2>The same agent everywhere you learn</h2>
        <p className="surface-copy">Use Cortex across app, classroom, archive, and command surfaces, all connected by one learning account.</p>
        <button className="docs-link" onClick={() => scrollTo('teams')}>
          Explore Cortex surfaces
          <ArrowRight size={14} />
        </button>
        <div className="surface-grid">
          {surfaceCards.map((card) => (
            <article className="surface-card" key={card.title}>
              <div className="surface-card-graphic">
                <img src={card.image} alt={card.title} />
              </div>
              <div className="surface-card-info">
                <h3>{card.title}</h3>
                <p>{card.body}</p>
                <div className="surface-loading">Loading</div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="teams" className="teams-section">
        <h2>Cortex for teams</h2>
        <p>Pay as you go-no seat fees. Scale without limits.</p>
        <button className="soft-pill" onClick={openApp}>Start now</button>
        <div className="team-card-grid">
          {teamCards.map((card) => (
            <article className={`team-card ${card.mark ? '' : 'team-card-plain'}`} key={card.title}>
              {card.mark && <span>{card.mark}</span>}
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="final" className="final-cta">
        <div className="final-icon" aria-hidden="true">
          <CortexLogoMark className="final-logo-mark" />
        </div>
        <h2>Try Cortex today</h2>
        <p>Your AI assistant for learning.</p>
        <div className="final-loading">Loading</div>
      </section>
    </main>

    <footer className="landing-footer">
      <div className="footer-groups">
        {footerGroups.map((group) => (
          <div className="footer-group" key={group.title}>
            <h2>{group.title}</h2>
            {group.links.map((link) => (
              <button key={link} onClick={() => scrollTo('work')}>
                {link}
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className="footer-bottom">
        <span>Cortex © 2026</span>
        <span>Manage cookies</span>
      </div>
    </footer>
  </div>
);

export default Home;
