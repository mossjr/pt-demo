import React from 'react';
import { X, Clock, Sparkles, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { ModuleInfo } from '../types';

interface DummyModuleModalProps {
  module: ModuleInfo | null;
  onClose: () => void;
  onLaunchActive: () => void;
}

export const DummyModuleModal: React.FC<DummyModuleModalProps> = ({
  module,
  onClose,
  onLaunchActive,
}) => {
  if (!module) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#122852] border border-[#3f7abb]/50 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-white space-y-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#0d2045] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-[#0d2045] border border-[#3f7abb]/40 rounded-xl text-[#ecdf51]">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#ecdf51]/20 border border-[#ecdf51]/40 text-[#ecdf51] mb-1">
              {module.badge || 'Coming Soon'}
            </span>
            <h3 className="text-xl font-bold">{module.title}</h3>
          </div>
        </div>

        {/* Description & Vision */}
        <div className="bg-[#0d2045] p-4 rounded-xl border border-[#3f7abb]/30 space-y-3">
          <p className="text-sm text-slate-300 leading-relaxed">
            {module.description}
          </p>

          <div className="flex items-center space-x-2 text-xs text-[#3f7abb] pt-2 border-t border-[#3f7abb]/20">
            <Sparkles className="w-4 h-4 text-[#ecdf51]" />
            <span>Planned for Next Quarterly Release</span>
          </div>
        </div>

        {/* Key Features Roadmap */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Planned Capability Preview
          </h4>
          <ul className="space-y-1.5 text-xs text-slate-300">
            <li className="flex items-center space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#ecdf51]" />
              <span>Seamless integration with main Sales Pipeline data</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#ecdf51]" />
              <span>Automated reporting & AI insights for trade businesses</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#ecdf51]" />
              <span>Exportable executive summaries in CSV & PDF formats</span>
            </li>
          </ul>
        </div>

        {/* Action Prompt to Active Module */}
        <div className="p-3 bg-[#0d2045]/60 rounded-xl border border-[#3f7abb]/30 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-slate-300">
            <AlertCircle className="w-4 h-4 text-[#ecdf51]" />
            <span>Active suite ready now:</span>
          </div>
          <button
            onClick={() => {
              onClose();
              onLaunchActive();
            }}
            className="px-3 py-1.5 bg-[#3f7abb] hover:bg-[#3267a0] text-white text-xs font-semibold rounded-lg flex items-center space-x-1 transition-colors"
          >
            <span>Sales Pipeline</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#ecdf51]" />
          </button>
        </div>
      </div>
    </div>
  );
};
