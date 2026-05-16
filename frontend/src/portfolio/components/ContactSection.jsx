import React, { useRef, useState, useCallback } from 'react';
import { ArrowRight, Github, Linkedin, Mail, Twitter } from 'lucide-react';
import { motion, useInView, useMotionValue, useSpring, useTransform } from 'framer-motion';

/* ═══════════════════════════════════════════════════════════════════════════
   LUMINESCENT CTA BUTTON
   Not just a glow — the cursor creates a "light source" that illuminates
   the button surface as if it's made of frosted glass.
   ═══════════════════════════════════════════════════════════════════════════ */
const LuminescentButton = ({ children, onClick }) => {
  const ref = useRef(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const springX = useSpring(mouseX, { stiffness: 300, damping: 30 });
  const springY = useSpring(mouseY, { stiffness: 300, damping: 30 });

  const bgGlow = useTransform(
    [springX, springY],
    ([x, y]) => `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(99,102,241,0.2), transparent 60%)`
  );
  const borderGlow = useTransform(
    [springX, springY],
    ([x, y]) => `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(99,102,241,0.5), rgba(168,85,247,0.2) 40%, transparent 70%)`
  );

  const handleMove = useCallback((e) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  }, [mouseX, mouseY]);

  return (
    <motion.button
      ref={ref}
      onClick={onClick}
      onMouseMove={handleMove}
      className="relative h-14 px-10 rounded-2xl text-white text-[15px] font-semibold flex items-center gap-3 cursor-pointer border-none active:scale-[0.97] transition-transform overflow-hidden group"
      style={{
        background: '#18181b',
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
    >
      {/* Cursor-following internal glow */}
      <motion.div
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: bgGlow }}
      />

      {/* Cursor-following border glow */}
      <motion.div
        className="absolute inset-0 pointer-events-none rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: borderGlow,
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
          WebkitMaskComposite: 'xor',
          padding: '1px',
        }}
      />

      {/* Shimmer sweep */}
      <div className="absolute inset-0 shimmer pointer-events-none" />

      {/* Content */}
      <span className="relative z-10">{children}</span>
      <ArrowRight size={18} className="relative z-10 group-hover:translate-x-1 transition-transform" />

      {/* Bottom glow */}
      <div className="absolute bottom-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </motion.button>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   CONTACT / CTA SECTION
   ═══════════════════════════════════════════════════════════════════════════ */
const ContactSection = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="research" ref={ref} className="relative py-40 overflow-hidden">
      {/* Ambient gradient — stronger */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_80%,rgba(99,102,241,0.1),transparent)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_30%_at_30%_70%,rgba(168,85,247,0.06),transparent)] pointer-events-none" />

      <div className="max-w-3xl mx-auto px-6 md:px-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <span className="text-[12px] text-indigo-400 mono uppercase tracking-wider mb-6 block">
            Get started
          </span>

          <h2 className="text-4xl md:text-6xl font-semibold text-white tracking-[-0.03em] mb-6 leading-[1.1]">
            Your next skill is one<br />prompt away
          </h2>

          <p className="text-[16px] text-zinc-400 max-w-md mx-auto mb-14 leading-relaxed">
            No setup, no account needed. Open the app, describe your goal,
            and start learning in under 30 seconds.
          </p>

          {/* Luminescent CTA */}
          <div className="flex flex-col items-center gap-4">
            <LuminescentButton onClick={() => window.location.hash = '/dashboard'}>
              Open Vidhyalaya
            </LuminescentButton>

            <span className="text-[12px] text-zinc-700 mono mt-2">
              Free · No sign-up · Works offline
            </span>
          </div>

          {/* Social */}
          <div className="flex items-center justify-center gap-3 mt-20">
            {[
              { icon: Github, href: 'https://github.com/Vidhyalaya-Collective' },
              { icon: Linkedin, href: 'https://linkedin.com/company/vidhyalaya-ai' },
              { icon: Twitter, href: '#' },
              { icon: Mail, href: 'mailto:hello@vidhyalaya.ai' },
            ].map(({ icon: Icon, href }, i) => (
              <a
                key={i}
                href={href}
                target={href.startsWith('mailto') ? '_self' : '_blank'}
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center text-zinc-600 hover:text-white hover:border-white/[0.15] hover:bg-white/[0.04] transition-all"
              >
                <Icon size={16} />
              </a>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ContactSection;
