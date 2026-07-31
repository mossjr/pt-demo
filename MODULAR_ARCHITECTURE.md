# 🧩 Modular Architecture & AI Builder Expansion Guide

This document defines the architectural guidelines and design patterns for adding new modules to the **Sales Pipeline & Rep Performance System**. Follow these guidelines when building new features to ensure zero breaking changes to existing pipeline analytics, validation engines, or multi-currency calculations.

---

## 🏛️ Core Architectural Principles

1. **Strict Module Encapsulation**: Each major functional domain lives in its own dedicated directory under `/src/components/<ModuleName>/`.
2. **Shared Data Contracts**: Global types, interfaces, and canonical models are defined in `/src/types.ts`. Never declare conflicting inline types in module components.
3. **Pure Utility Functions**: Business logic (e.g., currency conversion, analytics aggregation, date parsing) must remain pure functions in `/src/utils/`.
4. **Unidirectional Data Flow**: Modules receive normalized datasets (`deals: Deal[]`, `targets: RepTarget[]`, `fxConfig: FxConfig`, `currency: CurrencyCode`) as props and trigger state changes via explicit callbacks.

---

## 📂 Project Directory Structure

```
/src
├── components/
│   ├── SalesPipeline/
│   │   ├── SalesPipelineModule.tsx      # Main pipeline container & tab controller
│   │   ├── RepPerformanceWidget.tsx     # Quota tracking matrix & rep metrics
│   │   ├── PreImportValidationModal.tsx # Pre-import dataset validation & auto-fix engine
│   │   ├── FXSettingsModal.tsx          # Multi-currency exchange rate manager
│   │   └── ...
│   └── [NewModule]/                     # Placeholder for new modular features
│       ├── NewModuleMain.tsx
│       └── components/
├── utils/
│   ├── analytics.ts                     # Pipeline & quota aggregation math
│   ├── currency.ts                      # Multi-currency FX conversion logic
│   └── csvParser.ts                     # Flexible date & CSV parsing utilities
├── types.ts                             # Single source of truth for interfaces & enums
└── App.tsx                              # Main application layout & top-level state
```

---

## 🔌 How to Add a New Module (Step-by-Step for AI Builders)

### Step 1: Define Interface Contracts in `/src/types.ts`
When introducing new data structures (e.g., Lead Scoring, Commission Calculation, Territory Mapping):
- Add clear TypeScript interfaces to `/src/types.ts`.
- Re-use existing `Deal`, `RepTarget`, `FxConfig`, and `ValidationIssueItem` types whenever referencing pipeline data.

### Step 2: Create Module Directory in `/src/components/<ModuleName>/`
- Create a main module container component (e.g., `<NewModuleName>Module.tsx`).
- Define explicit component props accepts standardized state:

```typescript
interface NewModuleProps {
  deals: Deal[];
  targets: RepTarget[];
  fxConfig: FxConfig;
  currency: CurrencyCode;
  onUpdateDeals?: (deals: Deal[]) => void;
}
```

### Step 3: Implement Pure Analytics Logic in `/src/utils/`
- Keep calculation math out of React render cycles. Create helper functions inside `/src/utils/<feature>.ts` or extend `/src/utils/analytics.ts`.
- Always convert raw deal values using `convertCurrency(amount, fromCurrency, targetCurrency, fxRates)`.

### Step 4: Register Tab/Navigation in Container
- If adding a new view tab to `SalesPipelineModule.tsx`:
  1. Add new tab ID to module activeTab state.
  2. Add navigation tab button in top tab bar.
  3. Render `<NewModuleMain />` conditionally under `{activeTab === 'new-tab' && (...) }`.

---

## ⚠️ Critical Rules for AI Builders

- ❌ **DO NOT** modify existing `Deal` or `CanonicalStage` definitions without backwards compatibility.
- ❌ **DO NOT** inline hardcoded currency exchange rates; always utilize `convertCurrency` from `/src/utils/currency.ts`.
- ❌ **DO NOT** remove or mutate date parsing logic in `parseFlexibleDate`.
- ✅ **ALWAYS** run `npm run lint` and `compile_applet` after creating or updating modules.
