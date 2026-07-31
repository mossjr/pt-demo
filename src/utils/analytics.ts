import {
  Deal,
  FilterState,
  PipelineMetrics,
  RepPerformance,
  SalesRepTarget,
  FxConfig,
  StageSummary,
} from '../types';

export const DEFAULT_REP_TARGETS: SalesRepTarget[] = [
  { repName: 'Sarah Chen', monthlyTarget: 60000, targetCurrency: 'AUD' },
  { repName: 'Mike Thompson', monthlyTarget: 55000, targetCurrency: 'AUD' },
  { repName: 'Priya Patel', monthlyTarget: 58000, targetCurrency: 'NZD' },
  { repName: 'Jordan Lee', monthlyTarget: 50000, targetCurrency: 'NZD' },
  { repName: 'Ben Walsh', monthlyTarget: 45000, targetCurrency: 'AUD' },
  { repName: 'Aroha Ngata', monthlyTarget: 62000, targetCurrency: 'NZD' },
];

export const DEFAULT_FX_CONFIG: FxConfig = {
  baseCurrency: 'AUD',
  rates: {
    AUD: 1.0,
    NZD: 0.915, // 1 NZD = 0.915 AUD
    USD: 1.525, // 1 USD = 1.525 AUD
    EUR: 1.65,  // 1 EUR = 1.65 AUD
    GBP: 1.95,  // 1 GBP = 1.95 AUD
  },
  lastUpdated: new Date().toISOString().split('T')[0],
};

export function convertCurrency(
  amount: number,
  fromCurr: string,
  toCurr: string,
  fxConfig: FxConfig = DEFAULT_FX_CONFIG
): number {
  if (!amount || amount === 0) return 0;
  const from = (fromCurr || 'AUD').toUpperCase();
  const to = (toCurr || 'AUD').toUpperCase();
  if (from === to) return amount;

  const rates = fxConfig.rates || DEFAULT_FX_CONFIG.rates;
  const fromRate = rates[from] ?? 1.0;
  const toRate = rates[to] ?? 1.0;

  // Convert amount to base currency (e.g. AUD), then from base currency to target
  const amountInBase = amount * fromRate;
  const finalAmount = amountInBase / toRate;
  return finalAmount;
}

export function filterDeals(deals: Deal[], filters: FilterState): Deal[] {
  return deals.filter((deal) => {
    // Sales Rep filter
    if (filters.salesRep !== 'ALL' && deal.salesRep !== filters.salesRep) {
      return false;
    }

    // Currency filter
    if (filters.currency !== 'ALL' && deal.currency.toUpperCase() !== filters.currency.toUpperCase()) {
      return false;
    }

    // Deal Stage filter
    if (filters.dealStage !== 'ALL' && deal.dealStage !== filters.dealStage) {
      return false;
    }

    // Deal Status filter
    if (filters.dealStatus !== 'ALL' && deal.dealStatus !== filters.dealStatus) {
      return false;
    }

    // Date Range Isolator logic
    const dateField = filters.dateField || 'expectedCloseDate';
    const dealDate = deal[dateField];

    // Filter by selected Month (YYYY-MM) using specified date field
    if (filters.selectedMonth && filters.selectedMonth !== 'ALL') {
      if (!dealDate || !dealDate.startsWith(filters.selectedMonth)) {
        return false;
      }
    }

    // Filter by Start Date (YYYY-MM-DD)
    if (filters.startDate) {
      if (!dealDate || dealDate < filters.startDate) {
        return false;
      }
    }

    // Filter by End Date (YYYY-MM-DD)
    if (filters.endDate) {
      if (!dealDate || dealDate > filters.endDate) {
        return false;
      }
    }

    // Search query filter
    if (filters.searchQuery && filters.searchQuery.trim() !== '') {
      const q = filters.searchQuery.toLowerCase();
      const matchClient = deal.clientName.toLowerCase().includes(q);
      const matchRep = deal.salesRep.toLowerCase().includes(q);
      const matchId = deal.id.toLowerCase().includes(q);
      const matchStage = deal.dealStage.toLowerCase().includes(q);
      if (!matchClient && !matchRep && !matchId && !matchStage) {
        return false;
      }
    }

    return true;
  });
}

