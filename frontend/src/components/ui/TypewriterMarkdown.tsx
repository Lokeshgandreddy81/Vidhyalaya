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

  useEffect(() => {
    if (isLatest) {
      scrollParentToBottom();
    }
  }, [text, isLatest]);

  useEffect(() => {
    if (isLatest && onComplete) {
      // Trigger complete callback once when isLatest becomes false
      return () => {
        onComplete();
      };
    }
  }, [isLatest, onComplete]);

  // Append cursor character while actively streaming
  const contentToRender = isLatest ? `${text} ${cursorChar}` : text;

  return (
    <div ref={containerRef} className="typewriter-markdown-container">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {contentToRender}
      </ReactMarkdown>
    </div>
  );
};

export default TypewriterMarkdown;
