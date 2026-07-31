import React, { useState, useMemo, useEffect } from 'react';
import Papa from 'papaparse';
import {
  Deal,
  PreImportRecord,
  ValidationIssueItem,
  IMMUTABLE_CANONICAL_STAGES,
  CanonicalStage,
} from '../../types';
import { parseFlexibleDate, DEFAULT_STAGE_NORMALIZATION } from '../../utils/csvParser';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Edit3,
  Check,
  RotateCcw,
  UserCheck,
  Layers,
  DollarSign,
  Search,
  Zap,
  Building,
  UserPlus,
  Calendar,
  CalendarDays,
} from 'lucide-react';

const DEFAULT_KNOWN_REPS = [
  'Sarah Chen',
  'Mike Thompson',
  'Priya Patel',
  'Jordan Lee',
  'Ben Walsh',
  'Aroha Ngata',
];

const AVAILABLE_CURRENCIES = ['NZD', 'AUD', 'USD', 'GBP', 'EUR', 'CAD', 'SGD', 'JPY'];

function findBestGuessRep(rawRep: string, knownReps: string[]): string {
  if (!rawRep || rawRep.trim() === '') return 'Unassigned';
  const lower = rawRep.trim().toLowerCase();

  if (lower === 'unassigned') return 'Unassigned';

  // 1. Exact match (case insensitive)
  const exact = knownReps.find((r) => r.toLowerCase() === lower);
  if (exact) return exact;

  // 2. Token / Name match
  for (const rep of knownReps) {
    const repLower = rep.toLowerCase();
    const parts = repLower.split(' ');
    if (parts.some((part) => part.length >= 3 && lower.includes(part))) {
      return rep;
    }
  }

  // Fallback to first rep in targets
  return knownReps[0] || 'Unassigned';
}

function findBestGuessStage(rawStage: string): CanonicalStage {
  if (!rawStage || rawStage.trim() === '') return 'Discovery';
  const lower = rawStage.trim().toLowerCase();

  const exact = IMMUTABLE_CANONICAL_STAGES.find((s) => s.toLowerCase() === lower);
  if (exact) return exact;

  if (lower.includes('propos') || lower.includes('quote') || lower.includes('bid')) return 'Proposal Sent';
  if (lower.includes('qualif') || lower.includes('lead') || lower.includes('disc')) return 'Qualified';
  if (lower.includes('negot') || lower.includes('review') || lower.includes('contract')) return 'Negotiation';
  if (lower.includes('won') || lower.includes('close') || lower.includes('signed')) return 'Closed Won';
  if (lower.includes('lost') || lower.includes('drop') || lower.includes('cancel')) return 'Closed Lost';

  return 'Discovery';
}

interface PreImportValidationModalProps {
  csvContent: string;
  fileName: string;
  stalledThresholdDays: number;
  stageMappings?: Record<string, string>;
  knownReps?: string[];
  onApproveImport: (deals: Deal[]) => void;
  onCancelImport: () => void;
}

