import React from 'react';
import useScrollReveal, { getAnimationStyle } from '../../hooks/useScrollReveal';

const DJEqualizer = ({ className = "" }) => {
  const [ref, isVisible] = useScrollReveal({ threshold: 0.3, delay: 100 });

  // Bar heights for animation variety
  const bars = [
    { x: 20, baseY: 60, height: 40, delay: 0 },
    { x: 42, baseY: 30, height: 70, delay: 0.1 },
    { x: 64, baseY: 50, height: 50, delay: 0.2 },
    { x: 86, baseY: 20, height: 80, delay: 0.3 },
    { x: 108, baseY: 40, height: 60, delay: 0.4 },
    { x: 130, baseY: 35, height: 65, delay: 0.5 },
    { x: 152, baseY: 55, height: 45, delay: 0.6 }
  ];

  const innerBars = [
    { x: 23, y: 75, h: 18, delay: 0.8 },
    { x: 45, y: 45, h: 40, delay: 0.9 },
    { x: 67, y: 65, h: 25, delay: 1.0 },
    { x: 89, y: 35, h: 50, delay: 1.1 },
    { x: 111, y: 55, h: 35, delay: 1.2 },
    { x: 133, y: 50, h: 38, delay: 1.3 },
    { x: 155, y: 70, h: 20, delay: 1.4 }
  ];

  return (
    <div ref={ref} style={getAnimationStyle('slideUp', isVisible)}>
      <svg
        width="220"
        height="150"
        viewBox="0 0 180 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {/* Equalizer outer bars */}
        {bars.map((bar, i) => (
          <rect
            key={i}
            x={bar.x}
            y={bar.baseY}
            width="14"
            height={bar.height}
            stroke="currentColor"
            strokeWidth="2.5"
            fill="none"
            opacity="0.6"
            style={{
              transform: isVisible ? 'scaleY(1)' : 'scaleY(0)',
              transformOrigin: 'bottom',
              transition: `transform 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) ${bar.delay}s`
            }}
          />
        ))}

        {/* Inner bars for depth */}
        {innerBars.map((bar, i) => (
          <rect
            key={i}
            x={bar.x}
            y={bar.y}
            width="8"
            height={bar.h}
            fill="currentColor"
            opacity="0.3"
            style={{
              transform: isVisible ? 'scaleY(1)' : 'scaleY(0)',
              transformOrigin: 'bottom',
              transition: `transform 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) ${bar.delay}s`
            }}
          />
        ))}

        {/* Baseline */}
        <line
          x1="15"
          y1="105"
          x2="170"
          y2="105"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.5"
          style={{
            strokeDasharray: '155',
            strokeDashoffset: isVisible ? '0' : '155',
            transition: 'stroke-dashoffset 1.5s cubic-bezier(0.43, 0.13, 0.23, 0.96) 0.2s'
          }}
        />

        {/* Decorative waveform */}
        <path
          d="M10 10 Q30 5, 50 15 T90 10 Q110 5, 130 12 T170 8"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          opacity="0.4"
          style={{
            strokeDasharray: '200',
            strokeDashoffset: isVisible ? '0' : '200',
            transition: 'stroke-dashoffset 2.0s cubic-bezier(0.43, 0.13, 0.23, 0.96) 0.5s'
          }}
        />

        {/* Speaker dots */}
        {[27, 93, 159].map((cx, i) => (
          <circle
            key={i}
            cx={cx}
            cy="110"
            r="2"
            fill="currentColor"
            opacity="0.4"
            style={{
              transform: isVisible ? 'scale(1)' : 'scale(0)',
              transformOrigin: 'center',
              transition: `transform 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55) ${1.8 + i * 0.1}s`
            }}
          />
        ))}
      </svg>

      {/* Animated equalizer bars - like music playing */}
      <style>{`
        ${isVisible ? `
          @keyframes equalizerBounce {
            0%, 100% { transform: scaleY(1); }
            50% { transform: scaleY(0.7); }
          }
          
          svg rect[x="20"] { animation: equalizerBounce 0.8s ease-in-out infinite; transform-origin: bottom; }
          svg rect[x="42"] { animation: equalizerBounce 0.6s ease-in-out infinite 0.1s; transform-origin: bottom; }
          svg rect[x="64"] { animation: equalizerBounce 0.9s ease-in-out infinite 0.2s; transform-origin: bottom; }
          svg rect[x="86"] { animation: equalizerBounce 0.7s ease-in-out infinite 0.3s; transform-origin: bottom; }
          svg rect[x="108"] { animation: equalizerBounce 0.85s ease-in-out infinite 0.1s; transform-origin: bottom; }
          svg rect[x="130"] { animation: equalizerBounce 0.75s ease-in-out infinite 0.2s; transform-origin: bottom; }
          svg rect[x="152"] { animation: equalizerBounce 0.95s ease-in-out infinite; transform-origin: bottom; }
        ` : ''}
      `}</style>
    </div>
  );
};

export default DJEqualizer;