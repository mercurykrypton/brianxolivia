"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { trpc } from "@/lib/trpc/provider";
import { formatCurrency } from "@/lib/utils";

type Period = "7d" | "30d" | "90d" | "1y";

interface EarningsChartProps {
  showPeriodSelector?: boolean;
}

export function EarningsChart({ showPeriodSelector = true }: EarningsChartProps) {
  const [period, setPeriod] = useState<Period>("30d");
  const { data: chartData, isLoading } = trpc.creator.getEarningsChart.useQuery({
    period,
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-xl p-3 shadow-lg">
          <p className="text-xs text-muted-foreground mb-2">{label}</p>
          {payload.map((entry: any) => (
            <p key={entry.name} className="text-sm font-medium" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold">Earnings</h3>
        {showPeriodSelector && (
          <div className="flex gap-1">
            {(["7d", "30d", "90d", "1y"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  period === p
                    ? "gradient-bg text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="h-48 shimmer rounded-xl" />
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <defs>
              <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF1493" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#FF1493" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="tipsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#9B59B6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#9B59B6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.05)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fill: "#666", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => {
                const d = new Date(v);
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
            />
            <YAxis
              tick={{ fill: "#666", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${v}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="earnings"
              name="Total"
              stroke="#FF1493"
              strokeWidth={2}
              fill="url(#earningsGradient)"
            />
            <Area
              type="monotone"
              dataKey="tips"
              name="Tips"
              stroke="#9B59B6"
              strokeWidth={2}
              fill="url(#tipsGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
