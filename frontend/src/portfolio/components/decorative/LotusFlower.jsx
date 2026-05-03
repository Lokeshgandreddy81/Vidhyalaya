import React from 'react';
import useScrollReveal, { getAnimationStyle } from '../../hooks/useScrollReveal';

const LotusFlower = ({ className = "" }) => {
  const [ref, isVisible] = useScrollReveal({ threshold: 0.3, delay: 100 });

  return (
    <div ref={ref} style={getAnimationStyle('organic', isVisible)}>
      <svg
        width="240"
        height="240"
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {/* Main petals - stagger animation */}
        <path
          d="M100 150 C80 140, 70 120, 75 100 C80 80, 90 70, 100 75 L100 150Z"
          stroke="currentColor"
          strokeWidth="2.5"
          fill="none"
          opacity="0.6"
          style={{
            strokeDasharray: isVisible ? 'none' : '200',
            strokeDashoffset: isVisible ? '0' : '200',
            transition: 'stroke-dashoffset 1.5s cubic-bezier(0.43, 0.13, 0.23, 0.96) 0.2s'
          }}
        />
        <path
          d="M100 150 C120 140, 130 120, 125 100 C120 80, 110 70, 100 75 L100 150Z"
          stroke="currentColor"
          strokeWidth="2.5"
          fill="none"
          opacity="0.6"
          style={{
            strokeDasharray: isVisible ? 'none' : '200',
            strokeDashoffset: isVisible ? '0' : '200',
            transition: 'stroke-dashoffset 1.5s cubic-bezier(0.43, 0.13, 0.23, 0.96) 0.3s'
          }}
        />
        <path
          d="M100 75 C85 65, 70 60, 60 70 C50 80, 55 95, 65 105 L100 75Z"
          stroke="currentColor"
          strokeWidth="2.5"
          fill="none"
          opacity="0.6"
          style={{
            strokeDasharray: isVisible ? 'none' : '200',
            strokeDashoffset: isVisible ? '0' : '200',
            transition: 'stroke-dashoffset 1.5s cubic-bezier(0.43, 0.13, 0.23, 0.96) 0.4s'
          }}
        />
        <path
          d="M100 75 C115 65, 130 60, 140 70 C150 80, 145 95, 135 105 L100 75Z"
          stroke="currentColor"
          strokeWidth="2.5"
          fill="none"
          opacity="0.6"
          style={{
            strokeDasharray: isVisible ? 'none' : '200',
            strokeDashoffset: isVisible ? '0' : '200',
            transition: 'stroke-dashoffset 1.5s cubic-bezier(0.43, 0.13, 0.23, 0.96) 0.5s'
          }}
        />
        {/* Outer petals */}
        <path
          d="M65 105 C55 110, 45 120, 48 135 C50 145, 60 148, 72 145 L70 115"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          opacity="0.5"
          style={{
            strokeDasharray: isVisible ? 'none' : '200',
            strokeDashoffset: isVisible ? '0' : '200',
            transition: 'stroke-dashoffset 1.5s cubic-bezier(0.43, 0.13, 0.23, 0.96) 0.6s'
          }}
        />
        <path
          d="M135 105 C145 110, 155 120, 152 135 C150 145, 140 148, 128 145 L130 115"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          opacity="0.5"
          style={{
            strokeDasharray: isVisible ? 'none' : '200',
            strokeDashoffset: isVisible ? '0' : '200',
            transition: 'stroke-dashoffset 1.5s cubic-bezier(0.43, 0.13, 0.23, 0.96) 0.7s'
          }}
        />
        {/* Center circle - pulse animation */}
        <circle
          cx="100"
          cy="100"
          r="10"
          stroke="currentColor"
          strokeWidth="2.5"
          fill="none"
          opacity="0.7"
          style={{
            transform: isVisible ? 'scale(1)' : 'scale(0)',
            transformOrigin: 'center',
            transition: 'transform 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) 0.8s'
          }}
        />
        {/* Dots - pop in */}
        <circle
          cx="95"
          cy="95"
          r="3"
          fill="currentColor"
          opacity="0.5"
          style={{
            transform: isVisible ? 'scale(1)' : 'scale(0)',
            transformOrigin: 'center',
            transition: 'transform 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55) 1.1s'
          }}
        />
        <circle
          cx="105"
          cy="95"
          r="3"
          fill="currentColor"
          opacity="0.5"
          style={{
            transform: isVisible ? 'scale(1)' : 'scale(0)',
            transformOrigin: 'center',
            transition: 'transform 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55) 1.2s'
          }}
        />
        <circle
          cx="100"
          cy="105"
          r="3"
          fill="currentColor"
          opacity="0.5"
          style={{
            transform: isVisible ? 'scale(1)' : 'scale(0)',
            transformOrigin: 'center',
            transition: 'transform 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55) 1.3s'
          }}
        />
      </svg>

      {/* Subtle floating animation when visible */}
      <style>{`
        ${isVisible ? `
          @keyframes gentleFloat {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-8px) rotate(2deg); }
          }
          .decorative-svg {
            animation: gentleFloat 6s ease-in-out infinite;
          }
        ` : ''}
      `}</style>
    </div>
  );
};

export default LotusFlower;