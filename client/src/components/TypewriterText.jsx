import React, { useState, useEffect } from 'react';

const TypewriterText = ({ text, delay = 0, speed = 50, className = "" }) => {
    const [displayedText, setDisplayedText] = useState('');
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        let timeout;
        let currentIndex = 0;
        
        const startTyping = () => {
            if (currentIndex < text.length) {
                setDisplayedText(text.substring(0, currentIndex + 1));
                currentIndex++;
                timeout = setTimeout(startTyping, speed);
            } else {
                setIsComplete(true);
            }
        };

        const initialDelay = setTimeout(startTyping, delay);

        return () => {
            clearTimeout(timeout);
            clearTimeout(initialDelay);
        };
    }, [text, delay, speed]);

    return (
        <span className={className}>
            {displayedText}
            {!isComplete && <span className="animate-pulse">|</span>}
        </span>
    );
};

export default TypewriterText;
