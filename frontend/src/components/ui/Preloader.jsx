import React, { useEffect, useState } from 'react';

const Preloader = ({ onComplete }) => {
    const [percent, setPercent] = useState(0);
    const [isRevealing, setIsRevealing] = useState(false);
    const [isDone, setIsDone] = useState(false);

    useEffect(() => {
        let currentPercent = 0;
        // Cinematic, non-linear easing for the counter
        const tick = () => {
            currentPercent += Math.random() * 5;
            if (currentPercent >= 100) {
                setPercent(100);
                setTimeout(() => setIsRevealing(true), 400); // Pause at 100%
                setTimeout(() => {
                    setIsDone(true);
                    onComplete();
                }, 1800); // Wait for reveal animation to finish
            } else {
                setPercent(Math.floor(currentPercent));
                const nextTick = Math.max(20, 100 - (currentPercent * 0.8)); // Speeds up near the end
                setTimeout(tick, nextTick);
            }
        };

        // Initial delay before counting
        setTimeout(tick, 200);
    }, [onComplete]);

    if (isDone) return null;

    return (
        <div
            className={`fixed inset-0 z-[999999] bg-[#0a0a0a] flex flex-col justify-between p-8 md:p-12 transition-transform duration-[1.4s] ease-[cubic-bezier(0.85,0,0.15,1)] ${isRevealing ? '-translate-y-full' : 'translate-y-0'}`}
        >
            <div className="w-full flex justify-between items-start text-white/50 overflow-hidden">
                <span
                    className="font-mono text-xs uppercase tracking-[0.4em]"
                    style={{
                        transform: isRevealing ? 'translateY(-100%)' : 'translateY(0)',
                        transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                        transitionDelay: '0.1s'
                    }}
                >
                    {new Date().getFullYear()} // Portfolio
                </span>
                <span
                    className="font-mono text-xs uppercase tracking-[0.4em]"
                    style={{
                        transform: isRevealing ? 'translateY(-100%)' : 'translateY(0)',
                        transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                        transitionDelay: '0.2s'
                    }}
                >
                    Loading Assets
                </span>
            </div>

            <div className="w-full flex justify-end items-end overflow-hidden">
                <span
                    className="text-[15vw] md:text-[12rem] text-white leading-none font-light tracking-tighter"
                    style={{
                        fontFamily: 'Cormorant Garamond, serif',
                        transform: isRevealing ? 'translateY(100%)' : 'translateY(0)',
                        transition: 'transform 1s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                >
                    {percent}%
                </span>
            </div>
        </div>
    );
};

export default Preloader;
