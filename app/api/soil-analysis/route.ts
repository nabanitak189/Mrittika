import { existsSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SensorRow = {
  id: number;
  device_id?: string | null;
  created_at?: string | null;
  npk?: Record<string, unknown> | null;
  esp32?: Record<string, unknown> | null;
};

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function nestedData(value: Record<string, unknown> | null | undefined) {
  const data = value && typeof value === "object" ? value["data"] : undefined;
  return (data && typeof data === "object" ? data : value) as Record<string, unknown> | undefined;
}

function severityFromThreshold(value: number | null, low: number, high: number) {
  if (value === null) return "unknown";
  if (value < low) return "critical";
  if (value > high) return "warning";
  return "healthy";
}

function renderStatus(value: number | null, low: number, target: number, high: number) {
  if (value === null) return "No reading";
  if (value < low) return "Below target";
  if (value > high) return "Above target";
  if (value < target) return "Low but stable";
  if (value > target) return "High but stable";
  return "Within range";
}

function buildFallbackAnalysis(row: SensorRow | null) {
  const npk = nestedData(row?.npk ?? null) ?? {};
  const esp32 = nestedData(row?.esp32 ?? null) ?? {};

  const moisture = asNumber(npk.moisture_pct);
  const nitrogen = asNumber(npk.nitrogen_mg_kg);
  const phosphorus = asNumber(npk.phosphorus_mg_kg);
  const potassium = asNumber(npk.potassium_mg_kg);
  const ph = asNumber(npk.ph);
  const temperature = asNumber(npk.temperature_c);
  const humidity = asNumber(esp32.humidity_pct);
  const rainfall = asNumber(esp32.rain_intensity_estimate_mm_h);

  const findings = [
    {
      label: "Soil moisture",
      value: moisture,
      unit: "%",
      status: renderStatus(moisture ?? null, 18, 35, 60),
      message: moisture === null
        ? "No moisture value is available from the latest sensor row."
        : moisture < 18
          ? "Moisture is running low, which can stress roots and slow nutrient uptake."
          : moisture > 60
            ? "Moisture is elevated; consider checking drainage or irrigation timing."
            : "Moisture is in a healthy range for crop support.",
      severity: severityFromThreshold(moisture, 18, 60),
    },
    {
      label: "Nitrogen",
      value: nitrogen,
      unit: "mg/kg",
      status: renderStatus(nitrogen ?? null, 30, 60, 90),
      message: nitrogen === null
        ? "Nitrogen is not available in the latest row."
        : nitrogen < 30
          ? "Nitrogen is under target; consider a corrective nutrient plan."
          : nitrogen > 90
            ? "Nitrogen is elevated; monitor against crop growth stage."
            : "Nitrogen is within the expected agronomic window.",
      severity: severityFromThreshold(nitrogen, 30, 90),
    },
    {
      label: "Phosphorus",
      value: phosphorus,
      unit: "mg/kg",
      status: renderStatus(phosphorus ?? null, 15, 35, 60),
      message: phosphorus === null
        ? "Phosphorus is not available in the latest row."
        : phosphorus < 15
          ? "Phosphorus is below target and may limit root development."
          : phosphorus > 60
            ? "Phosphorus is high; watch for runoff and over-fertilization risk."
            : "Phosphorus is in a stable range for active growth.",
      severity: severityFromThreshold(phosphorus, 15, 60),
    },
    {
      label: "Potassium",
      value: potassium,
      unit: "mg/kg",
      status: renderStatus(potassium ?? null, 25, 55, 90),
      message: potassium === null
        ? "Potassium is not available in the latest row."
        : potassium < 25
          ? "Potassium is low and may reduce stress tolerance."
          : potassium > 90
            ? "Potassium is high; review nutrient balance and irrigation inputs."
            : "Potassium is within the healthy operating band.",
      severity: severityFromThreshold(potassium, 25, 90),
    },
    {
      label: "Soil pH",
      value: ph,
      unit: "pH",
      status: renderStatus(ph ?? null, 5.5, 6.6, 7.5),
      message: ph === null
        ? "pH is unavailable from the latest sensor record."
        : ph < 5.5
          ? "Soil acidity is elevated; pH correction may be needed."
          : ph > 7.5
            ? "Soil alkalinity is elevated; monitor nutrient lockout risk."
            : "Soil pH is within an agronomically suitable range.",
      severity: severityFromThreshold(ph ?? null, 5.5, 7.5),
    },
  ];

  const ordered = findings.map((finding) => ({
    ...finding,
    severity: finding.severity,
  }));

  const maxSeverity = ordered.reduce((current, finding) => {
    const severityWeight = { critical: 3, warning: 2, healthy: 1, unknown: 0 };
    return severityWeight[finding.severity] > severityWeight[current] ? finding.severity : current;
  }, "healthy" as "critical" | "warning" | "healthy" | "unknown");

  const actions = [
    ...(moisture !== null && moisture < 18 ? [{ code: "IRR-01", category: "Irrigation", priority: 1, reasons: ["Moisture is below target range."] }] : []),
    ...(nitrogen !== null && nitrogen < 30 ? [{ code: "NUT-02", category: "Nutrients", priority: 2, reasons: ["Nitrogen is below the agronomic target."] }] : []),
    ...(ph !== null && (ph < 5.5 || ph > 7.5) ? [{ code: "PH-03", category: "pH correction", priority: 3, reasons: ["Soil pH is outside the recommended zone."] }] : []),
    ...(temperature !== null && temperature > 32 ? [{ code: "CLM-04", category: "Climate", priority: 4, reasons: ["Temperature is elevated relative to field comfort range."] }] : []),
    ...(humidity !== null && humidity > 80 ? [{ code: "AIR-05", category: "Air flow", priority: 5, reasons: ["Humidity is high; check for mildew or drainage issues."] }] : []),
  ];

  return {
    source: "node-fallback",
    row_id: row?.id ?? null,
    captured_at: row?.created_at ?? new Date().toISOString(),
    analysis: {
      severity: maxSeverity,
      actions: actions.length > 0 ? actions : [{ code: "MON-00", category: "Monitoring", priority: 6, reasons: ["All soil indicators are within expected limits."] }],
    },
    findings: ordered,
  };
}

async function fetchLatestSensorRow() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  const params = new URLSearchParams({
    select: "id,device_id,created_at,npk,esp32",
    order: "created_at.desc",
    limit: "1",
  });

  const response = await fetch(`${supabaseUrl}/rest/v1/sensor_data?${params}`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Supabase request failed with status ${response.status}.`);
  }

  const rows = await response.json() as SensorRow[];
  return rows[0] ?? null;
}

export async function GET() {
  const projectPath = process.env.MITTI_PROJECT_PATH ?? "D:\\mitti_v3\\mitti_v3";
  const pythonPath = process.env.MITTI_PYTHON_PATH ?? "python";
  const analysisScript = join(projectPath, "web_analysis.py");

  if (existsSync(analysisScript)) {
    return await new Promise<Response>((resolve) => {
      const child = spawn(pythonPath, ["web_analysis.py"], {
        cwd: projectPath,
        env: {
          ...process.env,
          SUPABASE_URL: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
          SUPABASE_KEY: process.env.SUPABASE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        },
        windowsHide: true,
      });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
      child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
      child.on("error", (error) => resolve(NextResponse.json({ error: error.message }, { status: 503 })));
      child.on("close", (code) => {
        if (code !== 0) {
          resolve(NextResponse.json({ error: stderr || stdout || "Soil analysis process failed." }, { status: 502 }));
          return;
        }
        try {
          resolve(NextResponse.json(JSON.parse(stdout)));
        } catch {
          resolve(NextResponse.json({ error: "Soil analysis returned invalid JSON." }, { status: 502 }));
        }
      });
    });
  }

  try {
    const latestRow = await fetchLatestSensorRow();
    return NextResponse.json(buildFallbackAnalysis(latestRow));
  } catch (error) {
    return NextResponse.json({
      source: "fallback-error",
      row_id: null,
      captured_at: new Date().toISOString(),
      analysis: {
        severity: "unknown",
        actions: [{ code: "MON-01", category: "Monitoring", priority: 1, reasons: [error instanceof Error ? error.message : "Soil analysis is currently unavailable."] }],
      },
      findings: [],
      error: error instanceof Error ? error.message : "Soil analysis is currently unavailable.",
    }, { status: 200 });
  }
}
