import React, { useState } from 'react';
import { ArrowRight, ChevronDown, Youtube, Linkedin, Github, Instagram, Globe, Copy, Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const OpenAILogo = ({ className = '' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A6.0651 6.0651 0 0 0 19.0192 19.818a5.9847 5.9847 0 0 0 3.9977-2.9001 6.0462 6.0462 0 0 0-.735-7.0968zM10.9234 21.6546a4.5422 4.5422 0 0 1-2.7153-.8956l.081-.0469 3.528-2.0463a1.5167 1.5167 0 0 0 .7623-1.3061V9.9213l1.8344 1.0594a1.44 1.44 0 0 1 .7375 1.1578v5.5492a4.5701 4.5701 0 0 1-4.2279 3.9668zm-6.2731-2.802a4.5422 4.5422 0 0 1-1.3197-2.5204l.081.0468 3.528 2.0368a1.5167 1.5167 0 0 0 1.5246 0l6.45-3.7226V12.6l-1.8344 1.0594a1.44 1.44 0 0 1-1.4655 0L5.341 9.9407a4.5701 4.5701 0 0 1 .4943-5.6322zM2.8703 9.8789a4.5422 4.5422 0 0 1 1.3957-1.6248l-.081.0468-3.528 2.0368a1.5167 1.5167 0 0 0-.7623 1.3061v7.4357l1.8344-1.0594a1.44 1.44 0 0 1 .7375-1.1578V11.313a4.5701 4.5701 0 0 1 2.308-4.0416zM13.0766 2.3454a4.5422 4.5422 0 0 1 2.7153.8956l-.081.0469-3.528 2.0463a1.5167 1.5167 0 0 0-.7623 1.3061v7.4384l-1.8344-1.0594a1.44 1.44 0 0 1-.7375-1.1578V6.3125a4.5701 4.5701 0 0 1 4.2279-3.967zm6.2731 2.802a4.5422 4.5422 0 0 1 1.3197 2.5204l-.081-.0468-3.528-2.0368a1.5167 1.5167 0 0 0-1.5246 0l-6.45 3.7226V11.4l1.8344-1.0594a1.44 1.44 0 0 1 1.4655 0l6.2733 3.7187a4.5701 4.5701 0 0 1-.4943 5.6322zM21.1297 14.1211a4.5422 4.5422 0 0 1-1.3957 1.6248l.081-.0468 3.528-2.0368a1.5167 1.5167 0 0 0 .7623-1.3061V4.9205l-1.8344 1.0594a1.44 1.44 0 0 1-.7375 1.1578v5.5492a4.5701 4.5701 0 0 1-2.308 4.0416zM12 15.656a3.656 3.656 0 1 1 0-7.312 3.656 3.656 0 0 1 0 7.312z" />
  </svg>
);

const XLogo = ({ className = '' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const TikTokLogo = ({ className = '' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 003.96 15.7 6.34 6.34 0 0010.3 22h.16a6.34 6.34 0 006.34-6.32V10.1a8.31 8.31 0 004.5 1.29V8.04a5.2 5.2 0 01-1.71-.35z"/>
  </svg>
);

const imageBase = '/images/';

const trustItems = ['Students', 'Builders', 'Educators', 'Campuses'];

/* ── Nav items ── exactly like Codex */
const navItems = [
  { label: 'Overview', id: 'feature-rows' },
  { label: 'Features', id: 'work' },
  { label: 'Pricing', id: 'learning' },
  { label: 'Resources', id: 'resources' },
  { label: 'Business', id: 'accelerate' },
];

/* ── Trust: Codex uses a SINGLE line of plain small text — no logos, no animation */
/* ── Feature rows: text-only, matching Codex's "Pair with Codex in your terminal" layout */
const featureRows = [
  {
    title: 'Study with Cortex in your classroom or app',
    body: 'Starting from a goal or syllabus, Cortex navigates your learning context to build paths, create modules, run sessions, and generate reviewable study artifacts—available across the Cortex app, classroom, and archive surfaces.',
  },
  {
    title: 'Delegate to Cortex in the background',
    body: 'Cortex runs your learning work in the background so you can stay in flow and get more done. It processes each task against your path and context, generating study work you can review, keep, or continue building from.',
  },
  {
    title: 'Learn from anywhere',
    body: 'Kick off study sessions from any surface, wherever the goal strikes. Track progress, review artifacts, and continue paths to keep learning moving on the go.',
  },
];

/* ── "Accelerates your team" sub-items — matching Codex's three inline sub-items with Learn more */
const accelerateItems = [
  {
    title: 'Automated path review',
    body: 'Set up Cortex to review new learning paths and modules automatically. It compares intent with generated work, running verification if needed to provide a detailed review.',
    cta: 'Learn more',
  },
  {
    title: 'Study session integrations',
    body: 'Cortex can answer questions, fix gaps, and explore ideas right from your team\'s shared study surfaces. It automatically pulls context from the session to choose the right path and start working.',
    cta: 'Learn more',
  },
  {
    title: 'Embed Cortex in your workflows',
    body: 'Embed Cortex in your learning operations and internal tools to automate key processes like content maintenance, path management, and knowledge gap scans so your team stays focused on impact.',
    cta: 'Learn more',
  },
];

/* ── Work story rows: "Get work done faster" — text left, screenshot right */
const workItems = [
  {
    title: 'Your research assistant',
    body: 'Give Cortex the syllabus, notes, links, decisions, and constraints behind the task. It works from the materials that actually shape the learning job.',
    image: `${imageBase}cortex-prerequisite-alignment.png`,
    imageAlt: 'Cortex planning scene with prerequisite alignment',
  },
  {
    title: 'Get finished learning work back',
    body: 'Create study guides, worksheets, briefs, visuals, quizzes, messages, plans, and path changes that are ready to review and use.',
    image: `${imageBase}cortex-study-guide-jsx.png`,
    imageAlt: 'Cortex generated study guide artifact',
  },
  {
    title: 'Make good learning work repeatable',
    body: 'For recurring learning work, Cortex gathers the latest context and turns proven workflows into updates, summaries, follow-ups, and reusable changes.',
    image: `${imageBase}cortex-archive-books.png`,
    imageAlt: 'Cortex archive capacity and mastery bookshelf',
  },
  {
    title: 'For the work learners do every day',
    body: 'Use Cortex for syllabus breakdowns, exam prep, project paths, technical deep dives, classroom updates, concept maps, quizzes, and follow-ups.',
    image: `${imageBase}cortex-learners-every-day.png`,
    imageAlt: 'Cortex learner work surface',
  },
  {
    title: 'You stay in control',
    body: 'Cortex keeps sources, assumptions, changes, and next steps visible so learners, teachers, and teams can review the work before it moves forward.',
    image: `${imageBase}cortex-grounded-sources.png`,
    imageAlt: 'Cortex grounded sources scene',
  },
];

/* ── Pricing plans */
const plans = [
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

/* ── "More resources" 3-card grid — matching Codex's resource cards */
const resourceCards = [
  {
    title: 'Cortex for learning',
    subtitle: 'Learn more',
    body: 'Gets study goals, paths, sessions, and review loops done from start to finish.',
    image: `${imageBase}cortex-use-learning.png`,
  },
  {
    title: 'Cortex for builders',
    subtitle: 'Learn more',
    body: 'Built for real learning systems across paths, classrooms, archives, and agent-powered workflows.',
    image: `${imageBase}cortex-use-builders.png`,
  },
  {
    title: 'Cortex in the cloud',
    subtitle: 'Learn more',
    body: 'Preserve sources, artifacts, and next steps so context follows the learning work.',
    image: `${imageBase}codex-surface-archive.png`,
  },
];

/* ── FAQ — matching Codex's 4-question accordion */
const faqs = [
  {
    q: 'How do I access Cortex?',
    a: 'Cortex is available across all plans. Once you log in, you can access the learning app, classroom, archive, and command surfaces from a single account.',
  },
  {
    q: 'What\'s the difference between Cortex for learning and Cortex for builders?',
    a: 'Cortex is a single agent that works across every learning context — app, classroom, archive, and on the go. With your account, you can easily move work between surfaces without losing state or context.',
  },
  {
    q: 'How much does Cortex cost?',
    a: 'Cortex is part of Plus, Pro, Business, and Campus plans. Business and Campus plans can scale usage and add team controls. Learn more about usage for each plan on our pricing page.',
  },
  {
    q: 'Which AI models does Cortex use?',
    a: 'Cortex uses Gemini 3.5 Flash for fast learning logic and 2.5-Flash for audio overviews. You can also adjust reasoning depth per session for more precise or exploratory output.',
  },
];

const footerGroups = [
  { title: 'OpenAI', links: ['Research', 'Safety', 'API', 'न्यूज़'] },
  { title: 'Terms & Policies', links: ['Terms of Use', 'गोपनीयता नीति', 'Usage Policy', 'Other policies'] },
];

/* ── Helpers */
const openApp = () => { window.location.hash = '/create'; };
const scrollTo = (id) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

/* ── SVG Logo */
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

/* ── Work story row (alternating text + screenshot) */
const WorkItem = ({ item, index }) => (
  <section className={`work-story ${index % 2 === 1 ? 'work-story-reverse' : ''}`}>
    <div className="work-story-copy">
      <h3>{item.title}</h3>
      <p>{item.body}</p>
    </div>
    <div className="work-story-visual">
      <img src={item.image} alt={item.imageAlt} />
    </div>
  </section>
);

/* ── FAQ Accordion item */
const FaqItem = ({ faq }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item ${open ? 'faq-item-open' : ''}`}>
      <button className="faq-q" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>{faq.q}</span>
        <ChevronDown size={16} className="faq-chevron" />
      </button>
      {open && <div className="faq-a"><p>{faq.a}</p></div>}
    </div>
  );
};

/* ── CLI Pill — exact Codex design with Active Copy Trigger */
const CliPill = ({ light = false, copied = false, onCopy }) => (
  <button 
    className={`hero-cli-pill${light ? ' hero-cli-pill--light' : ''} flex items-center gap-2 group/cli transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer`}
    onClick={(e) => {
      e.stopPropagation();
      onCopy();
    }}
  >
    <span className="hero-cli-prompt">$</span>
    <span className="hero-cli-cmd font-mono">cortex start --guided</span>
    <span className="w-px h-3.5 bg-white/10 mx-1 group-hover/cli:opacity-100 opacity-0 transition-opacity" />
    <span className="text-[10px] text-white/40 group-hover/cli:text-white/80 transition-all flex items-center min-w-[45px] justify-center">
      {copied ? (
        <span className="text-emerald-400 font-bold flex items-center gap-1">
          <Check size={11} strokeWidth={3} /> Copied
        </span>
      ) : (
        <span className="opacity-0 group-hover/cli:opacity-100 transition-opacity flex items-center gap-1">
          <Copy size={11} /> Copy
        </span>
      )}
    </span>
  </button>
);

/* ═══════════════════════════════════════════════════════ PAGE ══ */
const Home = () => {
  const [cliCopied, setCliCopied] = useState(false);

  const handleCopyCli = () => {
    navigator.clipboard.writeText('cortex start --guided');
    setCliCopied(true);
    toast.success('CLI command copied to clipboard!');
    setTimeout(() => {
      setCliCopied(false);
    }, 2000);
  };

  return (
    <div className="codex-page">

    {/* ── Nav ── */}
    <header className="landing-header">
      <Logo />
      <nav className="landing-nav" aria-label="Main navigation">
        {navItems.map((item) => (
          <button key={item.label} onClick={() => scrollTo(item.id)}>{item.label}</button>
        ))}
      </nav>
      <div className="header-actions">
        <button className="ghost-pill" onClick={() => scrollTo('accelerate')}>Contact sales</button>
        <button className="dark-pill" onClick={openApp}>Log in</button>
      </div>
    </header>

    <main>

      {/* ══════════════════════════════════════════════════════════
          HERO — matches Codex exactly with GOAT-level visual overlays:
          Logo icon with conic aura → h1 Outfit display text → subtitle (two lines) → copy CLI pill → trust tags
      ══════════════════════════════════════════════════════════ */}
      <section className="hero-shell relative overflow-hidden">
        {/* Dynamic Background Nebula & Drift Particles */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
          <div className="cosmic-particle-drift absolute top-[15%] left-[20%] w-[12px] h-[12px] rounded-full bg-indigo-400/25 blur-[2px]" style={{ animationDelay: '0s', animationDuration: '14s' }} />
          <div className="cosmic-particle-drift absolute top-[45%] right-[15%] w-[8px] h-[8px] rounded-full bg-purple-400/20 blur-[1px]" style={{ animationDelay: '3.5s', animationDuration: '18s' }} />
          <div className="cosmic-particle-drift absolute bottom-[25%] left-[30%] w-[16px] h-[16px] rounded-full bg-blue-400/25 blur-[3px]" style={{ animationDelay: '7s', animationDuration: '16s' }} />
          
          {/* Celestial Spotlight Aura */}
          <div className="absolute top-[18%] left-1/2 -translate-x-1/2 w-[380px] h-[380px] rounded-full bg-indigo-500/10 blur-[100px] animate-pulse" style={{ animationDuration: '9s' }} />
        </div>

        <div className="hero-content relative z-10">
          {/* Logo with rotating conic gradient border */}
          <div className="relative inline-block mx-auto mb-7 group/logo">
            <div className="absolute -inset-[3px] rounded-[24px] bg-gradient-to-r from-[#4e5bff] via-[#8b5cf6] to-[#38bdf8] opacity-35 blur-sm group-hover/logo:opacity-85 transition-opacity duration-700 animate-spin" style={{ animationDuration: '9s' }} />
            
            <div className="hero-app-icon relative z-10 !mb-0" aria-hidden="true">
              <CortexLogoMark className="hero-logo-mark group-hover/logo:scale-105 transition-transform duration-500" />
            </div>
          </div>

          <h1 className="hero-title-goat text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-200">
            Cortex
          </h1>
          {/* Codex: two-line subtitle */}
          <p className="hero-subtitle-main">Your AI assistant for learning.</p>
          <p className="hero-subtitle-meta">Included in Plus, Pro, Business, and Campus plans.</p>

          {/* Codex: CLI pill is the PRIMARY CTA — white button is secondary */}
          <div className="hero-actions">
            <CliPill copied={cliCopied} onCopy={handleCopyCli} />
            <button className="hero-primary relative group/btn overflow-hidden" onClick={openApp}>
              {/* Glossy overlay */}
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
              <span className="relative z-10 flex items-center gap-1.5">
                Start learning <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
              </span>
            </button>
          </div>

          <div className="trusted-section hero-trust mt-11" aria-label="Trusted learning teams">
            <p className="hero-trust-line-premium">Trusted by top learning teams worldwide</p>
            <div className="trust-row flex gap-5 justify-center mt-6">
              {trustItems.map((item) => (
                <span key={item} className="trusted-tag-porche">
                  <span className="porche-bullet" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          FEATURE ROWS — matches Codex exactly:
          Small intro text → 3 h3 feature blocks, text only, no images
      ══════════════════════════════════════════════════════════ */}
      <section id="feature-rows" className="feature-rows-section">
        <div className="feature-rows-inner">
          <p className="feature-rows-intro">
            Switch seamlessly between real-time study sessions and async background learning with Cortex in all your tools.
          </p>
          <div className="feature-rows-list">
            {featureRows.map((row) => (
              <div className="feature-row" key={row.title}>
                <h3>{row.title}</h3>
                <p>{row.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          "Accelerates your team" — matching Codex's 3-item list with "Learn more"
      ══════════════════════════════════════════════════════════ */}
      <section id="accelerate" className="accelerate-section">
        <div className="accelerate-inner">
          <h2>Accelerates your learning</h2>
          <p className="accelerate-subtitle">Cortex plugs into your team's most important workflows to help you learn faster and more confidently.</p>
          <div className="accelerate-list">
            {accelerateItems.map((item) => (
              <div className="accelerate-item" key={item.title}>
                <div className="accelerate-item-copy">
                  <p>{item.body}</p>
                  <button className="accelerate-learn-more" onClick={openApp}>
                    {item.cta} <ArrowRight size={13} />
                  </button>
                </div>
                <h3>{item.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          "Get work done faster" — alternating text + screenshot
      ══════════════════════════════════════════════════════════ */}
      <section id="work" className="work-section">
        <div className="work-section-inner">
          <h2>Get work done faster</h2>
          {workItems.map((item, index) => (
            <WorkItem key={item.title} item={item} index={index} />
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          Pricing
      ══════════════════════════════════════════════════════════ */}
      <section id="learning" className="pricing-section">
        <h2>Choose a Cortex plan to get started</h2>
        <div className="plan-grid">
          {plans.map((mode) => (
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

      {/* ══════════════════════════════════════════════════════════
          "More resources" — 3 resource cards with screenshots
          Matching Codex: "Codex IDE extension / Codex CLI / Codex in the cloud"
      ══════════════════════════════════════════════════════════ */}
      <section id="resources" className="resources-section">
        <div className="resources-inner">
          <h2>More resources</h2>
          <p className="resources-subtitle">Cortex is included in Plus, Pro, Business, and Campus. Get the most out of it with these guides.</p>
          <div className="resources-grid">
            {resourceCards.map((card) => (
              <article className="resource-card" key={card.title}>
                <div className="resource-card-img">
                  <img src={card.image} alt={card.title} />
                </div>
                <div className="resource-card-body">
                  <h3>{card.title}</h3>
                  <button className="resource-learn-more" onClick={openApp}>
                    {card.subtitle} <ArrowRight size={13} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          FAQ — matching Codex's accordion section
      ══════════════════════════════════════════════════════════ */}
      <section id="faq" className="faq-section">
        <div className="faq-inner">
          {faqs.map((faq) => (
            <FaqItem key={faq.q} faq={faq} />
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          Final CTA — CLI pill repeated exactly like Codex bottom
      ══════════════════════════════════════════════════════════ */}
      <section id="final" className="final-cta">
        <CliPill light copied={cliCopied} onCopy={handleCopyCli} />
      </section>
    </main>

    {/* ── Footer ── */}
    <footer className="landing-footer">
      <div className="footer-top">
        <div className="footer-logo">
          <OpenAILogo className="footer-openai-logo" />
        </div>
        <div className="footer-groups">
          {footerGroups.map((group) => (
            <div className="footer-group" key={group.title}>
              <h2>{group.title}</h2>
              {group.links.map((link) => (
                <button key={link} onClick={() => scrollTo('work')}>{link}</button>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="footer-bottom">
        <div className="footer-bottom-left">
          <span>OpenAI © 2015–2026</span>
          <button className="footer-bottom-link">कुकीज़ को मैनेज करें</button>
        </div>
        <div className="footer-bottom-right">
          <a href="#" aria-label="X (Twitter)"><XLogo className="social-icon" /></a>
          <a href="#" aria-label="YouTube"><Youtube className="social-icon" /></a>
          <a href="#" aria-label="LinkedIn"><Linkedin className="social-icon" /></a>
          <a href="#" aria-label="GitHub"><Github className="social-icon" /></a>
          <a href="#" aria-label="Instagram"><Instagram className="social-icon" /></a>
          <a href="#" aria-label="TikTok"><TikTokLogo className="social-icon" /></a>
          <button className="lang-selector">
            <Globe size={15} className="social-icon" />
            <span>हिन्दी</span>
          </button>
        </div>
      </div>
    </footer>
  </div>
  );
};

export default Home;
