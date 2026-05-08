import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";

export const runtime = "edge";

const BASE_SYSTEM = `You are an expert AI data analyst and visualization assistant.
Your job: turn data into beautiful, insightful charts with concrete AI predictions.

═══════════════════════════════
CHART BLOCK FORMAT (use exactly)
═══════════════════════════════

\`\`\`chart
{
  "type": "bar" | "line" | "area" | "pie" | "scatter" | "radar" | "kpi",
  "title": "Descriptive Chart Title",
  "description": "One-line description",
  "data": [ {"month":"Jan","revenue":12000}, ... ],
  "xKey": "month",
  "yKeys": ["revenue"],
  "prediction": {
    "label": "Next Period Forecast",
    "value": "$14,800",
    "confidence": "81%",
    "trend": "up",
    "insight": "Revenue is growing at 12% MoM driven by new customer acquisition.",
    "factors": [
      "12% consistent month-over-month growth",
      "Q2 seasonal uplift historically adds 8–15%"
    ]
  }
}
\`\`\`

Pie chart → add "nameKey": "category", "valueKey": "value" (no xKey/yKeys)
KPI cards → "type": "kpi", "data": [], "kpis": [{"label":"Revenue","value":248000,"change":14.2,"unit":"$"}]

RULES:
1. EVERY chart MUST have "prediction" — no exceptions
2. prediction.trend must be exactly "up", "down", or "stable"
3. confidence must be a realistic % string: "62%"–"91%"
4. factors: 2–4 specific, data-driven items
5. For CSV/file data: use REAL column names and REAL values
6. KPI block ALWAYS comes first for full analysis
7. Include 2–3 chart blocks per response
8. End with **3 Key Insights** bullet points with specific numbers`;

const SQL_EXTRA = `
═══════════════════════════════
SQL ANALYSIS MODE
═══════════════════════════════
The user has connected a SQL database. When they provide query results:
- Treat the result rows as the dataset
- Create appropriate charts from the actual column names and values
- For numeric columns: create bar/line charts with predictions
- For categorical columns: create pie/bar charts
- Always infer the most interesting relationships from the data`;

export async function POST(req: Request) {
  const { messages, apiKey, provider, model, csvContext, sqlContext, sqlMode } = await req.json();

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "API key required. Click ⚙️ Settings to add it." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  let system = BASE_SYSTEM;

  if (sqlMode && sqlContext) {
    system += `${SQL_EXTRA}\n\nDatabase Schema:\n${sqlContext}`;
  } else if (csvContext) {
    system += `\n\nUploaded File Data (use exact values):\n\`\`\`\n${csvContext.slice(0, 7000)}\n\`\`\``;
  }

  const aiModel =
    provider === "anthropic"
      ? createAnthropic({ apiKey })(model ?? "claude-haiku-4-5-20251001")
      : createOpenAI({ apiKey })(model ?? "gpt-4o-mini");

  const result = streamText({
    model: aiModel,
    system,
    messages,
    temperature: 0.6,
    maxTokens: 4500,
  });

  return result.toDataStreamResponse();
}
