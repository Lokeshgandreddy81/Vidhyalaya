import React, { useEffect, useRef } from 'react';

export const CodeRainCanvas: React.FC<{ isZenMode: boolean }> = ({ isZenMode }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const columns = Math.floor(width / 16) + 1;
    const yPositions = Array(columns).fill(0);

    const draw = () => {
      ctx.fillStyle = isZenMode ? 'rgba(3, 10, 6, 0.12)' : 'rgba(240, 253, 244, 0.12)';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = isZenMode ? '#10b981' : '#047857';
      ctx.font = '10px monospace';

      for (let i = 0; i < yPositions.length; i++) {
        const text = Math.random() > 0.5 ? '1' : '0';
        const x = i * 16;
        const y = yPositions[i];

        ctx.fillText(text, x, y);

        if (y > height && Math.random() > 0.985) {
          yPositions[i] = 0;
        } else {
          yPositions[i] = y + 12;
        }
      }
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isZenMode]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none opacity-22"
      style={{ mixBlendMode: isZenMode ? 'screen' : 'multiply' }}
    />
  );
};
