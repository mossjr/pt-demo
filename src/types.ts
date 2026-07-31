export type DealStatus = 'Open' | 'Won' | 'Lost' | string;

export interface Deal {
  id: string;
  clientName: string;
  salesRep: string;
  dealStage: string; // Normalized (e.g., 'Proposal Sent')
  rawStage: string;
  dealValue: number;
  currency: string;
  dateCreated: string | null;
  dateEnteredCurrentStage: string | null;
  expectedCloseDate: string | null;
  lastActivityDate: string | null;
  dealStatus: DealStatus;
  // Computed fields
  daysInCurrentStage: number;
  daysSinceLastActivity: number;
  isStalled: boolean;
  isWon: boolean;
  isLost: boolean;
  isOpen: boolean;
  anomalies: string[];
}

export interface RepPerformance {
  repName: string;
  totalWonValue: number;
  wonDealsCount: number;
  expectedThisMonthValue: number;
  expectedThisMonthCount: number;
  totalPipelineValue: number;
  openDealsCount: number;
  totalPerformance: number; // Won + Expected This Month
  target: number; // Target in local currency
  targetCurrency: string; // e.g., 'AUD', 'NZD'
  targetConverted: number; // Converted to active reporting currency
  wonConverted: number; // Converted to active reporting currency
  expectedConverted: number; // Converted to active reporting currency
  totalPerformanceConverted: number; // Converted to active reporting currency
  targetProgressPercent: number; // Won vs Target %
  pipelineProgressPercent: number; // (Won + Expected) vs Target %
  variance: number; // Converted Performance minus Converted Target
  gapToTargetConverted: number; // Remaining amount to reach target (targetConverted - wonConverted)
  status: 'Over Quota' | 'On Track' | 'At Risk' | 'Underperforming';
  monthKey?: string; // Optional month identifier e.g. '2026-08'
}

export interface SalesRepTarget {
  repName: string;
  monthlyTarget: number;
  targetCurrency: string;
}

export interface FxRate {
  currency: string;
  rateToBase: number; // Multiplier to convert 1 unit of currency into Base Currency (e.g., 1 NZD = 0.915 AUD)
  lastUpdated?: string;
}

export interface FxConfig {
  baseCurrency: string; // Company base currency (e.g. 'AUD')
  rates: Record<string, number>; // Map of currency -> rateToBase
  lastUpdated?: string;
}

export interface StageSummary {
  stage: string;
  dealCount: number;
  totalValue: number;
  stalledCount: number;
  stalledValue: number;
}

export interface PipelineMetrics {
  totalPipelineValue: number;
  openDealsCount: number;
  totalWonValue: number;
  wonDealsCount: number;
  totalLostValue: number;
  lostDealsCount: number;
  stalledDealsCount: number;
  stalledValue: number;
  winRate: number; // percentage
  avgDealSize: number;
  avgDaysInStage: number;
  anomaliesCount: number;
}

export interface FilterState {
  salesRep: string; // 'ALL' or specific rep name
  currency: string; // 'ALL' or 'AUD' | 'NZD' | 'USD'
  dealStage: string; // 'ALL' or specific stage
  dealStatus: string; // 'ALL' | 'Open' | 'Won' | 'Lost'
  stalledThresholdDays: number; // Default e.g. 30 days
  searchQuery: string;
  selectedMonth: string; // 'ALL' or 'YYYY-MM' e.g. '2026-08'
  startDate: string; // 'YYYY-MM-DD' or ''
  endDate: string; // 'YYYY-MM-DD' or ''
  dateField: 'expectedCloseDate' | 'dateCreated' | 'lastActivityDate'; // Default 'expectedCloseDate'
}

export interface ModuleInfo {
  id: string;
  title: string;
  description: string;
  iconName: string;
  category: string;
  isActive: boolean;
  badge?: string;
  statsPreview?: string;
}

export const IMMUTABLE_CANONICAL_STAGES = [
  'Discovery',
  'Qualified',
  'Proposal Sent',
  'Negotiation',
  'Closed Won',
  'Closed Lost',
] as const;

export type CanonicalStage = typeof IMMUTABLE_CANONICAL_STAGES[number];

export interface ValidationIssueItem {
  type:
    | 'UNMATCHED_STAGE'
    | 'UNMATCHED_SALES_REP'
    | 'BLANK_SALES_REP'
    | 'NEGATIVE_VALUE'
    | 'MISSING_WON_VALUE'
    | 'BLANK_CLIENT'
    | 'MISSING_DEAL_VALUE'
    | 'MISSING_CURRENCY'
    | 'INVALID_DATE_FORMAT';
  severity: 'critical' | 'warning' | 'info';
  description: string;
}

export interface PreImportRecord {
  rowIndex: number;
  id: string;
  clientName: string;
  rawRep: string;
  salesRep: string;
  rawStage: string;
  dealStage: string; // Should match one of IMMUTABLE_CANONICAL_STAGES
  dealValue: number;
  currency: string;
  dealStatus: DealStatus;
  dateCreated: string | null;
  dateEnteredCurrentStage: string | null;
  expectedCloseDate: string | null;
  lastActivityDate: string | null;
  issues: ValidationIssueItem[];
  hasInitialIssues?: boolean;
  isFixed: boolean;
  isIgnored: boolean;
  isEdited?: boolean;
  originalValues?: {
    clientName: string;
    rawRep: string;
    salesRep: string;
    rawStage: string;
    dealStage: string;
    dealValue: number;
    dealStatus: DealStatus;
    dateCreated?: string | null;
    dateEnteredCurrentStage?: string | null;
    expectedCloseDate?: string | null;
    lastActivityDate?: string | null;
  };
}

export interface StageMappingConfig {
  mappings: Record<string, string>; // lowercase variant -> Canonical Stage Name
}

export interface DataQualityIssue {
  dealId: string;
  clientName: string;
  salesRep: string;
  issueType:
    | 'Blank Sales Rep'
    | 'Negative Value Error'
    | 'Missing Won Value'
    | 'Stage Typo Normalized'
    | 'Stalled Deal';
  severity: 'critical' | 'warning' | 'info';
  description: string;
  actionTaken: string;
}

export interface ReconciliationSummary {
  totalRowsLoaded: number;
  flaggedRowsCount: number;
  unassignedDealsCount: number;
  unassignedDealsValueConverted: number;
  negativeValueDealsCount: number;
  missingWonValueCount: number;
  typosNormalizedCount: number;
  stalledDealsCount: number;
  issues: DataQualityIssue[];
}

