import React, { useState } from 'react';
import { ReconciliationSummary, DataQualityIssue } from '../../types';
import { formatCurrency } from '../../utils/analytics';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  UserCheck,
  FileSpreadsheet,
  Layers,
  Search,
  Filter,
  ArrowRight,
  ShieldAlert,
  Zap,
} from 'lucide-react';

interface DataReconciliationWidgetProps {
  summary: ReconciliationSummary;
  currency: string;
  onSelectDeal?: (dealId: string) => void;
}

export const DataReconciliationWidget: React.FC<DataReconciliationWidgetProps> = ({
  summary,
  currency,
  onSelectDeal,
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredIssues = summary.issues.filter((issue) => {
    if (filterType !== 'ALL' && issue.issueType !== filterType) {
      return false;
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (
        issue.dealId.toLowerCase().includes(q) ||
        issue.clientName.toLowerCase().includes(q) ||
        issue.salesRep.toLowerCase().includes(q) ||
        issue.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getSeverityBadge = (severity: DataQualityIssue['severity']) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-500/20 text-red-300 border border-red-500/40">
            Critical Error
          </span>
        );
      case 'warning':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            Warning Flag
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/40">
            Auto-Normalized
          </span>
        );
    }
  };

  return (
    <div className="bg-[#122852] border border-[#3f7abb]/30 rounded-2xl p-5 shadow-xl space-y-5">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-[#0d2045] rounded-xl border border-[#3f7abb]/40">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-[#122852] rounded-xl text-[#ecdf51] border border-[#3f7abb]/40 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <span>Data Audit & Pipeline Reconciliation</span>
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Strict audit of CRM imports: zero silent drops, precise exception handling & data hygiene
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-semibold">
          <div className="px-3 py-1.5 bg-[#122852] border border-[#3f7abb]/30 rounded-lg text-slate-200">
            <span className="text-slate-400">Total Rows Loaded:</span>{' '}
            <span className="font-bold text-white font-mono">{summary.totalRowsLoaded} deals</span>
          </div>

          <div className="px-3 py-1.5 bg-[#122852] border border-[#ecdf51]/40 rounded-lg text-[#ecdf51]">
            <span className="text-slate-300">Flagged Issues:</span>{' '}
            <span className="font-bold font-mono">{summary.flaggedRowsCount} rows</span>
          </div>
        </div>
      </div>

      {/* 4 Core Edge Case Rule Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Rule 1: Blank Sales Rep */}
        <div className="bg-[#0d2045] p-3.5 rounded-xl border border-[#3f7abb]/30 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white flex items-center space-x-1.5">
              <UserCheck className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>Blank Sales Rep</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-[#38bdf8]/20 text-[#38bdf8] font-mono text-[10px] font-bold">
              {summary.unassignedDealsCount} deal
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-snug">
            Retained in total pipeline & stage metrics, but excluded from rep target quotas.
          </p>
          <div className="text-[10px] font-mono text-[#ecdf51] font-semibold">
            {formatCurrency(summary.unassignedDealsValueConverted, currency)} retained
          </div>
        </div>

        {/* Rule 2: Negative Deal Value */}
        <div className="bg-[#0d2045] p-3.5 rounded-xl border border-[#3f7abb]/30 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white flex items-center space-x-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span>Negative Deal Value</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-mono text-[10px] font-bold">
              {summary.negativeValueDealsCount} deal
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-snug">
            Excluded from dollar sums ($0 applied) to prevent understating revenue math.
          </p>
          <div className="text-[10px] text-red-300 font-semibold">
            Data Entry Error Flagged
          </div>
        </div>

        {/* Rule 3: Missing Won Value */}
        <div className="bg-[#0d2045] p-3.5 rounded-xl border border-[#3f7abb]/30 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>Missing Won Value</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold">
              {summary.missingWonValueCount} deal
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-snug">
            Treated as $0 in math, but visually flagged so rep attainment isn't quietly understated.
          </p>
          <div className="text-[10px] text-amber-300 font-semibold">
            Attainment Warning
          </div>
        </div>

        {/* Rule 4: Stage Typo Normalized */}
        <div className="bg-[#0d2045] p-3.5 rounded-xl border border-[#3f7abb]/30 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-[#ecdf51]" />
              <span>Stage Typo Corrected</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-[#ecdf51]/20 text-[#ecdf51] font-mono text-[10px] font-bold">
              {summary.typosNormalizedCount} deal
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-snug">
            Mapped variant ("Proposol Sent") to canonical stage ("Proposal Sent").
          </p>
          <div className="text-[10px] text-[#ecdf51] font-semibold">
            Pipeline Stage Retained
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="flex items-center space-x-2 bg-[#0d2045] p-1 rounded-xl border border-[#3f7abb]/30 text-xs w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'All Issues' },
            { id: 'Blank Sales Rep', label: 'Blank Rep' },
            { id: 'Negative Value Error', label: 'Negative Val' },
            { id: 'Missing Won Value', label: 'Missing Won' },
            { id: 'Stage Typo Normalized', label: 'Stage Typos' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilterType(item.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all text-xs ${
                filterType === item.id
                  ? 'bg-[#3f7abb] text-white shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search flagged deals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-[#0d2045] border border-[#3f7abb]/40 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#ecdf51]"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="overflow-x-auto rounded-xl border border-[#3f7abb]/30 bg-[#0d2045]">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#091630] text-slate-300 uppercase tracking-wider font-semibold border-b border-[#3f7abb]/30">
            <tr>
              <th className="p-3">Deal ID</th>
              <th className="p-3">Client</th>
              <th className="p-3">Sales Rep</th>
              <th className="p-3">Issue Category</th>
              <th className="p-3">Diagnostic Explanation</th>
              <th className="p-3">Action Applied</th>
              <th className="p-3 text-center">Severity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#3f7abb]/20 text-slate-200">
            {filteredIssues.map((issue, idx) => (
              <tr key={issue.dealId + idx} className="hover:bg-[#122852]/60 transition-colors">
                <td className="p-3 font-mono font-bold text-[#ecdf51]">{issue.dealId}</td>
                <td className="p-3 font-semibold text-white">{issue.clientName}</td>
                <td className="p-3 text-slate-300">{issue.salesRep}</td>
                <td className="p-3 font-bold text-slate-200">{issue.issueType}</td>
                <td className="p-3 text-slate-300 max-w-xs">{issue.description}</td>
                <td className="p-3 text-slate-200 max-w-xs font-mono text-[11px]">
                  {issue.actionTaken}
                </td>
                <td className="p-3 text-center">{getSeverityBadge(issue.severity)}</td>
              </tr>
            ))}
            {filteredIssues.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-400 italic">
                  No data quality issues match the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
