import Papa from 'papaparse';
import { Deal } from '../types';

// Stage normalization dictionary
export const DEFAULT_STAGE_NORMALIZATION: Record<string, string> = {
  'discovery': 'Discovery',
  'qualified': 'Qualified',
  'proposol sent': 'Proposal Sent',
  'proposal sent': 'Proposal Sent',
  'proposal': 'Proposal Sent',
  'negotiation': 'Negotiation',
  'closed won': 'Closed Won',
  'closed lost': 'Closed Lost',
};

// Robust date parsing helper
export function parseFlexibleDate(dateStr: string | undefined | null): Date | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // Handle YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
    const parts = trimmed.split('-').map(Number);
    const year = parts[0];
    const month = parts[1] - 1;
    const day = parts[2];
    if (month < 0 || month > 11 || day < 1 || day > 31) return null;
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  // Handle M/D/YY or M/D/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(trimmed)) {
    const parts = trimmed.split('/').map(Number);
    let month = parts[0] - 1;
    let day = parts[1];
    let year = parts[2];
    if (year < 100) year += 2000;
    if (month < 0 || month > 11 || day < 1 || day > 31) return null;
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  // Fallback native Date parse
  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function parseSalesDataCsv(
  csvText: string,
  stalledThresholdDays = 30,
  stageMappings: Record<string, string> = DEFAULT_STAGE_NORMALIZATION
): Deal[] {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (!parsed.data || parsed.data.length === 0) {
    return [];
  }

  // 1. Pass to parse raw rows and collect valid dates to determine dataset reference date
  let maxDatasetTimestamp = 0;

  const rawDeals = parsed.data.map((row, index) => {
    const anomalies: string[] = [];

    const dealId = row['Deal ID']?.trim() || `D-UNKNOWN-${index + 1}`;
    const clientName = row['Client Name']?.trim() || 'Unknown Client';
    const rawRep = row['Sales Rep']?.trim();
    const salesRep = rawRep ? rawRep : 'Unassigned';
    if (!rawRep) {
      anomalies.push('Blank Sales Rep (Unassigned)');
    }

    const rawStage = row['Deal Stage']?.trim() || 'Discovery';
    const lowerRawStage = rawStage.toLowerCase();
    const normalizedStage = stageMappings[lowerRawStage] || rawStage;

    if (lowerRawStage !== normalizedStage.toLowerCase()) {
      anomalies.push(`Stage Typo Normalized ("${rawStage}" -> "${normalizedStage}")`);
    }

    const dealStatusRaw = row['Deal Status']?.trim() || 'Open';
    const dealStatus = dealStatusRaw.toLowerCase().includes('won')
      ? 'Won'
      : dealStatusRaw.toLowerCase().includes('lost')
      ? 'Lost'
      : 'Open';

    const rawValue = row['Deal Value']?.trim();
    let dealValue = 0;

    if (rawValue === undefined || rawValue === '' || isNaN(Number(rawValue))) {
      dealValue = 0;
      if (dealStatus === 'Won') {
        anomalies.push('Missing Won Value ($0)');
      } else {
        anomalies.push('Missing Deal Value ($0)');
      }
    } else {
      dealValue = Number(rawValue);
      if (dealValue < 0) {
        anomalies.push(`Negative Value Error (${dealValue})`);
      } else if (dealStatus === 'Won' && dealValue === 0) {
        anomalies.push('Missing Won Value ($0)');
      }
    }

    const currency = row['Currency']?.trim() || 'NZD';
    if (!row['Currency']?.trim()) anomalies.push('Missing Currency');

    const dateCreatedObj = parseFlexibleDate(row['Date Created']);
    const dateEnteredStageObj = parseFlexibleDate(row['Date Entered Current Stage']);
    const expectedCloseDateObj = parseFlexibleDate(row['Expected Close Date']);
    const lastActivityDateObj = parseFlexibleDate(row['Last Activity Date']);

    if (row['Date Entered Current Stage'] && !dateEnteredStageObj) {
      anomalies.push(`Invalid Date Entered Stage ("${row['Date Entered Current Stage']}")`);
    }

    // Track latest timestamp in dataset
    [dateCreatedObj, dateEnteredStageObj, expectedCloseDateObj, lastActivityDateObj].forEach((d) => {
      if (d) {
        const time = d.getTime();
        if (time > maxDatasetTimestamp) {
          maxDatasetTimestamp = time;
        }
      }
    });

    return {
      id: dealId,
      clientName,
      salesRep,
      dealStage: normalizedStage,
      rawStage,
      dealValue,
      currency,
      dateCreated: dateCreatedObj ? dateCreatedObj.toISOString().split('T')[0] : null,
      dateEnteredCurrentStage: dateEnteredStageObj ? dateEnteredStageObj.toISOString().split('T')[0] : null,
      expectedCloseDate: expectedCloseDateObj ? expectedCloseDateObj.toISOString().split('T')[0] : null,
      lastActivityDate: lastActivityDateObj ? lastActivityDateObj.toISOString().split('T')[0] : null,
      dateEnteredStageObj,
      lastActivityDateObj,
      dealStatus,
      anomalies,
    };
  });

  // Reference date: Use dataset's maximum date or current date if empty
  const refDate = maxDatasetTimestamp > 0 ? new Date(maxDatasetTimestamp) : new Date();

  return rawDeals.map((deal) => {
    let daysInStage = 0;
    let daysSinceActivity = 0;

    if (deal.dateEnteredStageObj) {
      const diffMs = refDate.getTime() - deal.dateEnteredStageObj.getTime();
      daysInStage = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }

    if (deal.lastActivityDateObj) {
      const diffMs = refDate.getTime() - deal.lastActivityDateObj.getTime();
      daysSinceActivity = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }

    const isWon = deal.dealStatus === 'Won';
    const isLost = deal.dealStatus === 'Lost';
    const isOpen = deal.dealStatus === 'Open';

    // Stalled if open deal has daysInStage or daysSinceActivity exceeding threshold
    const isStalled = isOpen && (daysInStage >= stalledThresholdDays || daysSinceActivity >= stalledThresholdDays);

    if (isStalled) {
      deal.anomalies.push(`Stalled (${Math.max(daysInStage, daysSinceActivity)} days in current stage)`);
    }

    return {
      id: deal.id,
      clientName: deal.clientName,
      salesRep: deal.salesRep,
      dealStage: deal.dealStage,
      rawStage: deal.rawStage,
      dealValue: deal.dealValue,
      currency: deal.currency,
      dateCreated: deal.dateCreated,
      dateEnteredCurrentStage: deal.dateEnteredCurrentStage,
      expectedCloseDate: deal.expectedCloseDate,
      lastActivityDate: deal.lastActivityDate,
      dealStatus: deal.dealStatus,
      daysInCurrentStage: daysInStage,
      daysSinceLastActivity: daysSinceActivity,
      isStalled,
      isWon,
      isLost,
      isOpen,
      anomalies: deal.anomalies,
    };
  });
}

