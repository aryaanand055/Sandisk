import React from 'react';
import { AlertTriangle, Send, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message?: string;
  isProcessing?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
  isOpen, 
  onConfirm, 
  onCancel, 
  title = "AI Analysis Request", 
  message = "This action will call the Groq API to analyze your RTL changes and generate a verification impact graph. Proceed?",
  isProcessing = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header - Glassmorphism style */}
        <div className="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 px-6 py-4 flex items-center gap-3 border-b border-white/5">
          <div className="bg-blue-600/30 p-2 rounded-lg text-blue-400">
            <AlertTriangle size={20} />
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
          <button 
            onClick={onCancel}
            className="ml-auto text-gray-500 hover:text-white transition-colors"
            disabled={isProcessing}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-300 text-sm leading-relaxed mb-6">
            {message}
          </p>
          
          <div className="flex items-center gap-3">
             <div className="flex-1 h-[1px] bg-white/5"></div>
             <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Groq / GPT-OSS-20B</span>
             <div className="flex-1 h-[1px] bg-white/5"></div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 flex gap-3">
          <button 
            onClick={onCancel}
            className="flex-1 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-gray-300 py-3 rounded-xl font-semibold text-sm transition-all border border-white/5"
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="flex-2 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3 px-8 rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send size={16} />
                Confirm Request
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
