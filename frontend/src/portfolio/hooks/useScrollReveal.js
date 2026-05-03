import { useEffect, useRef, useState } from 'react';

/**
 * Premium scroll-triggered animation hook
 * Inspired by Google's Material Design motion principles
 */
export const useScrollReveal = (options = {}) => {
    const elementRef = useRef(null);
    const [isVisible, setIsVisible] = useState(false);

    const {
        threshold = 0.2,
        rootMargin = '0px',
        triggerOnce = true,
        delay = 0
    } = options;

    useEffect(() => {
        const element = elementRef.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        setIsVisible(true);
                    }, delay);

                    if (triggerOnce) {
                        observer.unobserve(element);
                    }
                } else if (!triggerOnce) {
                    setIsVisible(false);
                }
            },
            {
                threshold,
                rootMargin
            }
        );

        observer.observe(element);

        return () => {
            if (element) {
                observer.unobserve(element);
            }
        };
    }, [threshold, rootMargin, triggerOnce, delay]);

    return [elementRef, isVisible];
};

/**
 * Animation variants for different element types
 */
export const animationVariants = {
    // Gentle fade and scale - for organic elements like flowers
    organic: {
        initial: {
            opacity: 0,
            scale: 0.8,
            rotate: -5
        },
        animate: {
            opacity: 1,
            scale: 1,
            rotate: 0,
            transition: {
                duration: 1.2,
                ease: [0.34, 1.56, 0.64, 1] // Overshooting ease for playful feel
            }
        }
    },

    // Slide up with fade - for structural elements
    slideUp: {
        initial: {
            opacity: 0,
            y: 60
        },
        animate: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.8,
                ease: [0.25, 0.1, 0.25, 1] // Material Design standard easing
            }
        }
    },

    // Draw in effect - for line-based SVGs
    draw: {
        initial: {
            opacity: 0,
            pathLength: 0
        },
        animate: {
            opacity: 1,
            pathLength: 1,
            transition: {
                duration: 1.5,
                ease: [0.43, 0.13, 0.23, 0.96]
            }
        }
    },

    // Float in from side - for asymmetric elements
    floatIn: {
        initial: {
            opacity: 0,
            x: -40,
            rotate: -10
        },
        animate: {
            opacity: 1,
            x: 0,
            rotate: 0,
            transition: {
                duration: 1,
                ease: [0.34, 1.56, 0.64, 1]
            }
        }
    },

    // Gentle bounce - for playful elements
    bounce: {
        initial: {
            opacity: 0,
            scale: 0,
            y: 30
        },
        animate: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: {
                duration: 0.9,
                ease: [0.68, -0.55, 0.265, 1.55] // Bouncy ease
            }
        }
    },

    // Stagger children - for multi-part elements
    stagger: {
        initial: {
            opacity: 0
        },
        animate: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
            }
        }
    }
};

/**
 * Get animation style based on variant and visibility
 */
export const getAnimationStyle = (variant, isVisible) => {
    const config = animationVariants[variant] || animationVariants.organic;

    if (!isVisible) {
        return {
            opacity: config.initial.opacity,
            transform: `
        translateY(${config.initial.y || 0}px)
        translateX(${config.initial.x || 0}px)
        scale(${config.initial.scale || 1})
        rotate(${config.initial.rotate || 0}deg)
      `.trim(),
            transition: 'none'
        };
    }

    return {
        opacity: config.animate.opacity,
        transform: `
      translateY(${config.animate.y || 0}px)
      translateX(${config.animate.x || 0}px)
      scale(${config.animate.scale || 1})
      rotate(${config.animate.rotate || 0}deg)
    `.trim(),
        transition: `all ${config.animate.transition.duration}s cubic-bezier(${config.animate.transition.ease.join(', ')})`
    };
};

export default useScrollReveal;
