"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Navigation } from "@/components/landing/navigation";
import { FooterSection } from "@/components/landing/footer-section";
import { useSoilData } from "@/hooks/use-soil-data";

type PageKind = "analytics" | "sensors" | "alerts";
type AnalysisResponse = {
  analysis: { severity: string; actions: Array<{ code: string }> };
  findings: Array<{ label: string; value: number | null; unit: string; status: string; message: string; severity: string }>;
  row_id: number | string | null;
};

const value = (reading: number | null, suffix = "") => reading === null ? "—" : `${reading}${suffix}`;

export function FocusedAnalysisPage({ kind }: { kind: PageKind }) {
  const { data, lastUpdated } = useSoilData();
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const title = kind === "analytics" ? "Read the pattern." : kind === "sensors" ? "Know the network." : "See what needs attention.";
  const eyebrow = kind === "analytics" ? "Analytics" : kind === "sensors" ? "Sensors" : "Alerts";
  const description = kind === "analytics"
    ? "Historical sensor readings from Supabase, organized for comparison over time."
    : kind === "sensors"
      ? "Current sensor values and connection state from the latest Supabase row."
      : "Live MITTI findings from the latest sensor snapshot. No motor or irrigation controls are shown.";

  useEffect(() => {
    if (kind !== "alerts") return;
    fetch("/api/soil-analysis", { cache: "no-store" })
      .then((response) => response.json())
      .then(setAnalysis)
      .catch(() => setAnalysis(null));
  }, [kind, lastUpdated]);

  const chartData = useMemo(() => [...data.readings].reverse(), [data.readings]);
  const visual = {
    analytics: {
      label: "TEMPORAL / 30D",
      className: "from-[#171126] via-background to-background",
      accent: "rgba(159,140,255,.18)",
      pattern: "linear-gradient(rgba(159,140,255,.10) 1px, transparent 1px), linear-gradient(90deg, rgba(159,140,255,.10) 1px, transparent 1px)",
      imagePosition: "center right",
      image: "/route-art/analytics.png",
    },
    sensors: {
      label: "FIELD NETWORK / LIVE",
      className: "from-[#071b1b] via-background to-background",
      accent: "rgba(125,211,252,.16)",
      pattern: "radial-gradient(circle at 1px 1px, rgba(125,211,252,.18) 1px, transparent 0)",
      imagePosition: "left center",
      image: "/route-art/sensors.png",
    },
    alerts: {
      label: "SIGNAL / MONITOR",
      className: "from-[#1c1019] via-background to-background",
      accent: "rgba(236,168,214,.16)",
      pattern: "linear-gradient(135deg, rgba(236,168,214,.09) 12%, transparent 12.5%, transparent 50%, rgba(236,168,214,.09) 50.5%, rgba(236,168,214,.09) 62%, transparent 62.5%, transparent)",
      imagePosition: "center center",
      image: "/route-art/alerts.png",
    },
  }[kind];

  const analyticsCards = [
    ["Samples", `${data.readings.length}`],
    ["Moisture", value(data.soil.moisture, "%")],
    ["pH", value(data.soil.ph)],
    ["Updated", lastUpdated?.toLocaleTimeString("en-GB") ?? "—"],
  ];

  const sensorCards = [
    ["Nitrogen", value(data.soil.nitrogen, " mg/kg"), "NPK sensor"],
    ["Phosphorus", value(data.soil.phosphorus, " mg/kg"), "NPK sensor"],
    ["Potassium", value(data.soil.potassium, " mg/kg"), "NPK sensor"],
    ["Moisture", value(data.soil.moisture, "%"), "Soil sensor"],
    ["Temperature", value(data.environment.temperature, "°C"), "ESP32"],
    ["Humidity", value(data.environment.humidity, "%"), "ESP32"],
    ["Pressure", value(data.environment.pressure, " hPa"), "ESP32"],
    ["Air quality", value(data.environment.airQuality), "ESP32"],
    ["NPK connection", data.devices.npkSensor, "Device status"],
  ];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navigation />
      <section className={`relative overflow-hidden pt-40 pb-24 lg:pt-48 bg-gradient-to-br ${visual.className}`}>
        <img
          src={visual.image}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover pointer-events-none"
          style={{
            objectPosition: visual.imagePosition,
            opacity: 0.48,
            filter: "saturate(.9) contrast(1.05)",
            maskImage: "linear-gradient(to bottom, black 0%, black 68%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 68%, transparent 100%)",
          }}
        />
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-background/85 via-background/45 to-background/10" />
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-background/15 via-transparent to-background" />
        <div
          className="absolute inset-x-0 top-0 h-[620px] pointer-events-none opacity-45"
          style={{
            backgroundImage: `${visual.pattern}, radial-gradient(circle at 70% 15%, ${visual.accent}, transparent 38%)`,
            backgroundSize: kind === "sensors" ? "22px 22px, auto" : "42px 42px, 42px 42px, auto",
          }}
        />
        <div className="absolute right-[-8%] top-28 hidden lg:block text-[15rem] leading-none font-display text-white/[0.025] select-none pointer-events-none">
          {kind === "analytics" ? "TRENDS" : kind === "sensors" ? "NODES" : "SIGNAL"}
        </div>
        <div className="absolute left-6 lg:left-12 top-32 text-[10px] font-mono tracking-[0.35em] text-foreground/30 [writing-mode:vertical-rl] pointer-events-none">
          {visual.label}
        </div>
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
            <span className="w-12 h-px bg-foreground/20" />{eyebrow}
          </div>
          <div className="relative z-10 grid lg:grid-cols-12 gap-8 items-end">
            <h1 className="lg:col-span-8 text-6xl md:text-7xl lg:text-[110px] font-display tracking-tight leading-[0.9]">
              {title.split(" ")[0]}<br /><span className="text-muted-foreground">{title.split(" ").slice(1).join(" ")}</span>
            </h1>
            <p className="lg:col-span-4 text-lg text-muted-foreground leading-relaxed">{description}</p>
          </div>
          <div className="relative z-10 mt-14 max-w-3xl border-l border-foreground/20 pl-5 text-sm leading-relaxed text-foreground/60">
            {kind === "analytics" && "Patterns become useful when they stay connected to context. Compare nutrient movement with the environment around each reading."}
            {kind === "sensors" && "The field is a network of small signals. Each value below is the latest reported state from a named device, not a placeholder."}
            {kind === "alerts" && "Attention is not noise. MITTI turns the latest sensor state into a small set of conditions worth reviewing before they become field problems."}
          </div>

          {kind === "analytics" && (
            <>
              <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-4 mt-20">
                {analyticsCards.map(([label, reading]) => (
                  <Metric key={label} label={label} value={reading} />
                ))}
              </div>
              <div className="relative z-10 grid lg:grid-cols-2 gap-6 mt-6">
                <TrendChart title="Nutrients" data={chartData} lines={[
                  ["nitrogen", "#eca8d6"], ["phosphorus", "#9f8cff"], ["potassium", "#7dd3fc"],
                ]} />
                <TrendChart title="Environment" data={chartData} lines={[
                  ["moisture", "#f8d477"], ["temperature", "#7dd3fc"], ["humidity", "#eca8d6"],
                ]} />
              </div>
            </>
          )}

          {kind === "sensors" && (
            <div className="relative z-10 grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-20">
              {sensorCards.map(([label, reading, source]) => (
                <DataTile key={label} label={label} value={reading} source={source} />
              ))}
            </div>
          )}

          {kind === "alerts" && (
            <div className="relative z-10 mt-20 border border-foreground/10 bg-foreground/[0.02]">
              {analysis ? (
                <>
                  <div className="p-6 lg:p-8 border-b border-foreground/10 flex justify-between gap-4">
                    <div className="text-5xl font-display uppercase">{analysis.analysis.severity}</div>
                    <div className="text-xs font-mono text-muted-foreground">ROW {analysis.row_id ?? "—"}</div>
                  </div>
                  <div className="p-6 lg:p-8 grid md:grid-cols-2 gap-4">
                    {analysis.findings.map((finding) => (
                      <div key={finding.label} className="border border-foreground/10 p-5">
                        <div className="text-xs font-mono text-muted-foreground mb-2">{finding.label}</div>
                        <div className="mb-2">{finding.status}</div>
                        <div className="text-sm text-muted-foreground">{finding.message}</div>
                      </div>
                    ))}
                    <div className="md:col-span-2 border-t border-foreground/10 pt-5">
                      <div className="text-xs font-mono text-muted-foreground mb-3">MITTI ACTION CODES</div>
                      <div className="flex flex-wrap gap-2">{analysis.analysis.actions.map((action) => <span key={action.code} className="border border-foreground/15 px-3 py-2 text-xs font-mono">{action.code}</span>)}</div>
                    </div>
                  </div>
                </>
              ) : <div className="p-8 text-sm font-mono text-muted-foreground">Loading live findings…</div>}
            </div>
          )}
        </div>
      </section>
      <FooterSection />
    </main>
  );
}

