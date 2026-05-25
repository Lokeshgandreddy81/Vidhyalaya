import React from 'react';
import {
  ArrowRight,
  FileText,
  GraduationCap,
  Repeat2,
  Search,
  ShieldCheck,
  Sparkles,
  Terminal,
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

const useCases = [
  {
    title: 'Cortex for learning',
    body: 'Gets study goals, paths, sessions, and review loops done from start to finish.',
    image: `${imageBase}screenshot-discovery.png`,
    cta: 'Learn more',
  },
  {
    title: 'Cortex for builders',
    body: 'Built for real learning systems across paths, classrooms, archives, and study agents.',
    image: `${imageBase}screenshot-session.png`,
    cta: 'Learn more',
  },
];

const workItems = [
  {
    icon: Search,
    title: 'Your research assistant',
    body: 'Give Cortex the files, notes, data, decisions, and learning materials behind the task. It works from the actual materials that shape the job, so you do not have to flatten real work into a single prompt.',
    image: `${imageBase}cortex-prerequisite-alignment.png`,
    imageAlt: 'Cortex planning scene with prerequisite alignment',
    imageFit: 'contain',
  },
  {
    icon: FileText,
    title: 'Get finished learning work back',
    body: 'Create briefs, study guides, decks, visuals, messages, tools, automations, prototypes, plans, and learning changes you can review, refine, and use.',
    image: `${imageBase}cortex-study-guide-jsx.png`,
    imageAlt: 'Cortex generated study guide artifact for JSX and components',
    imageFit: 'contain',
  },
  {
    icon: Repeat2,
    title: 'Make good learning repeatable',
    body: 'For learning work you do again and again, Cortex can gather the latest context from docs, notes, and the archive, then help turn proven workflows into updates, summaries, follow-ups, automations, and learning changes.',
    image: `${imageBase}cortex-archive-books.png`,
    imageAlt: 'Cortex archive capacity and mastery bookshelf scene',
    imageFit: 'contain',
  },
  {
    icon: ShieldCheck,
    title: 'You stay in control',
    body: 'Cortex shows the sources, assumptions, changes, and next steps so learners and teams can review, refine, and decide what happens next.',
    image: `${imageBase}codex-shot-control.png`,
    imageAlt: 'Cortex control and review scene',
  },
  {
    icon: GraduationCap,
    title: 'For the work learners do every day',
    body: 'Use Cortex for syllabus breakdowns, exam prep, project paths, technical deep dives, weekly readouts, classroom updates, resource scouting, review packets, concept maps, and follow-ups.',
    image: `${imageBase}screenshot-classroom.png`,
    imageAlt: 'Cortex classroom surface',
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
    image: `${imageBase}codex-surface-app.png`,
  },
  {
    title: 'Move to your editor',
    image: `${imageBase}codex-surface-classroom.png`,
  },
  {
    title: 'Keep going in the terminal',
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

const Logo = () => (
  <button className="landing-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
    <span className="landing-logo-symbol">
      <Sparkles size={15} strokeWidth={2.2} />
    </span>
    <span>Cortex</span>
  </button>
);

const UseCaseCard = ({ card }) => (
  <article className="use-case-card">
    <div className="use-case-image">
      <img src={card.image} alt={card.title} />
    </div>
    <div className="use-case-copy">
      <h3>{card.title}</h3>
      <p>{card.body}</p>
      <button onClick={() => scrollTo('work')}>
        {card.cta}
        <ArrowRight size={14} />
      </button>
    </div>
  </article>
);

const WorkItem = ({ item, index }) => {
  const Icon = item.icon;
  return (
    <section className={`work-story ${index % 2 === 1 ? 'work-story-reverse' : ''}`}>
      <div className="work-story-copy">
        <div className="work-story-icon">
          <Icon size={18} strokeWidth={2.1} />
        </div>
        <h3>{item.title}</h3>
        <p>{item.body}</p>
      </div>
      <div className={`work-story-visual ${item.imageFit === 'contain' ? 'work-story-visual-contain' : ''}`}>
        <img src={item.image} alt={item.imageAlt} />
      </div>
    </section>
  );
};

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
        <div className="hero-media" aria-hidden="true">
          <img src={`${imageBase}screenshot-discovery.png`} alt="" />
        </div>
        <div className="hero-content">
          <div className="hero-app-icon" aria-hidden="true">
            <Terminal size={42} strokeWidth={2.35} />
          </div>
          <h1>Cortex</h1>
          <p>Your AI assistant for learning.</p>
          <div className="hero-loading" aria-label="Cortex product preview loading">Loading</div>
        </div>
      </section>

      <section className="trusted-section" aria-label="Trusted learning teams">
        <p>Trusted by top learning teams</p>
        <div className="trust-row">
          {trustItems.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </section>

      <section id="ways" className="ways-section">
        <h2>Ways to use Cortex</h2>
        <div className="use-case-grid">
          {useCases.map((card) => (
            <UseCaseCard key={card.title} card={card} />
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
        <p className="surface-copy">Use Cortex across multiple surfaces, all connected by your Cortex account.</p>
        <button className="docs-link" onClick={() => scrollTo('teams')}>
          Learn more in the developer docs
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
          <Terminal size={36} strokeWidth={2.3} />
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
