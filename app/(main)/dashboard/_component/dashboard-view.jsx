"use client";

import React, { useState, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, Brain, Activity,
  RefreshCw, Loader2, CheckCircle2, AlertCircle,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STAGES = {
  fetching: { label: "Fetching market data...", icon: RefreshCw, color: "text-blue-400" },
  computing: { label: "Computing SMA, volatility, returns...", icon: Activity, color: "text-amber-400" },
  narrating: { label: "Generating AI analysis...", icon: Brain, color: "text-purple-400" },
  completed: { label: "Dashboard updated!", icon: CheckCircle2, color: "text-emerald-400" },
  failed: { label: "Refresh failed", icon: AlertCircle, color: "text-red-400" },
};

const DashboardView = ({ initialInsights }) => {
  const [insights, setInsights] = useState(initialInsights);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshStage, setRefreshStage] = useState(null);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshStage("fetching");

    try {
      const res = await fetch("/api/dashboard/refresh", { method: "POST" });

      if (!res.ok) throw new Error("Refresh failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              setRefreshStage(data.status);

              if (data.status === "completed" && data.insight) {
                setInsights(data.insight);
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      setRefreshStage("failed");
      console.error("Refresh error:", err);
    } finally {
      setTimeout(() => {
        setRefreshing(false);
        setRefreshStage(null);
      }, 2000);
    }
  }, []);

  // No data yet — show first-time setup
  if (!insights) {
    return (
      <Card className="border-border/50">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to Your Dashboard</CardTitle>
          <CardDescription>
            Click below to fetch real market data and generate your first sector analysis.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {refreshStage && (
            <RefreshProgress stage={refreshStage} />
          )}
          <Button onClick={handleRefresh} disabled={refreshing} size="lg">
            {refreshing ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading Market Data...</>
            ) : (
              <><RefreshCw className="mr-2 h-4 w-4" /> Fetch Market Data & Analyze</>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const metrics = insights.metrics;
  const salaryData = (insights.salaryRanges || [])
    .filter((r) => r.role && typeof r.median === "number" && r.median > 0)
    .map((r) => ({ name: r.role, median: Math.round(r.median / 1000) }))
    .slice(0, 5);

  const growthRate = insights.growthRate || 0;
  const growthPrefix = growthRate >= 0 ? "+" : "";

  const getOutlookIcon = (o) => {
    if (o?.toLowerCase() === "positive") return TrendingUp;
    if (o?.toLowerCase() === "negative") return TrendingDown;
    return Minus;
  };
  const getOutlookColor = (o) => {
    if (o?.toLowerCase() === "positive") return "text-emerald-400";
    if (o?.toLowerCase() === "negative") return "text-red-400";
    return "text-amber-400";
  };

  const OutlookIcon = getOutlookIcon(insights.marketOutlook);
  const outlookColor = getOutlookColor(insights.marketOutlook);

  const safeDate = (val) => {
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex justify-between items-center">
        <Badge variant="outline" className="text-xs text-muted-foreground">
          Last updated: {format(safeDate(insights.lastUpdated), "dd/MM/yyyy HH:mm")}
        </Badge>
        <div className="flex items-center gap-2">
          {refreshStage && <RefreshProgress stage={refreshStage} />}
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-1 hidden md:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Real Computed Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Latest Close"
            value={`$${metrics.latestClose?.toFixed(2) || "—"}`}
            sub={metrics.previousClose
              ? `Prev: $${metrics.previousClose.toFixed(2)}`
              : null}
          />
          <MetricCard
            label="20-Day SMA"
            value={metrics.sma20 ? `$${metrics.sma20.toFixed(2)}` : "—"}
            sub={metrics.sma50 ? `50-SMA: $${metrics.sma50.toFixed(2)}` : null}
          />
          <MetricCard
            label="30d Volatility"
            value={metrics.volatility30d ? `${metrics.volatility30d.toFixed(1)}%` : "—"}
            sub="Annualized"
          />
          <MetricCard
            label="YTD Return"
            value={metrics.returnYTD != null ? `${metrics.returnYTD >= 0 ? "+" : ""}${metrics.returnYTD.toFixed(2)}%` : "—"}
            sub={metrics.returnMTD != null ? `MTD: ${metrics.returnMTD >= 0 ? "+" : ""}${metrics.returnMTD.toFixed(2)}%` : null}
            valueColor={metrics.returnYTD >= 0 ? "text-emerald-400" : "text-red-400"}
          />
        </div>
      )}

      {/* AI Narrative */}
      {insights.aiNarrative && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-400" />
              AI Market Analysis
            </CardTitle>
            <CardDescription>Generated from real computed metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed whitespace-pre-line">{insights.aiNarrative}</p>
          </CardContent>
        </Card>
      )}

      {/* Market Anomalies */}
      {insights.anomalies?.length > 0 && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-400" />
              Detected Market Anomalies
            </CardTitle>
            <CardDescription>
              Unusual daily moves detected via rolling 30-day Z-score (±2σ threshold)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {insights.anomalies.map((a, i) => {
                const isSpike = a.direction === "spike";
                const color = isSpike ? "text-emerald-400" : "text-red-400";
                const bgColor = isSpike ? "bg-emerald-500/10" : "bg-red-500/10";
                const borderColor = isSpike ? "border-emerald-500/20" : "border-red-500/20";
                return (
                  <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${bgColor} ${borderColor}`}>
                    <div className="flex items-center gap-3">
                      <div className={`text-xs font-mono ${color}`}>
                        {isSpike ? "▲" : "▼"} Z={Math.abs(a.zScore).toFixed(1)}
                      </div>
                      <div>
                        <span className="text-sm font-medium">
                          {new Date(a.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {a.etfSymbol}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-sm font-mono ${color}`}>
                        {a.dailyReturn >= 0 ? "+" : ""}{a.dailyReturn.toFixed(2)}%
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ${a.closingPrice.toFixed(2)}
                      </span>
                      {a.magnitude === "extreme" && (
                        <Badge variant="destructive" className="text-xs">Extreme</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sector Outlook Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sector Outlook</CardTitle>
            <OutlookIcon className={`h-5 w-5 ${outlookColor}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${outlookColor}`}>{insights.marketOutlook}</div>
            <p className="text-xs text-muted-foreground mt-1">Based on SMA crossover + momentum</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sector Growth (YTD)</CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{growthPrefix}{growthRate.toFixed(1)}%</div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-blue-500/20">
              <div className="h-1.5 rounded-full bg-blue-500 transition-all"
                style={{ width: `${Math.min(Math.max(Math.abs(growthRate), 0), 100)}%` }} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Investment Activity</CardTitle>
            <Activity className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.demandLevel}</div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Key Competencies</CardTitle>
            <Brain className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {(insights.topSkills || []).map((skill) => (
                <span key={skill} className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-400">
                  {skill}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compensation Chart */}
      {salaryData.length > 0 && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Compensation Benchmarks by Role</CardTitle>
            <CardDescription>Median compensation in thousands (USD)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salaryData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }} barCategoryGap="15%">
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#60a5fa" />
                      <stop offset="100%" stopColor="#2563eb" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" interval={0} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}K`} width={50} />
                  <Tooltip cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} content={({ active, payload }) => {
                    if (active && payload?.length) {
                      return (
                        <div className="rounded-lg border bg-background px-3 py-2 shadow-md">
                          <p className="font-medium text-sm">{payload[0]?.payload?.name}</p>
                          <p className="text-sm text-blue-400">Median: ${payload[0]?.value}K</p>
                        </div>
                      );
                    }
                    return null;
                  }} />
                  <Bar dataKey="median" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trends + Skills */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Key Sector Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {(insights.keyTrends || []).map((trend, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="mt-1.5 h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                  <span className="text-sm">{trend}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Recommended Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(insights.recommendedSkills || []).map((skill) => (
                <span key={skill} className="inline-flex items-center rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-xs font-medium text-blue-400">
                  {skill}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

function MetricCard({ label, value, sub, valueColor }) {
  return (
    <Card className="border-border/50">
      <CardContent className="pt-4 pb-3">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className={`text-xl font-bold ${valueColor || ""}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function RefreshProgress({ stage }) {
  const info = STAGES[stage] || STAGES.fetching;
  const Icon = info.icon;
  return (
    <div className={`flex items-center gap-2 text-sm ${info.color}`}>
      <Icon className={`h-4 w-4 ${stage !== "completed" && stage !== "failed" ? "animate-spin" : ""}`} />
      <span>{info.label}</span>
    </div>
  );
}

export default DashboardView;
