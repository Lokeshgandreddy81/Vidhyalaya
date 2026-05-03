import React, { useEffect, useRef } from 'react';
import { X, ArrowUpRight } from 'lucide-react';

/**
 * VideoModal
 * Props:
 *   isOpen    : bool
 *   onClose   : fn
 *   videoId   : YouTube video ID (string)
 *   title     : project name shown above player
 *   siteUrl   : URL to redirect to when user clicks "Visit Live Site"
 *   siteLabel : label for the redirect button
 */
const VideoModal = ({ isOpen, onClose, videoId, title, siteUrl, siteLabel = 'Visit Live Site' }) => {
    const overlayRef = useRef(null);

    /* Lock body scroll while open */
    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    /* Close on Escape */
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        if (isOpen) window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;

    return (
        /* Overlay */
        <div
            ref={overlayRef}
            className="fixed inset-0 z-[200] flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(24px)' }}
            onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
        >
            {/* Ambient orbs */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute rounded-full mix-blend-screen" style={{
                    width: '60vw', height: '60vw', top: '10%', left: '60%',
                    background: 'radial-gradient(circle, #2a8af6 0%, #a853ba 55%, transparent 75%)',
                    filter: 'blur(90px)', opacity: 0.15,
                }} />
                <div className="absolute rounded-full mix-blend-screen" style={{
                    width: '40vw', height: '40vw', top: '50%', left: '0%',
                    background: 'radial-gradient(circle, #e92a67 0%, #a853ba 60%, transparent 80%)',
                    filter: 'blur(70px)', opacity: 0.10,
                }} />
            </div>

            {/* Modal card */}
            <div
                className="relative w-full max-w-4xl mx-4 md:mx-8 flex flex-col"
                style={{
                    background: 'rgba(8,8,8,0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '1.5rem',
                    boxShadow: '0 40px 120px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)',
                    animation: 'videoModalIn 0.5s cubic-bezier(0.16,1,0.3,1) forwards',
                }}
            >
                {/* Header bar */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07]">
                    <div className="flex items-center gap-3">
                        <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/30">System Preview</span>
                        <div className="w-1 h-1 rounded-full bg-white/20" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/60">{title}</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 hover:scale-110 active:scale-95"
                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                        <X className="w-3.5 h-3.5 text-white/60" />
                    </button>
                </div>

                {/* Video embed — 16:9 */}
                <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                    <iframe
                        className="absolute inset-0 w-full h-full"
                        src={embedUrl}
                        title={title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        style={{ borderRadius: '0' }}
                    />
                </div>

                {/* Footer actions */}
                <div
                    className="flex items-center justify-between px-6 py-4 border-t border-white/[0.07]"
                >
                    <p className="font-mono text-xs text-white/30">
                        Watching preview — {title}
                    </p>

                    {/* CTA → live site */}
                    <a
                        href={siteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-400 hover:scale-105 active:scale-95"
                        style={{
                            background: 'rgba(255,255,255,0.9)',
                            color: '#0a0a0a',
                            fontFamily: 'monospace',
                            fontSize: '0.7rem',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            fontWeight: 600,
                            boxShadow: '0 8px 32px rgba(255,255,255,0.15)',
                        }}
                    >
                        {siteLabel}
                        <ArrowUpRight className="w-3.5 h-3.5 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform duration-300" />
                    </a>
                </div>
            </div>

            <style>{`
        @keyframes videoModalIn {
          from { opacity: 0; transform: scale(0.94) translateY(20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
        </div>
    );
};

export default VideoModal;
