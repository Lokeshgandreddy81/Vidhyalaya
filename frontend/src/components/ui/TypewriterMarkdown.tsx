import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const typedMessageIds = new Set<string>();

interface TypewriterMarkdownProps {
  text: string;
  msgId: string;
  isLatest: boolean;
  components?: any;
  cursorChar?: string;
  onComplete?: () => void;
}

const TypewriterMarkdown: React.FC<TypewriterMarkdownProps> = ({
  text,
  msgId,
  isLatest,
  components,
  cursorChar = '●',
  onComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const [displayedText, setDisplayedText] = useState(() => {
    if (!isLatest || typedMessageIds.has(msgId)) {
      return text;
    }
    return '';
  });

  const [isTyping, setIsTyping] = useState(() => {
    return isLatest && !typedMessageIds.has(msgId);
  });

  // Helper to scroll the nearest scrollable parent to the bottom
  const scrollParentToBottom = () => {
    if (!containerRef.current) return;
    let parent = containerRef.current.parentElement;
    while (parent) {
      const overflowY = window.getComputedStyle(parent).overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll') {
        parent.scrollTop = parent.scrollHeight;
        break;
      }
      parent = parent.parentElement;
    }
  };

  useEffect(() => {
    if (!isLatest || typedMessageIds.has(msgId)) {
      setDisplayedText(text);
      setIsTyping(false);
      return;
    }

    setIsTyping(true);
    let index = 0;
    
    // Adjust typing speed dynamically based on message length:
    // Long text streams faster (more characters per step) so it doesn't take too long to complete.
    const textLength = text.length;
    const charsPerStep = textLength > 1500 ? 12 : textLength > 800 ? 8 : textLength > 400 ? 5 : textLength > 150 ? 3 : 2;
    const intervalTime = 16; // ~60fps smooth typing

    const timer = setInterval(() => {
      index += charsPerStep;
      if (index >= textLength) {
        setDisplayedText(text);
        setIsTyping(false);
        typedMessageIds.add(msgId);
        clearInterval(timer);
        if (onComplete) onComplete();
      } else {
        setDisplayedText(text.slice(0, index));
      }
      // Scroll to bottom as content grows
      scrollParentToBottom();
    }, intervalTime);

    return () => {
      clearInterval(timer);
    };
  }, [text, msgId, isLatest, onComplete]);

  // Append a spacing and cursor character to the markdown text while actively typing
  const contentToRender = isTyping ? `${displayedText} ${cursorChar}` : displayedText;

  return (
    <div ref={containerRef} className="typewriter-markdown-container">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {contentToRender}
      </ReactMarkdown>
    </div>
  );
};

export default TypewriterMarkdown;
