import React from 'react';
import { Editor, DiffEditor } from '@monaco-editor/react';

interface CodeEditorProps {
  original: string;
  modified: string;
  onChange?: (value: string | undefined) => void;
  mode: 'edit' | 'diff';
  path: string;
  errors?: {line: number, message: string}[];
  highlightLine?: number;
  highlightToken?: number;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  original,
  modified,
  onChange,
  mode,
  path,
  errors = [],
  highlightLine,
  highlightToken
}) => {
  const editorRef = React.useRef<any>(null);
  const monacoRef = React.useRef<any>(null);
  const decorationIdsRef = React.useRef<string[]>([]);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
  };

  React.useEffect(() => {
    if (monacoRef.current && editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        const markers = errors.map(err => ({
          startLineNumber: err.line,
          startColumn: 1,
          endLineNumber: err.line,
          endColumn: 1000,
          message: err.message,
          severity: monacoRef.current.MarkerSeverity.Error,
        }));
        monacoRef.current.editor.setModelMarkers(model, 'owner', markers);
      }
    }
  }, [errors]);

  React.useEffect(() => {
    if (mode !== 'edit' || !editorRef.current || !monacoRef.current || !highlightLine) {
      return;
    }

    const model = editorRef.current.getModel();
    if (!model) return;

    const maxLines = model.getLineCount();
    const line = Math.max(1, Math.min(highlightLine, maxLines));
    const range = new monacoRef.current.Range(line, 1, line, model.getLineMaxColumn(line));

    decorationIdsRef.current = editorRef.current.deltaDecorations(decorationIdsRef.current, [
      {
        range,
        options: {
          isWholeLine: true,
          className: 'graph-selected-line'
        }
      }
    ]);

    editorRef.current.revealLineInCenter(line);
    editorRef.current.setPosition({ lineNumber: line, column: 1 });
    editorRef.current.focus();
  }, [highlightLine, highlightToken, mode, path]);

  return (
    <div className="w-full h-full flex flex-col">
      {mode === 'diff' ? (
        <DiffEditor
          key={`diff-${path}`}
          original={original}
          modified={modified}
          language="verilog"
          theme="vs-dark"
          options={{
            renderSideBySide: true,
            minimap: { enabled: false },
            readOnly: true,
            scrollBeyondLastLine: false,
          }}
        />
      ) : (
        <Editor
          key={`edit-${path}`}
          path={path}
          value={modified}
          onChange={onChange}
          onMount={handleEditorDidMount}
          language="verilog"
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
          }}
        />
      )}
    </div>
  );
};


export default CodeEditor;
