"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getExpenseSummary } from "@/actions/expenses";
import type { Granularity, SummaryBucket } from "@/lib/types";
import {
  startOfMonth,
  endOfMonth,
  format,
  startOfWeek,
  endOfWeek,
} from "date-fns";

interface SummaryViewProps {
  groupId: string;
}

export function SummaryView({ groupId }: SummaryViewProps) {
  const [granularity, setGranularity] = useState<Granularity>("monthly");
  const [startDate, setStartDate] = useState(
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(
    format(endOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [buckets, setBuckets] = useState<SummaryBucket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getExpenseSummary(groupId, granularity, startDate, endDate).then(
      (data) => {
        setBuckets(data);
        setLoading(false);
      }
    );
  }, [groupId, granularity, startDate, endDate]);

  const handleGranularityChange = (value: string) => {
    const g = value as Granularity;
    setGranularity(g);
    const now = new Date();
    if (g === "daily" || g === "weekly") {
      setStartDate(format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"));
      setEndDate(format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"));
    } else {
      setStartDate(format(startOfMonth(now), "yyyy-MM-dd"));
      setEndDate(format(endOfMonth(now), "yyyy-MM-dd"));
    }
  };

  const totalPeriod = buckets.reduce((sum, b) => sum + b.total, 0);
  const maxBucketTotal = Math.max(...buckets.map((b) => b.total), 1);

  // Aggregate categories across all buckets
  const categoryTotals: Record<string, { amount: number; color: string }> = {};
  for (const bucket of buckets) {
    for (const [name, data] of Object.entries(bucket.byCategory)) {
      if (!categoryTotals[name]) {
        categoryTotals[name] = { amount: 0, color: data.color };
      }
      categoryTotals[name].amount += data.amount;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
        <Tabs value={granularity} onValueChange={(v) => v && handleGranularityChange(v)}>
          <TabsList>
            <TabsTrigger value="daily">Diario</TabsTrigger>
            <TabsTrigger value="weekly">Semanal</TabsTrigger>
            <TabsTrigger value="monthly">Mensual</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex gap-2 items-center">
          <div>
            <Label className="text-xs">Desde</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-auto"
            />
          </div>
          <div>
            <Label className="text-xs">Hasta</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-auto"
            />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">
            $
            {totalPeriod.toLocaleString("es-AR", {
              minimumFractionDigits: 2,
            })}
          </CardTitle>
          <p className="text-sm text-muted-foreground">Total del período</p>
        </CardHeader>
      </Card>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Cargando...
        </div>
      ) : buckets.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No hay gastos en este período.
        </div>
      ) : (
        <>
          {/* Bar chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gastos por período</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {buckets.map((bucket) => (
                  <div key={bucket.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{bucket.label}</span>
                      <span className="font-medium">
                        $
                        {bucket.total.toLocaleString("es-AR", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="h-6 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{
                          width: `${(bucket.total / maxBucketTotal) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Category breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Por categoría</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(categoryTotals)
                  .sort(([, a], [, b]) => b.amount - a.amount)
                  .map(([name, data]) => (
                    <div key={name} className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: data.color }}
                      />
                      <span className="flex-1 text-sm">{name}</span>
                      <span className="text-sm font-medium">
                        $
                        {data.amount.toLocaleString("es-AR", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                      <span className="text-xs text-muted-foreground w-12 text-right">
                        {((data.amount / totalPeriod) * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
