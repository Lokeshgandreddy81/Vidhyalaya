import React, { useEffect } from 'react';
import Lenis from '@studio-freight/lenis';

const SmoothScroll = ({ children }) => {
    useEffect(() => {
        // Initialize Lenis for industry-standard native smooth scrolling
        const lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Seamless easing
            direction: 'vertical', // vertical, horizontal
            gestureDirection: 'vertical', // vertical, horizontal, both
            smooth: true,
            mouseMultiplier: 1,
            smoothTouch: false, // Leave mobile scrolling to native OS momentum
            touchMultiplier: 2,
            infinite: false,
        });

        window.lenis = lenis;

        // Broadcast scroll position to CSS variable for parallax components
        // We use requestAnimationFrame to ensure CSS updates are synced with display refresh
        const updateScroll = ({ scroll }) => {
            document.documentElement.style.setProperty('--scroll-y', scroll);
        };

        lenis.on('scroll', updateScroll);

        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }

        requestAnimationFrame(raf);

        // Reset scroll value on mount
        document.documentElement.style.setProperty('--scroll-y', window.scrollY);

        // Cleanup
        return () => {
            lenis.destroy();
        };
    }, []);

    // We no longer need a 'fixed' wrapper or a fake window height! 
    // Lenis works directly with the native body scroll.
    return (
        <div className="w-full relative">
            {children}
        </div>
    );
};

export default SmoothScroll;
