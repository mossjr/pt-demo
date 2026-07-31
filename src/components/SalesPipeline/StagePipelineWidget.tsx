import React from 'react';
import { StageSummary } from '../../types';
import { formatCurrency } from '../../utils/analytics';
import { Layers, ArrowRight, CheckCircle, XCircle } from 'lucide-react';

interface StagePipelineWidgetProps {
  stageSummaries: StageSummary[];
  currency: string;
}

export const StagePipelineWidget: React.FC<StagePipelineWidgetProps> = ({
  stageSummaries,
  currency,
}) => {
  const totalValueSum = stageSummaries.reduce((acc, s) => acc + s.totalValue, 0);

  return (
    <div className="bg-[#122852] border border-[#3f7abb]/30 rounded-2xl p-5 shadow-xl space-y-5">
      <div className="flex items-center space-x-3 pb-3 border-b border-[#3f7abb]/20">
        <div className="p-2.5 bg-[#0d2045] rounded-xl text-[#3f7abb] border border-[#3f7abb]/40">
          <Layers className="w-5 h-5 text-[#3f7abb]" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Pipeline Stage Conversion & Distribution</h3>
          <p className="text-xs text-slate-300">Total deal volume and value by sales stage</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stageSummaries.map((summary) => {
          const isWon = summary.stage === 'Closed Won';
          const isLost = summary.stage === 'Closed Lost';
          const percentOfTotal = totalValueSum > 0 ? (summary.totalValue / totalValueSum) * 100 : 0;

          return (
            <div
              key={summary.stage}
              className={`p-4 rounded-xl border transition-all ${
                isWon
                  ? 'bg-[#0d2045] border-[#ecdf51]/60 shadow-md'
                  : isLost
                  ? 'bg-[#0d2045]/60 border-red-500/30'
                  : 'bg-[#0d2045] border-[#3f7abb]/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                  {isWon && <CheckCircle className="w-3.5 h-3.5 text-[#ecdf51]" />}
                  {isLost && <XCircle className="w-3.5 h-3.5 text-red-400" />}
                  <span>{summary.stage}</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#122852] text-slate-300 border border-[#3f7abb]/30">
                  {summary.dealCount} deals
                </span>
              </div>

              <div className="text-xl font-extrabold text-white mb-2">
                {formatCurrency(summary.totalValue, currency)}
              </div>

              {/* Progress Bar of Pipeline Share */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Share of Total</span>
                  <span className="font-semibold text-slate-200">{percentOfTotal.toFixed(1)}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#122852] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      isWon ? 'bg-[#ecdf51]' : isLost ? 'bg-red-400/60' : 'bg-[#3f7abb]'
                    }`}
                    style={{ width: `${Math.min(100, percentOfTotal)}%` }}
                  />
                </div>
              </div>

              {summary.stalledCount > 0 && !isWon && !isLost && (
                <div className="mt-3 pt-2 border-t border-[#3f7abb]/20 flex items-center justify-between text-[11px]">
                  <span className="text-[#ecdf51] font-medium">Stalled Deals:</span>
                  <span className="font-bold text-[#ecdf51] bg-[#ecdf51]/10 px-2 py-0.5 rounded">
                    {summary.stalledCount} ({formatCurrency(summary.stalledValue, currency)})
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
