import React from 'react';
import useScrollReveal, { getAnimationStyle } from '../../hooks/useScrollReveal';

const FlowerSprig = ({ className = "" }) => {
  const [ref, isVisible] = useScrollReveal({ threshold: 0.3, delay: 250 });

  return (
    <div ref={ref} style={getAnimationStyle('organic', isVisible)}>
      <svg
        width="170"
        height="220"
        viewBox="0 0 140 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {/* Main stem - curves gracefully */}
        <path
          d="M70 170 Q65 140, 70 110 T75 80 Q72 60, 75 40"
          stroke="currentColor"
          strokeWidth="2.5"
          fill="none"
          opacity="0.6"
          style={{
            strokeDasharray: '180',
            strokeDashoffset: isVisible ? '0' : '180',
            transition: 'stroke-dashoffset 2.0s cubic-bezier(0.43, 0.13, 0.23, 0.96) 0.1s'
          }}
        />
        {/* Main flower - blooms */}
        <circle
          cx="75"
          cy="35"
          r="10"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          opacity="0.6"
          style={{
            strokeDasharray: '63',
            strokeDashoffset: isVisible ? '0' : '63',
            transition: 'stroke-dashoffset 1.0s cubic-bezier(0.68, -0.55, 0.265, 1.55) 1.2s'
          }}
        />
        {['30', '32', '40'].map((cy, i) => (
          <circle
            key={i}
            cx={['70', '80', '75'][i]}
            cy={cy}
            r="5"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            opacity="0.5"
            style={{
              strokeDasharray: '31.4',
              strokeDashoffset: isVisible ? '0' : '31.4',
              transition: `stroke-dashoffset 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) ${1.4 + i * 0.1}s`
            }}
          />
        ))}
        <circle
          cx="75"
          cy="35"
          r="3"
          fill="currentColor"
          opacity="0.5"
          style={{
            transform: isVisible ? 'scale(1)' : 'scale(0)',
            transformOrigin: 'center',
            transition: 'transform 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) 1.8s'
          }}
        />

        {/* Side branch 1 */}
        <path
          d="M70 100 Q55 95, 45 90"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.5"
          style={{
            strokeDasharray: '40',
            strokeDashoffset: isVisible ? '0' : '40',
            transition: 'stroke-dashoffset 1.0s cubic-bezier(0.43, 0.13, 0.23, 0.96) 0.8s'
          }}
        />
        <circle
          cx="42"
          cy="88"
          r="7"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          opacity="0.6"
          style={{
            strokeDasharray: '44',
            strokeDashoffset: isVisible ? '0' : '44',
            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) 1.5s'
          }}
        />
        <circle
          cx="38"
          cy="85"
          r="4"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
          opacity="0.5"
          style={{
            strokeDasharray: '25',
            strokeDashoffset: isVisible ? '0' : '25',
            transition: 'stroke-dashoffset 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) 1.7s'
          }}
        />
        <circle
          cx="42"
          cy="88"
          r="2.5"
          fill="currentColor"
          opacity="0.5"
          style={{
            transform: isVisible ? 'scale(1)' : 'scale(0)',
            transformOrigin: 'center',
            transition: 'transform 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55) 1.9s'
          }}
        />

        {/* Side branch 2 */}
        <path
          d="M72 120 Q85 115, 95 110"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.5"
          style={{
            strokeDasharray: '40',
            strokeDashoffset: isVisible ? '0' : '40',
            transition: 'stroke-dashoffset 1.0s cubic-bezier(0.43, 0.13, 0.23, 0.96) 0.9s'
          }}
        />
        <circle
          cx="98"
          cy="108"
          r="7"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          opacity="0.6"
          style={{
            strokeDasharray: '44',
            strokeDashoffset: isVisible ? '0' : '44',
            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) 1.6s'
          }}
        />
        <circle
          cx="102"
          cy="105"
          r="4"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
          opacity="0.5"
          style={{
            strokeDasharray: '25',
            strokeDashoffset: isVisible ? '0' : '25',
            transition: 'stroke-dashoffset 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) 1.8s'
          }}
        />
        <circle
          cx="98"
          cy="108"
          r="2.5"
          fill="currentColor"
          opacity="0.5"
          style={{
            transform: isVisible ? 'scale(1)' : 'scale(0)',
            transformOrigin: 'center',
            transition: 'transform 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55) 2.0s'
          }}
        />

        {/* Leaves */}
        <path
          d="M68 140 C60 138, 55 142, 58 148 C60 152, 65 150, 68 145"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          opacity="0.5"
          style={{
            strokeDasharray: '30',
            strokeDashoffset: isVisible ? '0' : '30',
            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.43, 0.13, 0.23, 0.96) 1.0s'
          }}
        />
        <path
          d="M72 145 C80 143, 85 147, 82 153 C80 157, 75 155, 72 150"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          opacity="0.5"
          style={{
            strokeDasharray: '30',
            strokeDashoffset: isVisible ? '0' : '30',
            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.43, 0.13, 0.23, 0.96) 1.1s'
          }}
        />
        {/* Buds */}
        {[70, 73].map((cx, i) => (
          <circle
            key={i}
            cx={cx}
            cy={[65, 85][i]}
            r="3"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            opacity="0.4"
            style={{
              strokeDasharray: '19',
              strokeDashoffset: isVisible ? '0' : '19',
              transition: `stroke-dashoffset 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) ${2.1 + i * 0.1}s`
            }}
          />
        ))}
      </svg>

      {/* Delicate bobbing */}
      <style>{`
        ${isVisible ? `
          @keyframes delicateBob {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-5px); }
          }
          .decorative-svg {
            animation: delicateBob 4s ease-in-out infinite;
          }
        ` : ''}
      `}</style>
    </div>
  );
};

export default FlowerSprig;