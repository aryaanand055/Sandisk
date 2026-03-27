import React from 'react';
import { Editor, DiffEditor } from '@monaco-editor/react';

interface CodeEditorProps {
  original: string;
  modified: string;
  onChange?: (value: string | undefined) => void;
  mode: 'edit' | 'diff';
  path: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ original, modified, onChange, mode, path }) => {
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
