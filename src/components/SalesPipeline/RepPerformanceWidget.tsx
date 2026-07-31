import React, { useState, useMemo } from 'react';
import { Deal, RepPerformance, SalesRepTarget, FxConfig } from '../../types';
import { formatCurrency, computeMonthlyRepMatrix } from '../../utils/analytics';
import {
  UserCheck,
  Award,
  Target,
  TrendingUp,
  BarChart2,
  Table,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Calendar,
  CalendarDays,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

interface RepPerformanceWidgetProps {
  repData: RepPerformance[];
  deals?: Deal[];
  targets?: SalesRepTarget[];
  fxConfig?: FxConfig;
  currency: string;
  unassignedCount?: number;
  unassignedValue?: number;
  onOpenSetup?: () => void;
}

export const RepPerformanceWidget: React.FC<RepPerformanceWidgetProps> = ({
  repData,
  deals = [],
  targets,
  fxConfig,
  currency,
  unassignedCount = 0,
  unassignedValue = 0,
  onOpenSetup,
}) => {
  const [viewMode, setViewMode] = useState<'matrix' | 'table' | 'chart'>('matrix');

  // Compute month-by-month tracking matrix across all available months in dataset
  const monthlyMatrix = useMemo(() => {
    return computeMonthlyRepMatrix(deals, targets, fxConfig, currency);
  }, [deals, targets, fxConfig, currency]);

  const activeMonthKey = repData[0]?.monthKey;
  const activeMonthLabel = useMemo(() => {
    if (!activeMonthKey) return '';
    const [yearStr, monthStr] = activeMonthKey.split('-');
    const date = new Date(Number(yearStr), Number(monthStr) - 1, 1);
    return isNaN(date.getTime())
      ? activeMonthKey
      : date.toLocaleString('default', { month: 'long', year: 'numeric' });
  }, [activeMonthKey]);

  // Compute aggregate totals for the executive summary cards
  const totalTarget = repData.reduce((acc, r) => acc + (r.targetConverted || r.target), 0);
  const totalWon = repData.reduce((acc, r) => acc + (r.wonConverted ?? r.totalWonValue), 0);
  const totalForecast = repData.reduce(
    (acc, r) => acc + (r.totalPerformanceConverted ?? r.totalPerformance),
    0
  );
  const totalGapToTarget = Math.max(0, totalTarget - totalWon);

  const overallWonProgress = totalTarget > 0 ? Math.round((totalWon / totalTarget) * 100) : 0;
  const overallForecastProgress = totalTarget > 0 ? Math.round((totalForecast / totalTarget) * 100) : 0;

  // Chart data preparation
  const chartData = repData.map((rep) => ({
    name: rep.repName.split(' ')[0] || rep.repName,
    fullName: rep.repName,
    'Target Quota': Math.round(rep.targetConverted || rep.target),
    'Closed Won': Math.round(rep.wonConverted ?? rep.totalWonValue),
    'Gap to Target': Math.max(0, Math.round((rep.targetConverted || rep.target) - (rep.wonConverted ?? rep.totalWonValue))),
    'Expected Close': Math.round(rep.expectedConverted ?? rep.expectedThisMonthValue),
  }));

  const getStatusBadge = (status: RepPerformance['status']) => {
    switch (status) {
      case 'Over Quota':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#ecdf51]/20 border border-[#ecdf51]/60 text-[#ecdf51]">
            <CheckCircle2 className="w-3 h-3" />
            <span>Over Quota</span>
          </span>
        );
      case 'On Track':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#38bdf8]/20 border border-[#38bdf8]/50 text-[#38bdf8]">
            <TrendingUp className="w-3 h-3" />
            <span>On Track</span>
          </span>
        );
      case 'At Risk':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/20 border border-amber-500/50 text-amber-300">
            <AlertTriangle className="w-3 h-3" />
            <span>At Risk</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-red-500/20 border border-red-500/50 text-red-300">
            <XCircle className="w-3 h-3" />
            <span>Behind</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-[#122852] border border-[#3f7abb]/30 rounded-2xl p-5 shadow-xl space-y-5">
      {/* Executive Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total Monthly Target */}
        <div className="bg-[#0d2045] p-3.5 rounded-xl border border-[#3f7abb]/30 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
            <span>Total Monthly Target</span>
            <Target className="w-4 h-4 text-[#3f7abb]" />
          </div>
          <p className="text-lg font-bold text-white">
            {formatCurrency(totalTarget, currency)}
          </p>
          <span className="text-[10px] text-slate-400 block">
            Combined monthly quota ({repData.length} reps){activeMonthLabel ? ` • ${activeMonthLabel}` : ''}
          </span>
        </div>

        {/* Closed Won Revenue */}
        <div className="bg-[#0d2045] p-3.5 rounded-xl border border-[#3f7abb]/30 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
            <span>Closed Won</span>
            <Award className="w-4 h-4 text-[#ecdf51]" />
          </div>
          <p className="text-lg font-bold text-[#ecdf51]">
            {formatCurrency(totalWon, currency)}
          </p>
          <div className="flex items-center space-x-1 text-[10px] font-semibold text-[#ecdf51]">
            <span>{overallWonProgress}% achieved</span>
          </div>
        </div>

        {/* Remaining Gap to Target */}
        <div className="bg-[#0d2045] p-3.5 rounded-xl border border-[#3f7abb]/30 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
            <span>Gap To Target</span>
            <Target className="w-4 h-4 text-amber-400" />
          </div>
          {totalGapToTarget > 0 ? (
            <>
              <p className="text-lg font-bold text-amber-400">
                {formatCurrency(totalGapToTarget, currency)}
              </p>
              <span className="text-[10px] text-amber-300/80 block font-medium">
                Needed to reach quota
              </span>
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-emerald-400">
                +{formatCurrency(totalWon - totalTarget, currency)}
              </p>
              <span className="text-[10px] text-emerald-300 block font-medium">
                Quota exceeded!
              </span>
            </>
          )}
        </div>

        {/* Total Forecast */}
        <div className="bg-[#0d2045] p-3.5 rounded-xl border border-[#3f7abb]/30 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
            <span>Total Forecast</span>
            <TrendingUp className="w-4 h-4 text-[#38bdf8]" />
          </div>
          <p className="text-lg font-bold text-[#38bdf8]">
            {formatCurrency(totalForecast, currency)}
          </p>
          <span className="text-[10px] text-slate-400 block">
            {overallForecastProgress}% projected
          </span>
        </div>

        {/* Rep Quota Status Breakdown */}
        <div className="bg-[#0d2045] p-3.5 rounded-xl border border-[#3f7abb]/30 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
            <span>Quota Status</span>
            <UserCheck className="w-4 h-4 text-[#3f7abb]" />
          </div>
          <div className="flex items-center space-x-1.5 pt-1 text-[11px]">
            <span className="px-1.5 py-0.5 rounded bg-[#ecdf51]/20 text-[#ecdf51] font-bold">
              {repData.filter((r) => r.status === 'Over Quota').length} Over
            </span>
            <span className="px-1.5 py-0.5 rounded bg-[#38bdf8]/20 text-[#38bdf8] font-bold">
              {repData.filter((r) => r.status === 'On Track').length} Track
            </span>
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
              {repData.filter((r) => r.status === 'At Risk' || r.status === 'Underperforming').length} Risk
            </span>
          </div>
        </div>
      </div>

      {/* Unassigned Deals Callout Note */}
      {unassignedCount > 0 && (
        <div className="bg-[#0d2045] border border-[#3f7abb]/40 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-200">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-[#122852] rounded-lg text-[#ecdf51] font-bold shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-white">
                Unassigned Pipeline Attribution: <span className="text-[#ecdf51] font-mono">{unassignedCount} deal ({formatCurrency(unassignedValue, currency)})</span>
              </p>
              <p className="text-[11px] text-slate-300">
                Included in total pipeline value & stage metrics, but excluded from rep target quotas (no sales rep assigned).
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-[#3f7abb]/30 border border-[#3f7abb]/50 text-[#ecdf51] text-[10px] font-extrabold rounded-md uppercase tracking-wide shrink-0">
            Pipeline Retained
          </span>
        </div>
      )}

      {/* Header with View Toggle & Setup Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#3f7abb]/20">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <Award className="w-5 h-5 text-[#ecdf51]" />
            <span>Sales Person Progress to Target</span>
          </h3>
          <p className="text-xs text-slate-300">
            Month-by-month tracking matrix, rep quota attainment & gap-to-target analysis across all dataset months
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {onOpenSetup && (
            <button
              onClick={onOpenSetup}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#0d2045] hover:bg-[#3f7abb]/30 border border-[#3f7abb]/40 rounded-xl text-xs font-semibold text-[#ecdf51] transition-all shadow-sm"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Edit Targets & FX</span>
            </button>
          )}

          {/* Toggle View: Matrix vs Table vs Chart */}
          <div className="flex items-center space-x-1 bg-[#0d2045] p-1 rounded-xl border border-[#3f7abb]/30 text-xs">
            <button
              onClick={() => setViewMode('matrix')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'matrix'
                  ? 'bg-[#3f7abb] text-white font-semibold shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Month-by-Month Column Matrix View"
            >
              <Calendar className="w-3.5 h-3.5 text-[#ecdf51]" />
              <span>Month-by-Month Matrix ({monthlyMatrix.availableMonths.length} Mo)</span>
            </button>

            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'table'
                  ? 'bg-[#3f7abb] text-white font-semibold shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Summary Table View"
            >
              <Table className="w-3.5 h-3.5" />
              <span>Overall Summary</span>
            </button>

            <button
              onClick={() => setViewMode('chart')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'chart'
                  ? 'bg-[#3f7abb] text-white font-semibold shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Visual Bar Chart View"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Chart</span>
            </button>
          </div>
        </div>
      </div>

      {/* MONTH-BY-MONTH TRACKING MATRIX VIEW */}
      {viewMode === 'matrix' && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-300 bg-[#0d2045] px-4 py-2.5 rounded-xl border border-[#3f7abb]/30">
            <div className="flex items-center space-x-2 font-medium">
              <CalendarDays className="w-4 h-4 text-[#ecdf51]" />
              <span>
                Tracking <strong className="text-white">{monthlyMatrix.rows.length} sales reps</strong> across{' '}
                <strong className="text-[#ecdf51]">{monthlyMatrix.availableMonths.length} dataset months</strong> ({monthlyMatrix.availableMonths.map((m) => m.label).join(', ')})
              </span>
            </div>

            <span className="text-[11px] font-mono text-slate-400">
              Values in {currency} (Converted via live FX rates)
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#3f7abb]/30 bg-[#0d2045]/80 shadow-lg">
            <table className="w-full text-left text-xs text-slate-200 border-collapse">
              <thead className="bg-[#0d2045] text-slate-300 uppercase tracking-wider font-semibold border-b border-[#3f7abb]/40">
                <tr>
                  <th className="p-3.5 min-w-[180px] sticky left-0 bg-[#0d2045] z-10 shadow-r">
                    Sales Rep & Quota
                  </th>
                  {monthlyMatrix.availableMonths.map((m) => (
                    <th
                      key={m.monthKey}
                      className="p-3.5 text-center border-l border-[#3f7abb]/30 min-w-[180px] bg-[#122852]/60"
                    >
                      <div className="text-[#ecdf51] font-bold text-xs">{m.label}</div>
                      <div className="text-[10px] text-slate-400 font-mono lowercase normal-case">
                        Monthly Tracking
                      </div>
                    </th>
                  ))}
                  <th className="p-3.5 text-right border-l-2 border-[#3f7abb] min-w-[200px] bg-[#0d2045] text-white font-bold">
                    Total All Months ({monthlyMatrix.availableMonths.length} Mo)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3f7abb]/20">
                {monthlyMatrix.rows.map((row) => (
                  <tr key={row.repName} className="hover:bg-[#122852] transition-colors">
                    {/* Rep Name & Quota */}
                    <td className="p-3.5 font-semibold text-white sticky left-0 bg-[#0d2045] z-10 border-r border-[#3f7abb]/30">
                      <div className="flex items-center space-x-2">
                        <UserCheck className="w-4 h-4 text-[#38bdf8] shrink-0" />
                        <div>
                          <p className="font-bold text-white text-xs">{row.repName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            Target: {formatCurrency(row.monthlyTargetConverted, currency)} / mo
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Month Columns */}
                    {row.months.map((cell) => {
                      const isMet = cell.wonConverted >= cell.monthlyTargetConverted;
                      return (
                        <td
                          key={cell.monthKey}
                          className="p-3 border-l border-[#3f7abb]/20 text-center align-top space-y-1 hover:bg-[#122852]/90"
                        >
                          {/* Closed Won */}
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[10px] text-slate-400">Closed Won:</span>
                            <span className="font-bold text-[#ecdf51] font-mono">
                              {formatCurrency(cell.wonConverted, currency)}
                            </span>
                          </div>

                          {/* Target & Gap */}
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-[10px] text-slate-400">To Target:</span>
                            {isMet ? (
                              <span className="text-emerald-400 font-bold font-mono text-[10px] bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/30">
                                Met (+{formatCurrency(cell.wonConverted - cell.monthlyTargetConverted, currency)})
                              </span>
                            ) : (
                              <span className="text-amber-400 font-bold font-mono text-[10px] bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-500/30">
                                {formatCurrency(cell.gapToTarget, currency)} gap
                              </span>
                            )}
                          </div>

                          {/* Attainment Bar */}
                          <div className="space-y-0.5 pt-1">
                            <div className="w-full bg-[#0d2045] h-2 rounded-full overflow-hidden border border-[#3f7abb]/30">
                              <div
                                className={`h-full transition-all ${
                                  isMet
                                    ? 'bg-emerald-400'
                                    : cell.attainmentPercent >= 75
                                    ? 'bg-[#38bdf8]'
                                    : cell.attainmentPercent >= 50
                                    ? 'bg-[#ecdf51]'
                                    : 'bg-amber-500'
                                }`}
                                style={{ width: `${Math.min(100, cell.attainmentPercent)}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                              <span>{cell.wonDealsCount} deals won</span>
                              <span className="font-bold text-slate-200">{cell.attainmentPercent}%</span>
                            </div>
                          </div>
                        </td>
                      );
                    })}

                    {/* Total All Months Column */}
                    <td className="p-3.5 border-l-2 border-[#3f7abb] bg-[#0d2045]/90 text-right align-top space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[10px] text-slate-400">Total Won:</span>
                        <span className="font-extrabold text-[#ecdf51] font-mono text-xs">
                          {formatCurrency(row.totalWonConverted, currency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[10px] text-slate-400">Total Quota Target:</span>
                        <span className="font-bold text-slate-300 font-mono text-xs">
                          {formatCurrency(row.totalTargetConverted, currency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-0.5">
                        <span className="text-[10px] text-slate-400">Overall Gap:</span>
                        {row.totalWonConverted >= row.totalTargetConverted ? (
                          <span className="text-emerald-400 font-bold text-xs font-mono">
                            Met (+{formatCurrency(row.totalWonConverted - row.totalTargetConverted, currency)})
                          </span>
                        ) : (
                          <span className="text-amber-400 font-bold text-xs font-mono">
                            {formatCurrency(row.totalGapToTarget, currency)} gap
                          </span>
                        )}
                      </div>
                      <div className="pt-1 flex items-center justify-end space-x-1">
                        <span className="text-[10px] font-bold text-slate-300">Attainment:</span>
                        <span
                          className={`text-xs font-extrabold font-mono px-2 py-0.5 rounded ${
                            row.totalAttainmentPercent >= 100
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : row.totalAttainmentPercent >= 75
                              ? 'bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {row.totalAttainmentPercent}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Team Monthly Totals Summary Footer */}
              <tfoot className="bg-[#0d2045] font-bold border-t-2 border-[#3f7abb] text-xs">
                <tr>
                  <td className="p-3.5 text-white sticky left-0 bg-[#0d2045] z-10 border-r border-[#3f7abb]/30">
                    <div className="flex items-center space-x-2">
                      <Target className="w-4 h-4 text-[#ecdf51]" />
                      <div>
                        <p className="font-extrabold text-white">TEAM TOTALS</p>
                        <p className="text-[10px] text-slate-400 font-normal">Combined Quota & Performance</p>
                      </div>
                    </div>
                  </td>

                  {monthlyMatrix.teamMonthlyTotals.map((tot) => (
                    <td key={tot.monthKey} className="p-3 border-l border-[#3f7abb]/30 text-center space-y-1 bg-[#122852]/40">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[10px] text-slate-400">Target:</span>
                        <span className="font-bold text-slate-200 font-mono">
                          {formatCurrency(tot.totalTeamTargetConverted, currency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[10px] text-slate-400">Won:</span>
                        <span className="font-bold text-[#ecdf51] font-mono">
                          {formatCurrency(tot.totalTeamWonConverted, currency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[10px] text-slate-400">Team Gap:</span>
                        {tot.totalTeamWonConverted >= tot.totalTeamTargetConverted ? (
                          <span className="text-emerald-400 font-bold font-mono">Met</span>
                        ) : (
                          <span className="text-amber-400 font-bold font-mono">
                            {formatCurrency(tot.totalTeamGapToTarget, currency)}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[#38bdf8] font-bold font-mono text-right pt-0.5">
                        {tot.totalTeamAttainmentPercent}% team quota
                      </div>
                    </td>
                  ))}

                  <td className="p-3.5 border-l-2 border-[#3f7abb] bg-[#0d2045] text-right space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[10px] text-slate-400">Grand Total Target:</span>
                      <span className="font-bold text-white font-mono">
                        {formatCurrency(monthlyMatrix.overallTeamTarget, currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[10px] text-slate-400">Grand Total Won:</span>
                      <span className="font-bold text-[#ecdf51] font-mono">
                        {formatCurrency(monthlyMatrix.overallTeamWon, currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[10px] text-slate-400">Grand Total Gap:</span>
                      {monthlyMatrix.overallTeamWon >= monthlyMatrix.overallTeamTarget ? (
                        <span className="text-emerald-400 font-bold font-mono">Met</span>
                      ) : (
                        <span className="text-amber-400 font-bold font-mono">
                          {formatCurrency(monthlyMatrix.overallTeamGap, currency)}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Visual Chart View */}
      {viewMode === 'chart' && (
        <div className="h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f7abb/20" vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0d2045',
                  borderColor: '#3f7abb',
                  borderRadius: '0.75rem',
                  color: '#fff',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [formatCurrency(value, currency), '']}
              />
              <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px', color: '#cbd5e1' }} />
              <Bar dataKey="Target Quota" fill="#3f7abb" radius={[4, 4, 0, 0]} name="Quota Target ($)" />
              <Bar dataKey="Closed Won" fill="#ecdf51" radius={[4, 4, 0, 0]} name="Closed Won ($)" />
              <Bar dataKey="Expected Close" fill="#38bdf8" radius={[4, 4, 0, 0]} name="Expected Close ($)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Aggregated Summary Table View */}
      {viewMode === 'table' && (
        <div className="overflow-x-auto rounded-xl border border-[#3f7abb]/20 bg-[#0d2045]/60">
          <table className="w-full text-left text-xs text-slate-200">
            <thead className="bg-[#0d2045] text-slate-300 uppercase tracking-wider font-semibold border-b border-[#3f7abb]/30">
              <tr>
                <th className="p-3">Sales Rep</th>
                <th className="p-3 text-right">Monthly Target</th>
                <th className="p-3 text-right">Closed Won</th>
                <th className="p-3 text-right">To Target (Gap)</th>
                <th className="p-3 text-right">Expected (Mo)</th>
                <th className="p-3 text-right">Total Forecast</th>
                <th className="p-3 text-center min-w-[160px]">Quota Progress</th>
                <th className="p-3 text-right">Variance</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3f7abb]/20">
              {repData.map((rep) => {
                const isDiffCurrency =
                  rep.targetCurrency &&
                  rep.targetCurrency.toUpperCase() !== currency.toUpperCase();

                const convertedTarget = rep.targetConverted || rep.target;
                const convertedWon = rep.wonConverted ?? rep.totalWonValue;
                const convertedTotal = rep.totalPerformanceConverted ?? rep.totalPerformance;

                const isAhead = rep.variance >= 0;
                const gapToTarget = Math.max(0, convertedTarget - convertedWon);

                return (
                  <tr key={rep.repName} className="hover:bg-[#122852]/80 transition-colors">
                    {/* Sales Rep Name */}
                    <td className="p-3 font-semibold text-white flex items-center space-x-2">
                      <UserCheck className="w-4 h-4 text-[#3f7abb] shrink-0" />
                      <span>{rep.repName}</span>
                    </td>

                    {/* Monthly Target */}
                    <td className="p-3 text-right">
                      <span className="font-bold text-slate-100 block">
                        {formatCurrency(convertedTarget, currency)}
                      </span>
                      {isDiffCurrency ? (
                        <span className="text-[10px] text-slate-400 block font-mono">
                          Local: {formatCurrency(rep.target, rep.targetCurrency)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {rep.targetCurrency || currency} Quota
                        </span>
                      )}
                    </td>

                    {/* Closed Won */}
                    <td className="p-3 text-right font-bold text-[#ecdf51]">
                      {formatCurrency(convertedWon, currency)}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        {rep.wonDealsCount} deals
                      </span>
                    </td>

                    {/* To Target (Gap) */}
                    <td className="p-3 text-right font-mono font-bold">
                      {convertedWon >= convertedTarget ? (
                        <span className="text-emerald-400 block text-[11px]">
                          Met (+{formatCurrency(convertedWon - convertedTarget, currency)})
                        </span>
                      ) : (
                        <span className="text-amber-400 block text-[11px]">
                          {formatCurrency(gapToTarget, currency)} gap
                        </span>
                      )}
                    </td>

                    {/* Expected This Month */}
                    <td className="p-3 text-right font-semibold text-slate-200">
                      {formatCurrency(rep.expectedConverted ?? rep.expectedThisMonthValue, currency)}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        {rep.expectedThisMonthCount} deals
                      </span>
                    </td>

                    {/* Total Forecast */}
                    <td className="p-3 text-right font-extrabold text-white">
                      {formatCurrency(convertedTotal, currency)}
                    </td>

                    {/* Quota Progress Bars */}
                    <td className="p-3">
                      <div className="space-y-1.5 max-w-[180px] mx-auto">
                        <div className="flex justify-between text-[10px] font-semibold">
                          <span className="text-slate-300">Closed Won:</span>
                          <span className="text-[#ecdf51]">{rep.targetProgressPercent}%</span>
                        </div>
                        <div className="w-full bg-[#0d2045] h-2 rounded-full overflow-hidden border border-[#3f7abb]/30">
                          <div
                            className="bg-[#ecdf51] h-full transition-all"
                            style={{ width: `${Math.min(100, rep.targetProgressPercent)}%` }}
                          />
                        </div>

                        <div className="flex justify-between text-[10px] font-semibold pt-0.5">
                          <span className="text-slate-400">Forecast:</span>
                          <span className="text-[#38bdf8]">{rep.pipelineProgressPercent}%</span>
                        </div>
                        <div className="w-full bg-[#0d2045] h-1.5 rounded-full overflow-hidden border border-[#3f7abb]/20">
                          <div
                            className="bg-[#38bdf8] h-full transition-all"
                            style={{ width: `${Math.min(100, rep.pipelineProgressPercent)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Variance */}
                    <td className="p-3 text-right font-mono font-bold">
                      <span
                        className={`inline-flex items-center space-x-0.5 ${
                          isAhead ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        <span>
                          {isAhead ? '+' : ''}
                          {formatCurrency(rep.variance, currency)}
                        </span>
                      </span>
                    </td>

                    {/* Status */}
                    <td className="p-3 text-center">{getStatusBadge(rep.status)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
