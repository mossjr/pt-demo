import React from 'react';
import { PipelineMetrics } from '../../types';
import { formatCurrency } from '../../utils/analytics';
import { DollarSign, Trophy, AlertTriangle, Activity, TrendingUp } from 'lucide-react';

interface KpiCardsProps {
  metrics: PipelineMetrics;
  currency: string;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ metrics, currency }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Pipeline Value */}
      <div className="bg-[#122852] border border-[#3f7abb]/30 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Open Pipeline Value
          </span>
          <div className="p-2 bg-[#0d2045] rounded-xl text-[#3f7abb] border border-[#3f7abb]/30">
            <DollarSign className="w-5 h-5 text-[#3f7abb]" />
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {formatCurrency(metrics.totalPipelineValue, currency)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>{metrics.openDealsCount} Active Deals</span>
            <span className="text-[#3f7abb] font-medium">In Pipeline</span>
          </div>
        </div>
      </div>

      {/* 2. Total Won Value & Win Rate */}
      <div className="bg-[#122852] border border-[#3f7abb]/30 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Closed Won Value
          </span>
          <div className="p-2 bg-[#0d2045] rounded-xl text-[#ecdf51] border border-[#3f7abb]/30">
            <Trophy className="w-5 h-5 text-[#ecdf51]" />
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-2xl sm:text-3xl font-extrabold text-[#ecdf51] tracking-tight">
            {formatCurrency(metrics.totalWonValue, currency)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>{metrics.wonDealsCount} Deals Won</span>
            <span className="px-2 py-0.5 rounded-full font-bold bg-[#ecdf51]/20 text-[#ecdf51] border border-[#ecdf51]/40">
              {metrics.winRate.toFixed(1)}% Win Rate
            </span>
          </div>
        </div>
      </div>

      {/* 3. Stalled Deals Warning (Callout Accent Color #ecdf51) */}
      <div className={`bg-[#122852] border rounded-2xl p-5 shadow-lg relative overflow-hidden transition-all ${
        metrics.stalledDealsCount > 0 ? 'border-[#ecdf51]/80 ring-1 ring-[#ecdf51]/40' : 'border-[#3f7abb]/30'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#ecdf51]">
            Stalled Deals Alert
          </span>
          <div className="p-2 bg-[#0d2045] rounded-xl text-[#ecdf51] border border-[#ecdf51]/40">
            <AlertTriangle className="w-5 h-5 text-[#ecdf51] animate-pulse" />
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-baseline space-x-2">
            <span className="text-[#ecdf51]">{metrics.stalledDealsCount}</span>
            <span className="text-sm font-normal text-slate-300">deals stalled</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="text-red-300 font-medium">At Risk Value:</span>
            <span className="text-[#ecdf51] font-bold">
              {formatCurrency(metrics.stalledValue, currency)}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Average Deal Size & Stage Velocity */}
      <div className="bg-[#122852] border border-[#3f7abb]/30 rounded-2xl p-5 shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Avg Deal & Velocity
          </span>
          <div className="p-2 bg-[#0d2045] rounded-xl text-[#3f7abb] border border-[#3f7abb]/30">
            <Activity className="w-5 h-5 text-[#3f7abb]" />
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {formatCurrency(metrics.avgDealSize, currency)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>Avg Stage Duration:</span>
            <span className="font-semibold text-white">
              {Math.round(metrics.avgDaysInStage)} days
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
