import React from 'react';
import { Editor, DiffEditor } from '@monaco-editor/react';

interface CodeEditorProps {
  original: string;
  modified: string;
  onChange?: (value: string | undefined) => void;
  mode: 'edit' | 'diff';
  path: string;
  errors?: {line: number, message: string}[];
}

const CodeEditor: React.FC<CodeEditorProps> = ({ original, modified, onChange, mode, path, errors = [] }) => {
  const editorRef = React.useRef<any>(null);
  const monacoRef = React.useRef<any>(null);

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
