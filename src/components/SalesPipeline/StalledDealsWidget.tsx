import React, { useState } from 'react';
import { Deal, StageSummary } from '../../types';
import { formatCurrency } from '../../utils/analytics';
import { AlertOctagon, Clock, Filter, AlertCircle, ArrowRight, ShieldAlert } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';

interface StalledDealsWidgetProps {
  stalledDeals: Deal[];
  stageSummaries: StageSummary[];
  stalledThresholdDays: number;
  onThresholdChange: (days: number) => void;
  currency: string;
}

export const StalledDealsWidget: React.FC<StalledDealsWidgetProps> = ({
  stalledDeals,
  stageSummaries,
  stalledThresholdDays,
  onThresholdChange,
  currency,
}) => {
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('ALL');

  // Chart data for stage bottlenecks
  const stageBottlenecks = stageSummaries
    .filter((s) => s.stage !== 'Closed Won' && s.stage !== 'Closed Lost')
    .map((s) => ({
      stage: s.stage,
      stalledCount: s.stalledCount,
      stalledValue: s.stalledValue,
    }));

  const filteredStalledDeals = stalledDeals.filter(
    (d) => selectedStageFilter === 'ALL' || d.dealStage === selectedStageFilter
  );

  return (
    <div className="bg-[#122852] border border-[#ecdf51]/40 rounded-2xl p-5 shadow-xl space-y-6 relative overflow-hidden">
      {/* Top Header with Threshold Slider */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#3f7abb]/20">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-[#0d2045] rounded-xl text-[#ecdf51] border border-[#ecdf51]/50">
            <AlertOctagon className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <span>Pipeline Bottlenecks & Stalled Deals</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#ecdf51] text-[#0d2045]">
                {stalledDeals.length} Stalled
              </span>
            </h3>
            <p className="text-xs text-slate-300">
              Deals with inactive duration exceeding {stalledThresholdDays} days
            </p>
          </div>
        </div>

        {/* Sensitivity Threshold Control */}
        <div className="flex items-center space-x-3 bg-[#0d2045] p-2.5 rounded-xl border border-[#3f7abb]/30">
          <Clock className="w-4 h-4 text-[#ecdf51]" />
          <span className="text-xs text-slate-300 whitespace-nowrap">Stalled Threshold:</span>
          <div className="flex items-center space-x-1">
            {[7, 14, 30, 60].map((days) => (
              <button
                key={days}
                onClick={() => onThresholdChange(days)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  stalledThresholdDays === days
                    ? 'bg-[#ecdf51] text-[#0d2045] shadow-md'
                    : 'text-slate-300 hover:bg-[#122852]'
                }`}
              >
                {days}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid: Left Bottleneck Stage Chart, Right Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bottleneck by Stage Chart */}
        <div className="lg:col-span-2 bg-[#0d2045]/80 p-4 rounded-xl border border-[#3f7abb]/30 space-y-2">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span>Bottleneck Count by Deal Stage</span>
            <span className="text-[#ecdf51]">Critical Bottleneck Analysis</span>
          </h4>
          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageBottlenecks} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f7abb/20" vertical={false} />
                <XAxis dataKey="stage" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0d2045',
                    borderColor: '#ecdf51',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(value: number, name: string) => [
                    name === 'stalledCount' ? `${value} deals` : formatCurrency(value, currency),
                    name === 'stalledCount' ? 'Stalled Deals' : 'Stalled Value',
                  ]}
                />
                <Bar dataKey="stalledCount" fill="#ecdf51" radius={[6, 6, 0, 0]}>
                  {stageBottlenecks.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.stalledCount > 3 ? '#ecdf51' : '#3f7abb'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottleneck Stage Filter & Quick Callouts */}
        <div className="bg-[#0d2045]/80 p-4 rounded-xl border border-[#3f7abb]/30 flex flex-col justify-between space-y-4">
          <div>
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
              Filter Stalled Stage
            </h4>
            <div className="space-y-2">
              <button
                onClick={() => setSelectedStageFilter('ALL')}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                  selectedStageFilter === 'ALL'
                    ? 'bg-[#ecdf51] text-[#0d2045] font-bold'
                    : 'bg-[#122852] text-slate-300 hover:bg-[#1f3a6e]'
                }`}
              >
                <span>All Bottleneck Stages</span>
                <span className="font-bold">{stalledDeals.length}</span>
              </button>

              {stageBottlenecks.map((s) => (
                <button
                  key={s.stage}
                  onClick={() => setSelectedStageFilter(s.stage)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                    selectedStageFilter === s.stage
                      ? 'bg-[#ecdf51] text-[#0d2045] font-bold'
                      : 'bg-[#122852] text-slate-300 hover:bg-[#1f3a6e]'
                  }`}
                >
                  <span>{s.stage}</span>
                  <span className="px-2 py-0.5 rounded bg-[#0d2045] text-[#ecdf51] font-bold text-[10px]">
                    {s.stalledCount} deals
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-[#122852] rounded-lg border border-[#ecdf51]/30 text-xs text-slate-300 space-y-1">
            <div className="flex items-center space-x-1 text-[#ecdf51] font-bold">
              <ShieldAlert className="w-4 h-4" />
              <span>Recommended Action</span>
            </div>
            <p className="text-[11px] leading-tight">
              Schedule immediate sales rep check-ins for deals stalled over {stalledThresholdDays} days to unblock client proposals.
            </p>
          </div>
        </div>
      </div>

      {/* Stalled Deals Detailed Action Table */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
          <span>Stalled Deals Inspection List ({filteredStalledDeals.length})</span>
        </h4>

        {filteredStalledDeals.length === 0 ? (
          <div className="p-6 bg-[#0d2045] rounded-xl text-center text-xs text-slate-400 border border-[#3f7abb]/20">
            No stalled deals found under current filter threshold.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#3f7abb]/30 bg-[#0d2045]/90">
            <table className="w-full text-left text-xs text-slate-200">
              <thead className="bg-[#0d2045] text-slate-300 uppercase tracking-wider font-semibold border-b border-[#3f7abb]/30">
                <tr>
                  <th className="p-3">Deal ID & Client</th>
                  <th className="p-3">Sales Rep</th>
                  <th className="p-3">Stage</th>
                  <th className="p-3 text-right">Value</th>
                  <th className="p-3 text-center">Inactivity Duration</th>
                  <th className="p-3">Last Activity Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3f7abb]/20">
                {filteredStalledDeals.map((deal) => (
                  <tr key={deal.id + deal.clientName} className="hover:bg-[#122852] transition-colors">
                    <td className="p-3 font-semibold text-white">
                      <div>{deal.clientName}</div>
                      <span className="text-[10px] text-slate-400 font-mono">{deal.id}</span>
                    </td>
                    <td className="p-3 text-slate-200">{deal.salesRep}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-[#3f7abb]/30 text-white font-medium text-[11px]">
                        {deal.dealStage}
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold text-[#ecdf51]">
                      {formatCurrency(deal.dealValue, currency)}
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-[#ecdf51] text-[#0d2045] shadow-sm">
                        {deal.daysInCurrentStage} days stalled
                      </span>
                    </td>
                    <td className="p-3 text-slate-300 font-mono text-[11px]">
                      {deal.lastActivityDate || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