export const PreImportValidationModal: React.FC<PreImportValidationModalProps> = ({
  csvContent,
  fileName,
  stalledThresholdDays,
  stageMappings = DEFAULT_STAGE_NORMALIZATION,
  knownReps = DEFAULT_KNOWN_REPS,
  onApproveImport,
  onCancelImport,
}) => {
  const [records, setRecords] = useState<PreImportRecord[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const knownRepsList = useMemo(() => {
    return knownReps && knownReps.length > 0 ? knownReps : DEFAULT_KNOWN_REPS;
  }, [knownReps]);

  // Initial parse and validation on load
  useEffect(() => {
    if (!csvContent) return;

    const parsed = Papa.parse<Record<string, string>>(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });

    if (!parsed.data || parsed.data.length === 0) {
      setRecords([]);
      return;
    }

    const initialRecords: PreImportRecord[] = parsed.data.map((row, idx) => {
      const dealId = row['Deal ID']?.trim() || `D-${idx + 101}`;
      const clientName = row['Client Name']?.trim() || 'Unknown Client';

      const rawRep = row['Sales Rep']?.trim() || '';
      const bestGuessRep = findBestGuessRep(rawRep, knownRepsList);

      const rawStage = row['Deal Stage']?.trim() || '';
      const bestGuessStage = findBestGuessStage(rawStage);

      // Default stage & rep to best guess
      const dealStage = bestGuessStage;
      const salesRep = bestGuessRep;

      const rawStatus = row['Deal Status']?.trim() || 'Open';
      const dealStatus = rawStatus.toLowerCase().includes('won')
        ? 'Won'
        : rawStatus.toLowerCase().includes('lost')
        ? 'Lost'
        : 'Open';

      const rawValue = row['Deal Value']?.trim();
      const isMissingValue = rawValue === undefined || rawValue === '' || isNaN(Number(rawValue));
      let dealValue = 0;
      if (!isMissingValue) {
        dealValue = Number(rawValue);
      }

      const rawCurrency = row['Currency']?.trim();
      const currency = rawCurrency || 'NZD';

      const rawDateCreated = row['Date Created']?.trim();
      const rawDateEntered = row['Date Entered Current Stage']?.trim();
      const rawExpectedClose = row['Expected Close Date']?.trim();
      const rawLastActivity = row['Last Activity Date']?.trim();

      const dateCreatedObj = parseFlexibleDate(rawDateCreated);
      const dateEnteredStageObj = parseFlexibleDate(rawDateEntered);
      const expectedCloseDateObj = parseFlexibleDate(rawExpectedClose);
      const lastActivityDateObj = parseFlexibleDate(rawLastActivity);

      // Perform Edge Case Validation Checks
      const issues: ValidationIssueItem[] = [];

      // 1. Stage Validation against Immutable Canonical List
      const isExactCanonicalStage = IMMUTABLE_CANONICAL_STAGES.some(
        (stg) => stg.toLowerCase() === rawStage.toLowerCase()
      );
      if (!isExactCanonicalStage) {
        issues.push({
          type: 'UNMATCHED_STAGE',
          severity: 'warning',
          description: `Stage "${rawStage || 'Blank'}" does not match canonical stages. Recommended: "${bestGuessStage}".`,
        });
      }

      // 2. Sales Rep Validation against Official Target Reps List
      const isExactKnownRep = knownRepsList.some(
        (r) => r.toLowerCase() === rawRep.toLowerCase()
      );
      if (!rawRep || rawRep.toLowerCase() === 'unassigned') {
        issues.push({
          type: 'BLANK_SALES_REP',
          severity: 'info',
          description: 'Sales Rep is blank in CRM export (Unassigned).',
        });
      } else if (!isExactKnownRep) {
        issues.push({
          type: 'UNMATCHED_SALES_REP',
          severity: 'warning',
          description: `Sales Rep "${rawRep}" is not in target list. Recommended: "${bestGuessRep}".`,
        });
      }

      // 3. Negative Value Error
      if (dealValue < 0) {
        issues.push({
          type: 'NEGATIVE_VALUE',
          severity: 'critical',
          description: `Invalid negative deal value (${dealValue} ${currency}).`,
        });
      }

      // 4. Missing Deal Value Validation
      if (isMissingValue) {
        issues.push({
          type: 'MISSING_DEAL_VALUE',
          severity: 'warning',
          description: 'Deal Value is missing or blank in source sheet ($0 applied as fallback).',
        });
      }

      // 5. Missing Currency Validation
      if (!rawCurrency) {
        issues.push({
          type: 'MISSING_CURRENCY',
          severity: 'info',
          description: 'Currency is missing in source sheet (defaulted to NZD).',
        });
      }

      // 6. Missing Won Value
      if (dealStatus === 'Won' && dealValue <= 0 && !isMissingValue) {
        issues.push({
          type: 'MISSING_WON_VALUE',
          severity: 'warning',
          description: 'Closed Won deal is recorded with $0 or missing contract value.',
        });
      }

      // 7. Date Format Validation (m/d/yy)
      const dateFieldsToCheck = [
        { raw: rawDateCreated, label: 'Date Created' },
        { raw: rawDateEntered, label: 'Date Entered Current Stage' },
        { raw: rawExpectedClose, label: 'Expected Close Date' },
        { raw: rawLastActivity, label: 'Last Activity Date' },
      ];

      dateFieldsToCheck.forEach(({ raw, label }) => {
        if (raw) {
          const parsed = parseFlexibleDate(raw);
          if (!parsed) {
            issues.push({
              type: 'INVALID_DATE_FORMAT',
              severity: 'warning',
              description: `${label} ("${raw}") is an invalid date. Expected format: m/d/yy.`,
            });
          } else {
            const isMdy = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(raw);
            const isIso = /^\d{4}-\d{1,2}-\d{1,2}$/.test(raw);
            if (!isMdy && !isIso) {
              issues.push({
                type: 'INVALID_DATE_FORMAT',
                severity: 'info',
                description: `${label} ("${raw}") does not follow standard m/d/yy format.`,
              });
            }
          }
        }
      });

      return {
        rowIndex: idx + 1,
        id: dealId,
        clientName,
        rawRep,
        salesRep,
        rawStage,
        dealStage,
        dealValue,
        currency,
        dealStatus,
        dateCreated: dateCreatedObj ? dateCreatedObj.toISOString().split('T')[0] : null,
        dateEnteredCurrentStage: dateEnteredStageObj ? dateEnteredStageObj.toISOString().split('T')[0] : null,
        expectedCloseDate: expectedCloseDateObj ? expectedCloseDateObj.toISOString().split('T')[0] : null,
        lastActivityDate: lastActivityDateObj ? lastActivityDateObj.toISOString().split('T')[0] : null,
        issues,
        hasInitialIssues: issues.length > 0,
        isFixed: false,
        isIgnored: false,
        isEdited: false,
        originalValues: {
          clientName,
          rawRep,
          salesRep,
          rawStage,
          dealStage,
          dealValue,
          dealStatus,
          dateCreated: dateCreatedObj ? dateCreatedObj.toISOString().split('T')[0] : null,
          dateEnteredCurrentStage: dateEnteredStageObj ? dateEnteredStageObj.toISOString().split('T')[0] : null,
          expectedCloseDate: expectedCloseDateObj ? expectedCloseDateObj.toISOString().split('T')[0] : null,
          lastActivityDate: lastActivityDateObj ? lastActivityDateObj.toISOString().split('T')[0] : null,
        },
      };
    });

    setRecords(initialRecords);
  }, [csvContent, stageMappings, knownRepsList]);

  // Compute validation stats
  const totalRows = records.length;
  const flaggedCount = records.filter((r) => r.issues.length > 0 && !r.isFixed && !r.isIgnored).length;
  const resolvedCount = records.filter((r) => r.issues.length > 0 && (r.isFixed || r.isIgnored)).length;
  const cleanCount = records.filter((r) => r.issues.length === 0 && !r.isFixed).length;
  const pendingEditsCount = records.filter((r) => r.isEdited).length;

  // Filter records based on active tab and search query
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      // Search query check
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          rec.id.toLowerCase().includes(q) ||
          rec.clientName.toLowerCase().includes(q) ||
          rec.salesRep.toLowerCase().includes(q) ||
          rec.rawRep.toLowerCase().includes(q) ||
          rec.rawStage.toLowerCase().includes(q) ||
          rec.dealStage.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      // Filter tab check
      if (activeFilter === 'ALL') return true;
      if (activeFilter === 'FLAGGED') return rec.issues.length > 0 && !rec.isFixed && !rec.isIgnored;
      if (activeFilter === 'VALID') return rec.issues.length === 0 || rec.isFixed || rec.isIgnored;
      if (activeFilter === 'UNMATCHED_STAGE') return rec.issues.some((i) => i.type === 'UNMATCHED_STAGE');
      if (activeFilter === 'UNMATCHED_SALES_REP') return rec.issues.some((i) => i.type === 'UNMATCHED_SALES_REP');
      if (activeFilter === 'BLANK_SALES_REP') return rec.issues.some((i) => i.type === 'BLANK_SALES_REP');
      if (activeFilter === 'NEGATIVE_VALUE') return rec.issues.some((i) => i.type === 'NEGATIVE_VALUE');
      if (activeFilter === 'MISSING_WON_VALUE') return rec.issues.some((i) => i.type === 'MISSING_WON_VALUE');
      if (activeFilter === 'MISSING_DEAL_VALUE') return rec.issues.some((i) => i.type === 'MISSING_DEAL_VALUE');
      if (activeFilter === 'MISSING_CURRENCY') return rec.issues.some((i) => i.type === 'MISSING_CURRENCY');
      if (activeFilter === 'INVALID_DATE_FORMAT') return rec.issues.some((i) => i.type === 'INVALID_DATE_FORMAT');

      return true;
    });
  }, [records, activeFilter, searchQuery]);

  // Separate filtered records into Flagged (top) and Valid & Clean (below)
  // Cards stay in Flagged section even when edited until explicitly committed or ignored!
  const flaggedRecordsList = useMemo(() => {
    return filteredRecords.filter(
      (rec) => (rec.hasInitialIssues || rec.issues.length > 0) && !rec.isFixed && !rec.isIgnored
    );
  }, [filteredRecords]);

  const validRecordsList = useMemo(() => {
    return filteredRecords.filter(
      (rec) => (!rec.hasInitialIssues && rec.issues.length === 0) || rec.isFixed || rec.isIgnored
    );
  }, [filteredRecords]);

  // Handle field modifications
  const handleFieldChange = (rowIndex: number, field: keyof PreImportRecord, value: any) => {
    setRecords((prev) =>
      prev.map((rec) => {
        if (rec.rowIndex !== rowIndex) return rec;

        const updated = { ...rec, [field]: value };

        // Re-evaluate issues for updated record draft values
        const newIssues: ValidationIssueItem[] = [];

        // Check Stage
        const isCanonical = IMMUTABLE_CANONICAL_STAGES.includes(updated.dealStage as CanonicalStage);
        if (!isCanonical) {
          newIssues.push({
            type: 'UNMATCHED_STAGE',
            severity: 'warning',
            description: `Stage "${updated.dealStage}" does not match canonical stages.`,
          });
        }

        // Check Rep
        const isKnownRep = knownRepsList.some((r) => r.toLowerCase() === updated.salesRep.toLowerCase());
        if (!updated.salesRep.trim() || updated.salesRep.toLowerCase() === 'unassigned') {
          newIssues.push({
            type: 'BLANK_SALES_REP',
            severity: 'info',
            description: 'Sales Rep is blank (Unassigned).',
          });
        } else if (!isKnownRep) {
          newIssues.push({
            type: 'UNMATCHED_SALES_REP',
            severity: 'warning',
            description: `Sales Rep "${updated.salesRep}" is not in target list.`,
          });
        }

        // Check Missing Currency
        if (!updated.currency) {
          newIssues.push({
            type: 'MISSING_CURRENCY',
            severity: 'info',
            description: 'Currency is missing (defaulted to NZD).',
          });
        }

        // Check Negative Value
        if (updated.dealValue < 0) {
          newIssues.push({
            type: 'NEGATIVE_VALUE',
            severity: 'critical',
            description: `Negative deal value (${updated.dealValue}).`,
          });
        }

        // Check Missing Won Value
        if (updated.dealStatus === 'Won' && updated.dealValue <= 0) {
          newIssues.push({
            type: 'MISSING_WON_VALUE',
            severity: 'warning',
            description: 'Closed Won deal has $0 or missing value.',
          });
        }

        // Check Date Formats
        const dateFieldsToCheck = [
          { val: updated.dateCreated, label: 'Date Created' },
          { val: updated.dateEnteredCurrentStage, label: 'Date Entered Current Stage' },
          { val: updated.expectedCloseDate, label: 'Expected Close Date' },
          { val: updated.lastActivityDate, label: 'Last Activity Date' },
        ];

        dateFieldsToCheck.forEach(({ val, label }) => {
          if (val) {
            const parsed = parseFlexibleDate(val);
            if (!parsed || isNaN(parsed.getTime())) {
              newIssues.push({
                type: 'INVALID_DATE_FORMAT',
                severity: 'warning',
                description: `${label} ("${val}") is invalid.`,
              });
            }
          }
        });

        return {
          ...updated,
          issues: newIssues,
          isEdited: true, // User has pending uncommitted edits
        };
      })
    );
  };

  // Explicitly commit changes on a record card
  const handleCommitRecordFix = (rowIndex: number) => {
    setRecords((prev) =>
      prev.map((rec) => {
        if (rec.rowIndex !== rowIndex) return rec;
        return {
          ...rec,
          isFixed: true,
          isEdited: false,
          isIgnored: false,
        };
      })
    );
  };

  // Revert draft changes back to original loaded values
  const handleRevertRecord = (rowIndex: number) => {
    setRecords((prev) =>
      prev.map((rec) => {
        if (rec.rowIndex !== rowIndex) return rec;
        if (!rec.originalValues) return rec;

        const restored = {
          ...rec,
          clientName: rec.originalValues.clientName,
          salesRep: rec.originalValues.salesRep,
          dealStage: rec.originalValues.dealStage,
          dealValue: rec.originalValues.dealValue,
          dealStatus: rec.originalValues.dealStatus,
          isEdited: false,
        };

        // Re-evaluate original issues
        const issues: ValidationIssueItem[] = [];
        const isCanonical = IMMUTABLE_CANONICAL_STAGES.some(
          (s) => s.toLowerCase() === restored.rawStage.toLowerCase()
        );
        if (!isCanonical) {
          issues.push({
            type: 'UNMATCHED_STAGE',
            severity: 'warning',
            description: `Stage "${restored.rawStage || 'Blank'}" does not match canonical stages list.`,
          });
        }

        const isKnownRep = knownRepsList.some(
          (r) => r.toLowerCase() === restored.rawRep.toLowerCase()
        );
        if (!restored.rawRep || restored.rawRep.toLowerCase() === 'unassigned') {
          issues.push({
            type: 'BLANK_SALES_REP',
            severity: 'info',
            description: 'Sales Rep is blank in CRM export (Unassigned).',
          });
        } else if (!isKnownRep) {
          issues.push({
            type: 'UNMATCHED_SALES_REP',
            severity: 'warning',
            description: `Sales Rep "${restored.rawRep}" is not in target list.`,
          });
        }

        if (restored.dealValue < 0) {
          issues.push({
            type: 'NEGATIVE_VALUE',
            severity: 'critical',
            description: `Invalid negative deal value (${restored.dealValue}).`,
          });
        }

        if (restored.dealStatus === 'Won' && restored.dealValue <= 0) {
          issues.push({
            type: 'MISSING_WON_VALUE',
            severity: 'warning',
            description: 'Closed Won deal is recorded with $0 or missing contract value.',
          });
        }

        return {
          ...restored,
          issues,
          isFixed: false,
          isIgnored: false,
        };
      })
    );
  };

  const handleToggleIgnore = (rowIndex: number) => {
    setRecords((prev) =>
      prev.map((rec) => {
        if (rec.rowIndex !== rowIndex) return rec;
        return {
          ...rec,
          isIgnored: !rec.isIgnored,
          isEdited: false,
        };
      })
    );
  };

  const handleCommitAllDrafts = () => {
    setRecords((prev) =>
      prev.map((rec) => {
        if (rec.isEdited) {
          return {
            ...rec,
            isFixed: true,
            isEdited: false,
            isIgnored: false,
          };
        }
        return rec;
      })
    );
  };

  const handleIgnoreAllRemaining = () => {
    setRecords((prev) =>
      prev.map((rec) => {
        if (rec.issues.length > 0 && !rec.isFixed) {
          return { ...rec, isIgnored: true, isEdited: false };
        }
        return rec;
      })
    );
  };

  const handleAutoFixStages = () => {
    setRecords((prev) =>
      prev.map((rec) => {
        if (rec.issues.some((i) => i.type === 'UNMATCHED_STAGE')) {
          const matched = findBestGuessStage(rec.rawStage);
          const remainingIssues = rec.issues.filter((i) => i.type !== 'UNMATCHED_STAGE');

          return {
            ...rec,
            dealStage: matched,
            isEdited: true,
            issues: remainingIssues,
          };
        }
        return rec;
      })
    );
  };

  const handleAutoFixReps = () => {
    setRecords((prev) =>
      prev.map((rec) => {
        if (rec.issues.some((i) => i.type === 'UNMATCHED_SALES_REP' || i.type === 'BLANK_SALES_REP')) {
          const matched = findBestGuessRep(rec.rawRep, knownRepsList);
          const remainingIssues = rec.issues.filter(
            (i) => i.type !== 'UNMATCHED_SALES_REP' && i.type !== 'BLANK_SALES_REP'
          );

          return {
            ...rec,
            salesRep: matched,
            isEdited: true,
            issues: remainingIssues,
          };
        }
        return rec;
      })
    );
  };

  const handleAutoFixDates = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setRecords((prev) =>
      prev.map((rec) => {
        if (rec.issues.some((i) => i.type === 'INVALID_DATE_FORMAT')) {
          const fixDateVal = (val: string | null) => {
            if (!val) return todayStr;
            const parsed = parseFlexibleDate(val);
            if (!parsed || isNaN(parsed.getTime())) return todayStr;
            return parsed.toISOString().split('T')[0];
          };

          const updatedCreated = fixDateVal(rec.dateCreated);
          const updatedEntered = fixDateVal(rec.dateEnteredCurrentStage);
          const updatedExpected = fixDateVal(rec.expectedCloseDate);
          const updatedActivity = fixDateVal(rec.lastActivityDate);

          const remainingIssues = rec.issues.filter((i) => i.type !== 'INVALID_DATE_FORMAT');

          return {
            ...rec,
            dateCreated: updatedCreated,
            dateEnteredCurrentStage: updatedEntered,
            expectedCloseDate: updatedExpected,
            lastActivityDate: updatedActivity,
            isEdited: true,
            issues: remainingIssues,
          };
        }
        return rec;
      })
    );
  };

  // Final approval conversion into clean Deal[] objects
  const handleFinalApprove = () => {
    let maxDatasetTimestamp = 0;

    const dealsToProcess = records.map((rec) => {
      let finalStage = rec.dealStage;
      if (!IMMUTABLE_CANONICAL_STAGES.includes(finalStage as CanonicalStage)) {
        finalStage = 'Discovery';
      }

      let finalValue = rec.dealValue;
      if (finalValue < 0 && rec.isIgnored) {
        finalValue = 0;
      }

      let finalRep = rec.salesRep.trim();
      if (!finalRep) finalRep = 'Unassigned';

      const dateCreatedObj = rec.dateCreated ? new Date(rec.dateCreated) : null;
      const dateEnteredStageObj = rec.dateEnteredCurrentStage
        ? new Date(rec.dateEnteredCurrentStage)
        : null;
      const expectedCloseDateObj = rec.expectedCloseDate ? new Date(rec.expectedCloseDate) : null;
      const lastActivityDateObj = rec.lastActivityDate ? new Date(rec.lastActivityDate) : null;

      [dateCreatedObj, dateEnteredStageObj, expectedCloseDateObj, lastActivityDateObj].forEach((d) => {
        if (d && !isNaN(d.getTime()) && d.getTime() > maxDatasetTimestamp) {
          maxDatasetTimestamp = d.getTime();
        }
      });

      return {
        id: rec.id,
        clientName: rec.clientName || 'Unknown Client',
        salesRep: finalRep,
        dealStage: finalStage,
        rawStage: rec.rawStage,
        dealValue: finalValue,
        currency: rec.currency || 'NZD',
        dateCreated: rec.dateCreated,
        dateEnteredCurrentStage: rec.dateEnteredCurrentStage,
        expectedCloseDate: rec.expectedCloseDate,
        lastActivityDate: rec.lastActivityDate,
        dealStatus: rec.dealStatus,
        dateEnteredStageObj,
        lastActivityDateObj,
        anomalies: rec.issues.map((i) => i.description),
      };
    });

    const refDate = maxDatasetTimestamp > 0 ? new Date(maxDatasetTimestamp) : new Date();

    const finalDeals: Deal[] = dealsToProcess.map((d) => {
      let daysInStage = 0;
      let daysSinceActivity = 0;

      if (d.dateEnteredStageObj && !isNaN(d.dateEnteredStageObj.getTime())) {
        const diffMs = refDate.getTime() - d.dateEnteredStageObj.getTime();
        daysInStage = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }

      if (d.lastActivityDateObj && !isNaN(d.lastActivityDateObj.getTime())) {
        const diffMs = refDate.getTime() - d.lastActivityDateObj.getTime();
        daysSinceActivity = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }

      const isWon = d.dealStatus === 'Won';
      const isLost = d.dealStatus === 'Lost';
      const isOpen = d.dealStatus === 'Open';

      const isStalled =
        isOpen && (daysInStage >= stalledThresholdDays || daysSinceActivity >= stalledThresholdDays);

      return {
        id: d.id,
        clientName: d.clientName,
        salesRep: d.salesRep,
        dealStage: d.dealStage,
        rawStage: d.rawStage,
        dealValue: d.dealValue,
        currency: d.currency,
        dateCreated: d.dateCreated,
        dateEnteredCurrentStage: d.dateEnteredCurrentStage,
        expectedCloseDate: d.expectedCloseDate,
        lastActivityDate: d.lastActivityDate,
        dealStatus: d.dealStatus,
        daysInCurrentStage: daysInStage,
        daysSinceLastActivity: daysSinceActivity,
        isStalled,
        isWon,
        isLost,
        isOpen,
        anomalies: d.anomalies,
      };
    });

    onApproveImport(finalDeals);
  };

  // Render Card Component for a PreImportRecord
  const renderRecordCard = (rec: PreImportRecord, isFlaggedSection: boolean) => {
    const hasIssues = rec.issues.length > 0;
    const isResolved = rec.isFixed || rec.isIgnored;
    const isEdited = rec.isEdited;

    const rawRepMismatched =
      rec.rawRep && rec.rawRep.toLowerCase() !== rec.salesRep.toLowerCase();
    const rawStageMismatched =
      rec.rawStage && rec.rawStage.toLowerCase() !== rec.dealStage.toLowerCase();

    return (
      <div
        key={rec.rowIndex}
        className={`p-4 rounded-xl border transition-all ${
          isEdited
            ? 'bg-[#162d5a] border-amber-400/80 shadow-xl ring-1 ring-amber-400/30'
            : isResolved
            ? 'bg-[#0d2045]/60 border-emerald-500/30'
            : hasIssues
            ? 'bg-[#0d2045] border-amber-500/50 shadow-lg'
            : 'bg-[#0d2045]/40 border-[#3f7abb]/30'
        }`}
      >
        {/* Record Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#3f7abb]/20 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 bg-[#122852] border border-[#3f7abb]/40 rounded font-mono text-[11px] font-bold text-[#ecdf51]">
              Row #{rec.rowIndex} ({rec.id})
            </span>

            {/* Editable Client Name */}
            <div className="flex items-center space-x-1">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={rec.clientName}
                onChange={(e) => handleFieldChange(rec.rowIndex, 'clientName', e.target.value)}
                placeholder="Client Name"
                className="bg-[#122852] border border-[#3f7abb]/30 rounded px-2 py-0.5 font-bold text-white text-xs focus:outline-none focus:ring-1 focus:ring-[#ecdf51]"
              />
            </div>
          </div>

          {/* Issue Badges & Status Indicators */}
          <div className="flex flex-wrap items-center gap-1.5">
            {isEdited && (
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/50 flex items-center space-x-1 animate-pulse">
                <Edit3 className="w-3 h-3" />
                <span>Uncommitted Draft Edits</span>
              </span>
            )}

            {rec.isFixed && !isEdited && (
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center space-x-1">
                <Check className="w-3 h-3" />
                <span>Committed & Valid</span>
              </span>
            )}

            {rec.isIgnored && !isEdited && (
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-500/20 text-slate-300 border border-slate-500/40">
                Warning Ignored
              </span>
            )}

            {!isResolved &&
              rec.issues.map((iss, iIdx) => (
                <span
                  key={iIdx}
                  className={`px-2 py-0.5 rounded text-[10px] font-extrabold border flex items-center space-x-1 ${
                    iss.severity === 'critical'
                      ? 'bg-red-500/20 text-red-300 border-red-500/40'
                      : iss.severity === 'warning'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-[#38bdf8]/20 text-[#38bdf8] border-[#38bdf8]/40'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>{iss.description}</span>
                </span>
              ))}
          </div>
        </div>

        {/* Record Form Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 text-xs">
          {/* Sales Rep Input / Dropdown */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-300 flex items-center space-x-1">
                <UserCheck className="w-3 h-3 text-[#38bdf8]" />
                <span>Sales Rep Name:</span>
              </label>

              {/* Display entered raw value if different or blank */}
              {rawRepMismatched && (
                <span
                  className="text-[10px] font-mono text-amber-300 bg-amber-950/40 border border-amber-500/30 px-1.5 py-0.2 rounded truncate max-w-[130px]"
                  title={`File entered: "${rec.rawRep || 'Blank'}"`}
                >
                  File: "{rec.rawRep || 'Blank'}"
                </span>
              )}
            </div>

            <select
              value={rec.salesRep}
              onChange={(e) => handleFieldChange(rec.rowIndex, 'salesRep', e.target.value)}
              className={`w-full bg-[#122852] border rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#ecdf51] ${
                knownRepsList.includes(rec.salesRep)
                  ? 'text-[#38bdf8] border-[#3f7abb]/50'
                  : rec.salesRep === 'Unassigned'
                  ? 'text-slate-300 border-slate-500/50'
                  : 'text-amber-300 border-amber-500/60'
              }`}
            >
              <option value="Unassigned">Unassigned</option>
              {knownRepsList.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
              {!knownRepsList.includes(rec.salesRep) && rec.salesRep !== 'Unassigned' && (
                <option value={rec.salesRep}>{rec.salesRep} (Entered in File)</option>
              )}
            </select>
          </div>

          {/* Deal Stage Select */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-300 flex items-center space-x-1">
                <Layers className="w-3 h-3 text-[#ecdf51]" />
                <span>Canonical Deal Stage:</span>
              </label>

              {/* Display entered raw value if different */}
              {rawStageMismatched && (
                <span
                  className="text-[10px] font-mono text-amber-300 bg-amber-950/40 border border-amber-500/30 px-1.5 py-0.2 rounded truncate max-w-[130px]"
                  title={`File entered: "${rec.rawStage || 'Blank'}"`}
                >
                  File: "{rec.rawStage || 'Blank'}"
                </span>
              )}
            </div>

            <select
              value={rec.dealStage}
              onChange={(e) => handleFieldChange(rec.rowIndex, 'dealStage', e.target.value)}
              className="w-full bg-[#122852] border border-[#3f7abb]/50 rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#ecdf51] focus:outline-none focus:ring-1 focus:ring-[#ecdf51]"
            >
              {IMMUTABLE_CANONICAL_STAGES.map((stg) => (
                <option key={stg} value={stg}>
                  {stg}
                </option>
              ))}
            </select>
          </div>

          {/* Deal Value Input & Currency Dropdown */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1 flex items-center space-x-1">
              <DollarSign className="w-3 h-3 text-emerald-400" />
              <span>Deal Value & Currency:</span>
            </label>
            <div className="flex items-center space-x-1">
              <input
                type="number"
                value={rec.dealValue}
                onChange={(e) => handleFieldChange(rec.rowIndex, 'dealValue', Number(e.target.value))}
                className={`w-2/3 bg-[#122852] border rounded-lg px-2 py-1.5 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#ecdf51] ${
                  rec.dealValue < 0
                    ? 'text-red-300 border-red-500/60 bg-red-950/20'
                    : 'text-white border-[#3f7abb]/50'
                }`}
              />
              <select
                value={rec.currency}
                onChange={(e) => handleFieldChange(rec.rowIndex, 'currency', e.target.value)}
                className="w-1/3 bg-[#122852] border border-[#3f7abb]/50 rounded-lg px-1.5 py-1.5 text-xs font-bold text-[#ecdf51] focus:outline-none focus:ring-1 focus:ring-[#ecdf51]"
                title="Select Currency"
              >
                {AVAILABLE_CURRENCIES.map((curr) => (
                  <option key={curr} value={curr}>
                    {curr}
                  </option>
                ))}
                {!AVAILABLE_CURRENCIES.includes(rec.currency) && (
                  <option value={rec.currency}>{rec.currency}</option>
                )}
              </select>
            </div>
          </div>

          {/* Deal Status & Actions */}
          <div className="flex items-end space-x-2">
            <div className="flex-1">
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                Deal Status:
              </label>
              <select
                value={rec.dealStatus}
                onChange={(e) => handleFieldChange(rec.rowIndex, 'dealStatus', e.target.value)}
                className="w-full bg-[#122852] border border-[#3f7abb]/50 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#ecdf51]"
              >
                <option value="Open">Open</option>
                <option value="Won">Won</option>
                <option value="Lost">Lost</option>
              </select>
            </div>

            {/* Commit / Save or Ignore Button */}
            {isEdited ? (
              <div className="flex items-center space-x-1 shrink-0">
                <button
                  onClick={() => handleCommitRecordFix(rec.rowIndex)}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold rounded-lg text-xs shadow-md flex items-center space-x-1 transition-all"
                  title="Commit changes and save record"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Commit Fix</span>
                </button>

                <button
                  onClick={() => handleRevertRecord(rec.rowIndex)}
                  className="px-2 py-1.5 bg-[#0d2045] hover:bg-slate-700 text-slate-300 rounded-lg text-xs border border-[#3f7abb]/30 transition-all"
                  title="Revert draft edits"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : hasIssues && !isResolved ? (
              <div className="flex items-center space-x-1 shrink-0">
                <button
                  onClick={() => handleCommitRecordFix(rec.rowIndex)}
                  className="px-3 py-1.5 bg-[#3f7abb] hover:bg-[#3267a0] text-white font-bold rounded-lg text-xs flex items-center space-x-1 transition-all"
                  title="Mark record as reviewed & committed"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Commit</span>
                </button>

                <button
                  onClick={() => handleToggleIgnore(rec.rowIndex)}
                  className="px-2.5 py-1.5 bg-[#0d2045] hover:bg-[#1f3a6e] text-slate-300 border border-[#3f7abb]/40 rounded-lg text-xs font-medium transition-all"
                >
                  Ignore
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-1 shrink-0">
                <span className="text-[10px] text-emerald-400 font-semibold px-2 py-1 bg-emerald-950/40 border border-emerald-500/30 rounded-lg">
                  ✓ Ready
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Record Dates Validation & Editing Sub-Grid */}
        <div className="mt-3 pt-3 border-t border-[#3f7abb]/20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
          {/* Date Created */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-300 font-bold flex items-center space-x-1">
                <Calendar className="w-3 h-3 text-[#38bdf8]" />
                <span>Date Created:</span>
              </label>
              <button
                type="button"
                onClick={() => handleFieldChange(rec.rowIndex, 'dateCreated', new Date().toISOString().split('T')[0])}
                className="text-[10px] text-[#ecdf51] hover:underline font-mono"
                title="Set to today's date"
              >
                Set Today
              </button>
            </div>
            <input
              type="date"
              value={rec.dateCreated || ''}
              onChange={(e) => handleFieldChange(rec.rowIndex, 'dateCreated', e.target.value || null)}
              className="w-full bg-[#122852] border border-[#3f7abb]/40 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#ecdf51]"
            />
          </div>

          {/* Date Entered Stage */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-300 font-bold flex items-center space-x-1">
                <Calendar className="w-3 h-3 text-[#ecdf51]" />
                <span>Date Entered Stage:</span>
              </label>
              <button
                type="button"
                onClick={() => handleFieldChange(rec.rowIndex, 'dateEnteredCurrentStage', new Date().toISOString().split('T')[0])}
                className="text-[10px] text-[#ecdf51] hover:underline font-mono"
                title="Set to today's date"
              >
                Set Today
              </button>
            </div>
            <input
              type="date"
              value={rec.dateEnteredCurrentStage || ''}
              onChange={(e) => handleFieldChange(rec.rowIndex, 'dateEnteredCurrentStage', e.target.value || null)}
              className="w-full bg-[#122852] border border-[#3f7abb]/40 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#ecdf51]"
            />
          </div>

          {/* Expected Close Date */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-300 font-bold flex items-center space-x-1">
                <Calendar className="w-3 h-3 text-emerald-400" />
                <span>Expected Close Date:</span>
              </label>
              <button
                type="button"
                onClick={() => handleFieldChange(rec.rowIndex, 'expectedCloseDate', new Date().toISOString().split('T')[0])}
                className="text-[10px] text-[#ecdf51] hover:underline font-mono"
                title="Set to today's date"
              >
                Set Today
              </button>
            </div>
            <input
              type="date"
              value={rec.expectedCloseDate || ''}
              onChange={(e) => handleFieldChange(rec.rowIndex, 'expectedCloseDate', e.target.value || null)}
              className="w-full bg-[#122852] border border-[#3f7abb]/40 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#ecdf51]"
            />
          </div>

          {/* Last Activity Date */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-300 font-bold flex items-center space-x-1">
                <Calendar className="w-3 h-3 text-indigo-300" />
                <span>Last Activity Date:</span>
              </label>
              <button
                type="button"
                onClick={() => handleFieldChange(rec.rowIndex, 'lastActivityDate', new Date().toISOString().split('T')[0])}
                className="text-[10px] text-[#ecdf51] hover:underline font-mono"
                title="Set to today's date"
              >
                Set Today
              </button>
            </div>
            <input
              type="date"
              value={rec.lastActivityDate || ''}
              onChange={(e) => handleFieldChange(rec.rowIndex, 'lastActivityDate', e.target.value || null)}
              className="w-full bg-[#122852] border border-[#3f7abb]/40 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#ecdf51]"
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#122852] border border-[#3f7abb]/40 rounded-2xl w-full max-w-6xl shadow-2xl flex flex-col max-h-[90vh] my-auto overflow-hidden">
        
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 bg-[#0d2045] border-b border-[#3f7abb]/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[#122852] rounded-xl text-[#ecdf51] border border-[#3f7abb]/40 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white">Pre-Import File Validation & Data Cleaning</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#3f7abb]/40 text-slate-200 border border-[#3f7abb]/50">
                  {fileName}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Target sales reps & canonical stages validation. Entered values are displayed with pre-selected best-guess recommendations.
              </p>
            </div>
          </div>

          {/* Validation Stats Bar */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <div className="px-3 py-1.5 bg-[#122852] border border-[#3f7abb]/30 rounded-lg text-slate-300">
              <span className="text-slate-400">Total Import Rows:</span>{' '}
              <span className="font-bold text-white font-mono">{totalRows}</span>
            </div>

            <div className="px-3 py-1.5 bg-[#122852] border border-amber-500/40 rounded-lg text-amber-300">
              <span>Validation Needed:</span>{' '}
              <span className="font-bold font-mono text-[#ecdf51]">{flaggedCount}</span>
            </div>

            <div className="px-3 py-1.5 bg-[#122852] border border-emerald-500/40 rounded-lg text-emerald-300">
              <span>Clean / Committed:</span>{' '}
              <span className="font-bold font-mono text-emerald-300">{cleanCount + resolvedCount}</span>
            </div>

            {pendingEditsCount > 0 && (
              <div className="px-3 py-1.5 bg-amber-500/20 border border-amber-400 rounded-lg text-amber-300 animate-pulse">
                <span>Uncommitted Drafts:</span>{' '}
                <span className="font-bold font-mono">{pendingEditsCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Filter Pills & Controls */}
        <div className="px-4 py-3 bg-[#091630] border-b border-[#3f7abb]/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            {[
              { id: 'ALL', label: `All Import Records (${totalRows})`, color: 'text-white' },
              { id: 'FLAGGED', label: `Flagged (${flaggedCount})`, color: 'text-amber-300' },
              { id: 'VALID', label: `Valid & Committed (${cleanCount + resolvedCount})`, color: 'text-emerald-300' },
              { id: 'UNMATCHED_STAGE', label: 'Unmatched Stage', color: 'text-[#ecdf51]' },
              { id: 'UNMATCHED_SALES_REP', label: 'Unmatched Rep', color: 'text-[#38bdf8]' },
              { id: 'BLANK_SALES_REP', label: 'Blank Rep', color: 'text-slate-300' },
              { id: 'MISSING_DEAL_VALUE', label: 'Missing Value', color: 'text-amber-300' },
              { id: 'MISSING_CURRENCY', label: 'Missing Currency', color: 'text-[#38bdf8]' },
              { id: 'INVALID_DATE_FORMAT', label: 'Invalid Date', color: 'text-rose-300' },
              { id: 'NEGATIVE_VALUE', label: 'Negative Val', color: 'text-red-300' },
              { id: 'MISSING_WON_VALUE', label: 'Missing Won Val', color: 'text-amber-300' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all text-xs ${
                  activeFilter === tab.id
                    ? 'bg-[#3f7abb] text-white shadow'
                    : 'bg-[#0d2045] text-slate-300 hover:text-white border border-[#3f7abb]/30'
                }`}
              >
                <span className={tab.color}>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-52">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search deals or clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-[#0d2045] border border-[#3f7abb]/40 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#ecdf51]"
              />
            </div>

            <div className="flex items-center space-x-1.5 shrink-0">
              {pendingEditsCount > 0 && (
                <button
                  onClick={handleCommitAllDrafts}
                  className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold rounded-lg text-xs flex items-center space-x-1 shadow-md transition-all"
                  title="Commit all draft changes made to records"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Commit Drafts ({pendingEditsCount})</span>
                </button>
              )}

              {flaggedCount > 0 && (
                <>
                  <button
                    onClick={handleAutoFixStages}
                    className="px-2.5 py-1.5 bg-[#0d2045] hover:bg-[#3f7abb]/40 border border-[#3f7abb]/50 text-[#ecdf51] font-semibold rounded-lg text-xs flex items-center space-x-1 transition-all"
                    title="Automatically map stage typos to best guess canonical stages"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Auto-Fix Stages</span>
                  </button>

                  <button
                    onClick={handleAutoFixReps}
                    className="px-2.5 py-1.5 bg-[#0d2045] hover:bg-[#3f7abb]/40 border border-[#3f7abb]/50 text-[#38bdf8] font-semibold rounded-lg text-xs flex items-center space-x-1 transition-all"
                    title="Automatically map unmatched rep names to target list reps"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Auto-Fix Reps</span>
                  </button>

                  <button
                    onClick={handleAutoFixDates}
                    className="px-2.5 py-1.5 bg-[#0d2045] hover:bg-[#3f7abb]/40 border border-[#3f7abb]/50 text-rose-300 font-semibold rounded-lg text-xs flex items-center space-x-1 transition-all"
                    title="Automatically fix invalid dates to today or parsed format"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Auto-Fix Dates</span>
                  </button>

                  <button
                    onClick={handleIgnoreAllRemaining}
                    className="px-2.5 py-1.5 bg-[#0d2045] hover:bg-[#3f7abb]/40 border border-[#3f7abb]/50 text-slate-300 font-semibold rounded-lg text-xs transition-all"
                    title="Ignore remaining warnings and proceed with defaults"
                  >
                    Ignore Remaining
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Validation Queue & Import Records Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-[#0d2045]/40">
          {filteredRecords.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto opacity-80" />
              <p className="text-sm font-bold text-white">No records match the active filter</p>
              <p className="text-xs text-slate-400">
                {flaggedCount === 0
                  ? 'All records in this dataset pass validation checks or have been resolved!'
                  : 'Try switching filters to view other rows.'}
              </p>
            </div>
          ) : (
            <>
              {/* SECTION 1: FLAGGED / VALIDATION NEEDED RECORDS (SORTED AT TOP) */}
              {(activeFilter === 'ALL' || activeFilter === 'FLAGGED' || activeFilter !== 'VALID') &&
                flaggedRecordsList.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 px-3.5 py-2 rounded-xl text-xs font-bold text-amber-300">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-[#ecdf51]" />
                        <span>Validation Required ({flaggedRecordsList.length} Flagged Deals)</span>
                      </div>
                      <span className="text-[11px] text-amber-200/80 font-normal hidden sm:inline">
                        Entered file values shown. Select from dropdown or edit directly, then click <strong>Commit Fix</strong>.
                      </span>
                    </div>

                    <div className="space-y-3">
                      {flaggedRecordsList.map((rec) => renderRecordCard(rec, true))}
                    </div>
                  </div>
                )}

              {/* SECTION 2: VALID & COMMITTED IMPORT RECORDS (BELOW) */}
              {(activeFilter === 'ALL' || activeFilter === 'VALID') && validRecordsList.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-300">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Valid & Clean Import Records ({validRecordsList.length} Deals)</span>
                    </div>
                    <span className="text-[11px] text-slate-300 font-normal hidden sm:inline">
                      Reference dataset or edit any value before finalizing import.
                    </span>
                  </div>

                  <div className="space-y-3">
                    {validRecordsList.map((rec) => renderRecordCard(rec, false))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="p-4 bg-[#0d2045] border-t border-[#3f7abb]/30 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={onCancelImport}
            className="w-full sm:w-auto px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all"
          >
            <XCircle className="w-4 h-4" />
            <span>Cancel Run</span>
          </button>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <span className="text-xs text-slate-300 hidden md:inline">
              {flaggedCount > 0 ? (
                <span className="text-amber-300 font-semibold">
                  ⚠️ {flaggedCount} uncommitted flags remaining (will auto-default on import).
                </span>
              ) : (
                <span className="text-emerald-300 font-semibold">
                  ✓ All records validated & clean. Ready for import!
                </span>
              )}
            </span>

            <button
              onClick={handleFinalApprove}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#3f7abb] hover:bg-[#3267a0] border border-[#ecdf51]/40 text-white font-extrabold rounded-xl text-xs shadow-lg flex items-center justify-center space-x-2 transition-all focus:outline-none focus:ring-2 focus:ring-[#ecdf51]"
            >
              <CheckCircle2 className="w-4.5 h-4.5 text-[#ecdf51]" />
              <span>Approve & Import Clean Data ({records.length} Deals)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
