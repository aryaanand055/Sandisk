import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { GitBranch, GitCommit, Play, FileCode, CheckCircle2, ArrowRightLeft } from 'lucide-react';
import CodeEditor from './components/CodeEditor';
import ImpactGraph from './components/ImpactGraph';
import VersionTimeline from './components/VersionTimeline';

const API_URL = 'http://localhost:8000';

const INITIAL_CODE = `module uart_tx (
  input wire clk,
  input wire rst_n,
  input wire tx_en,
  input wire [7:0] tx_data,
  output reg tx_out,
  output reg tx_busy,
  output reg tx_done
);

  parameter BAUD_RATE = 115200;
  parameter CLK_FREQ = 50000000;
  parameter BIT_TIMER = CLK_FREQ / BAUD_RATE;
  
  reg [15:0] timer;
  reg [3:0] bit_idx;
  reg [9:0] shift_reg;
  reg [1:0] state;

  localparam IDLE = 2'b00;
  localparam START = 2'b01;
  localparam DATA = 2'b10;
  localparam STOP = 2'b11;
  
  always @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      state <= IDLE;
      tx_busy <= 0;
      tx_done <= 0;
      tx_out <= 1;
      timer <= 0;
      bit_idx <= 0;
    end else begin
      tx_done <= 0;
      case (state)
        IDLE: begin
          tx_out <= 1;
          tx_busy <= 0;
          if (tx_en) begin
            shift_reg <= {1'b1, tx_data, 1'b0};
            state <= START;
            tx_busy <= 1;
            timer <= 0;
            bit_idx <= 0;
          end
        end
        START, DATA, STOP: begin
          if (timer < BIT_TIMER - 1) begin
            timer <= timer + 1;
          end else begin
            timer <= 0;
            tx_out <= shift_reg[0];
            shift_reg <= {1'b1, shift_reg[9:1]};
            
            if (bit_idx < 9) begin
              bit_idx <= bit_idx + 1;
              state <= DATA;
            end else begin
              state <= IDLE;
              tx_done <= 1;
              tx_busy <= 0;
            end
          end
        end
      endcase
    end
  end
endmodule`;

