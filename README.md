# Sales Pipeline & Rep Performance Intelligence System

A full-stack sales analytics and pipeline forecasting platform built with **React**, **TypeScript**, **Tailwind CSS**, and **Express**. The system provides real-time multi-currency revenue conversion, pre-import CSV dataset validation with automated date & currency correction, and month-by-month sales rep quota tracking matrixes.

---

## 🌟 Key Features

### 1. 📊 Sales Pipeline & Revenue Analytics
- **Pipeline Stage Analysis**: Interactive breakdown across canonical stages (Qualified, Demo/Meeting, Proposal Sent, Negotiation, Closed Won, Closed Lost).
- **Weighted & Actual Pipeline Value**: Automatic calculations comparing gross pipeline vs. probability-weighted deal values.
- **Conversion Rate & Velocity Tracking**: Real-time win rate percentages, average cycle length, and pipeline velocity metrics.

### 2. 💱 Multi-Currency FX Conversion Engine
- **Supported Currencies**: AUD, NZD, USD, EUR, GBP, CAD, SGD, and JPY.
- **Dynamic FX Rates**: Live FX rate fetching with user-customizable override exchange rates.
- **Normalized Reporting**: Instantly convert all deal values and rep quotas into any active target currency on the fly.

### 3. 🎯 Sales Rep Quota & Performance Matrix
- **Month-by-Month Tracking Grid**: Displays closed won deals alongside monthly targets across all dataset months.
- **Multi-Month Quota Annualization**: Targets automatically scale according to the exact number of active months detected in the dataset.
- **Rep Performance Table & Charts**: Detailed breakdown of target attainment percentages, deal counts, won amounts, and average deal sizes.

### 4. 🛡️ Pre-Import CSV Validation Engine
- **Field & Formatting Checks**:
  - **Deal Values**: Flags missing or $0 deal values.
  - **Currencies**: Identifies missing currency fields and applies configurable fallbacks (default NZD).
  - **Dates (`m/d/yy`)**: Validates `Date Created`, `Date Entered Stage`, `Expected Close Date`, and `Last Activity Date`.
  - **Sales Reps & Stages**: Validates reps and canonical deal stages.
- **In-Line Cell Editing & Auto-Fixing**:
  - **Auto-Fix Dates**: Instantly normalizes invalid date formats into standardized ISO/YYYY-MM-DD format or fills missing dates with current timestamps.
  - **Manual Date Pickers & Batch Fixes**: Edit individual fields directly in the validation modal before finalizing import.

---

## 📁 Data Pipeline & Validation Rules

### Date Parsing (`m/d/yy`)
- Supports standard American (`M/D/YY` or `MM/DD/YYYY`), ISO (`YYYY-MM-DD`), and slashes/dashes delimiters.
- Pre-import validation flags non-standard or corrupt date strings.
- **Auto-Fix Dates** tool converts non-conforming or missing date fields automatically into valid date objects.

### Currency Handling
- Each deal preserves its native transaction currency (`NZD`, `AUD`, `USD`, etc.).
- The reporting layer converts all native values into the user's selected global reporting currency using current FX conversion multipliers.

---

## 🛠️ Tech Stack & Scripts

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Recharts, Framer Motion
- **Backend/Server**: Express (Node.js) on Port 3000
- **Build System**: Vite (client), esbuild (server)

### Commands

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build client and server for production
npm run build

# Start production server
npm start

# Run type check and linter
npm run lint
```

---

## 📄 License
MIT License. Built for scalable enterprise sales analytics.
