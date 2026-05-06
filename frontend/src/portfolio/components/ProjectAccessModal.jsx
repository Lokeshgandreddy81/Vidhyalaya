import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Loader2, ArrowRight, Github, Linkedin, ExternalLink, LayoutDashboard, GraduationCap, Library as LibraryIcon, ClipboardCheck, Calendar as CalendarIcon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import siteConfig from '../config/siteConfig';

const ProjectAccessModal = ({ isOpen, onClose, projectName = 'Unknown Project' }) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const navigate = useNavigate();
    const [stage, setStage] = useState('loading');
    const [terminalLines, setTerminalLines] = useState([]);
    const [currentLine, setCurrentLine] = useState({ text: '', status: 'loading' });
    const [accessToken, setAccessToken] = useState('');
    const [stats, setStats] = useState({
        totalAttempts: 0,
        todayAttempts: 0,
        yourPosition: 0
    });

    const generateToken = () => {
        const randomStr = Math.random().toString(36).substr(2, 4).toUpperCase();
        return `CT-${randomStr}-${new Date().getFullYear()}`;
    };

    // Initialize stats
    useEffect(() => {
        if (!isOpen) return;

        const token = generateToken();
        setAccessToken(token);
        setStage('loading');
        setTerminalLines([]);
        setCurrentLine({ text: '', status: 'loading' });

        const storedData = localStorage.getItem('projectAccessStats');
        let data = storedData ? JSON.parse(storedData) : {
            totalAttempts: 0,
            todayAttempts: 0,
            lastDate: new Date().toDateString(),
            attempts: []
        };

        if (data.lastDate !== new Date().toDateString()) {
            data.todayAttempts = 0;
            data.lastDate = new Date().toDateString();
        }

        const newAttempt = {
            id: token,
            timestamp: new Date().toISOString(),
            project: projectName,
            userAgent: navigator.userAgent
        };

        data.totalAttempts += 1;
        data.todayAttempts += 1;
        data.attempts.push(newAttempt);

        if (data.attempts.length > 100) {
            data.attempts = data.attempts.slice(-100);
        }

        localStorage.setItem('projectAccessStats', JSON.stringify(data));

        setStats({
            totalAttempts: data.totalAttempts,
            todayAttempts: data.todayAttempts,
            yourPosition: data.totalAttempts
        });
    }, [isOpen, projectName]);

    // Streaming terminal animation
    useEffect(() => {
        if (!isOpen || stage !== 'loading') return;

        const isGranted = ['Classrooms', 'Courses', 'Library', 'Exam Mode', 'Calendar'].includes(projectName);

        const baseSequence = [
            {
                text: `Initializing secure connection to ${projectName}...`,
                status: 'loading',
                duration: 2000
            },
            {
                text: 'Authenticating session credentials...',
                status: 'success',
                duration: 2200
            },
            {
                text: 'Verifying access permissions...',
                status: 'success',
                duration: 2100
            },
            {
                text: 'Scanning authorization levels...',
                status: 'loading',
                duration: 2300
            },
            {
                text: 'Checking project visibility status...',
                status: 'loading',
                duration: 2000
            }
        ];

        const sequence = isGranted ? [
            ...baseSequence,
            {
                text: 'ACCESS GRANTED - Connection established to live server',
                status: 'success',
                duration: 2500
            }
        ] : [
            ...baseSequence,
            {
                text: 'ACCESS DENIED - Project is in private development mode',
                status: 'error',
                duration: 2500
            }
        ];

        let timeoutIds = [];

        const processLine = (index) => {
            if (index >= sequence.length) {
                const finalTimeout = setTimeout(() => {
                    setStage(isGranted ? 'granted' : 'denied');
                }, 1500);
                timeoutIds.push(finalTimeout);
                return;
            }

            const { text, status, duration } = sequence[index];
            setCurrentLine({ text: '', status });

            const chars = text.split('');
            const charDelay = duration / chars.length;

            chars.forEach((char, charIndex) => {
                const charTimeout = setTimeout(() => {
                    setCurrentLine(prev => ({
                        ...prev,
                        text: prev.text + char
                    }));

                    if (charIndex === chars.length - 1) {
                        const completeTimeout = setTimeout(() => {
                            setTerminalLines(prev => [...prev, { text, status }]);
                            setCurrentLine({ text: '', status: 'loading' });
                            processLine(index + 1);
                        }, 300);
                        timeoutIds.push(completeTimeout);
                    }
                }, charIndex * charDelay);
                timeoutIds.push(charTimeout);
            });
        };

        processLine(0);

        return () => {
            timeoutIds.forEach(id => clearTimeout(id));
        };
    }, [isOpen, stage, projectName]);

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const StatusIcon = ({ status }) => {
        if (status === 'success') return <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />;
        if (status === 'error') return <AlertCircle size={16} className="text-red-500 flex-shrink-0" />;
        return <Loader2 size={16} className="text-blue-500 animate-spin flex-shrink-0" />;
    };

    return (
        <>
            {/* Ultra-Premium Glassmorphism backdrop */}
            <div
                className="fixed inset-0 bg-background/40 backdrop-blur-[40px] saturate-[200%] z-[100] transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{ animation: 'backdropFade 0.8s cubic-bezier(0.16,1,0.3,1)' }}
                onClick={onClose}
            />

            {/* Modal - fully theme aware */}
            <div
                className="fixed inset-0 z-[101] flex items-center justify-center p-4 md:p-8 pointer-events-none"
                style={{ animation: 'modalEntry 1s cubic-bezier(0.16, 1, 0.3, 1)' }}
            >
                <div
                    className="bg-background/90 backdrop-blur-3xl border border-white/10 w-full max-w-5xl max-h-[90vh] overflow-hidden pointer-events-auto relative shadow-[0_0_100px_rgba(0,0,0,0.5)] rounded-xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 md:top-8 md:right-8 z-10 w-10 h-10 flex items-center justify-center text-muted hover:text-foreground transition-all duration-300 hover:rotate-90 hover:scale-110"
                        aria-label="Close"
                    >
                        <X size={22} />
                    </button>

                    {/* Content */}
                    <div className="overflow-y-auto max-h-[90vh] custom-scrollbar">
                        {stage === 'loading' ? (
                            /* ===== LOADING STAGE: ORBITAL AUTHORIZATION SEQUENCE ===== */
                            <div className="relative flex flex-col items-center justify-center min-h-[560px] overflow-hidden">

                                {/* ── Deep Atmosphere / Multi-Layer Ambient Bloom ─────── */}
                                <div className="absolute inset-0 pointer-events-none select-none">
                                    {/* Core halo */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] rounded-full"
                                        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, rgba(139,92,246,0.10) 40%, transparent 70%)', animation: 'bloomPulse 4s ease-in-out infinite' }} />
                                    {/* Outer aurora */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px] rounded-full"
                                        style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, rgba(236,72,153,0.06) 50%, transparent 70%)', animation: 'bloomPulse 6s ease-in-out infinite', animationDelay: '2s' }} />
                                </div>

                                {/* ── Content ─────────────────────────────────────────── */}
                                <div className="relative z-10 flex flex-col items-center w-full px-8 md:px-16">

                                    {/* Triple Ring Orbital System */}
                                    <div className="relative flex items-center justify-center mb-10" style={{ width: '240px', height: '240px' }}>

                                        {/* Track ring (static) */}
                                        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 240 240">
                                            <circle cx="120" cy="120" r="116" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                                            <circle cx="120" cy="120" r="96" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                                            <circle cx="120" cy="120" r="76" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                                        </svg>

                                        {/* Outer progress arc — blue/pink */}
                                        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 240 240">
                                            <defs>
                                                <linearGradient id="outerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                                    <stop offset="0%" stopColor="#3b82f6" />
                                                    <stop offset="100%" stopColor="#ec4899" />
                                                </linearGradient>
                                            </defs>
                                            <circle
                                                cx="120" cy="120" r="116"
                                                fill="none" stroke="url(#outerGrad)" strokeWidth="2.5"
                                                strokeLinecap="round"
                                                strokeDasharray="729.0"
                                                strokeDashoffset={729.0 - (729.0 * Math.min(terminalLines.length / 6, 1))}
                                                style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)', filter: 'drop-shadow(0 0 6px rgba(99,102,241,0.6))' }}
                                            />
                                        </svg>

                                        {/* Mid spinning ring — purple, counter-clockwise */}
                                        <div className="absolute rounded-full border border-purple-500/30"
                                            style={{
                                                width: '192px', height: '192px', animation: 'spinCCW 8s linear infinite',
                                                borderImage: 'linear-gradient(to right, rgba(168,85,247,0.6), transparent 50%) 1'
                                            }}>
                                            {/* Dot on ring */}
                                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-purple-400"
                                                style={{ boxShadow: '0 0 8px rgba(168,85,247,0.9)' }} />
                                        </div>

                                        {/* Inner spinning ring — blue, clockwise */}
                                        <div className="absolute rounded-full border border-blue-500/25"
                                            style={{ width: '152px', height: '152px', animation: 'spinCW 5s linear infinite' }}>
                                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-400"
                                                style={{ boxShadow: '0 0 8px rgba(59,130,246,0.9)' }} />
                                        </div>

                                        {/* Center numerical display */}
                                        <div className="absolute flex flex-col items-center justify-center select-none">
                                            <span
                                                className="font-light tabular-nums leading-none"
                                                style={{ fontFamily: 'Inter, sans-serif', fontSize: '52px', letterSpacing: '-0.04em', color: isDark ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.9)' }}
                                            >
                                                {Math.round(Math.min(terminalLines.length / 6, 1) * 100)}
                                            </span>
                                            <span className="font-mono text-[10px] tracking-[0.35em] uppercase mt-1" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)' }}>
                                                percent
                                            </span>
                                        </div>
                                    </div>

                                    {/* Project Name */}
                                    <h2
                                        className={`text-3xl md:text-4xl font-light tracking-tight mb-1 ${isDark ? 'text-white/90' : 'text-black/90'}`}
                                        style={{ fontFamily: 'Cormorant Garamond, serif' }}
                                    >
                                        {projectName}
                                    </h2>
                                    <p className={`font-mono text-[9px] uppercase tracking-[0.45em] mb-8 ${isDark ? 'text-white/30' : 'text-black/40'}`}>
                                        Authorization Sequence
                                    </p>

                                    {/* Step-by-step Diagnostic Feed */}
                                    <div className="w-full max-w-md space-y-2 mb-8">
                                        {[
                                            'Initializing secure channel',
                                            'Authenticating credentials',
                                            'Verifying access permissions',
                                            'Scanning authorization levels',
                                            'Checking project visibility',
                                            'Finalizing handshake'
                                        ].map((label, i) => {
                                            const done = i < terminalLines.length;
                                            const active = i === terminalLines.length;
                                            return (
                                                <div key={i} className="flex items-center gap-3 transition-all duration-500"
                                                    style={{ opacity: done ? 0.5 : active ? 1 : 0.2 }}>
                                                    {/* Step indicator */}
                                                    <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                                                        style={{
                                                            background: done ? 'rgba(34,197,94,0.15)' : active ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                                                            border: `1px solid ${done ? 'rgba(34,197,94,0.5)' : active ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.08)'}`,
                                                            boxShadow: active ? '0 0 10px rgba(99,102,241,0.4)' : 'none',
                                                        }}>
                                                        {done ? (
                                                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                                                <path d="M2 5l2 2 4-4" stroke="rgba(34,197,94,0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                        ) : active ? (
                                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                                                        ) : (
                                                            <div className="w-1 h-1 rounded-full bg-white/20" />
                                                        )}
                                                    </div>
                                                    {/* Label */}
                                                    <span className="font-mono text-[11px] tracking-wide"
                                                        style={{ color: done ? (isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)') : active ? (isDark ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.95)') : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.25)') }}>
                                                        {label}
                                                        {active && currentLine.text && (
                                                            <span className={isDark ? "ml-2 text-indigo-400/80" : "ml-2 text-indigo-600/80"}>— {currentLine.text.slice(-40)}</span>
                                                        )}
                                                    </span>
                                                    {/* Done timestamp */}
                                                    {done && (
                                                        <span className="ml-auto font-mono text-[9px] text-green-500/60">✓</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Footer metadata */}
                                    <div className={`w-full max-w-md flex items-center justify-between pt-5 border-t ${isDark ? 'border-white/[0.06]' : 'border-black/[0.06]'}`}>
                                        <div>
                                            <p className={`font-mono text-[8px] uppercase tracking-[0.3em] mb-1 ${isDark ? 'text-white/25' : 'text-black/30'}`}>Session</p>
                                            <p className={`font-mono text-[10px] ${isDark ? 'text-blue-400/70' : 'text-blue-600/80'}`}>{accessToken}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-mono text-[8px] uppercase tracking-[0.3em] mb-1 ${isDark ? 'text-white/25' : 'text-black/30'}`}>Protocol</p>
                                            <p className={`font-mono text-[10px] ${isDark ? 'text-white/50' : 'text-black/60'}`}>AES-256-GCM</p>
                                        </div>
                                    </div>

                                </div>

                                <style>{`
                                    @keyframes bloomPulse {
                                        0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                                        50% { transform: translate(-50%, -50%) scale(1.08); opacity: 0.7; }
                                    }
                                    @keyframes spinCW {
                                        from { transform: rotate(0deg); }
                                        to   { transform: rotate(360deg); }
                                    }
                                    @keyframes spinCCW {
                                        from { transform: rotate(0deg); }
                                        to   { transform: rotate(-360deg); }
                                    }
                                `}</style>
                            </div>
                        ) : stage === 'denied' ? (
                            <div className="px-8 md:px-16 py-12 md:py-20">
                                {/* Header */}
                                <div className="mb-12 md:mb-16">
                                    <div className="flex items-center gap-3 mb-6">
                                        <AlertCircle size={20} className="text-red-500" />
                                        <span className="text-xs uppercase tracking-[0.2em] text-muted">Access Restricted</span>
                                    </div>
                                    <h1
                                        className="text-5xl md:text-7xl font-light leading-[1.1] text-foreground mb-6"
                                        style={{ fontFamily: 'Cormorant Garamond, serif' }}
                                    >
                                        Private Development<br />Zone
                                    </h1>
                                    <p className="text-xl md:text-2xl text-muted italic max-w-2xl leading-relaxed">
                                        "Curiosity is the engine of achievement"
                                    </p>
                                    <p className="text-muted mt-2">— Richard Feynman</p>
                                </div>

                                {/* Message */}
                                <div className="mb-12 md:mb-16 max-w-3xl">
                                    <p className="text-lg md:text-xl text-muted leading-relaxed mb-10">
                                        You've reached my private development zone. While I'd love to show you everything,
                                        some projects remain confidential as they're actively evolving.
                                    </p>

                                    {/* Status items */}
                                    <div className="space-y-5 mb-12 border-l-2 border-border pl-6">
                                        <div className="flex items-start gap-3">
                                            <CheckCircle2 size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                                            <div className="text-muted">
                                                Request logged as{' '}
                                                <span className="font-mono text-sm text-foreground border border-border bg-accent px-2 py-1 rounded">
                                                    {accessToken}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <CheckCircle2 size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                                            <div className="text-muted">
                                                Added to <span className="text-foreground italic">Eager Innovators</span> list
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <CheckCircle2 size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                                            <div className="text-muted">
                                                Project attempted: <span className="text-foreground">{projectName}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Instructions */}
                                    <div className="border-t border-border pt-10">
                                        <h3 className="text-xl md:text-2xl font-light mb-6 text-foreground">
                                            Interested in collaboration?
                                        </h3>
                                        <ol className="space-y-5 text-muted">
                                            <li className="flex gap-5">
                                                <span className="text-muted/40 font-mono text-sm">01</span>
                                                <span>Connect with me on LinkedIn with a personalized message</span>
                                            </li>
                                            <li className="flex gap-5">
                                                <span className="text-muted/40 font-mono text-sm">02</span>
                                                <span>
                                                    Mention your access ID:{' '}
                                                    <span className="font-mono text-sm text-foreground">{accessToken}</span>
                                                </span>
                                            </li>
                                            <li className="flex gap-5">
                                                <span className="text-muted/40 font-mono text-sm">03</span>
                                                <span>I'll personally share relevant insights and discuss opportunities</span>
                                            </li>
                                        </ol>
                                    </div>
                                </div>

                                {/* Stats - theme aware */}
                                <div className="mb-12 md:mb-16">
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                        <h2
                                            className="text-2xl md:text-3xl font-light text-foreground"
                                            style={{ fontFamily: 'Cormorant Garamond, serif' }}
                                        >
                                            Live Analytics
                                        </h2>
                                    </div>

                                    <div className="grid md:grid-cols-3 gap-6">
                                        <div className="group border border-border bg-accent p-8 hover:border-muted transition-all duration-500 stat-card">
                                            <div className="text-[10px] uppercase tracking-[0.2em] text-muted mb-4 font-medium">
                                                Total Attempts
                                            </div>
                                            <div className="text-5xl font-light text-foreground group-hover:text-blue-500 transition-colors duration-500">
                                                {stats.totalAttempts.toLocaleString()}
                                            </div>
                                        </div>

                                        <div className="group border border-border bg-accent p-8 hover:border-muted transition-all duration-500 stat-card">
                                            <div className="text-[10px] uppercase tracking-[0.2em] text-muted mb-4 font-medium">
                                                Today
                                            </div>
                                            <div className="text-5xl font-light text-foreground group-hover:text-green-500 transition-colors duration-500">
                                                {stats.todayAttempts}
                                            </div>
                                        </div>

                                        <div className="group border border-border bg-accent p-8 hover:border-muted transition-all duration-500 stat-card">
                                            <div className="text-[10px] uppercase tracking-[0.2em] text-muted mb-4 font-medium">
                                                Your Position
                                            </div>
                                            <div className="text-5xl font-light text-foreground group-hover:text-purple-500 transition-colors duration-500">
                                                #{stats.yourPosition}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions - theme aware */}
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <a
                                        href={siteConfig.linkedIn}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group px-10 py-5 bg-foreground text-background text-center font-medium hover:opacity-90 transition-all duration-300 relative overflow-hidden"
                                    >
                                        <span className="relative z-10">Connect on LinkedIn</span>
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                                    </a>
                                    <button
                                        onClick={onClose}
                                        className="px-10 py-5 border border-border text-foreground hover:border-muted hover:bg-accent transition-all duration-300"
                                    >
                                        Back to Portfolio
                                    </button>
                                </div>

                                {/* Footer */}
                                <div className="mt-12 text-sm text-muted/60">
                                    <p>Your interest has been recorded. Thank you for your curiosity.</p>
                                </div>
                            </div>
                        ) : (
                            /* ===== GRANTED STAGE: CINEMATIC REVEAL ===== */
                            <div className="relative overflow-hidden">

                                {/* Ambient green halo at top */}
                                <div className="absolute top-0 left-0 right-0 h-[2px] z-10"
                                    style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(34,197,94,0.7) 30%, rgba(99,102,241,0.8) 70%, transparent 100%)' }} />
                                <div className="absolute top-0 left-1/4 w-1/2 h-[200px] pointer-events-none"
                                    style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(34,197,94,0.08) 0%, transparent 70%)' }} />

                                <div className="px-8 md:px-12 pt-12 pb-10">

                                    {/* ── Top bar: status + badge ─────────────────────── */}
                                    <div className="flex items-center justify-between mb-8">
                                        <div className="flex items-center gap-3">
                                            {/* Animated green checkmark */}
                                            <div className="relative w-5 h-5">
                                                <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" style={{ animationDuration: '2.5s' }} />
                                                <div className="relative w-5 h-5 rounded-full bg-green-500/15 border border-green-500/40 flex items-center justify-center">
                                                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                                        <path d="M2 5l2 2 4-4" stroke="rgba(34,197,94,1)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </div>
                                            </div>
                                            <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-green-400/80">Access Granted</span>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-green-500/20 bg-green-500/5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                            <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-green-400/70">System Online</span>
                                        </div>
                                    </div>

                                    {/* ── Project Name Hero lockup ────────────────────── */}
                                    <div className="mb-10">
                                        <h1
                                            className="text-5xl md:text-7xl font-light leading-[1] tracking-tight mb-3 relative inline-block"
                                            style={{ fontFamily: 'Cormorant Garamond, serif' }}
                                        >
                                            <span
                                                className="text-transparent bg-clip-text"
                                                style={{ backgroundImage: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0.6) 100%)' }}
                                            >
                                                {projectName}
                                            </span>
                                        </h1>
                                        <p className="text-sm text-white/40 italic font-light tracking-wide">
                                            "Production is where theory meets reality."
                                        </p>
                                    </div>

                                    {/* ── Browser Preview Card ─────────────────────────── */}
                                    {/* ── System Ready Interface (Internal) ───────────────── */}
                                    <div
                                        className="relative rounded-2xl overflow-hidden mb-8 p-12 flex flex-col items-center justify-center text-center group"
                                        style={{
                                            background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                                            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
                                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
                                            minHeight: '320px'
                                        }}
                                    >
                                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-40 blur-[80px]" />
                                        </div>

                                        <div className="relative z-10 mb-6">
                                            {projectName === 'Classrooms' && <LayoutDashboard size={64} className="text-blue-500/60" />}
                                            {projectName === 'Courses' && <GraduationCap size={64} className="text-purple-500/60" />}
                                            {projectName === 'Library' && <LibraryIcon size={64} className="text-emerald-500/60" />}
                                            {projectName === 'Exam Mode' && <ClipboardCheck size={64} className="text-amber-500/60" />}
                                            {projectName === 'Calendar' && <CalendarIcon size={64} className="text-indigo-500/60" />}
                                        </div>

                                        <h3 className={`text-2xl font-light mb-4 ${isDark ? 'text-white' : 'text-black'}`} style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                                            Handshake Successful
                                        </h3>
                                        <p className={`text-sm max-w-sm mb-8 ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                                            Secure tunnel established to the {projectName} engine. System is primed and awaiting your directive.
                                        </p>
                                    </div>

                                    {/* ── Primary CTA: Internal Navigation ─────────────── */}
                                    <button
                                        onClick={() => {
                                            const routes = {
                                                'Classrooms': '/dashboard',
                                                'Courses': '/courses',
                                                'Library': '/library',
                                                'Exam Mode': '/exam',
                                                'Calendar': '/schedule'
                                            };
                                            navigate(routes[projectName] || '/dashboard');
                                            onClose();
                                        }}
                                        className="group flex items-center justify-center gap-3 w-full py-4 rounded-xl mb-4 font-medium text-white transition-all duration-500 hover:shadow-[0_12px_40px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 relative overflow-hidden"
                                        style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)', backgroundSize: '200% 200%' }}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-700" />
                                        <span className="relative z-10 tracking-wide">Enter {projectName} System</span>
                                        <ArrowRight size={16} className="relative z-10 group-hover:translate-x-1 transition-transform duration-300" />
                                    </button>

                                    {/* ── Secondary row: GitHub + LinkedIn ───────────── */}
                                    <div className="grid grid-cols-2 gap-3 mb-8">
                                        <a
                                            href={siteConfig.github}
                                            target="_blank" rel="noopener noreferrer"
                                            className="group flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-mono text-white/60 hover:text-white/90 transition-all duration-300 hover:-translate-y-0.5"
                                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                                        >
                                            <Github size={15} className="group-hover:text-white transition-colors" />
                                            System Source
                                        </a>
                                        <a
                                            href={siteConfig.linkedIn}
                                            target="_blank" rel="noopener noreferrer"
                                            className="group flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-mono text-white/60 hover:text-white/90 transition-all duration-300 hover:-translate-y-0.5"
                                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                                        >
                                            <Linkedin size={15} className="group-hover:text-blue-400 transition-colors" />
                                            Collective
                                        </a>
                                    </div>

                                    {/* ── Footer bar: session info ─────────────────────── */}
                                    <div className="flex items-center justify-between pt-5 border-t border-white/[0.06]">
                                        <div>
                                            <p className="font-mono text-[8px] uppercase tracking-[0.3em] text-white/25 mb-1">Session ID</p>
                                            <p className="font-mono text-[10px] text-blue-400/70">{accessToken}</p>
                                        </div>
                                        <button
                                            onClick={onClose}
                                            className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30 hover:text-white/60 transition-colors"
                                        >
                                            Close
                                        </button>
                                    </div>

                                </div>
                            </div>
                        )}
                    </div >
                </div >
            </div >

            <style>{`
        @keyframes backdropFade {
          from { opacity: 0; backdrop-filter: blur(0px); }
          to { opacity: 1; backdrop-filter: blur(12px); }
        }

        @keyframes modalEntry {
          from {
            opacity: 0;
            transform: translateY(40px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes lineSlideIn {
          from {
            opacity: 0;
            transform: translateX(-12px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes decryptionEntry {
          0% {
            opacity: 0;
            transform: translateX(-10px);
            filter: blur(4px);
            font-weight: 100;
          }
          50% {
            opacity: 0.5;
            font-weight: 900;
          }
          100% {
            opacity: 1;
            transform: translateX(0);
            filter: blur(0);
            font-weight: 400;
          }
        }

        /* Terminal glow effect */
        .terminal-glow {
          box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.03);
        }

        .light .terminal-glow {
          box-shadow: inset 0 1px 0 0 rgba(0, 0, 0, 0.05);
        }

        /* Stat card effects */
        .stat-card {
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .stat-card:hover {
          transform: translateY(-2px);
        }

        @keyframes termLineIn {
          from { opacity: 0; transform: translateX(-8px); filter: blur(2px); }
          to   { opacity: 1; transform: translateX(0);    filter: blur(0); }
        }

        @keyframes termBlink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: var(--background);
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 0;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--muted);
        }
      `}</style>
        </>
    );
};

export default ProjectAccessModal;