export function computePipelineMetrics(deals: Deal[]): PipelineMetrics {
  let totalPipelineValue = 0;
  let openDealsCount = 0;
  let totalWonValue = 0;
  let wonDealsCount = 0;
  let totalLostValue = 0;
  let lostDealsCount = 0;
  let stalledDealsCount = 0;
  let stalledValue = 0;
  let totalDaysInStage = 0;
  let anomaliesCount = 0;

  deals.forEach((deal) => {
    // Math safety: Exclude negative deal values from dollar sums (data quality error)
    const safeValue = Math.max(0, deal.dealValue);

    if (deal.isOpen) {
      totalPipelineValue += safeValue;
      openDealsCount += 1;
      totalDaysInStage += deal.daysInCurrentStage;
      if (deal.isStalled) {
        stalledDealsCount += 1;
        stalledValue += safeValue;
      }
    } else if (deal.isWon) {
      totalWonValue += safeValue;
      wonDealsCount += 1;
    } else if (deal.isLost) {
      totalLostValue += safeValue;
      lostDealsCount += 1;
    }

    if (deal.anomalies.length > 0) {
      anomaliesCount += 1;
    }
  });

  const closedDealsTotal = wonDealsCount + lostDealsCount;
  const winRate = closedDealsTotal > 0 ? (wonDealsCount / closedDealsTotal) * 100 : 0;
  const totalDeals = deals.length;
  const totalAllValue = totalPipelineValue + totalWonValue;
  const avgDealSize = totalDeals > 0 ? totalAllValue / totalDeals : 0;
  const avgDaysInStage = openDealsCount > 0 ? totalDaysInStage / openDealsCount : 0;

  return {
    totalPipelineValue,
    openDealsCount,
    totalWonValue,
    wonDealsCount,
    totalLostValue,
    lostDealsCount,
    stalledDealsCount,
    stalledValue,
    winRate,
    avgDealSize,
    avgDaysInStage,
    anomaliesCount,
  };
}

