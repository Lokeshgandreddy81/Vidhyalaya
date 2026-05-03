import React from 'react';
import useScrollReveal, { getAnimationStyle } from '../../hooks/useScrollReveal';

const TreeIllustration = ({ className = "" }) => {
  const [ref, isVisible] = useScrollReveal({ threshold: 0.3, delay: 200 });

  return (
    <div ref={ref} style={getAnimationStyle('slideUp', isVisible)}>
      <svg
        width="200"
        height="240"
        viewBox="0 0 160 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {/* Trunk - grows from bottom */}
        <path
          d="M75 200 L75 120 C75 110, 70 100, 72 90 L88 90 C90 100, 85 110, 85 120 L85 200"
          stroke="currentColor"
          strokeWidth="3"
          fill="none"
          opacity="0.6"
          style={{
            strokeDasharray: '150',
            strokeDashoffset: isVisible ? '0' : '150',
            transition: 'stroke-dashoffset 1.6s cubic-bezier(0.43, 0.13, 0.23, 0.96) 0.2s'
          }}
        />
        {/* Main foliage - bloom effect */}
        <path
          d="M80 100 C60 95, 45 85, 40 70 C35 55, 45 40, 60 38 C70 37, 75 45, 80 50 C85 45, 90 37, 100 38 C115 40, 125 55, 120 70 C115 85, 100 95, 80 100Z"
          stroke="currentColor"
          strokeWidth="2.5"
          fill="none"
          opacity="0.6"
          style={{
            strokeDasharray: '300',
            strokeDashoffset: isVisible ? '0' : '300',
            transition: 'stroke-dashoffset 2.0s cubic-bezier(0.34, 1.56, 0.64, 1) 0.8s'
          }}
        />
        {/* Detail foliage - left */}
        <path
          d="M70 80 C60 78, 52 72, 50 65 C48 58, 52 50, 60 49 C65 48, 68 52, 70 55"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          opacity="0.5"
          style={{
            strokeDasharray: '80',
            strokeDashoffset: isVisible ? '0' : '80',
            transition: 'stroke-dashoffset 1.0s cubic-bezier(0.43, 0.13, 0.23, 0.96) 1.5s'
          }}
        />
        {/* Detail foliage - right */}
        <path
          d="M90 80 C100 78, 108 72, 110 65 C112 58, 108 50, 100 49 C95 48, 92 52, 90 55"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          opacity="0.5"
          style={{
            strokeDasharray: '80',
            strokeDashoffset: isVisible ? '0' : '80',
            transition: 'stroke-dashoffset 1.0s cubic-bezier(0.43, 0.13, 0.23, 0.96) 1.6s'
          }}
        />
        {/* Branches */}
        <path
          d="M75 110 C65 105, 55 100, 50 95"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.5"
          style={{
            strokeDasharray: '60',
            strokeDashoffset: isVisible ? '0' : '60',
            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.43, 0.13, 0.23, 0.96) 1.2s'
          }}
        />
        <path
          d="M85 110 C95 105, 105 100, 110 95"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.5"
          style={{
            strokeDasharray: '60',
            strokeDashoffset: isVisible ? '0' : '60',
            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.43, 0.13, 0.23, 0.96) 1.3s'
          }}
        />
        {/* Texture dots - pop in */}
        {[70, 90, 80, 65, 95].map((cx, i) => (
          <circle
            key={i}
            cx={cx}
            cy={[60, 55, 70, 75, 72][i]}
            r="2.5"
            fill="currentColor"
            opacity="0.4"
            style={{
              transform: isVisible ? 'scale(1)' : 'scale(0)',
              transformOrigin: 'center',
              transition: `transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55) ${2.0 + i * 0.1}s`
            }}
          />
        ))}
      </svg>

      {/* Subtle wind sway */}
      <style>{`
        ${isVisible ? `
          @keyframes windSway {
            0%, 100% { transform: rotate(-0.5deg); }
            50% { transform: rotate(0.5deg); }
          }
          .decorative-svg {
            animation: windSway 7s ease-in-out infinite;
            transform-origin: bottom center;
          }
        ` : ''}
      `}</style>
    </div>
  );
};

export default TreeIllustration;