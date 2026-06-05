import React, { useRef, useEffect, useCallback } from 'react';

interface SandboxEditorProps {
  value: string;
  onChange: (value: string) => void;
  activeLine?: number;
  isZenMode?: boolean;
  readOnly?: boolean;
}

const SandboxEditor: React.FC<SandboxEditorProps> = ({
  value,
  onChange,
  activeLine,
  isZenMode,
  readOnly,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const lineCount = value.split('\n').length;

  const syncScroll = useCallback(() => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  useEffect(() => {
    if (activeLine && textareaRef.current) {
      const lineHeight = 20;
      textareaRef.current.scrollTop = Math.max(0, (activeLine - 3) * lineHeight);
      syncScroll();
    }
  }, [activeLine, syncScroll]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = `${value.slice(0, start)}  ${value.slice(end)}`;
      onChange(next);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2;
      });
    }
  };

  return (
    <div className={`flex flex-1 min-h-0 overflow-hidden font-mono text-[13px] leading-5 ${isZenMode ? 'bg-[#0d1117]' : 'bg-white'}`}>
      <div
        ref={gutterRef}
        className={`shrink-0 w-10 overflow-hidden select-none text-right pr-2 py-3 ${isZenMode ? 'text-slate-600 bg-[#0d1117]' : 'text-slate-300 bg-slate-50'}`}
        aria-hidden
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div
            key={i}
            className={`h-5 ${activeLine === i + 1 ? (isZenMode ? 'text-red-400 font-bold' : 'text-red-500 font-bold') : ''}`}
          >
            {i + 1}
          </div>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        onKeyDown={handleKeyDown}
        readOnly={readOnly}
        spellCheck={false}
        className={`flex-1 resize-none border-0 outline-none py-3 pr-4 bg-transparent ${
          isZenMode ? 'text-slate-200 caret-indigo-400' : 'text-slate-800 caret-[#000666]'
        }`}
        style={{ tabSize: 2 }}
        aria-label="Code editor"
      />
    </div>
  );
};

export default SandboxEditor;