export function computeRepPerformance(
  deals: Deal[],
  targets: SalesRepTarget[] = DEFAULT_REP_TARGETS,
  fxConfig: FxConfig = DEFAULT_FX_CONFIG,
  reportingCurrency = 'AUD'
): RepPerformance[] {
  // First, map target by rep name (case-insensitive trim match)
  const targetMap: Record<string, SalesRepTarget> = {};
  targets.forEach((t) => {
    targetMap[t.repName.trim().toLowerCase()] = t;
  });

  const repStatsMap: Record<
    string,
    {
      repName: string;
      totalWonValue: number;
      wonDealsCount: number;
      expectedThisMonthValue: number;
      expectedThisMonthCount: number;
      totalPipelineValue: number;
      openDealsCount: number;
      wonConverted: number;
      expectedConverted: number;
    }
  > = {};

  // Ensure all configured targets show up in rep performance even if they have 0 deals in dataset
  targets.forEach((t) => {
    repStatsMap[t.repName] = {
      repName: t.repName,
      totalWonValue: 0,
      wonDealsCount: 0,
      expectedThisMonthValue: 0,
      expectedThisMonthCount: 0,
      totalPipelineValue: 0,
      openDealsCount: 0,
      wonConverted: 0,
      expectedConverted: 0,
    };
  });

  const availableMonthsCount = extractAvailableMonths(deals).length || 1;

  deals.forEach((deal) => {
    const rep = deal.salesRep ? deal.salesRep.trim() : 'Unassigned';

    // Exclude Unassigned deals from individual rep performance quotas (surfaced separately in widget)
    if (rep.toLowerCase() === 'unassigned') {
      return;
    }

    if (!repStatsMap[rep]) {
      repStatsMap[rep] = {
        repName: rep,
        totalWonValue: 0,
        wonDealsCount: 0,
        expectedThisMonthValue: 0,
        expectedThisMonthCount: 0,
        totalPipelineValue: 0,
        openDealsCount: 0,
        wonConverted: 0,
        expectedConverted: 0,
      };
    }

    const item = repStatsMap[rep];
    // Exclude negative deal values from dollar sums
    const safeValue = Math.max(0, deal.dealValue);
    const convertedVal = convertCurrency(safeValue, deal.currency, reportingCurrency, fxConfig);

    if (deal.isWon) {
      item.totalWonValue += safeValue;
      item.wonConverted += convertedVal;
      item.wonDealsCount += 1;
    } else if (deal.isOpen) {
      item.totalPipelineValue += safeValue;
      item.openDealsCount += 1;

      if (deal.expectedCloseDate) {
        item.expectedThisMonthValue += safeValue;
        item.expectedConverted += convertedVal;
        item.expectedThisMonthCount += 1;
      }
    }
  });

  return Object.values(repStatsMap)
    .filter((item) => item.repName.toLowerCase() !== 'unassigned')
    .map((item) => {
      const repKey = item.repName.trim().toLowerCase();
      const targetObj = targetMap[repKey] || {
        repName: item.repName,
        monthlyTarget: 50000,
        targetCurrency: reportingCurrency,
      };

      const targetLocal = targetObj.monthlyTarget * availableMonthsCount;
      const targetCurrency = targetObj.targetCurrency || 'AUD';

      const targetConverted = convertCurrency(
        targetLocal,
        targetCurrency,
        reportingCurrency,
        fxConfig
      );

      const totalPerformance = item.totalWonValue + item.expectedThisMonthValue;
      const totalPerformanceConverted = item.wonConverted + item.expectedConverted;

      const targetProgressPercent =
        targetConverted > 0 ? Math.round((item.wonConverted / targetConverted) * 100) : 0;

      const pipelineProgressPercent =
        targetConverted > 0
          ? Math.round((totalPerformanceConverted / targetConverted) * 100)
          : 0;

      const variance = totalPerformanceConverted - targetConverted;
      const gapToTargetConverted = Math.max(0, targetConverted - item.wonConverted);

      let status: 'Over Quota' | 'On Track' | 'At Risk' | 'Underperforming' = 'Underperforming';
      if (variance >= 0) {
        status = 'Over Quota';
      } else if (pipelineProgressPercent >= 85) {
        status = 'On Track';
      } else if (pipelineProgressPercent >= 60) {
        status = 'At Risk';
      } else {
        status = 'Underperforming';
      }

      return {
        repName: item.repName,
        totalWonValue: item.totalWonValue,
        wonDealsCount: item.wonDealsCount,
        expectedThisMonthValue: item.expectedThisMonthValue,
        expectedThisMonthCount: item.expectedThisMonthCount,
        totalPipelineValue: item.totalPipelineValue,
        openDealsCount: item.openDealsCount,
        totalPerformance,
        target: targetLocal,
        targetCurrency,
        targetConverted,
        wonConverted: item.wonConverted,
        expectedConverted: item.expectedConverted,
        totalPerformanceConverted,
        targetProgressPercent,
        pipelineProgressPercent,
        variance,
        gapToTargetConverted,
        status,
      };
    })
    .sort((a, b) => b.wonConverted - a.wonConverted);
}

