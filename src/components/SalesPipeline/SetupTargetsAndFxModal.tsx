import React, { useState } from 'react';
import { SalesRepTarget, FxConfig } from '../../types';
import { DEFAULT_REP_TARGETS, DEFAULT_FX_CONFIG } from '../../utils/analytics';
import { DEFAULT_STAGE_NORMALIZATION } from '../../utils/csvParser';
import {
  DollarSign,
  UserCheck,
  RefreshCw,
  Plus,
  Trash2,
  Info,
  CheckCircle2,
  Sliders,
  RotateCcw,
  Globe,
  TrendingUp,
  Layers,
} from 'lucide-react';

interface SetupTargetsAndFxModalProps {
  targets: SalesRepTarget[];
  fxConfig: FxConfig;
  stageMappings?: Record<string, string>;
  onSaveTargets: (targets: SalesRepTarget[]) => void;
  onSaveFxConfig: (fxConfig: FxConfig) => void;
  onSaveStageMappings?: (mappings: Record<string, string>) => void;
  onClose?: () => void;
}

export const SetupTargetsAndFxModal: React.FC<SetupTargetsAndFxModalProps> = ({
  targets,
  fxConfig,
  stageMappings = DEFAULT_STAGE_NORMALIZATION,
  onSaveTargets,
  onSaveFxConfig,
  onSaveStageMappings,
  onClose,
}) => {
  const [localTargets, setLocalTargets] = useState<SalesRepTarget[]>(
    targets && targets.length > 0 ? targets : DEFAULT_REP_TARGETS
  );

  const [localFxConfig, setLocalFxConfig] = useState<FxConfig>(
    fxConfig && fxConfig.rates ? fxConfig : DEFAULT_FX_CONFIG
  );

  const [localStageMappings, setLocalStageMappings] = useState<Record<string, string>>(
    stageMappings || DEFAULT_STAGE_NORMALIZATION
  );

  const [isFetchingFx, setIsFetchingFx] = useState(false);
  const [fxFetchMessage, setFxFetchMessage] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'targets' | 'fx' | 'stages'>('targets');

  // Stage mapping new entry
  const [newStageVariant, setNewStageVariant] = useState('');
  const [newCanonicalStage, setNewCanonicalStage] = useState('Proposal Sent');

  const canonicalStagesList = ['Discovery', 'Qualified', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost'];


  // New Rep state
  const [newRepName, setNewRepName] = useState('');
  const [newRepTarget, setNewRepTarget] = useState<number>(50000);
  const [newRepCurrency, setNewRepCurrency] = useState('AUD');

  // New FX Currency state
  const [newFxCurrency, setNewFxCurrency] = useState('');
  const [newFxRate, setNewFxRate] = useState<number>(1.0);

  const currenciesList = ['AUD', 'NZD', 'USD', 'EUR', 'GBP', 'CAD', 'SGD', 'JPY'];

  // Handle Target Changes
  const handleTargetValueChange = (index: number, val: number) => {
    const updated = [...localTargets];
    updated[index] = { ...updated[index], monthlyTarget: val };
    setLocalTargets(updated);
    onSaveTargets(updated);
  };

  const handleTargetCurrencyChange = (index: number, curr: string) => {
    const updated = [...localTargets];
    updated[index] = { ...updated[index], targetCurrency: curr };
    setLocalTargets(updated);
    onSaveTargets(updated);
  };

  const handleRemoveRep = (index: number) => {
    const updated = localTargets.filter((_, i) => i !== index);
    setLocalTargets(updated);
    onSaveTargets(updated);
  };

  const handleAddRep = () => {
    if (!newRepName.trim()) return;
    const updated = [
      ...localTargets,
      {
        repName: newRepName.trim(),
        monthlyTarget: Number(newRepTarget) || 50000,
        targetCurrency: newRepCurrency,
      },
    ];
    setLocalTargets(updated);
    onSaveTargets(updated);
    setNewRepName('');
    setNewRepTarget(50000);
  };

  const handleResetDefaultTargets = () => {
    setLocalTargets(DEFAULT_REP_TARGETS);
    onSaveTargets(DEFAULT_REP_TARGETS);
  };

  // Handle FX Rate Changes
  const handleBaseCurrencyChange = (newBase: string) => {
    const updated: FxConfig = {
      ...localFxConfig,
      baseCurrency: newBase,
      rates: {
        ...localFxConfig.rates,
        [newBase]: 1.0,
      },
      lastUpdated: new Date().toISOString().split('T')[0],
    };
    setLocalFxConfig(updated);
    onSaveFxConfig(updated);
  };

  const handleRateValueChange = (currCode: string, rateVal: number) => {
    const updated: FxConfig = {
      ...localFxConfig,
      rates: {
        ...localFxConfig.rates,
        [currCode]: rateVal,
      },
      lastUpdated: new Date().toISOString().split('T')[0],
    };
    setLocalFxConfig(updated);
    onSaveFxConfig(updated);
  };

  const handleRemoveFxCurrency = (currCode: string) => {
    if (currCode === localFxConfig.baseCurrency) return; // Cannot remove base
    const copyRates = { ...localFxConfig.rates };
    delete copyRates[currCode];
    const updated: FxConfig = {
      ...localFxConfig,
      rates: copyRates,
    };
    setLocalFxConfig(updated);
    onSaveFxConfig(updated);
  };

  const handleAddFxCurrency = () => {
    if (!newFxCurrency.trim()) return;
    const code = newFxCurrency.trim().toUpperCase();
    const updated: FxConfig = {
      ...localFxConfig,
      rates: {
        ...localFxConfig.rates,
        [code]: Number(newFxRate) || 1.0,
      },
    };
    setLocalFxConfig(updated);
    onSaveFxConfig(updated);
    setNewFxCurrency('');
    setNewFxRate(1.0);
  };

  const handleResetFxRates = () => {
    setLocalFxConfig(DEFAULT_FX_CONFIG);
    onSaveFxConfig(DEFAULT_FX_CONFIG);
  };

  // Fetch Live Rates from API
  const handleFetchLiveRates = async () => {
    setIsFetchingFx(true);
    setFxFetchMessage(null);
    try {
      const base = localFxConfig.baseCurrency || 'AUD';
      const response = await fetch(`https://open.er-api.com/v6/latest/${base}`);
      if (!response.ok) {
        throw new Error(`FX API HTTP ${response.status}`);
      }
      const data = await response.json();
      if (data && data.rates) {
        const liveRates = data.rates;
        const newRates: Record<string, number> = { ...localFxConfig.rates };

        // For open.er-api.com, rates are relative to base: 1 Base = X Foreign
        // So 1 Foreign = (1 / liveRates[Code]) Units of Base
        Object.keys(newRates).forEach((code) => {
          if (code === base) {
            newRates[code] = 1.0;
          } else if (liveRates[code]) {
            // Convert to rateToBase (how much Base 1 unit of foreign is worth)
            const rate = 1 / liveRates[code];
            newRates[code] = Number(rate.toFixed(4));
          }
        });

        const updatedFx: FxConfig = {
          baseCurrency: base,
          rates: newRates,
          lastUpdated: new Date().toISOString().split('T')[0],
        };
        setLocalFxConfig(updatedFx);
        onSaveFxConfig(updatedFx);
        setFxFetchMessage(`Successfully updated FX rates live from Open Exchange Rates for base ${base}!`);
      } else {
        throw new Error('Invalid rate format returned');
      }
    } catch (err) {
      console.error('Error fetching FX rates:', err);
      // Fallback approximation
      setFxFetchMessage('Could not reach live market feed. Rates maintained from current configuration.');
    } finally {
      setIsFetchingFx(false);
    }
  };

  return (
    <div className="bg-[#122852] border border-[#3f7abb]/40 rounded-2xl p-6 shadow-2xl space-y-6 text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#3f7abb]/30">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-[#0d2045] rounded-xl text-[#ecdf51] border border-[#3f7abb]/40">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2">
              <span>Sales Targets & Foreign Exchange (FX) Setup</span>
            </h2>
            <p className="text-xs text-slate-300">
              Configure sales rep quota targets, target currencies, and company exchange conversion rates
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-[#0d2045] hover:bg-[#3f7abb]/30 text-xs font-semibold rounded-lg border border-[#3f7abb]/30 text-slate-200"
          >
            Done
          </button>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-[#0d2045] p-1.5 rounded-xl border border-[#3f7abb]/30 text-xs font-semibold">
        <button
          onClick={() => setActiveSubTab('targets')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
            activeSubTab === 'targets'
              ? 'bg-[#3f7abb] text-white shadow'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <UserCheck className="w-4 h-4 text-[#ecdf51]" />
          <span>Sales Rep Targets ({localTargets.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('fx')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
            activeSubTab === 'fx'
              ? 'bg-[#3f7abb] text-white shadow'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <Globe className="w-4 h-4 text-[#ecdf51]" />
          <span>FX Exchange Rates</span>
        </button>

        <button
          onClick={() => setActiveSubTab('stages')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
            activeSubTab === 'stages'
              ? 'bg-[#3f7abb] text-white shadow'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4 text-[#ecdf51]" />
          <span>Stage Canonical Mappings ({Object.keys(localStageMappings).length})</span>
        </button>
      </div>


      {/* SECTION 1: SALES REP TARGETS */}
      {activeSubTab === 'targets' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0d2045]/60 p-4 rounded-xl border border-[#3f7abb]/30">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-[#ecdf51]" />
                <span>Monthly Quota Targets by Sales Rep</span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Set individual monthly deal target goals and rep operational currency
              </p>
            </div>

            <button
              onClick={handleResetDefaultTargets}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#0d2045] hover:bg-[#3f7abb]/30 border border-[#3f7abb]/40 rounded-lg text-xs font-medium text-slate-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#ecdf51]" />
              <span>Reset Defaults</span>
            </button>
          </div>

          {/* Table of Reps */}
          <div className="overflow-x-auto rounded-xl border border-[#3f7abb]/30 bg-[#0d2045]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#091630] text-slate-300 uppercase tracking-wider font-semibold border-b border-[#3f7abb]/30">
                <tr>
                  <th className="p-3">Sales Rep</th>
                  <th className="p-3">Monthly Target</th>
                  <th className="p-3">Target Currency</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3f7abb]/20 text-slate-200">
                {localTargets.map((t, idx) => (
                  <tr key={t.repName + idx} className="hover:bg-[#122852]/50 transition-colors">
                    <td className="p-3 font-bold text-white flex items-center space-x-2">
                      <UserCheck className="w-4 h-4 text-[#3f7abb]" />
                      <span>{t.repName}</span>
                    </td>
                    <td className="p-3">
                      <div className="relative w-36">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                          $
                        </span>
                        <input
                          type="number"
                          value={t.monthlyTarget}
                          onChange={(e) => handleTargetValueChange(idx, Number(e.target.value))}
                          className="w-full pl-7 pr-3 py-1.5 bg-[#122852] border border-[#3f7abb]/50 rounded-lg font-mono text-white text-xs focus:outline-none focus:ring-1 focus:ring-[#ecdf51]"
                        />
                      </div>
                    </td>
                    <td className="p-3">
                      <select
                        value={t.targetCurrency}
                        onChange={(e) => handleTargetCurrencyChange(idx, e.target.value)}
                        className="bg-[#122852] border border-[#3f7abb]/50 rounded-lg px-3 py-1.5 font-bold text-[#ecdf51] text-xs focus:outline-none focus:ring-1 focus:ring-[#3f7abb]"
                      >
                        {currenciesList.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleRemoveRep(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Remove Rep Target"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add New Rep Bar */}
          <div className="bg-[#0d2045] p-3 rounded-xl border border-[#3f7abb]/30 space-y-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              + Add Sales Rep Target:
            </span>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="text"
                placeholder="Sales Rep Name (e.g. Alex Morgan)"
                value={newRepName}
                onChange={(e) => setNewRepName(e.target.value)}
                className="flex-1 bg-[#122852] border border-[#3f7abb]/40 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#3f7abb]"
              />
              <div className="relative w-full sm:w-36">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                  $
                </span>
                <input
                  type="number"
                  placeholder="Target Amount"
                  value={newRepTarget}
                  onChange={(e) => setNewRepTarget(Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-2 bg-[#122852] border border-[#3f7abb]/40 rounded-lg font-mono text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#3f7abb]"
                />
              </div>
              <select
                value={newRepCurrency}
                onChange={(e) => setNewRepCurrency(e.target.value)}
                className="bg-[#122852] border border-[#3f7abb]/40 rounded-lg px-3 py-2 text-xs font-bold text-[#ecdf51]"
              >
                {currenciesList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddRep}
                disabled={!newRepName.trim()}
                className="w-full sm:w-auto px-4 py-2 bg-[#3f7abb] hover:bg-[#3f7abb]/80 disabled:opacity-50 text-white font-semibold rounded-lg text-xs flex items-center justify-center space-x-1 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add Rep</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: FX EXCHANGE RATES */}
      {activeSubTab === 'fx' && (
        <div className="space-y-5">
          {/* Base Currency & Live Fetch Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0d2045]/80 p-4 rounded-xl border border-[#3f7abb]/30">
            <div className="flex items-center space-x-3">
              <Globe className="w-5 h-5 text-[#ecdf51]" />
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Company Base Reporting Currency:
                </label>
                <select
                  value={localFxConfig.baseCurrency}
                  onChange={(e) => handleBaseCurrencyChange(e.target.value)}
                  className="mt-1 bg-[#122852] border border-[#3f7abb]/50 rounded-lg px-3 py-1.5 font-bold text-white text-xs focus:outline-none focus:ring-1 focus:ring-[#ecdf51]"
                >
                  {currenciesList.map((c) => (
                    <option key={c} value={c}>
                      {c} (Base Currency)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleResetFxRates}
                className="px-3 py-2 bg-[#122852] hover:bg-[#3f7abb]/30 border border-[#3f7abb]/40 rounded-lg text-xs font-medium text-slate-200 transition-colors flex items-center space-x-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-300" />
                <span>Reset FX Defaults</span>
              </button>

              <button
                onClick={handleFetchLiveRates}
                disabled={isFetchingFx}
                className="px-4 py-2 bg-[#3f7abb] hover:bg-[#3f7abb]/80 text-white font-bold rounded-lg text-xs flex items-center space-x-2 shadow transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isFetchingFx ? 'animate-spin text-[#ecdf51]' : ''}`} />
                <span>{isFetchingFx ? 'Fetching Spot Rates...' : 'Populate Live Rates'}</span>
              </button>
            </div>
          </div>

          {fxFetchMessage && (
            <div className="p-3 bg-[#3f7abb]/20 border border-[#3f7abb]/40 rounded-xl text-xs text-[#ecdf51] flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{fxFetchMessage}</span>
            </div>
          )}

          {/* FX Rates Table */}
          <div className="overflow-x-auto rounded-xl border border-[#3f7abb]/30 bg-[#0d2045]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#091630] text-slate-300 uppercase tracking-wider font-semibold border-b border-[#3f7abb]/30">
                <tr>
                  <th className="p-3">Currency</th>
                  <th className="p-3">Exchange Rate (To 1 {localFxConfig.baseCurrency})</th>
                  <th className="p-3">Conversion Formula</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3f7abb]/20 text-slate-200">
                {Object.entries(localFxConfig.rates).map(([currCode, rate]) => {
                  const isBase = currCode === localFxConfig.baseCurrency;
                  return (
                    <tr key={currCode} className="hover:bg-[#122852]/50 transition-colors">
                      <td className="p-3 font-bold text-white flex items-center space-x-2">
                        <DollarSign className="w-4 h-4 text-[#ecdf51]" />
                        <span>{currCode}</span>
                        {isBase && (
                          <span className="px-2 py-0.5 bg-[#3f7abb]/30 border border-[#3f7abb]/50 text-[10px] font-extrabold text-[#ecdf51] rounded-full">
                            BASE
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          step="0.0001"
                          disabled={isBase}
                          value={rate}
                          onChange={(e) => handleRateValueChange(currCode, Number(e.target.value))}
                          className="w-32 px-3 py-1.5 bg-[#122852] border border-[#3f7abb]/50 rounded-lg font-mono text-white text-xs focus:outline-none focus:ring-1 focus:ring-[#ecdf51] disabled:opacity-50"
                        />
                      </td>
                      <td className="p-3 font-mono text-slate-300 text-[11px]">
                        1 {currCode} = {rate} {localFxConfig.baseCurrency}
                      </td>
                      <td className="p-3 text-right">
                        {!isBase && (
                          <button
                            onClick={() => handleRemoveFxCurrency(currCode)}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Remove Currency"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Add Custom Currency Row */}
          <div className="bg-[#0d2045] p-3 rounded-xl border border-[#3f7abb]/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="font-bold text-slate-300 uppercase tracking-wider">+ Add Currency Rate:</span>
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Code (e.g. CAD)"
                value={newFxCurrency}
                onChange={(e) => setNewFxCurrency(e.target.value.toUpperCase())}
                className="w-28 bg-[#122852] border border-[#3f7abb]/40 rounded-lg px-3 py-1.5 text-white uppercase placeholder-slate-400 font-mono"
              />
              <input
                type="number"
                step="0.0001"
                placeholder="Rate to Base"
                value={newFxRate}
                onChange={(e) => setNewFxRate(Number(e.target.value))}
                className="w-32 bg-[#122852] border border-[#3f7abb]/40 rounded-lg px-3 py-1.5 text-white font-mono"
              />
              <button
                onClick={handleAddFxCurrency}
                disabled={!newFxCurrency.trim()}
                className="px-3 py-1.5 bg-[#3f7abb] hover:bg-[#3f7abb]/80 text-white font-semibold rounded-lg text-xs flex items-center space-x-1 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Wording Box: FX Business Logic Policy */}
          <div className="bg-[#091630] p-4 rounded-xl border border-[#3f7abb]/30 space-y-2 text-xs text-slate-300">
            <div className="flex items-center space-x-2 font-bold text-[#ecdf51] uppercase tracking-wider">
              <Info className="w-4 h-4" />
              <span>FX Conversion Business Logic & Policy Guidelines</span>
            </div>
            <p className="leading-relaxed">
              <strong>1. Local Operational Targets:</strong> Each sales rep has a quota set in their local regional currency (e.g., AUD or NZD). This ensures rep performance metrics align with local customer contract pricing.
            </p>
            <p className="leading-relaxed">
              <strong>2. Executive Reporting Normalization:</strong> In multi-currency sales analysis, deal revenues and quota progress are dynamically converted into the <strong>Company Base Currency ({localFxConfig.baseCurrency})</strong> using the exchange rates specified above.
            </p>
            <p className="leading-relaxed">
              <strong>3. Fixed Budget vs. Live Market Rates:</strong> In enterprise CRM architecture, quota targets are evaluated using <em>fixed monthly budget FX rates</em> locked at financial planning, insulating rep attainment from daily forex volatility. The "Populate Live Rates" tool allows real-time scenario testing against current spot markets.
            </p>
          </div>
        </div>
      )}

      {/* SECTION 3: STAGE CANONICAL MAPPINGS */}
      {activeSubTab === 'stages' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0d2045]/60 p-4 rounded-xl border border-[#3f7abb]/30">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Layers className="w-4 h-4 text-[#ecdf51]" />
                <span>Canonical Pipeline Stage Aliases & Typo Mapping</span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Map raw CRM export stage strings and typos (e.g., "proposol sent") to canonical funnel stages
              </p>
            </div>

            <button
              onClick={() => {
                setLocalStageMappings(DEFAULT_STAGE_NORMALIZATION);
                if (onSaveStageMappings) onSaveStageMappings(DEFAULT_STAGE_NORMALIZATION);
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#0d2045] hover:bg-[#3f7abb]/30 border border-[#3f7abb]/40 rounded-lg text-xs font-medium text-slate-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#ecdf51]" />
              <span>Reset Stage Defaults</span>
            </button>
          </div>

          {/* Mappings Table */}
          <div className="overflow-x-auto rounded-xl border border-[#3f7abb]/30 bg-[#0d2045]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#091630] text-slate-300 uppercase tracking-wider font-semibold border-b border-[#3f7abb]/30">
                <tr>
                  <th className="p-3">Raw CRM Stage / Typo Variant</th>
                  <th className="p-3">Canonical Stage Assigned</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3f7abb]/20 text-slate-200">
                {Object.entries(localStageMappings).map(([rawVariant, canonicalStage]) => (
                  <tr key={rawVariant} className="hover:bg-[#122852]/50 transition-colors">
                    <td className="p-3 font-mono font-semibold text-[#38bdf8]">
                      "{rawVariant}"
                    </td>
                    <td className="p-3">
                      <select
                        value={canonicalStage}
                        onChange={(e) => {
                          const updated = { ...localStageMappings, [rawVariant]: e.target.value };
                          setLocalStageMappings(updated);
                          if (onSaveStageMappings) onSaveStageMappings(updated);
                        }}
                        className="bg-[#122852] border border-[#3f7abb]/50 rounded-lg px-3 py-1.5 font-bold text-[#ecdf51] text-xs focus:outline-none focus:ring-1 focus:ring-[#ecdf51]"
                      >
                        {canonicalStagesList.map((stg) => (
                          <option key={stg} value={stg}>
                            {stg}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          const copy = { ...localStageMappings };
                          delete copy[rawVariant];
                          setLocalStageMappings(copy);
                          if (onSaveStageMappings) onSaveStageMappings(copy);
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Remove Mapping"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add New Variant */}
          <div className="bg-[#0d2045] p-3 rounded-xl border border-[#3f7abb]/30 space-y-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              + Add Raw CRM Stage Alias / Typo Mapping:
            </span>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="text"
                placeholder="Raw Stage Variant (e.g. proposol sent)"
                value={newStageVariant}
                onChange={(e) => setNewStageVariant(e.target.value)}
                className="flex-1 bg-[#122852] border border-[#3f7abb]/40 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#3f7abb]"
              />
              <select
                value={newCanonicalStage}
                onChange={(e) => setNewCanonicalStage(e.target.value)}
                className="bg-[#122852] border border-[#3f7abb]/40 rounded-lg px-3 py-2 text-xs font-bold text-[#ecdf51]"
              >
                {canonicalStagesList.map((stg) => (
                  <option key={stg} value={stg}>
                    Maps to: {stg}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  if (!newStageVariant.trim()) return;
                  const key = newStageVariant.trim().toLowerCase();
                  const updated = { ...localStageMappings, [key]: newCanonicalStage };
                  setLocalStageMappings(updated);
                  if (onSaveStageMappings) onSaveStageMappings(updated);
                  setNewStageVariant('');
                }}
                disabled={!newStageVariant.trim()}
                className="w-full sm:w-auto px-4 py-2 bg-[#3f7abb] hover:bg-[#3f7abb]/80 disabled:opacity-50 text-white font-semibold rounded-lg text-xs flex items-center justify-center space-x-1 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add Alias</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
