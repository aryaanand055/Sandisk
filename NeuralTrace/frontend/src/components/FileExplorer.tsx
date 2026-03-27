import { Folder, FileText, ChevronRight } from 'lucide-react';

interface FileItem {
  name: string;
  path: string;
  type: string;
}

interface FileExplorerProps {
  files: FileItem[];
  activeFile: string;
  onFileSelect: (path: string) => void;
}

export default function FileExplorer({ files, activeFile, onFileSelect }: FileExplorerProps) {
  const rtlFiles = files.filter(f => f.type === 'rtl');
  const tbFiles = files.filter(f => f.type === 'testbench');

  return (
    <div className="flex flex-col text-[#cccccc] select-none">
      <div className="flex items-center gap-2 px-4 py-1.5 hover:bg-[#2a2d2e] cursor-pointer group">
        <ChevronRight size={16} className="text-[#858585] group-hover:text-white" />
        <Folder size={16} className="text-[#3b82f6]" />
        <span className="text-xs font-bold uppercase tracking-tight">Project</span>
      </div>
      
      <div className="ml-4 space-y-0.5">
        {rtlFiles.map(file => (
          <div 
            key={file.path}
            onClick={() => onFileSelect(file.path)}
            className={`flex items-center gap-2 px-4 py-1.5 cursor-pointer transition-colors ${activeFile === file.path ? 'bg-[#37373d] text-white' : 'hover:bg-[#2a2d2e]'}`}
          >
            <FileText size={14} className="text-[#519aba]" />
            <span className="text-[13px]">{file.name}</span>
          </div>
        ))}
        
        <div className="flex items-center gap-2 px-4 py-1.5 group cursor-pointer mt-2">
           <Folder size={16} className="text-yellow-600" />
           <span className="text-[11px] font-bold uppercase text-[#858585]">Testbenches</span>
        </div>
        
        <div className="ml-2">
            {tbFiles.map(file => (
              <div 
                key={file.path}
                onClick={() => onFileSelect(file.path)}
                className={`flex items-center gap-2 px-4 py-1.5 cursor-pointer transition-colors ${activeFile === file.path ? 'bg-[#37373d] text-white' : 'hover:bg-[#2a2d2e]'}`}
              >
                <FileText size={14} className="text-[#e37933]" />
                <span className="text-[13px]">{file.name}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