export function extractAvailableMonths(
  deals: Deal[],
  dateField: 'expectedCloseDate' | 'dateCreated' | 'lastActivityDate' = 'expectedCloseDate'
): { monthKey: string; label: string }[] {
  const monthSet = new Set<string>();
  deals.forEach((deal) => {
    const val = deal[dateField];
    if (val && /^\d{4}-\d{2}/.test(val)) {
      monthSet.add(val.substring(0, 7)); // e.g. "2026-08"
    }
  });

  return Array.from(monthSet)
    .sort()
    .map((mKey) => {
      const [yearStr, monthStr] = mKey.split('-');
      const date = new Date(Number(yearStr), Number(monthStr) - 1, 1);
      const label = isNaN(date.getTime())
        ? mKey
        : date.toLocaleString('default', { month: 'long', year: 'numeric' });
      return { monthKey: mKey, label };
    });
}

export interface MonthlyRepCell {
  monthKey: string;
  monthLabel: string;
  monthlyTargetConverted: number;
  wonConverted: number;
  expectedConverted: number;
  wonDealsCount: number;
  gapToTarget: number;
  attainmentPercent: number;
  status: 'Over Quota' | 'On Track' | 'At Risk' | 'Underperforming';
}

export interface MonthlyRepRow {
  repName: string;
  targetLocal: number;
  targetCurrency: string;
  monthlyTargetConverted: number;
  months: MonthlyRepCell[];
  totalWonConverted: number;
  totalTargetConverted: number;
  totalGapToTarget: number;
  totalAttainmentPercent: number;
}

export interface MonthlyTeamTotals {
  monthKey: string;
  monthLabel: string;
  totalTeamTargetConverted: number;
  totalTeamWonConverted: number;
  totalTeamGapToTarget: number;
  totalTeamAttainmentPercent: number;
}

