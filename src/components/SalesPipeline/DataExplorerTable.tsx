import React, { useState } from 'react';
import { Deal } from '../../types';
import { formatCurrency } from '../../utils/analytics';
import { Search, Download, AlertTriangle, CheckCircle, ShieldAlert, FileText, ArrowUpDown } from 'lucide-react';

interface DataExplorerTableProps {
  deals: Deal[];
  currency: string;
}

export const DataExplorerTable: React.FC<DataExplorerTableProps> = ({ deals, currency }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [anomalyOnly, setAnomalyOnly] = useState(false);
  const [sortField, setSortField] = useState<keyof Deal>('dealValue');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: keyof Deal) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredDeals = deals.filter((deal) => {
    if (anomalyOnly && deal.anomalies.length === 0) return false;
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      deal.clientName.toLowerCase().includes(q) ||
      deal.salesRep.toLowerCase().includes(q) ||
      deal.id.toLowerCase().includes(q) ||
      deal.dealStage.toLowerCase().includes(q)
    );
  });

  const sortedDeals = [...filteredDeals].sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];

    if (valA === null || valA === undefined) return 1;
    if (valB === null || valB === undefined) return -1;

    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    }
    return sortDirection === 'asc'
      ? String(valA).localeCompare(String(valB))
      : String(valB).localeCompare(String(valA));
  });

  const exportToCsv = () => {
    if (deals.length === 0) return;
    const headers = [
      'Deal ID',
      'Client Name',
      'Sales Rep',
      'Deal Stage',
      'Deal Value',
      'Currency',
      'Date Created',
      'Date Entered Current Stage',
      'Expected Close Date',
      'Last Activity Date',
      'Deal Status',
      'Anomalies',
    ];

    const rows = deals.map((d) => [
      d.id,
      `"${d.clientName}"`,
      `"${d.salesRep}"`,
      `"${d.dealStage}"`,
      d.dealValue,
      d.currency,
      d.dateCreated || '',
      d.dateEnteredCurrentStage || '',
      d.expectedCloseDate || '',
      d.lastActivityDate || '',
      d.dealStatus,
      `"${d.anomalies.join('; ')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `profitable_tradie_deals_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-[#122852] border border-[#3f7abb]/30 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Top Header & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-3 border-b border-[#3f7abb]/20">
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="p-2.5 bg-[#0d2045] rounded-xl text-[#3f7abb] border border-[#3f7abb]/40">
            <FileText className="w-5 h-5 text-[#3f7abb]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Full Deals Data Inspector</h3>
            <p className="text-xs text-slate-300">
              Interactive record explorer with anomaly detection ({sortedDeals.length} records shown)
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
          <button
            onClick={() => setAnomalyOnly(!anomalyOnly)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              anomalyOnly
                ? 'bg-[#ecdf51] text-[#0d2045] shadow'
                : 'bg-[#0d2045] text-slate-300 border border-[#3f7abb]/30 hover:bg-[#1f3a6e]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Anomalies Only</span>
          </button>

          <button
            onClick={exportToCsv}
            className="px-3 py-1.5 bg-[#3f7abb] hover:bg-[#3267a0] text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-md transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#ecdf51]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter by deal ID, client, sales rep, stage..."
          className="w-full pl-10 pr-4 py-2 bg-[#0d2045] border border-[#3f7abb]/40 rounded-xl text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-[#3f7abb]"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[#3f7abb]/30 bg-[#0d2045]">
        <table className="w-full text-left text-xs text-slate-200">
          <thead className="bg-[#0d2045] text-slate-300 uppercase tracking-wider font-semibold border-b border-[#3f7abb]/30">
            <tr>
              <th className="p-3 cursor-pointer hover:text-white" onClick={() => handleSort('id')}>
                <div className="flex items-center space-x-1">
                  <span>Deal ID & Client</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-3 cursor-pointer hover:text-white" onClick={() => handleSort('salesRep')}>
                <div className="flex items-center space-x-1">
                  <span>Sales Rep</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-3 cursor-pointer hover:text-white" onClick={() => handleSort('dealStage')}>
                <div className="flex items-center space-x-1">
                  <span>Stage</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('dealValue')}>
                <div className="flex items-center justify-end space-x-1">
                  <span>Deal Value</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-3 text-center cursor-pointer hover:text-white" onClick={() => handleSort('dealStatus')}>
                <div className="flex items-center justify-center space-x-1">
                  <span>Status</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="p-3">Data Flags & Anomalies</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#3f7abb]/20">
            {sortedDeals.map((deal) => (
              <tr key={deal.id + deal.clientName} className="hover:bg-[#122852] transition-colors">
                <td className="p-3 font-semibold text-white">
                  <div>{deal.clientName}</div>
                  <span className="text-[10px] text-slate-400 font-mono">{deal.id}</span>
                </td>
                <td className="p-3 text-slate-200">
                  <span className={deal.salesRep === 'Unassigned' ? 'text-amber-400 italic' : ''}>
                    {deal.salesRep}
                  </span>
                </td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded bg-[#3f7abb]/30 text-white font-medium text-[11px]">
                    {deal.dealStage}
                  </span>
                </td>
                <td className="p-3 text-right font-bold text-[#ecdf51]">
                  {formatCurrency(deal.dealValue, deal.currency)}
                </td>
                <td className="p-3 text-center">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      deal.isWon
                        ? 'bg-[#ecdf51] text-[#0d2045]'
                        : deal.isLost
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                        : 'bg-[#3f7abb]/30 text-slate-200 border border-[#3f7abb]/50'
                    }`}
                  >
                    {deal.dealStatus}
                  </span>
                </td>
                <td className="p-3">
                  {deal.anomalies.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {deal.anomalies.map((ano, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center space-x-1"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          <span>{ano}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] text-emerald-400 flex items-center space-x-1">
                      <CheckCircle className="w-3 h-3" />
                      <span>Valid</span>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
