import React, { useRef, useEffect } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';

interface SandboxEditorProps {
  value: string;
  onChange: (value: string) => void;
  activeLine?: number;
  isZenMode?: boolean;
  readOnly?: boolean;
  language?: string;
}

const SandboxEditor: React.FC<SandboxEditorProps> = ({
  value,
  onChange,
  activeLine,
  isZenMode,
  readOnly,
  language = 'javascript',
}) => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorRef = useRef<string[]>([]);

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
  };

  useEffect(() => {
    if (editorRef.current && monacoRef.current && activeLine) {
      const editor = editorRef.current;
      const monaco = monacoRef.current;

      editor.revealLineInCenter(activeLine);

      const newDecorations = [
        {
          range: new monaco.Range(activeLine, 1, activeLine, 1),
          options: {
            isWholeLine: true,
            className: 'cortex-error-line-highlight',
            glyphMarginClassName: 'cortex-error-glyph-margin',
          },
        },
      ];

      decorRef.current = editor.deltaDecorations(decorRef.current, newDecorations);
    } else if (editorRef.current && !activeLine && decorRef.current.length > 0) {
      editorRef.current.deltaDecorations(decorRef.current, []);
      decorRef.current = [];
    }
  }, [activeLine]);

  return (
    <div className="flex-1 h-full min-w-0 overflow-hidden relative">
      <style dangerouslySetInnerHTML={{ __html: `
        .cortex-error-line-highlight {
          background: rgba(239, 68, 68, 0.08) !important;
          border-left: 3px solid #ef4444 !important;
        }
        .cortex-error-glyph-margin {
          background: #ef4444 !important;
          border-radius: 50%;
        }
      `}} />
      <Editor
        height="100%"
        language={language}
        theme={isZenMode ? 'vs-dark' : 'light'}
        value={value}
        onChange={(val) => onChange(val || '')}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          tabSize: 2,
          automaticLayout: true,
          readOnly: readOnly,
          wordWrap: 'on',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          lineHeight: 20,
          glyphMargin: true,
          folding: true,
          lineDecorationsWidth: 10,
        }}
      />
    </div>
  );
};

export default SandboxEditor;
