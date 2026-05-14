import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Hero from '../components/Hero';
import HowItWorks from '../components/HowItWorks';
import WorkSection from '../components/WorkSection';
import AboutSection from '../components/AboutSection';
import ContactSection from '../components/ContactSection';
import Footer from '../components/Footer';
import Preloader from '../components/Preloader';
import { AnimatePresence } from 'framer-motion';

/* ═══════════════════════════════════════════════════════════════════════════
   HOME PAGE ORCHESTRATOR
   Dark-only. No theme toggle. The product IS dark.
   Section order follows narrative velocity:
   1. Hero (feel the AI)
   2. How It Works (understand the AI)
   3. Product (explore the subsystems)
   4. Architecture (trust the AI)
   5. CTA (use the AI)
   ═══════════════════════════════════════════════════════════════════════════ */
const Home = () => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    document.body.style.overflow = ready ? '' : 'hidden';
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
    return () => { document.body.style.overflow = ''; };
  }, [ready]);

  const Divider = () => (
    <div className="max-w-7xl mx-auto px-6 md:px-10">
      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#09090b] text-white relative overflow-x-hidden selection:bg-indigo-500/30 selection:text-white">
      {/* Film grain — barely perceptible */}
      <div
        className="pointer-events-none fixed inset-0 z-[9999] opacity-[0.012] mix-blend-overlay"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
        }}
      />

      <Header />

      <AnimatePresence mode="wait">
        {!ready && <Preloader key="preloader" onComplete={() => setReady(true)} />}
      </AnimatePresence>

      {ready && (
        <main>
          <Hero />
          <Divider />
          <HowItWorks />
          <Divider />
          <WorkSection />
          <Divider />
          <AboutSection />
          <Divider />
          <ContactSection />
          <Footer />
        </main>
      )}
    </div>
  );
};

export default Home;