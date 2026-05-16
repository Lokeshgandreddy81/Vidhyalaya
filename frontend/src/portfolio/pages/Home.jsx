import React from 'react';
import {
  ArrowRight,
  BookOpen,
  Compass,
  LibraryBig,
  Sparkles,
  Terminal,
} from 'lucide-react';

const imageBase = '/images/';
const heroPreview = `${imageBase}live-discovery.png`;

const navItems = [
  { label: 'About', id: 'ways' },
  { label: 'Features', id: 'work' },
  { label: 'Learn', id: 'surfaces' },
  { label: 'Vidhyalaya', id: 'teams' },
  { label: 'Business', id: 'teams' },
  { label: 'Pricing', id: 'pricing' },
  { label: 'Download', id: 'final' },
];

const trustItems = ['Discovery', 'Classrooms', 'The Archive', 'New Architect'];

const workSections = [
  {
    kicker: 'Get clarity faster',
    title: 'Discovery opens the right path',
    body: 'Search the registry, compare tracks, and move from a vague goal to a focused learning direction without losing momentum.',
    image: `${imageBase}codex-shot-research.png`,
    alt: 'Vidhyalaya Discovery snapshot',
  },
  {
    kicker: 'Get finished learning work back',
    title: 'Classrooms keep the work alive',
    body: 'Preserve every realm, module, and synthesis so study does not reset between sessions, subjects, or teams.',
    image: `${imageBase}codex-shot-finished.png`,
    alt: 'Vidhyalaya Classrooms snapshot',
    reverse: true,
  },
  {
    kicker: 'Make mastery repeatable',
    title: 'The archive remembers everything',
    body: 'Keep generated paths, notes, and knowledge architecture available for deep-focus study and fast redeployment.',
    image: `${imageBase}codex-shot-repeat.png`,
    alt: 'Vidhyalaya Archive snapshot',
  },
  {
    kicker: 'You stay in control',
    title: 'The new architect builds with you',
    body: 'Create a path, tune the constraints, attach context, and let the agent turn raw ambition into an executable learning system.',
    image: `${imageBase}codex-shot-control.png`,
    alt: 'Vidhyalaya Architect snapshot',
    reverse: true,
  },
];

const planCards = [
  {
    title: 'Plus',
    body: 'Includes Vidhyalaya usage for focused learning sessions each week.',
    price: '₹1,999',
    meta: '/ month',
    cta: 'Get Plus',
  },
  {
    title: 'Pro',
    body: 'Higher usage limits to power full study days across multiple paths.',
    price: '₹10,699',
    meta: '/ month',
    cta: 'Get Pro',
    prefix: 'From',
  },
  {
    title: 'Business',
    body: 'Secure shared workspace with admin controls for teams using Vidhyalaya across classrooms.',
    price: '₹2,250',
    meta: '/ user / month',
    cta: 'Try Business',
  },
];

const surfaceCards = [
  {
    image: `${imageBase}codex-surface-app.png`,
    title: 'Start in the Vidhyalaya app',
    icon: Compass,
    button: 'Open app',
  },
  {
    image: `${imageBase}codex-surface-classroom.png`,
    title: 'Move to your classroom',
    icon: BookOpen,
    button: 'Try classroom',
  },
  {
    image: `${imageBase}codex-surface-archive.png`,
    title: 'Keep going in the archive',
    icon: LibraryBig,
    button: 'Build memory',
  },
];

const teamCards = [
  {
    mark: '>_learn',
    title: 'Ship stronger understanding',
    body: 'Automate path design and continuously reinforce concepts that matter.',
  },
  {
    mark: '⌘  ✦  ◌',
    title: 'Built for how your team studies',
    body: 'Run agent workflows for solo learning, classroom programs, and project teams.',
  },
  {
    mark: '▦  ⚿  ♡',
    title: 'Enterprise-ready',
    body: 'Shared archives, learning operations, and clear security controls.',
  },
];

const testimonials = [
  ['“Vidhyalaya turned scattered resources into a path I could actually finish.”', 'Product learner, Bengaluru'],
  ['“The archive is the first learning memory system that feels useful after the session ends.”', 'Backend engineer, Hyderabad'],
  ['“Classrooms gave our project group one source of truth for study and execution.”', 'Student founder, Chennai'],
  ['“Discovery is fast enough that I use it before every new technical topic.”', 'Full-stack developer, Pune'],
  ['“The smart session made hard topics feel navigable instead of intimidating.”', 'AI learner, Mumbai'],
  ['“It feels like a curriculum architect sitting beside the work.”', 'Engineering lead, Remote'],
];

