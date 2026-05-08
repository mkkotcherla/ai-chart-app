# AI Charts

An AI-powered data visualization app that generates charts, KPIs, and predictions from your data using natural language.

## Features

- **Chat** — Ask for charts, analysis, and forecasts in plain English
- **File Upload** — Upload CSV, Excel, or spreadsheet files for automatic analysis
- **SQL Database** — Connect a PostgreSQL database and query it with AI-generated charts
- **AI Predictions** — Every chart includes a trend forecast with confidence level and key factors
- **Multi-provider** — Supports both OpenAI and Anthropic (Claude) models

<img width="1465" height="1055" alt="Screenshot 2026-05-08 at 9 11 31 PM" src="https://github.com/user-attachments/assets/436495cc-75bf-4c2b-b083-d930e1d01c7e" />



## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Add your API key

Click **Settings** (or the warning button) in the sidebar and enter your OpenAI or Anthropic API key. The key is stored locally in your browser — it is never sent to any server other than the AI provider.

## Usage

### Chat mode
Type a question like _"Show monthly revenue with growth prediction"_ or _"Create a KPI dashboard for e-commerce"_ and the AI will respond with charts and insights.

### Files mode
Switch to the **Files** tab and upload a CSV or Excel file. The AI automatically analyzes the data, generates KPI cards, charts, and a 3-point insight summary.

### SQL mode
Switch to the **SQL DB** tab, enter your PostgreSQL connection details, and connect. The AI reads your schema and you can run queries whose results are immediately charted and forecasted.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| AI streaming | Vercel AI SDK (`ai`) |
| AI providers | `@ai-sdk/openai`, `@ai-sdk/anthropic` |
| Charts | Recharts |
| Styling | Tailwind CSS |
| File parsing | PapaParse, xlsx |
| Database | PostgreSQL (`pg`) |

## Configuration

No environment variables are required. API keys and DB credentials are entered in the UI at runtime and stored in `localStorage`.

## Scripts

```bash
npm run dev      # Start development server (Turbopack)
npm run build    # Production build
npm run start    # Start production server
```