function Metric({ label, value: reading }: { label: string; value: string }) {
  return <div className="border border-foreground/10 bg-foreground/[0.02] p-6"><div className="text-3xl font-display">{reading}</div><div className="text-xs font-mono text-muted-foreground mt-2 uppercase">{label}</div></div>;
}

function DataTile({ label, value, source }: { label: string; value: string; source: string }) {
  return (
    <div className="border border-foreground/10 bg-foreground/[0.02] p-6">
      <div className="text-xs font-mono text-muted-foreground uppercase mb-4">{source}</div>
      <div className="text-4xl font-display">{value}</div>
      <div className="text-sm text-muted-foreground mt-2">{label}</div>
    </div>
  );
}

function TrendChart({ title, data, lines }: { title: string; data: Array<Record<string, number | string | null>>; lines: Array<[string, string]> }) {
  return <div className="border border-foreground/10 bg-foreground/[0.02] p-6 lg:p-8"><div className="text-lg mb-6">{title}</div><div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={data}><CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} /><XAxis dataKey="timestamp" tick={{ fill: "rgba(255,255,255,.45)", fontSize: 11 }} tickLine={false} axisLine={false} /><YAxis tick={{ fill: "rgba(255,255,255,.45)", fontSize: 11 }} tickLine={false} axisLine={false} /><Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid rgba(255,255,255,.16)" }} />{lines.map(([key, color]) => <Line key={key} type="monotone" dataKey={key} stroke={color} strokeWidth={2} dot={false} connectNulls={false} />)}</LineChart></ResponsiveContainer></div></div>;
}
