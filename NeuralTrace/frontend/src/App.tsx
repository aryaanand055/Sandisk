import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { 
  GitBranch, GitCommit, Play, FileCode, ArrowRightLeft, 
  AlertCircle, Files, Sparkles, ChevronDown, Check, 
  RotateCcw, MoreHorizontal 
} from 'lucide-react';
import CodeEditor from './components/CodeEditor';
import ImpactGraph from './components/ImpactGraph';
import VersionTimeline from './components/VersionTimeline';
import FileExplorer from './components/FileExplorer';
import ConfirmationModal from './components/ConfirmationModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function App() {
  const [files, setFiles] = useState<any[]>([]);
  const [activeFile, setActiveFile] = useState('clk_divider.v');
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  
  const [baselineRtl, setBaselineRtl] = useState('');
  const [workingRtl, setWorkingRtl] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [editorMode, setEditorMode] = useState<'edit' | 'diff'>('edit');
  
  const [diffLeft, setDiffLeft] = useState('baseline');
  const [diffRight, setDiffRight] = useState('working');

  const [impactData, setImpactData] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [history, setHistory] = useState<any[]>([
    { id: 'baseline', message: 'Initial Baseline', risk: 'Low', time: 'Recently', content: '' }
  ]);
  const [syntaxErrors, setSyntaxErrors] = useState<{line: number, message: string}[]>([]);
  const [isSyntaxValid, setIsSyntaxValid] = useState(false);

  const [showExplorer, setShowExplorer] = useState(true);
  const [showEvolution, setShowEvolution] = useState(true);
  const [showImpact, setShowImpact] = useState(true);
  const [maximizeImpact, setMaximizeImpact] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [analysisView, setAnalysisView] = useState(false);

  const handleAnalyze = useCallback(async (oldVal: string, newVal: string) => {
    setIsAnalyzing(true);
    try {
      const res = await axios.post(`${API_URL}/analyze`, {
        old_rtl: oldVal,
        new_rtl: newVal
      });
      setImpactData(res.data);
      return res.data;
    } catch (err) {
      console.error(err);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // Fetch file list
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const res = await axios.get(`${API_URL}/files`);
        setFiles(res.data.files);
        
        let initialDesignContent = '';
        // Initial load for all files
        for (const f of res.data.files) {
          const contentRes = await axios.get(`${API_URL}/file/${f.path}`);
          const content = contentRes.data.content;
          setFileContents(prev => ({ ...prev, [f.path]: content }));
          if (f.path === 'clk_divider.v') {
             initialDesignContent = content;
             setBaselineRtl(content);
             setWorkingRtl(content);
             setHistory([{ id: 'baseline', message: 'Initial Baseline', risk: 'Low', time: 'Recently', content: content }]);
          }
        }

        // Only one startup call for initial state (as requested)
        if (initialDesignContent) {
          handleAnalyze(initialDesignContent, initialDesignContent);
        }
      } catch (err) {
        console.error("Failed to load files", err);
      }
    };
    fetchFiles();
  }, [handleAnalyze]); // Included handleAnalyze back to dependency for clarity



  const handleFileSelect = (path: string) => {
    setActiveFile(path);
  };

  const handleNewFile = async (type: 'rtl' | 'testbench') => {
    const name = prompt(`Enter ${type === 'rtl' ? 'RTL' : 'Testbench'} filename (with .v or .sv extension):`);
    if (!name) return;
    
    try {
      const res = await axios.post(`${API_URL}/files`, { name, type });
      if (res.data.error) {
        alert(res.data.error);
        return;
      }
      
      // Refresh file list
      const filesRes = await axios.get(`${API_URL}/files`);
      setFiles(filesRes.data.files);
      
      // Load new file content and set active
      const contentRes = await axios.get(`${API_URL}/file/${res.data.path}`);
      setFileContents(prev => ({ ...prev, [res.data.path]: contentRes.data.content }));
      setActiveFile(res.data.path);
      
    } catch (err) {
      console.error("Failed to create file", err);
      alert("Failed to create file");
    }
  };

  const handleRemoveFile = async (path: string) => {
    if (path === 'design.v') return alert("Cannot delete main design file");
    if (!confirm(`Are you sure you want to delete ${path}?`)) return;
    
    try {
      const res = await axios.delete(`${API_URL}/file/${path}`);
      if (res.data.error) {
        alert(res.data.error);
        return;
      }
      
      // Refresh file list
      const filesRes = await axios.get(`${API_URL}/files`);
      setFiles(filesRes.data.files);
      
      // If deleted file was active, switch to design.v
      if (activeFile === path) {
        setActiveFile('design.v');
      }
      
    } catch (err) {
      console.error("Failed to delete file", err);
      alert("Failed to delete file");
    }
  };

  // Debounced Syntax Check
  useEffect(() => {
    if (activeFile !== 'clk_divider.v' && !activeFile.endsWith('.v') && !activeFile.endsWith('.sv')) {
      setSyntaxErrors([]);
      return;
    }

    const currentCode = activeFile === 'clk_divider.v' ? workingRtl : fileContents[activeFile];
    if (!currentCode) return;

    // Reset validity on change
    setIsSyntaxValid(false);

    const timer = setTimeout(async () => {
      try {
        const res = await axios.post(`${API_URL}/check-syntax`, { rtl: currentCode });
        if (res.data.status === 'error') {
          // Parse line number from "line:4: before: ..."
          const match = res.data.message.match(/line:(\d+):/);
          const line = match ? parseInt(match[1]) : 1;
          setSyntaxErrors([{ line, message: res.data.message }]);
          setIsSyntaxValid(false);
        } else {
          setSyntaxErrors([]);
          setIsSyntaxValid(true);
        }
      } catch (err) {
        console.error("Syntax check failed", err);
        setIsSyntaxValid(false);
      }
    }, 400);


    return () => clearTimeout(timer);
  }, [workingRtl, fileContents, activeFile]);

  const handleCommit = async () => {
    if (!commitMessage.trim()) return alert("Enter a commit message");
    setShowConfirmModal(true);
  };

  const executeCommit = async () => {
    // Save current values for analysis
    const oldRtl = baselineRtl;
    const newRtl = workingRtl;
    const msg = commitMessage;
    
    // Create commit record first (After Commit requirement)
    const newCommitId = Math.random().toString(16).slice(2, 10);
    const newCommit = {
      id: newCommitId,
      message: msg,
      risk: 'Analyzing...',
      time: new Date().toLocaleTimeString(),
      content: newRtl
    };
    
    setHistory(prev => [...prev, newCommit]);
    setBaselineRtl(newRtl);
    setCommitMessage('');
    setDiffLeft(newCommitId);
    setShowConfirmModal(false);
    setAnalysisView(true);
    setShowImpact(true);

    // Trigger Groq analysis only once after the commit process has finalized
    const analysis = await handleAnalyze(oldRtl, newRtl);
    
    // Update the history record once analysis is complete
    if (analysis) {
      setHistory(prev => prev.map(c => 
        c.id === newCommitId ? { ...c, risk: analysis.risk } : c
      ));
    }
  };


  const handleApplyFix = async (fixedCode: string) => {
    if (!fixedCode) return;
    try {
      const res = await axios.post(`${API_URL}/apply-fix`, {
        path: activeFile,
        fixed_code: fixedCode
      });
      if (res.data.status === 'success') {
        if (activeFile === 'led_blinker.v') {
          setWorkingRtl(fixedCode);
        } else {
          setFileContents(prev => ({ ...prev, [activeFile]: fixedCode }));
        }
        alert("Fix applied successfully!");
      } else {
        alert("Failed to apply fix: " + res.data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Error applying fix");
    }
  };

  const leftContent = diffLeft === 'working' ? workingRtl : (history.find(c => c.id === diffLeft)?.content || '');
  const rightContent = diffRight === 'working' ? workingRtl : (history.find(c => c.id === diffRight)?.content || '');

  return (
    <div className="flex h-screen w-full flex-col bg-[#1e1e1e] text-[#d4d4d4]">
      {/* Top Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-[#333] bg-[#2d2d2d] shadow-md z-10">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <GitBranch size={20} className="text-white" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-white">Neural Trace</h1>
        </div>
        
        <div className="flex items-center gap-6">
           {/* Section Toggles */}
           <div className="flex items-center gap-2 bg-black/20 p-1 rounded-md border border-[#444]">
              <button 
                onClick={() => setShowExplorer(!showExplorer)}
                className={`p-1.5 rounded transition-all ${showExplorer ? 'bg-blue-600/20 text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
                title="Toggle Explorer"
              >
                <Files size={16} />
              </button>
              <button 
                onClick={() => setShowEvolution(!showEvolution)}
                className={`p-1.5 rounded transition-all ${showEvolution ? 'bg-blue-600/20 text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
                title="Toggle Evolution"
              >
                <GitCommit size={16} />
              </button>
              <button 
                onClick={() => setShowImpact(!showImpact)}
                className={`p-1.5 rounded transition-all ${showImpact ? 'bg-blue-600/20 text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
                title="Toggle Impact Graph"
              >
                <ArrowRightLeft size={16} />
              </button>
           </div>

           {/* Editor Modes Toggles */}
           <div className="bg-black/20 p-1 rounded-md flex border border-[#444]">
              <button 
                onClick={() => setEditorMode('edit')}
                className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-semibold transition-all ${editorMode === 'edit' ? 'bg-[#444] text-white' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <FileCode size={14} /> Edit
              </button>
              <button 
                 onClick={() => setEditorMode('diff')}
                 className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-semibold transition-all ${editorMode === 'diff' ? 'bg-[#444] text-white' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <Play size={14} /> Diff
              </button>
           </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - VS Code Style */}
        {(showExplorer || showEvolution) && (
          <aside className="w-80 border-r border-[#333] bg-[#252526] flex flex-col select-none">
            <div className="flex-1 flex flex-col overflow-hidden">
              
              {/* Explorer Section */}
              {showExplorer && (
                <div className={`${showEvolution ? 'h-2/5' : 'flex-1'} flex flex-col min-h-0`}>
                  <div className="px-4 py-2 border-b border-[#333] flex items-center justify-between bg-[#252526] sticky top-0 z-10 group cursor-pointer hover:bg-[#2a2d2e]" onClick={() => {}}>
                    <div className="flex items-center gap-1">
                      <ChevronDown size={14} className="text-gray-400" />
                      <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#858585]">Explorer</h2>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); setShowExplorer(false); }} className="hover:bg-white/10 p-1 rounded transition-all">
                        <span className="text-[10px] text-gray-500">Hide</span>
                      </button>
                      <Files size={14} className="text-[#858585]" />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar pt-2">
                    <FileExplorer files={files} activeFile={activeFile} onFileSelect={handleFileSelect} onNewFile={handleNewFile} onRemoveFile={handleRemoveFile} />
                  </div>
                </div>
              )}

              {/* Source Control / Evolution Section */}
              <div className="flex-1 border-t border-[#333] flex flex-col min-h-0 bg-[#1e1e1e]">
                {/* Source Control Header */}
                <div className="px-4 py-2 flex items-center justify-between bg-[#252526] text-[#cccccc]">
                  <h2 className="text-[11px] font-normal">Source Control</h2>
                  <MoreHorizontal size={16} className="text-gray-500 cursor-pointer hover:text-white" />
                </div>

                {/* Changes List and Input Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                  {/* Commmit Tool Bar */}
                  <div className="px-3 py-2 flex items-center justify-between group cursor-pointer hover:bg-[#2a2d2e]">
                    <div className="flex items-center gap-1">
                       <ChevronDown size={14} className="text-gray-400" />
                       <span className="text-[11px] font-bold text-[#858585]">Changes</span>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all text-gray-400">
                      <Check size={14} className="hover:text-white" />
                      <RotateCcw size={14} className="hover:text-white" />
                      <MoreHorizontal size={14} className="hover:text-white" />
                    </div>
                  </div>

                  {/* Commit Input Box */}
                  <div className="px-3 mb-3">
                    <div className="relative group/input">
                      <textarea 
                        placeholder="Message (Ctrl+Enter to commit)"
                        value={commitMessage}
                        onChange={(e) => setCommitMessage(e.target.value)}
                        className="w-full bg-[#3c3c3c] border border-transparent focus:border-blue-500 outline-none p-2 pr-20 rounded text-[13px] min-h-[70px] text-white placeholder-gray-500 transition-all custom-scrollbar overflow-hidden resize-none"
                      />

                    </div>
                  </div>

                  {/* Main Commit Button */}
                  <div className="px-3 mb-4">
                    <div className="flex w-full">
                      <button 
                        onClick={handleCommit}
                        disabled={isAnalyzing || !isSyntaxValid}
                        className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-l text-[13px] transition-all opacity-100 ${
                          (isAnalyzing || !isSyntaxValid) 
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                            : 'bg-[#007acc] hover:bg-[#0062a3] text-white shadow-[0_0_15px_rgba(0,122,204,0.3)]'
                        }`}
                      >
                        <Check size={16} /> 
                        {isAnalyzing ? 'Analyzing...' : (!isSyntaxValid ? (syntaxErrors.length > 0 ? 'Fix Errors' : 'Verifying...') : 'Commit')}
                      </button>
                      <div className="w-[1px] bg-black/20 h-auto"></div>
                      <button className={`px-2 rounded-r transition-all ${
                        (isAnalyzing || !isSyntaxValid) 
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                          : 'bg-[#007acc] hover:bg-[#0062a3] text-white'
                      }`}>
                        <ChevronDown size={16} />
                      </button>

                    </div>
                    {syntaxErrors.length > 0 && (
                      <div className="mt-2 text-[10px] text-red-500 font-medium px-1 flex items-center gap-1">
                        <AlertCircle size={10} /> Syntax errors must be resolved before committing.
                      </div>
                    )}
                  </div>


                  {/* Evolution Timeline (Graph Section) */}
                  {showEvolution && (
                    <div className="flex-1 flex flex-col min-h-0 mt-2">
                       <div className="px-3 py-1 flex items-center justify-between group cursor-pointer hover:bg-[#2a2d2e]">
                          <div className="flex items-center gap-1">
                             <ChevronDown size={14} className="text-gray-400" />
                             <span className="text-[11px] font-bold text-[#858585]">Evolution Graph</span>
                             <span className="ml-2 bg-[#333] text-[#bbb] rounded-full px-1.5 py-0.5 text-[10px] leading-none">{history.length}</span>
                          </div>
                       </div>
                       
                       <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar mt-1">
                          {/* Reusing the timeline component for the "Graph" part */}
                          <div className="px-2">
                             <VersionTimeline history={history} compact={true} />
                          </div>

                          {impactData && (
                            <div className="mt-4 px-3 space-y-4 pb-6 border-t border-[#333] pt-4">
                               {/* Analysis Error if any */}
                               {impactData.risk === 'Error' && (
                                  <div className="bg-red-500/10 border border-red-500/30 p-2 rounded text-[11px] text-red-400 flex items-start gap-2">
                                     <AlertCircle className="shrink-0" size={14} />
                                     <span>{impactData.suggestions[0]}</span>
                                  </div>
                               )}

                               {/* Impact summary - Styled like Git changes */}
                               <div>
                                  <div className="flex items-center justify-between mb-2">
                                     <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Impacted RTL Signals</h3>
                                     <span className="bg-[#333] text-[#bbb] rounded-full px-1.5 py-0.5 text-[9px] leading-none">
                                        {(impactData.delta.changed_signals?.length || 0)}
                                     </span>
                                  </div>
                                  <div className="space-y-0.5 mb-6">
                                    {(impactData.delta.changed_signals || []).map((sig: string, i: number) => (
                                       <div key={i} className="flex items-center justify-between text-[12px] group cursor-default py-1 px-1 hover:bg-[#2a2d2e] rounded">
                                          <div className="flex items-center gap-2 overflow-hidden">
                                             <FileCode size={14} className="text-yellow-500/80 shrink-0" />
                                             <div className="flex items-baseline gap-1.5 overflow-hidden">
                                                <span className="text-[#cccccc] truncate">{sig}</span>
                                                <span className="text-[10px] text-gray-600 truncate">Internal</span>
                                             </div>
                                          </div>
                                          <span className="text-yellow-500/80 font-bold text-[10px] px-1">M</span>
                                       </div>
                                    ))}
                                  </div>

                                  <div className="flex items-center justify-between mb-2">
                                     <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#facc15]">Mandatory Re-Verification</h3>
                                     <span className="bg-yellow-500/20 text-yellow-500 rounded-full px-1.5 py-0.5 text-[9px] leading-none border border-yellow-500/30">
                                        {(impactData.stale_testbenches?.length || 0)}
                                     </span>
                                  </div>
                                  <div className="space-y-1 mb-6">
                                    {(impactData.stale_testbenches || []).map((tb: string, i: number) => (
                                       <div key={i} className="flex flex-col gap-1 p-2 bg-[#2d2d2d] rounded border border-yellow-500/20 hover:border-yellow-500/40 transition-all cursor-pointer group">
                                          <div className="flex items-center justify-between text-[12px]">
                                             <div className="flex items-center gap-2">
                                                <Play size={14} className="text-yellow-500 shrink-0" />
                                                <span className="text-[#eee] font-medium">{tb}</span>
                                             </div>
                                             <div className="flex items-center gap-1.5">
                                                <span className="text-[9px] bg-red-500/20 text-red-400 px-1 rounded border border-red-500/30">RERUN</span>
                                             </div>
                                          </div>
                                          <p className="text-[10px] text-gray-400 leading-tight">Impacted by module logic changes</p>
                                       </div>
                                    ))}
                                  </div>
                               </div>

                               <div>
                                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Analysis Story</h3>
                                  <div className="space-y-2">
                                     {impactData.suggestions.map((s: any, i: number) => {
                                        const description = typeof s === 'string' ? s : s.description;
                                        const fixedCode = typeof s === 'string' ? null : s.fixed_code;
                                        return (
                                          <div key={i} className="flex flex-col gap-2 p-2 bg-blue-500/5 rounded border border-blue-500/10">
                                            <div className="flex gap-2">
                                              <Sparkles size={12} className="text-blue-400 shrink-0 mt-0.5" />
                                              <p className="text-[11px] leading-relaxed text-gray-300">
                                                 {description}
                                              </p>
                                            </div>
                                            {fixedCode && (
                                              <button 
                                                onClick={() => handleApplyFix(fixedCode)}
                                                className="ml-5 self-start flex items-center gap-1 px-2 py-0.5 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 text-[10px] font-bold rounded border border-blue-500/30 transition-all"
                                              >
                                                Apply Fix
                                              </button>
                                            )}
                                          </div>
                                        );
                                     })}
                                  </div>
                               </div>
                            </div>
                          )}
                       </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </aside>
        )}
        
        {/* Center Panel - Editor */}
        <main className="flex-1 border-r border-[#333] flex flex-col relative bg-[#1e1e1e]">
           {editorMode === 'diff' && activeFile === 'led_blinker.v' && (
             <div className="bg-[#252526] px-4 py-2 border-b border-[#333] flex items-center gap-4 text-sm z-20">
               <span className="text-gray-400 font-semibold text-xs uppercase tracking-widest">Compare</span>
               <select value={diffLeft} onChange={(e) => setDiffLeft(e.target.value)} className="bg-[#1e1e1e] border border-[#444] rounded text-gray-300 px-2 py-1 outline-none focus:border-blue-500 flex-1">
                  <option value="working">Working Copy</option>
                  {history.map(c => <option key={c.id} value={c.id}>{c.id.substring(0,7)} - {c.message}</option>)}
               </select>
               <ArrowRightLeft size={16} className="text-gray-500" />
               <select value={diffRight} onChange={(e) => setDiffRight(e.target.value)} className="bg-[#1e1e1e] border border-[#444] rounded text-gray-300 px-2 py-1 outline-none focus:border-blue-500 flex-1">
                  <option value="working">Working Copy</option>
                  {history.map(c => <option key={c.id} value={c.id}>{c.id.substring(0,7)} - {c.message}</option>)}
               </select>
             </div>
           )}

           <div className="flex-1 relative">
             {(!workingRtl && activeFile === 'clk_divider.v') ? (
               <div className="flex items-center justify-center h-full text-gray-500 animate-pulse">Loading clk_divider.v...</div>
             ) : (
              <CodeEditor 
                 original={activeFile === 'clk_divider.v' ? leftContent : ''} 
                 modified={activeFile === 'clk_divider.v' ? (editorMode === 'edit' ? workingRtl : rightContent) : (fileContents[activeFile] || '')} 
                 onChange={(val) => {
                   const newVal = val || '';
                   if (activeFile === 'led_blinker.v') {
                     setWorkingRtl(newVal);
                   } else {
                     setFileContents({ ...fileContents, [activeFile]: newVal });
                   }
                 }}
                 mode={activeFile === 'led_blinker.v' ? editorMode : 'edit'}
                 path={activeFile}
                 errors={syntaxErrors}
              />
             )}
           </div>
           
           {/* Visual Breadcrumb/Status */}
           <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#2d2d2d]/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 text-[11px] flex items-center gap-4 z-20 pointer-events-none">
              <div className="flex items-center gap-2">
                 <span className="text-gray-500">HEAD:</span>
                 <span className="text-blue-400 font-mono">{history[history.length-1]?.id.substring(0,7)}</span>
              </div>
              <div className="w-[1px] h-3 bg-white/10"></div>
              <div className="flex items-center gap-1.5">
                 <FileCode size={12} className={activeFile.includes('testbench') ? 'text-yellow-500' : 'text-blue-400'} />
                 <span className="text-white font-medium">{activeFile}</span>
              </div>
           </div>
        </main>
        
        {/* Right Panel - Impact Visualizer */}
        {showImpact && !maximizeImpact && (
          <aside className="w-[450px] bg-[#252526] border-l border-[#333] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#333] bg-[#2d2d2d]">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setAnalysisView(false)}
                  className={`text-[11px] font-bold uppercase tracking-widest px-2 py-1 rounded transition-all ${!analysisView ? 'text-blue-400 bg-blue-400/10' : 'text-[#858585] hover:text-gray-300'}`}
                >
                  Graph
                </button>
                <div className="w-[1px] h-3 bg-[#444]"></div>
                <button 
                  onClick={() => setAnalysisView(true)}
                  className={`text-[11px] font-bold uppercase tracking-widest px-2 py-1 rounded transition-all ${analysisView ? 'text-blue-400 bg-blue-400/10' : 'text-[#858585] hover:text-gray-300'}`}
                >
                  AI Analysis
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setMaximizeImpact(true)} className="hover:bg-white/10 p-1 rounded transition-all" title="Full Screen">
                  <MoreHorizontal size={14} className="text-gray-500" />
                </button>
                <button onClick={() => setShowImpact(false)} className="hover:bg-white/10 p-1 rounded transition-all" title="Close">
                  <span className="text-[10px] text-gray-500">Hide</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {analysisView ? (
                <div className="p-6 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                  {/* Assessment Header */}
                  {impactData && (
                    <div className={`p-4 rounded-xl border flex items-center justify-between ${
                      impactData.risk === 'High' ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20'
                    }`}>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">Risk Assessment</p>
                        <h3 className={`text-2xl font-bold ${
                          impactData.risk === 'High' ? 'text-red-500' : 'text-green-500'
                        }`}>{impactData.risk} Impact detected</h3>
                      </div>
                      <Sparkles size={32} className={impactData.risk === 'High' ? 'text-red-500/50' : 'text-green-500/50'} />
                    </div>
                  )}

                  {!impactData && isAnalyzing && (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-sm text-gray-400">AI Engine analyzing changes...</p>
                    </div>
                  )}

                  {impactData && (
                    <>
                      {/* Re-verification Section */}
                      <section>
                        <div className="flex items-center gap-2 mb-4">
                          <RotateCcw size={18} className="text-yellow-500" />
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Mandatory RTL Re-Verification</h3>
                        </div>
                        <div className="grid gap-3">
                          {impactData.stale_testbenches.length > 0 ? (
                            impactData.stale_testbenches.map((tb: string, i: number) => (
                              <div key={i} className="group flex items-center justify-between p-4 bg-[#2d2d2d] rounded-xl border border-yellow-500/20 hover:border-yellow-500/50 transition-all cursor-pointer">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                                    <Play size={20} className="text-yellow-500" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-white">{tb}</p>
                                    <p className="text-xs text-gray-500">Outdated • Requires Rerun</p>
                                  </div>
                                </div>
                                <button className="opacity-0 group-hover:opacity-100 bg-yellow-500 text-black px-3 py-1 rounded text-xs font-bold transition-all">
                                  RUN NOW
                                </button>
                              </div>
                            ))
                          ) : (
                            <div className="p-4 bg-green-500/5 rounded-xl border border-green-500/10 text-center">
                              <Check className="mx-auto mb-2 text-green-500" size={24} />
                              <p className="text-sm text-gray-400">All testbenches are up to date.</p>
                            </div>
                          )}
                        </div>
                      </section>

                      {/* Analysis Story */}
                      <section>
                        <div className="flex items-center gap-2 mb-4">
                          <Sparkles size={18} className="text-blue-400" />
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider">AI Analysis Story</h3>
                        </div>
                        <div className="space-y-3">
                          {impactData.suggestions.map((s: any, i: number) => {
                            const description = typeof s === 'string' ? s : s.description;
                            const fixedCode = typeof s === 'string' ? null : s.fixed_code;
                            return (
                              <div key={i} className="flex flex-col gap-3 p-4 bg-blue-500/5 rounded-xl border border-blue-500/10 transition-all hover:bg-blue-500/10">
                                <div className="flex gap-3">
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0"></div>
                                  <p className="text-[13px] leading-relaxed text-gray-300">{description}</p>
                                </div>
                                {fixedCode && (
                                  <button 
                                    onClick={() => handleApplyFix(fixedCode)}
                                    className="ml-5 self-start flex items-center gap-1.5 px-3 py-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 text-[11px] font-bold rounded border border-blue-500/30 transition-all"
                                  >
                                    <Check size={12} /> Apply Fix
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </section>

                      {/* Impacted Signals */}
                      <section>
                        <div className="flex items-center gap-2 mb-4">
                          <ArrowRightLeft size={18} className="text-purple-400" />
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Impacted Signals</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {impactData.delta.changed_signals.map((sig: string, i: number) => (
                            <span key={i} className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-[11px] text-purple-300 font-medium">
                              {sig}
                            </span>
                          ))}
                        </div>
                      </section>
                    </>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col p-4">
                   <div className="flex-1 rounded-xl border border-[#333] overflow-hidden bg-[#1e1e1e] shadow-inner relative">
                    <ImpactGraph externalNodes={impactData?.impact_map?.nodes} externalEdges={impactData?.impact_map?.edges} />
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Full Screen Impact Graph Modal/Overlay */}
      {maximizeImpact && (
        <div className="fixed inset-0 z-50 bg-[#1e1e1e] flex flex-col p-6 animate-in fade-in zoom-in duration-300">
           <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-white tracking-tight">Full Impact Analysis</h2>
                {impactData && (
                  <div className={`px-4 py-1.5 rounded-full text-xs font-bold border ${ impactData.risk === 'High' ? 'bg-red-500/10 border-red-500/50 text-red-500' : 'bg-green-500/10 border-green-500/50 text-green-500' }`}>
                    Overall Risk Assessment: {impactData.risk}
                  </div>
                )}
              </div>
              <button 
                onClick={() => setMaximizeImpact(false)}
                className="bg-[#333] hover:bg-[#444] text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all shadow-lg"
              >
                Exit Full Screen
              </button>
           </div>
           <div className="flex-1 rounded-2xl border border-[#333] overflow-hidden bg-black/40 shadow-2xl relative">
              <ImpactGraph externalNodes={impactData?.impact_map?.nodes} externalEdges={impactData?.impact_map?.edges} />
           </div>
        </div>
      )}

      <ConfirmationModal 
        isOpen={showConfirmModal}
        onConfirm={executeCommit}
        onCancel={() => setShowConfirmModal(false)}
        isProcessing={isAnalyzing}
      />
    </div>
  );
}

export default App;
