import React from 'react';
import useScrollReveal, { getAnimationStyle } from '../../hooks/useScrollReveal';

const Houseplant = ({ className = "" }) => {
  const [ref, isVisible] = useScrollReveal({ threshold: 0.3, delay: 180 });

  return (
    <div ref={ref} style={getAnimationStyle('bounce', isVisible)}>
      <svg
        width="200"
        height="240"
        viewBox="0 0 160 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {/* Pot - solid and stable */}
        <path
          d="M50 180 L55 200 L105 200 L110 180 Z"
          stroke="currentColor"
          strokeWidth="2.5"
          fill="none"
          opacity="0.6"
          style={{
            strokeDasharray: '200',
            strokeDashoffset: isVisible ? '0' : '200',
            transition: 'stroke-dashoffset 1.2s cubic-bezier(0.43, 0.13, 0.23, 0.96) 0.1s'
          }}
        />
        <line
          x1="45"
          y1="180"
          x2="115"
          y2="180"
          stroke="currentColor"
          strokeWidth="2.5"
          opacity="0.6"
          style={{
            strokeDasharray: '70',
            strokeDashoffset: isVisible ? '0' : '70',
            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.43, 0.13, 0.23, 0.96) 0.2s'
          }}
        />
        <line
          x1="48"
          y1="175"
          x2="112"
          y2="175"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.5"
          style={{
            strokeDasharray: '64',
            strokeDashoffset: isVisible ? '0' : '64',
            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.43, 0.13, 0.23, 0.96) 0.3s'
          }}
        />

        {/* Main stems - grow from pot */}
        <path
          d="M70 180 Q65 150, 55 120"
          stroke="currentColor"
          strokeWidth="2.5"
          opacity="0.6"
          style={{
            strokeDasharray: '75',
            strokeDashoffset: isVisible ? '0' : '75',
            transition: 'stroke-dashoffset 1.4s cubic-bezier(0.43, 0.13, 0.23, 0.96) 0.5s'
          }}
        />
        <path
          d="M80 180 Q80 150, 80 120"
          stroke="currentColor"
          strokeWidth="2.5"
          opacity="0.6"
          style={{
            strokeDasharray: '60',
            strokeDashoffset: isVisible ? '0' : '60',
            transition: 'stroke-dashoffset 1.4s cubic-bezier(0.43, 0.13, 0.23, 0.96) 0.6s'
          }}
        />
        <path
          d="M90 180 Q95 150, 105 120"
          stroke="currentColor"
          strokeWidth="2.5"
          opacity="0.6"
          style={{
            strokeDasharray: '75',
            strokeDashoffset: isVisible ? '0' : '75',
            transition: 'stroke-dashoffset 1.4s cubic-bezier(0.43, 0.13, 0.23, 0.96) 0.7s'
          }}
        />

        {/* Large leaves - unfurl */}
        <path
          d="M55 120 C40 110, 30 95, 35 80 C38 70, 48 68, 58 75 L55 120"
          stroke="currentColor"
          strokeWidth="2.5"
          fill="none"
          opacity="0.6"
          style={{
            strokeDasharray: '120',
            strokeDashoffset: isVisible ? '0' : '120',
            transition: 'stroke-dashoffset 1.6s cubic-bezier(0.34, 1.56, 0.64, 1) 1.0s'
          }}
        />
        <path
          d="M80 120 C80 105, 75 85, 80 70 C85 60, 95 60, 100 70 L85 115"
          stroke="currentColor"
          strokeWidth="2.5"
          fill="none"
          opacity="0.6"
          style={{
            strokeDasharray: '120',
            strokeDashoffset: isVisible ? '0' : '120',
            transition: 'stroke-dashoffset 1.6s cubic-bezier(0.34, 1.56, 0.64, 1) 1.2s'
          }}
        />
        <path
          d="M105 120 C120 110, 130 95, 125 80 C122 70, 112 68, 102 75 L105 120"
          stroke="currentColor"
          strokeWidth="2.5"
          fill="none"
          opacity="0.6"
          style={{
            strokeDasharray: '120',
            strokeDashoffset: isVisible ? '0' : '120',
            transition: 'stroke-dashoffset 1.6s cubic-bezier(0.34, 1.56, 0.64, 1) 1.4s'
          }}
        />

        {/* Small leaves */}
        <path
          d="M65 140 C55 138, 50 132, 52 125 C54 120, 60 122, 65 125"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          opacity="0.5"
          style={{
            strokeDasharray: '40',
            strokeDashoffset: isVisible ? '0' : '40',
            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.43, 0.13, 0.23, 0.96) 1.6s'
          }}
        />
        <path
          d="M95 140 C105 138, 110 132, 108 125 C106 120, 100 122, 95 125"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          opacity="0.5"
          style={{
            strokeDasharray: '40',
            strokeDashoffset: isVisible ? '0' : '40',
            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.43, 0.13, 0.23, 0.96) 1.7s'
          }}
        />

        {/* Leaf veins - fade in */}
        {[
          { x1: 48, y1: 95, x2: 52, y2: 85, delay: 2.0 },
          { x1: 45, y1: 88, x2: 50, y2: 82, delay: 2.1 },
          { x1: 85, y1: 85, x2: 88, y2: 75, delay: 2.2 },
          { x1: 83, y1: 92, x2: 86, y2: 82, delay: 2.3 },
          { x1: 112, y1: 95, x2: 108, y2: 85, delay: 2.4 },
          { x1: 115, y1: 88, x2: 110, y2: 82, delay: 2.5 }
        ].map((vein, i) => (
          <path
            key={i}
            d={`M${vein.x1} ${vein.y1} L${vein.x2} ${vein.y2}`}
            stroke="currentColor"
            strokeWidth="1.5"
            opacity={isVisible ? 0.4 : 0}
            style={{ transition: `opacity 0.5s ease ${vein.delay}s` }}
          />
        ))}
      </svg>

      {/* Gentle breathing motion */}
      <style>{`
        ${isVisible ? `
          @keyframes plantBreathe {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.02); }
          }
          .decorative-svg {
            animation: plantBreathe 6s ease-in-out infinite;
            transform-origin: center bottom;
          }
        ` : ''}
      `}</style>
    </div>
  );
};

export default Houseplant;