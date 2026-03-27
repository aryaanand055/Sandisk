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

const API_URL = 'http://localhost:8000';

function App() {
  const [files, setFiles] = useState<any[]>([]);
  const [activeFile, setActiveFile] = useState('design.v');
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

  const [showExplorer, setShowExplorer] = useState(true);
  const [showEvolution, setShowEvolution] = useState(true);
  const [showImpact, setShowImpact] = useState(true);
  const [maximizeImpact, setMaximizeImpact] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

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
        
        // Initial load for all files
        for (const f of res.data.files) {
          const contentRes = await axios.get(`${API_URL}/file/${f.path}`);
          const content = contentRes.data.content;
          setFileContents(prev => ({ ...prev, [f.path]: content }));
          if (f.path === 'design.v') {
             setBaselineRtl(content);
             setWorkingRtl(content);
             setHistory([{ id: 'baseline', message: 'Initial Baseline', risk: 'Low', time: 'Recently', content: content }]);
          }
        }
      } catch (err) {
        console.error("Failed to load files", err);
      }
    };
    fetchFiles();
  }, []); // Only run once on mount, no need to depend on handleAnalyze now


  const handleFileSelect = (path: string) => {
    setActiveFile(path);
  };

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

    // Trigger Groq analysis only once after the commit process has finalized
    const analysis = await handleAnalyze(oldRtl, newRtl);
    
    // Update the history record once analysis is complete
    if (analysis) {
      setHistory(prev => prev.map(c => 
        c.id === newCommitId ? { ...c, risk: analysis.risk } : c
      ));
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
                    <FileExplorer files={files} activeFile={activeFile} onFileSelect={handleFileSelect} />
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
                        disabled={isAnalyzing}
                        className="flex-1 flex items-center justify-center gap-2 bg-[#007acc] hover:bg-[#0062a3] text-white py-1.5 rounded-l text-[13px] transition-all disabled:opacity-50"
                      >
                        <Check size={16} /> {isAnalyzing ? 'Analyzing...' : 'Commit'}
                      </button>
                      <div className="w-[1px] bg-black/20 h-auto"></div>
                      <button className="bg-[#007acc] hover:bg-[#0062a3] text-white px-2 rounded-r transition-all">
                        <ChevronDown size={16} />
                      </button>
                    </div>
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
                                     {(impactData.suggestions || []).map((s: string, i: number) => (
                                        <div key={i} className="flex gap-2 p-2 bg-blue-500/5 rounded border border-blue-500/10">
                                           <Sparkles size={12} className="text-blue-400 shrink-0 mt-0.5" />
                                           <p className="text-[11px] leading-relaxed text-gray-300">
                                              {s}
                                           </p>
                                        </div>
                                     ))}
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
           {editorMode === 'diff' && activeFile === 'design.v' && (
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
             {(!workingRtl && activeFile === 'design.v') ? (
               <div className="flex items-center justify-center h-full text-gray-500 animate-pulse">Loading design.v...</div>
             ) : (
               <CodeEditor 
                  original={activeFile === 'design.v' ? leftContent : ''} 
                  modified={activeFile === 'design.v' ? (editorMode === 'edit' ? workingRtl : rightContent) : (fileContents[activeFile] || '')} 
                  onChange={(val) => {
                    const newVal = val || '';
                    if (activeFile === 'design.v') {
                      setWorkingRtl(newVal);
                    } else {
                      setFileContents({ ...fileContents, [activeFile]: newVal });
                    }
                  }}
                  mode={activeFile === 'design.v' ? editorMode : 'edit'}
                  path={activeFile}
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
          <aside className="w-[450px] bg-[#252526] p-4 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#858585]">Impact Graph</h2>
                <div className="flex items-center gap-1">
                  <button onClick={() => setMaximizeImpact(true)} className="hover:bg-white/10 p-1 rounded transition-all" title="Full Screen">
                    <span className="text-[10px] text-gray-500">Maximize</span>
                  </button>
                  <button onClick={() => setShowImpact(false)} className="hover:bg-white/10 p-1 rounded transition-all" title="Close">
                    <span className="text-[10px] text-gray-500">Minimize</span>
                  </button>
                </div>
              </div>
              {impactData && (
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold border ${ impactData.risk === 'High' ? 'bg-red-500/10 border-red-500/50 text-red-500' : 'bg-green-500/10 border-green-500/50 text-green-500' } animate-pulse`}>
                  {impactData.risk} Risk Detected
                </div>
              )}
            </div>
            <div className="flex-1 rounded-xl border border-[#333] overflow-hidden bg-[#1e1e1e] shadow-inner relative">
               <ImpactGraph externalNodes={impactData?.impact_map?.nodes} externalEdges={impactData?.impact_map?.edges} />
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
