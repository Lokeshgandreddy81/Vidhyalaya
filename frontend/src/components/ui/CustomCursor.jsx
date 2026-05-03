import React, { useEffect, useState, useRef } from 'react';

const CustomCursor = () => {
    const mousePos = useRef({ x: -100, y: -100 });
    const [trailingPos, setTrailingPos] = useState({ x: -100, y: -100 });
    const [isHovering, setIsHovering] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [cursorText, setCursorText] = useState('');
    const requestRef = useRef();

    useEffect(() => {
        let currentX = trailingPos.x;
        let currentY = trailingPos.y;

        const onMouseMove = (e) => {
            mousePos.current = { x: e.clientX, y: e.clientY };
            if (!isVisible) setIsVisible(true);

            if (currentX === -100) {
                currentX = e.clientX;
                currentY = e.clientY;
            }
        };

        const updateTrailingCursor = () => {
            // Crisp, responsive lerp for editorial feel (faster than before)
            currentX += (mousePos.current.x - currentX) * 0.25;
            currentY += (mousePos.current.y - currentY) * 0.25;
            
            setTrailingPos({ x: currentX, y: currentY });
            requestRef.current = requestAnimationFrame(updateTrailingCursor);
        };

        const handleHoverStart = (text) => {
            setIsHovering(true);
            if (text) setCursorText(text);
        };
        const handleHoverEnd = () => {
            setIsHovering(false);
            setCursorText('');
        };

        document.addEventListener('mousemove', onMouseMove);

        const onMouseOver = (e) => {
            const hoverTarget = e.target.closest('a, button, input, [data-interactive="true"], [data-cursor-text]');
            if (hoverTarget) {
                const text = hoverTarget.getAttribute('data-cursor-text');
                handleHoverStart(text);
            } else {
                handleHoverEnd();
            }
        };
        document.addEventListener('mouseover', onMouseOver);

        requestRef.current = requestAnimationFrame(updateTrailingCursor);

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseover', onMouseOver);
            cancelAnimationFrame(requestRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty dependency array — event listeners only need to be attached once

    if (!isVisible && mousePos.current.x === -100) return null;

    // Calculate size and style based on hover state and context text
    const size = cursorText ? 80 : isHovering ? 48 : 12;

    return (
        <div
            className={`pointer-events-none fixed top-0 left-0 bg-white rounded-full z-[9999] mix-blend-difference hidden md:flex items-center justify-center`}
            style={{
                width: `${size}px`,
                height: `${size}px`,
                transform: `translate3d(${trailingPos.x - size / 2}px, ${trailingPos.y - size / 2}px, 0)`,
                transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1), height 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                willChange: 'transform, width, height'
            }}
        >
            {cursorText && (
                <span
                    className="text-black text-[10px] uppercase font-mono tracking-widest absolute whitespace-nowrap"
                    style={{
                        animation: 'fadeIn 0.3s ease-out forwards'
                    }}
                >
                    {cursorText}
                </span>
            )}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.8); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
};

export default CustomCursor;