const footerGroups = [
  {
    title: 'Vidhyalaya',
    links: ['Discovery', 'Classrooms', 'The Archive', 'New Architect'],
  },
  {
    title: 'Resources',
    links: ['Learning paths', 'Smartboards', 'Team study', 'Archive memory'],
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
      <Sparkles size={16} strokeWidth={2.4} />
    </span>
    <span>Vidhyalaya</span>
  </button>
);

const Shot = ({ src, alt }) => (
  <div className="shot-frame">
    <img src={src} alt={alt} />
  </div>
);

const WorkSection = ({ section }) => {
  const copy = (
    <div className="work-copy">
      <p className="work-kicker">{section.kicker}</p>
      <h3>{section.title}</h3>
      <p>{section.body}</p>
    </div>
  );

  const visual = <Shot src={section.image} alt={section.alt} />;

  return (
    <section className={`work-row ${section.reverse ? 'work-row-reverse' : ''}`}>
      {section.reverse ? visual : copy}
      {section.reverse ? copy : visual}
    </section>
  );
};

const Home = () => (
  <div className="codex-page">
    <header className="landing-header">
      <Logo />
      <nav className="landing-nav" aria-label="Main navigation">
        {navItems.map((item) => (
          <button key={`${item.label}-${item.id}`} onClick={() => scrollTo(item.id)}>
            {item.label}
          </button>
        ))}
      </nav>
      <div className="header-actions">
        <button className="ghost-pill" onClick={openApp}>Contact sales</button>
        <button className="dark-pill" onClick={openApp}>Go to app</button>
      </div>
    </header>

    <main>
      <section className="hero-shell">
        <div className="hero-atmosphere" aria-hidden="true" />
        <div className="hero-content">
          <div className="hero-app-icon" aria-hidden="true">
            <Terminal size={42} strokeWidth={2.4} />
          </div>
          <h1>Vidhyalaya</h1>
          <p>An AI learning agent that helps you discover, study, archive, and architect mastery.</p>
          <div className="hero-actions">
            <button className="hero-button" onClick={openApp}>
              Start learning
              <ArrowRight size={15} />
            </button>
          </div>

          <p className="trusted-label">Trusted learning layers</p>
          <div className="trust-row" aria-label="Vidhyalaya product layers">
            {trustItems.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="hero-showcase" aria-label="Vidhyalaya workspace preview">
        <div className="hero-showcase-frame">
          <img src={heroPreview} alt="Vidhyalaya workspace preview" />
        </div>
      </section>

      <section id="ways" className="best-section">
        <h2>The best way to learn with agents</h2>
      </section>

      <section id="work" className="work-section">
        {workSections.map((section) => (
          <WorkSection key={section.title} section={section} />
        ))}
      </section>

      <section id="pricing" className="pricing-section">
        <h2>Choose a Vidhyalaya plan to get started</h2>
        <div className="plan-grid">
          {planCards.map((plan) => (
            <article className="plan-card" key={plan.title}>
              <h3>{plan.title}</h3>
              <p>{plan.body}</p>
              <div className="plan-price">
                {plan.prefix && <em>{plan.prefix}</em>}
                <span>{plan.price}</span>
                <em>{plan.meta}</em>
              </div>
              <button onClick={openApp}>{plan.cta}</button>
            </article>
          ))}
        </div>
      </section>

      <section id="surfaces" className="surfaces-section">
        <p className="section-label">The same agent everywhere you learn</p>
        <h2>Use Vidhyalaya across every study surface.</h2>
        <div className="surface-grid">
          {surfaceCards.map((card) => {
            const Icon = card.icon;
            return (
              <article className="surface-card" key={card.title}>
                <img src={card.image} alt="" />
                <h3>{card.title}</h3>
                <button onClick={openApp}>
                  <Icon size={14} />
                  {card.button}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section id="teams" className="teams-section">
        <h2>Vidhyalaya for teams</h2>
        <p>Pay as you grow. Scale learning without limits.</p>
        <button className="soft-pill" onClick={openApp}>Start now</button>
        <div className="team-card-grid">
          {teamCards.map((card) => (
            <article className="team-card" key={card.title}>
              <span>{card.mark}</span>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="quotes-section">
        <h2>What builders are saying</h2>
        <div className="quote-grid">
          {testimonials.map(([quote, person]) => (
            <article className="quote-card" key={quote}>
              <div className="quote-avatar" />
              <p>{quote}</p>
              <span>{person}</span>
            </article>
          ))}
        </div>
      </section>

      <section id="final" className="final-cta">
        <h2>Try Vidhyalaya today</h2>
        <p>Your AI learning assistant for mastery.</p>
        <button className="hero-button" onClick={openApp}>
          Start learning
          <ArrowRight size={15} />
        </button>
      </section>
    </main>

    <footer className="landing-footer">
      <div className="footer-logo">
        <Logo />
      </div>
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
        <span>Vidhyalaya © 2026</span>
        <span>Built for focused learning work</span>
      </div>
    </footer>
  </div>
);

export default Home;
