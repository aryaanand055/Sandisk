import React from 'react';

interface VersionTimelineProps {
  history: any[];
  compact?: boolean;
}

const VersionTimeline: React.FC<VersionTimelineProps> = ({ history, compact = false }) => {
  return (
    <div className={`flex flex-col w-full ${compact ? 'p-0 gap-0' : 'p-2 gap-0'}`}>
      {history.slice().reverse().map((commit, index, arr) => (
        <div key={commit.id} className={`relative flex items-start group cursor-pointer hover:bg-[#2a2d2e] rounded transition-colors ${compact ? 'min-h-[36px] px-1 py-1' : 'min-h-[44px] px-2 py-1.5'}`}>
          {/* Vertical Line */}
          {index !== arr.length - 1 && (
            <div className={`absolute left-[13px] group-hover:bg-[#666] transition-colors w-[1px] bg-[#444] ${compact ? 'top-[16px] bottom-[-4px]' : 'top-[20px] bottom-[-8px]'}`} />
          )}
          
          {/* Timeline Dot */}
          <div className={`flex items-center justify-center mr-2 relative z-10 ${compact ? 'mt-0.5' : 'mt-1 mr-3'}`}>
             <div className={`rounded-full border-2 bg-transparent transition-transform group-hover:scale-110 ${commit.risk === 'High' ? 'border-red-500' : 'border-[#007acc]'} ${compact ? 'w-[8px] h-[8px]' : 'w-[10px] h-[10px]'}`} />
          </div>
          
          {/* Content */}
          <div className="flex flex-col flex-1 min-w-0">
             <div className="flex items-center justify-between gap-2 overflow-hidden">
                <span className={`text-[#cccccc] truncate font-medium ${compact ? 'text-[11px]' : 'text-[12px]'}`}>{commit.message}</span>
                <span className={`text-[#858585] whitespace-nowrap ${compact ? 'text-[9px]' : 'text-[10px]'}`}>{commit.time}</span>
             </div>
             <div className="flex items-center gap-2 mt-0">
                <span className={`text-[#858585] font-mono ${compact ? 'text-[9px]' : 'text-[10px]'}`}>{commit.id.substring(0, 7)}</span>
                {!compact && (
                  commit.risk === 'High' ? (
                    <span className="text-[9px] px-1 py-[1px] rounded bg-red-500/20 text-red-400 font-bold uppercase leading-none">High Risk</span>
                  ) : (
                    <span className="text-[9px] px-1 py-[1px] rounded bg-[#007acc]/20 text-[#007acc] font-bold uppercase leading-none">{commit.risk}</span>
                  )
                )}
             </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default VersionTimeline;