export function computeMonthlyRepMatrix(
  deals: Deal[],
  targets: SalesRepTarget[] = DEFAULT_REP_TARGETS,
  fxConfig: FxConfig = DEFAULT_FX_CONFIG,
  reportingCurrency: string = 'AUD',
  dateField: 'expectedCloseDate' | 'dateCreated' | 'lastActivityDate' = 'expectedCloseDate'
): {
  availableMonths: { monthKey: string; label: string }[];
  rows: MonthlyRepRow[];
  teamMonthlyTotals: MonthlyTeamTotals[];
  overallTeamTarget: number;
  overallTeamWon: number;
  overallTeamGap: number;
} {
  const availableMonths = extractAvailableMonths(deals, dateField);

  if (availableMonths.length === 0) {
    const curKey = new Date().toISOString().substring(0, 7);
    const curLabel = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    availableMonths.push({ monthKey: curKey, label: curLabel });
  }

  const targetMap: Record<string, SalesRepTarget> = {};
  targets.forEach((t) => {
    targetMap[t.repName.trim().toLowerCase()] = t;
  });

  const repSet = new Set<string>();
  targets.forEach((t) => repSet.add(t.repName.trim()));
  deals.forEach((d) => {
    if (d.salesRep && d.salesRep.toLowerCase() !== 'unassigned') {
      repSet.add(d.salesRep.trim());
    }
  });

  const repNames = Array.from(repSet).sort();

  const rows: MonthlyRepRow[] = repNames.map((repName) => {
    const repKey = repName.toLowerCase();
    const targetObj = targetMap[repKey] || {
      repName,
      monthlyTarget: 50000,
      targetCurrency: reportingCurrency,
    };

    const targetLocal = targetObj.monthlyTarget;
    const targetCurrency = targetObj.targetCurrency || reportingCurrency;
    const monthlyTargetConverted = convertCurrency(
      targetLocal,
      targetCurrency,
      reportingCurrency,
      fxConfig
    );

    let totalWonConverted = 0;

    const months: MonthlyRepCell[] = availableMonths.map((m) => {
      const repMonthDeals = deals.filter((d) => {
        if (d.salesRep.trim().toLowerCase() !== repKey) return false;
        const dealDate = d[dateField];
        return dealDate && dealDate.startsWith(m.monthKey);
      });

      let monthWonConverted = 0;
      let monthExpectedConverted = 0;
      let wonCount = 0;

      repMonthDeals.forEach((d) => {
        const safeVal = Math.max(0, d.dealValue);
        const conv = convertCurrency(safeVal, d.currency, reportingCurrency, fxConfig);
        if (d.isWon) {
          monthWonConverted += conv;
          wonCount += 1;
        } else if (d.isOpen) {
          monthExpectedConverted += conv;
        }
      });

      totalWonConverted += monthWonConverted;

      const gapToTarget = Math.max(0, monthlyTargetConverted - monthWonConverted);
      const attainmentPercent =
        monthlyTargetConverted > 0 ? Math.round((monthWonConverted / monthlyTargetConverted) * 100) : 0;

      let status: 'Over Quota' | 'On Track' | 'At Risk' | 'Underperforming' = 'Underperforming';
      if (monthWonConverted >= monthlyTargetConverted) {
        status = 'Over Quota';
      } else if (attainmentPercent >= 75) {
        status = 'On Track';
      } else if (attainmentPercent >= 50) {
        status = 'At Risk';
      }

      return {
        monthKey: m.monthKey,
        monthLabel: m.label,
        monthlyTargetConverted,
        wonConverted: monthWonConverted,
        expectedConverted: monthExpectedConverted,
        wonDealsCount: wonCount,
        gapToTarget,
        attainmentPercent,
        status,
      };
    });

    const totalTargetConverted = monthlyTargetConverted * availableMonths.length;
    const totalGapToTarget = Math.max(0, totalTargetConverted - totalWonConverted);
    const totalAttainmentPercent =
      totalTargetConverted > 0 ? Math.round((totalWonConverted / totalTargetConverted) * 100) : 0;

    return {
      repName,
      targetLocal,
      targetCurrency,
      monthlyTargetConverted,
      months,
      totalWonConverted,
      totalTargetConverted,
      totalGapToTarget,
      totalAttainmentPercent,
    };
  });

  const teamMonthlyTotals: MonthlyTeamTotals[] = availableMonths.map((m, idx) => {
    let teamTarget = 0;
    let teamWon = 0;

    rows.forEach((r) => {
      const cell = r.months[idx];
      teamTarget += cell ? cell.monthlyTargetConverted : 0;
      teamWon += cell ? cell.wonConverted : 0;
    });

    const gap = Math.max(0, teamTarget - teamWon);
    const attainment = teamTarget > 0 ? Math.round((teamWon / teamTarget) * 100) : 0;

    return {
      monthKey: m.monthKey,
      monthLabel: m.label,
      totalTeamTargetConverted: teamTarget,
      totalTeamWonConverted: teamWon,
      totalTeamGapToTarget: gap,
      totalTeamAttainmentPercent: attainment,
    };
  });

  const overallTeamTarget = teamMonthlyTotals.reduce((a, b) => a + b.totalTeamTargetConverted, 0);
  const overallTeamWon = teamMonthlyTotals.reduce((a, b) => a + b.totalTeamWonConverted, 0);
  const overallTeamGap = Math.max(0, overallTeamTarget - overallTeamWon);

  return {
    availableMonths,
    rows,
    teamMonthlyTotals,
    overallTeamTarget,
    overallTeamWon,
    overallTeamGap,
  };
}