function App() {
  const [baselineRtl, setBaselineRtl] = useState(INITIAL_CODE);
  const [workingRtl, setWorkingRtl] = useState(INITIAL_CODE);
  const [commitMessage, setCommitMessage] = useState('');
  const [editorMode, setEditorMode] = useState<'edit' | 'diff'>('edit');
  
  const [diffLeft, setDiffLeft] = useState('baseline');
  const [diffRight, setDiffRight] = useState('working');

  const [impactData, setImpactData] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [history, setHistory] = useState<any[]>([
    { id: 'baseline', message: 'Initial Baseline', risk: 'Low', time: 'Recently', content: INITIAL_CODE }
  ]);

  const handleAnalyze = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      const res = await axios.post(`${API_URL}/analyze`, {
        old_rtl: baselineRtl,
        new_rtl: workingRtl
      });
      setImpactData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [baselineRtl, workingRtl]);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleAnalyze();
    }, 1000);
    return () => clearTimeout(timer);
  }, [handleAnalyze]);

  const handleCommit = () => {
    if (!commitMessage.trim()) return alert("Enter a commit message");
    
    const newCommitId = Math.random().toString(16).slice(2, 10);
    const newCommit = {
      id: newCommitId,
      message: commitMessage,
      risk: impactData?.risk || 'Low',
      time: new Date().toLocaleTimeString(),
      content: workingRtl
    };
    
    setHistory([...history, newCommit]);
    setBaselineRtl(workingRtl);
    setCommitMessage('');
    setDiffLeft(newCommitId);
    alert("Committed changes set as new baseline.");
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
        
        <div className="flex items-center gap-4">
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
           
           <button 
              onClick={handleAnalyze} 
              disabled={isAnalyzing}
              className="group relative flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-full text-sm font-bold transition-all disabled:opacity-50 hover:shadow-[0_0_15px_rgba(37,99,235,0.4)]"
            >
              <CheckCircle2 size={16} />
              {isAnalyzing ? "Analyzing..." : "Analyze Impact"}
            </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Git View */}
        <aside className="w-80 border-r border-[#333] bg-[#252526] flex flex-col">
          <div className="p-4 border-b border-[#333]">
             <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#858585] mb-4">Source Control</h2>
             
             {/* Commit Form */}
             <div className="flex flex-col gap-3">
                <textarea 
                  placeholder="Commit message..."
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  className="w-full bg-[#3c3c3c] border border-[#3c3c3c] focus:border-blue-500 outline-none p-2 rounded text-sm min-h-[80px] text-white placeholder-gray-500 transition-all custom-scrollbar"
                />
                <button 
                  onClick={handleCommit}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded font-semibold text-xs transition-all"
                >
                  <GitCommit size={14} /> Commit Baseline
                </button>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <div className="flex flex-col gap-6">
              {/* Evolution Graph Section */}
              <div>
                 <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#858585] mb-3">Evolution Graph</h3>
                 <div className="bg-[#1e1e1e] border border-[#333] rounded overflow-hidden">
                    <VersionTimeline history={history} />
                 </div>
              </div>

              {impactData && (
                <>
                  <div>
                     <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#858585] mb-3">AI Recommendations</h3>
                     <div className="space-y-3">
                        {impactData.suggestions.map((s: string, i: number) => (
                          <div key={i} className="bg-[#2a2d2e] p-3 rounded-md border-l-2 border-blue-500 text-sm leading-relaxed">
                            {s}
                          </div>
                        ))}
                     </div>
                  </div>
                  
                  <div>
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#858585] mb-3">Modified Objects</h3>
                    <div className="space-y-1">
                      {impactData.delta.changed_signals.map((sig: string, i: number) => (
                         <div key={i} className="flex items-center gap-2 text-xs px-2 py-1.5 hover:bg-[#2a2d2e] rounded cursor-default group">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                            <span className="text-gray-300">signal</span>
                            <span className="text-white font-mono">{sig}</span>
                         </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </aside>
        
        {/* Center Panel - Editor */}
        <main className="flex-1 border-r border-[#333] flex flex-col relative bg-[#1e1e1e]">
           {editorMode === 'diff' && (
             <div className="bg-[#252526] px-4 py-2 border-b border-[#333] flex items-center gap-4 text-sm z-20">
               <span className="text-gray-400 font-semibold text-xs uppercase tracking-widest">Compare</span>
               <select value={diffLeft} onChange={(e) => setDiffLeft(e.target.value)} className="bg-[#1e1e1e] border border-[#444] rounded text-gray-300 px-2 py-1 outline-none focus:border-blue-500 flex-1">
                  <option value="working">Working Copy (Uncommitted)</option>
                  {history.map(c => <option key={c.id} value={c.id}>{c.id.substring(0,7)} - {c.message}</option>)}
               </select>
               <ArrowRightLeft size={16} className="text-gray-500" />
               <select value={diffRight} onChange={(e) => setDiffRight(e.target.value)} className="bg-[#1e1e1e] border border-[#444] rounded text-gray-300 px-2 py-1 outline-none focus:border-blue-500 flex-1">
                  <option value="working">Working Copy (Uncommitted)</option>
                  {history.map(c => <option key={c.id} value={c.id}>{c.id.substring(0,7)} - {c.message}</option>)}
               </select>
             </div>
           )}

           <div className="flex-1 relative">
             <CodeEditor 
                original={leftContent} 
                modified={editorMode === 'edit' ? workingRtl : rightContent} 
                onChange={(val) => setWorkingRtl(val || '')}
                mode={editorMode}
             />
           </div>
           
           {/* Visual Breadcrumb/Status */}
           {editorMode === 'edit' && (
             <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#2d2d2d]/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 text-[11px] flex items-center gap-4 z-20 pointer-events-none">
                <div className="flex items-center gap-2">
                   <span className="text-gray-500">HEAD:</span>
                   <span className="text-blue-400 font-mono">{history[history.length-1]?.id.substring(0,7)}</span>
                </div>
                <div className="w-[1px] h-3 bg-white/10"></div>
                <div className="flex items-center gap-2">
                   <span className="text-gray-500">FILE:</span>
                   <span className="text-white">design.v</span>
                </div>
             </div>
           )}
        </main>
        
        {/* Right Panel - Impact Visualizer */}
        <aside className="w-[450px] bg-[#252526] p-4 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#858585]">Impact Graph</h2>
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
      </div>
    </div>
  );
}

export default App;
