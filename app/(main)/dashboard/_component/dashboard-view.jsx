"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  defs,
} from "recharts";
import {
  BriefcaseIcon,
  TrendingUp,
  TrendingDown,
  Minus,
  Brain,
  Activity,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const DashboardView = ({ insights }) => {
  // Filter valid entries, sort by median descending, take top 5 only
  const salaryData = insights.salaryRanges
    .filter(
      (range) =>
        range.role &&
        range.role.trim() !== "" &&
        typeof range.median === "number" &&
        range.median > 0
    )
    .map((range) => ({
      name: range.role,
      median: Math.round(range.median / 1000),
    }))
    .sort((a, b) => b.median - a.median)
    .slice(0, 5);

  const getDemandLevelColor = (level) => {
    switch (level?.toLowerCase()) {
      case "high":
        return "text-emerald-400";
      case "medium":
        return "text-amber-400";
      case "low":
        return "text-red-400";
      default:
        return "text-muted-foreground";
    }
  };

  const getDemandBarColor = (level) => {
    switch (level?.toLowerCase()) {
      case "high":
        return "bg-emerald-500";
      case "medium":
        return "bg-amber-500";
      case "low":
        return "bg-red-500";
      default:
        return "bg-muted";
    }
  };

  const getOutlookIcon = (outlook) => {
    switch (outlook?.toLowerCase()) {
      case "positive":
        return TrendingUp;
      case "negative":
        return TrendingDown;
      default:
        return Minus;
    }
  };

  const getOutlookColor = (outlook) => {
    switch (outlook?.toLowerCase()) {
      case "positive":
        return "text-emerald-400";
      case "negative":
        return "text-red-400";
      default:
        return "text-amber-400";
    }
  };

  const OutlookIcon = getOutlookIcon(insights.marketOutlook);
  const outlookColor = getOutlookColor(insights.marketOutlook);

  const lastUpdatedDate = format(new Date(insights.lastUpdated), "dd/MM/yyyy");
  const nextUpdateDistance = formatDistanceToNow(
    new Date(insights.nextUpdate),
    { addSuffix: true }
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Badge variant="outline" className="text-xs text-muted-foreground">
          Last updated: {lastUpdatedDate}
        </Badge>
        <Badge variant="outline" className="text-xs text-muted-foreground">
          Next update {nextUpdateDistance}
        </Badge>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sector Outlook
            </CardTitle>
            <OutlookIcon className={`h-5 w-5 ${outlookColor}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${outlookColor}`}>
              {insights.marketOutlook}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sector Growth
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">
              +{insights.growthRate.toFixed(1)}%
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-blue-500/20">
              <div
                className="h-1.5 rounded-full bg-blue-500 transition-all"
                style={{
                  width: `${Math.min(Math.max(insights.growthRate, 0), 100)}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Investment Activity
            </CardTitle>
            <Activity className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getDemandLevelColor(insights.demandLevel)}`}>
              {insights.demandLevel}
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
              <div
                className={`h-1.5 rounded-full transition-all ${getDemandBarColor(
                  insights.demandLevel
                )}`}
                style={{
                  width:
                    insights.demandLevel?.toLowerCase() === "high"
                      ? "90%"
                      : insights.demandLevel?.toLowerCase() === "medium"
                      ? "55%"
                      : "25%",
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Key Competencies
            </CardTitle>
            <Brain className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {insights.topSkills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-400"
                >
                  {skill}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compensation Chart — Short thick bars */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Compensation Benchmarks by Role</CardTitle>
          <CardDescription>
            Median compensation in thousands (USD)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={salaryData}
                margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                barCategoryGap="25%"
              >
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" />
                    <stop offset="100%" stopColor="#2563eb" />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="name"
                  interval={0}
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `$${val}K`}
                  width={50}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-background px-3 py-2 shadow-md">
                          <p className="font-medium text-sm">
                            {payload[0]?.payload?.name}
                          </p>
                          <p className="text-sm text-blue-400">
                            Median: ${payload[0]?.value}K
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="median"
                  fill="url(#barGradient)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={80}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Sector Trends + Recommended Skills */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Key Sector Trends</CardTitle>
            <CardDescription>
              Current trends shaping this financial sector
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {insights.keyTrends.map((trend, index) => (
                <li key={index} className="flex items-start gap-3">
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
            <CardDescription>Skills and areas to develop</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {insights.recommendedSkills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-xs font-medium text-blue-400"
                >
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

export default DashboardView;
