"use client";

import { type LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  gradient: string;
  subtitle?: string;
  change?: number; // percentage change
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  gradient,
  subtitle,
  change,
}: StatsCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl p-4 hover:border-pink-500/30 transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted-foreground">{title}</p>
        <div
          className={cn(
            "w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center",
            gradient
          )}
        >
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>

      <p className="text-2xl font-bold">{value}</p>

      {(subtitle || change !== undefined) && (
        <div className="flex items-center gap-2 mt-1">
          {change !== undefined && (
            <span
              className={cn(
                "text-xs flex items-center gap-0.5 font-medium",
                isPositive ? "text-green-500" : "text-red-500"
              )}
            >
              {isPositive ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {Math.abs(change).toFixed(1)}%
            </span>
          )}
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      )}
    </motion.div>
  );
}
