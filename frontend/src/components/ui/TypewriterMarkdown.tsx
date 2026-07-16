import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
  isLatest,
  components,
  cursorChar = '▋',
  onComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

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

  const [displayedText, setDisplayedText] = React.useState(isLatest ? '' : text);

  React.useEffect(() => {
    if (!isLatest) {
      setDisplayedText(text);
      return;
    }

    if (displayedText.length < text.length) {
      // Calculate a smooth uniform catch-up speed. 
      // Add 2 characters every 10ms (approx 200 chars/sec) for a premium, readable flow.
      const timeoutId = setTimeout(() => {
        const nextLength = Math.min(text.length, displayedText.length + 2);
        setDisplayedText(text.substring(0, nextLength));
      }, 8);
      return () => clearTimeout(timeoutId);
    }
  }, [text, displayedText, isLatest]);

  useEffect(() => {
    if (isLatest) {
      scrollParentToBottom();
    }
  }, [displayedText, isLatest]);

  useEffect(() => {
    if (isLatest && onComplete) {
      return () => {
        onComplete();
      };
    }
  }, [isLatest, onComplete]);

  // Append cursor character while actively streaming
  const contentToRender = isLatest ? `${displayedText} ${cursorChar}` : text;

  return (
    <div ref={containerRef} className="typewriter-markdown-container">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {contentToRender}
      </ReactMarkdown>
    </div>
  );
};

export default TypewriterMarkdown;
