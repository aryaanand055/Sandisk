import { Folder, FileText, ChevronRight, Plus, Trash2 } from 'lucide-react';

interface FileItem {
  name: string;
  path: string;
  type: string;
}

interface FileExplorerProps {
  files: FileItem[];
  activeFile: string;
  onFileSelect: (path: string) => void;
  onNewFile: (type: 'rtl' | 'testbench') => void;
  onRemoveFile: (path: string) => void;
}

export default function FileExplorer({ files, activeFile, onFileSelect, onNewFile, onRemoveFile }: FileExplorerProps) {
  const rtlFiles = files.filter(f => f.type === 'rtl');
  const tbFiles = files.filter(f => f.type === 'testbench');

  return (
    <div className="flex flex-col text-[#cccccc] select-none">
      <div className="flex items-center justify-between px-4 py-1.5 hover:bg-[#2a2d2e] cursor-pointer group">
        <div className="flex items-center gap-2">
          <ChevronRight size={16} className="text-[#858585] group-hover:text-white" />
          <Folder size={16} className="text-[#3b82f6]" />
          <span className="text-xs font-bold uppercase tracking-tight">Project</span>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onNewFile('rtl'); }}
          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[#37373d] rounded transition-all"
          title="New RTL File"
        >
          <Plus size={14} className="text-gray-400 hover:text-white" />
        </button>
      </div>
      
      <div className="ml-4 space-y-0.5">
        {rtlFiles.map(file => (
          <div 
            key={file.path}
            onClick={() => onFileSelect(file.path)}
            className={`flex items-center justify-between px-4 py-1.5 cursor-pointer group transition-colors ${activeFile === file.path ? 'bg-[#37373d] text-white' : 'hover:bg-[#2a2d2e]'}`}
          >
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-[#519aba]" />
              <span className="text-[13px]">{file.name}</span>
            </div>
            {file.path !== 'design.v' && (
              <button 
                onClick={(e) => { e.stopPropagation(); onRemoveFile(file.path); }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                title="Delete File"
              >
                <Trash2 size={12} className="text-gray-500 hover:text-red-400" />
              </button>
            )}
          </div>
        ))}
        
        <div className="flex items-center justify-between px-4 py-1.5 group cursor-pointer mt-2 hover:bg-[#2a2d2e]">
           <div className="flex items-center gap-2">
              <Folder size={16} className="text-yellow-600" />
              <span className="text-[11px] font-bold uppercase text-[#858585]">Testbenches</span>
           </div>
           <button 
             onClick={(e) => { e.stopPropagation(); onNewFile('testbench'); }}
             className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[#37373d] rounded transition-all"
             title="New Testbench File"
           >
             <Plus size={14} className="text-gray-400 hover:text-white" />
           </button>
        </div>
        
        <div className="ml-2">
            {tbFiles.map(file => (
              <div 
                key={file.path}
                onClick={() => onFileSelect(file.path)}
                className={`flex items-center justify-between px-4 py-1.5 cursor-pointer group transition-colors ${activeFile === file.path ? 'bg-[#37373d] text-white' : 'hover:bg-[#2a2d2e]'}`}
              >
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-[#e37933]" />
                  <span className="text-[13px]">{file.name}</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); onRemoveFile(file.path); }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                  title="Delete File"
                >
                  <Trash2 size={12} className="text-gray-500 hover:text-red-400" />
                </button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