export function computeStageSummaries(deals: Deal[]): StageSummary[] {
  const stageOrder = ['Discovery', 'Qualified', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost'];
  const stageMap: Record<string, StageSummary> = {};

  stageOrder.forEach((stage) => {
    stageMap[stage] = {
      stage,
      dealCount: 0,
      totalValue: 0,
      stalledCount: 0,
      stalledValue: 0,
    };
  });

  deals.forEach((deal) => {
    const s = deal.dealStage;
    if (!stageMap[s]) {
      stageMap[s] = {
        stage: s,
        dealCount: 0,
        totalValue: 0,
        stalledCount: 0,
        stalledValue: 0,
      };
    }

    const safeValue = Math.max(0, deal.dealValue);
    stageMap[s].dealCount += 1;
    stageMap[s].totalValue += safeValue;
    if (deal.isStalled) {
      stageMap[s].stalledCount += 1;
      stageMap[s].stalledValue += safeValue;
    }
  });

  return Object.values(stageMap);
}

export function computeReconciliationSummary(
  deals: Deal[],
  fxConfig: FxConfig = DEFAULT_FX_CONFIG,
  reportingCurrency = 'AUD'
) {
  const issues: any[] = [];

  let unassignedCount = 0;
  let unassignedValueConverted = 0;
  let negativeCount = 0;
  let missingWonValueCount = 0;
  let typosNormalizedCount = 0;
  let stalledCount = 0;

  deals.forEach((deal) => {
    const isUnassigned = deal.salesRep === 'Unassigned' || !deal.salesRep;
    const isNegative = deal.dealValue < 0;
    const isMissingWonValue = deal.isWon && deal.dealValue <= 0;
    const hasTypo = deal.rawStage.toLowerCase() !== deal.dealStage.toLowerCase();

    const convertedVal = convertCurrency(
      Math.max(0, deal.dealValue),
      deal.currency,
      reportingCurrency,
      fxConfig
    );

    if (isUnassigned) {
      unassignedCount++;
      unassignedValueConverted += convertedVal;
      issues.push({
        dealId: deal.id,
        clientName: deal.clientName,
        salesRep: 'Unassigned',
        issueType: 'Blank Sales Rep',
        severity: 'info',
        description: `Deal has no assigned sales rep in CRM export (${formatCurrency(convertedVal, reportingCurrency)}).`,
        actionTaken: 'Retained in total pipeline & stage metrics; excluded from rep target quotas.',
      });
    }

    if (isNegative) {
      negativeCount++;
      issues.push({
        dealId: deal.id,
        clientName: deal.clientName,
        salesRep: deal.salesRep,
        issueType: 'Negative Value Error',
        severity: 'critical',
        description: `Deal has invalid negative value (${deal.dealValue} ${deal.currency}).`,
        actionTaken: 'Excluded from dollar sums ($0 applied) to prevent understating revenue math.',
      });
    }

    if (isMissingWonValue) {
      missingWonValueCount++;
      issues.push({
        dealId: deal.id,
        clientName: deal.clientName,
        salesRep: deal.salesRep,
        issueType: 'Missing Won Value',
        severity: 'warning',
        description: `Closed Won deal is logged with $0 or missing value.`,
        actionTaken: 'Counted in closed deal count, treated as $0. Flagged to manager to fix contract value.',
      });
    }

    if (hasTypo) {
      typosNormalizedCount++;
      issues.push({
        dealId: deal.id,
        clientName: deal.clientName,
        salesRep: deal.salesRep,
        issueType: 'Stage Typo Normalized',
        severity: 'info',
        description: `Raw stage "${deal.rawStage}" contained typo/variant.`,
        actionTaken: `Mapped to canonical stage "${deal.dealStage}" to prevent falling out of stage totals.`,
      });
    }

    if (deal.isStalled) {
      stalledCount++;
    }
  });

  const flaggedRowsCount = new Set(issues.map((i) => i.dealId)).size;

  return {
    totalRowsLoaded: deals.length,
    flaggedRowsCount,
    unassignedDealsCount: unassignedCount,
    unassignedDealsValueConverted: unassignedValueConverted,
    negativeValueDealsCount: negativeCount,
    missingWonValueCount,
    typosNormalizedCount,
    stalledDealsCount: stalledCount,
    issues,
  };
}


export function formatCurrency(amount: number, currencyCode = 'NZD'): string {
  try {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: currencyCode || 'NZD',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `$${amount.toLocaleString()}`;
  }
}
