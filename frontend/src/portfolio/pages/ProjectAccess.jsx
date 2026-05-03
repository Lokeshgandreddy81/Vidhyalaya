import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, TrendingUp, Users, ArrowRight } from 'lucide-react';
import siteConfig from '../config/siteConfig';

const ProjectAccess = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(0);
    const [terminalLines, setTerminalLines] = useState([]);
    const [accessToken, setAccessToken] = useState('');
    const [stats, setStats] = useState({
        totalAttempts: 0,
        todayAttempts: 0,
        yourPosition: 0
    });

    const projectName = searchParams.get('project') || 'Unknown Project';

    // Generate unique access token
    const generateToken = () => {
        const randomStr = Math.random().toString(36).substr(2, 4).toUpperCase();
        return `CT-${randomStr}-${new Date().getFullYear()}`;
    };

    // Initialize counter and token
    useEffect(() => {
        const token = generateToken();
        setAccessToken(token);

        // Get current stats from localStorage
        const storedData = localStorage.getItem('projectAccessStats');
        let data = storedData ? JSON.parse(storedData) : {
            totalAttempts: 0,
            todayAttempts: 0,
            lastDate: new Date().toDateString(),
            attempts: []
        };

        // Reset today's count if it's a new day
        if (data.lastDate !== new Date().toDateString()) {
            data.todayAttempts = 0;
            data.lastDate = new Date().toDateString();
        }

        // Log this attempt
        const newAttempt = {
            id: token,
            timestamp: new Date().toISOString(),
            project: projectName,
            userAgent: navigator.userAgent
        };

        data.totalAttempts += 1;
        data.todayAttempts += 1;
        data.attempts.push(newAttempt);

        // Keep only last 100 attempts
        if (data.attempts.length > 100) {
            data.attempts = data.attempts.slice(-100);
        }

        localStorage.setItem('projectAccessStats', JSON.stringify(data));

        setStats({
            totalAttempts: data.totalAttempts,
            todayAttempts: data.todayAttempts,
            yourPosition: data.totalAttempts
        });
    }, [projectName]);

    // Simulate loading animation
    useEffect(() => {
        const terminalMessages = [
            '$ Authenticating credentials...',
            '$ Connecting to secure repository...',
            '$ Verifying access permissions...',
            '$ Loading project assets...',
            '$ Analyzing security protocols...',
            '$ ACCESS DENIED - Insufficient permissions'
        ];

        let currentLine = 0;
        let progressInterval;

        const lineInterval = setInterval(() => {
            if (currentLine < terminalMessages.length) {
                setTerminalLines(prev => [...prev, terminalMessages[currentLine]]);
                currentLine++;
            } else {
                clearInterval(lineInterval);
                setTimeout(() => setLoading(false), 500);
            }
        }, 500);

        // Progress bar animation
        progressInterval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 95) return 95;
                return prev + Math.random() * 15;
            });
        }, 200);

        return () => {
            clearInterval(lineInterval);
            clearInterval(progressInterval);
        };
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
                <div className="w-full max-w-2xl">
                    {/* Terminal Window */}
                    <div className="bg-[#1a1a1a] rounded-lg border border-[#333] shadow-2xl overflow-hidden">
                        {/* Terminal Header */}
                        <div className="bg-[#2a2a2a] px-4 py-3 flex items-center gap-2 border-b border-[#333]">
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                                <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                                <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                            </div>
                            <div className="flex-1 text-center text-xs text-[#888]">
                                lokesh@portfolio ~ secure-access
                            </div>
                        </div>

                        {/* Terminal Body */}
                        <div className="p-6 font-mono">
                            {terminalLines.map((line, idx) => (
                                <div key={idx} className="mb-2">
                                    <span className="text-green-400 animate-pulse">{line}</span>
                                </div>
                            ))}
                            <div className="mt-4">
                                <div className="h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <div className="text-xs text-[#666] mt-2 text-right">
                                    {Math.round(progress)}%
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white py-20 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Main Message */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 mb-6">
                        <Lock size={40} className="text-red-400" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4 font-[Cormorant_Garamond]">
                        Access Restricted
                    </h1>
                    <p className="text-xl text-[#888] italic mb-2">
                        "Curiosity is the engine of achievement" — Richard Feynman
                    </p>
                </div>

                {/* Access Details Card */}
                <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-8 mb-8">
                    <p className="text-lg text-[#ccc] mb-6 leading-relaxed">
                        Hi there! You've reached <span className="text-white font-semibold">Lokesh's private development zone</span>.
                        While I'd love to show you everything, some projects remain confidential as they're actively evolving.
                    </p>

                    <div className="space-y-3 mb-6">
                        <div className="flex items-start gap-3">
                            <span className="text-green-400 mt-1">✓</span>
                            <span className="text-[#ccc]">
                                This interaction has been logged as{' '}
                                <span className="font-mono text-blue-400 bg-blue-400/10 px-2 py-1 rounded">
                                    {accessToken}
                                </span>
                            </span>
                        </div>
                        <div className="flex items-start gap-3">
                            <span className="text-green-400 mt-1">✓</span>
                            <span className="text-[#ccc]">
                                You're now part of the <span className="text-purple-400 font-semibold">"Eager Innovators"</span> list
                            </span>
                        </div>
                        <div className="flex items-start gap-3">
                            <span className="text-green-400 mt-1">✓</span>
                            <span className="text-[#ccc]">
                                Project attempted: <span className="text-white font-semibold">{projectName}</span>
                            </span>
                        </div>
                    </div>

                    <div className="border-t border-[#333] pt-6">
                        <h3 className="text-lg font-semibold mb-3 text-white">Want real access?</h3>
                        <ol className="space-y-2 text-[#ccc]">
                            <li className="flex items-start gap-3">
                                <span className="text-[#666]">1.</span>
                                <span>Connect with me on LinkedIn with a personalized message</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-[#666]">2.</span>
                                <span>
                                    Mention this access attempt ID:{' '}
                                    <span className="font-mono text-blue-400">{accessToken}</span>
                                </span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-[#666]">3.</span>
                                <span>I'll personally share relevant insights!</span>
                            </li>
                        </ol>
                    </div>
                </div>

                {/* Live Stats Dashboard */}
                <div className="space-y-4 mb-8">
                    <h2 className="text-2xl font-serif font-bold font-[Cormorant_Garamond] text-center mb-6">
                        Live Curiosity Dashboard
                    </h2>

                    <div className="grid md:grid-cols-3 gap-4">
                        {/* Total Attempts */}
                        <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg p-6">
                            <div className="flex items-center gap-3 mb-2">
                                <TrendingUp className="text-blue-400" size={24} />
                                <span className="text-sm text-[#888] uppercase tracking-wide">Total Attempts</span>
                            </div>
                            <div className="text-3xl font-bold text-white">{stats.totalAttempts.toLocaleString()}</div>
                        </div>

                        {/* Today's Attempts */}
                        <div className="bg-gradient-to-br from-green-500/10 to-teal-500/10 border border-green-500/30 rounded-lg p-6">
                            <div className="flex items-center gap-3 mb-2">
                                <Users className="text-green-400" size={24} />
                                <span className="text-sm text-[#888] uppercase tracking-wide">Today</span>
                            </div>
                            <div className="text-3xl font-bold text-white">{stats.todayAttempts}</div>
                        </div>

                        {/* Your Position */}
                        <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-lg p-6">
                            <div className="flex items-center gap-3 mb-2">
                                <ArrowRight className="text-orange-400" size={24} />
                                <span className="text-sm text-[#888] uppercase tracking-wide">Your Position</span>
                            </div>
                            <div className="text-3xl font-bold text-white">#{stats.yourPosition}</div>
                        </div>
                    </div>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <a
                        href={siteConfig.linkedIn}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-8 py-3 bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition-colors text-center"
                    >
                        Connect on LinkedIn
                    </a>
                    <button
                        onClick={() => navigate('/')}
                        className="px-8 py-3 border border-[#444] text-white font-semibold rounded-full hover:bg-[#1a1a1a] transition-colors"
                    >
                        Back to Home
                    </button>
                </div>

                {/* Footer Note */}
                <div className="text-center mt-12 text-sm text-[#666]">
                    <p>Your curiosity has been noted. Great minds think alike.</p>
                </div>
            </div>
        </div>
    );
};

export default ProjectAccess;
