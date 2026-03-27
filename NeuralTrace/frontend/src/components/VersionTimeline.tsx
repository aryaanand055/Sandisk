import React from 'react';

interface VersionTimelineProps {
  history: any[];
}

const VersionTimeline: React.FC<VersionTimelineProps> = ({ history }) => {
  return (
    <div className="flex flex-col w-full p-2 gap-0">
      {history.slice().reverse().map((commit, index, arr) => (
        <div key={commit.id} className="relative flex items-start min-h-[44px] group cursor-pointer hover:bg-[#2a2d2e] rounded px-2 py-1.5 transition-colors">
          {/* Vertical Line */}
          {index !== arr.length - 1 && (
            <div className="absolute left-[13px] top-[20px] bottom-[-8px] w-[1px] bg-[#444] group-hover:bg-[#666] transition-colors" />
          )}
          
          {/* Timeline Dot */}
          <div className="flex items-center justify-center mt-1 mr-3 relative z-10">
             <div className={`w-[10px] h-[10px] rounded-full border-2 bg-transparent ${commit.risk === 'High' ? 'border-red-500' : 'border-[#007acc]'} group-hover:scale-110 transition-transform`} />
          </div>
          
          {/* Content */}
          <div className="flex flex-col flex-1 min-w-0">
             <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] text-[#cccccc] truncate font-medium">{commit.message}</span>
                <span className="text-[10px] text-[#858585] whitespace-nowrap">{commit.time}</span>
             </div>
             <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-[#858585] font-mono">{commit.id.substring(0, 7)}</span>
                {commit.risk === 'High' ? (
                  <span className="text-[9px] px-1 py-[1px] rounded bg-red-500/20 text-red-400 font-bold uppercase leading-none">High Risk</span>
                ) : (
                  <span className="text-[9px] px-1 py-[1px] rounded bg-[#007acc]/20 text-[#007acc] font-bold uppercase leading-none">{commit.risk}</span>
                )}
             </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default VersionTimeline;
