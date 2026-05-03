import React, { useRef, useState } from 'react';

const MagneticButton = ({ children, className, onClick, style }) => {
    const buttonRef = useRef(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e) => {
        if (!buttonRef.current) return;
        const { clientX, clientY } = e;
        const { left, top, width, height } = buttonRef.current.getBoundingClientRect();
        const x = clientX - (left + width / 2);
        const y = clientY - (top + height / 2);

        // Dampen the movement for a smoother magnetic pull
        setPosition({ x: x * 0.3, y: y * 0.3 });
    };

    const handleMouseLeave = () => {
        setPosition({ x: 0, y: 0 });
    };

    return (
        <div
            ref={buttonRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={`inline-flex items-center justify-center p-4 cursor-pointer ${className}`}
            onClick={onClick}
            style={{
                transform: `translate(${position.x}px, ${position.y}px)`,
                transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                ...style
            }}
        >
            <div
                className="pointer-events-none flex items-center justify-center w-full h-full"
                style={{
                    transform: `translate(${position.x * 0.2}px, ${position.y * 0.2}px)`,
                    transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
            >
                {children}
            </div>
        </div>
    );
};

export default MagneticButton;
