'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  DollarSign,
  PieChart,
  Users,
  Calendar,
  Sparkles,
  Loader2,
  AlertCircle,
  ArrowUpRight,
  ChevronRight,
  Crown,
  Zap,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function RevenueAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analytics/revenue');
      if (!res.ok) throw new Error('Failed to fetch revenue forecasts');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error('[Revenue Dashboard] Load failed:', err);
      setError(err.message || 'Analytics engine currently offline.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[80vh] space-y-4 text-muted-foreground bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
        <div className="text-center">
          <p className="text-sm font-bold text-foreground uppercase tracking-wider">Compiling Revenue Projections</p>
          <p className="text-xs text-muted-foreground mt-1">Simulating predictive CLV models and aggregating sales pipelines...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[80vh] text-center space-y-3 bg-background px-4">
        <AlertCircle className="size-10 text-rose-500/80" />
        <h3 className="text-lg font-bold text-foreground uppercase tracking-wider">Analytics Load Failed</h3>
        <p className="text-xs text-muted-foreground max-w-md">{error || 'An unexpected database error occurred.'}</p>
        <Button onClick={fetchAnalytics} className="bg-primary hover:bg-primary/90 text-slate-950 text-xs font-bold h-9 px-4 rounded-xl transition-all">
          Retry Aggregations
        </Button>
      </div>
    );
  }

  const { metrics, forecasts, groupings, clvLeaderboard } = data;

  // Calculate percentage ratios for visual bars
  const maxServiceVal = Math.max(...groupings.revenueByService.map((s: any) => s.value), 1);
  const maxSourceVal = Math.max(...groupings.revenueBySource.map((s: any) => s.value), 1);

  return (
    <div className="flex-1 space-y-6 p-6 bg-background text-foreground min-h-screen">
      {/* Top Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-card pb-5">
        <div>
          <h1 className="text-xl font-black text-foreground uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="size-5 text-primary" />
            Sales Intelligence & Revenue Projections
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Enterprise pipeline forecasting, predictive Customer Lifetime Value (CLV), and RAG audit analytics.</p>
        </div>
        <Button
          onClick={fetchAnalytics}
          className="bg-card hover:bg-muted text-foreground text-xs font-bold h-9 px-4 rounded-xl border border-border transition-all flex items-center gap-1.5"
        >
          <Sparkles className="size-3.5 text-amber-450 animate-pulse" />
          Refresh AI Predictions
        </Button>
      </div>

      {/* 1. Core KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-card/35 border border-border p-5 rounded-2xl shadow-xl flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider block">Total Pipeline Value</span>
            <p className="text-xl font-black text-foreground font-mono leading-none">
              INR {Number(metrics.totalPipeline).toLocaleString()}
            </p>
            <span className="text-[9px] text-muted-foreground leading-none block">Aggregate contract values</span>
          </div>
          <div className="p-3 bg-background border border-border rounded-xl">
            <DollarSign className="size-5 text-primary" />
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-card/35 border border-border p-5 rounded-2xl shadow-xl flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider block">Expected Revenue (Weighted)</span>
            <p className="text-xl font-black text-indigo-400 font-mono leading-none">
              INR {Number(metrics.expectedRevenue).toLocaleString()}
            </p>
            <span className="text-[9px] text-muted-foreground leading-none block">Probability-weighted forecast</span>
          </div>
          <div className="p-3 bg-background border border-border rounded-xl">
            <Sparkles className="size-5 text-indigo-400 animate-pulse" />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-card/35 border border-border p-5 rounded-2xl shadow-xl flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider block">Realized Revenue (Won)</span>
            <p className="text-xl font-black text-emerald-450 font-mono leading-none">
              INR {Number(metrics.wonRevenue).toLocaleString()}
            </p>
            <span className="text-[9px] text-muted-foreground leading-none block">Paid or signed agreements</span>
          </div>
          <div className="p-3 bg-background border border-border rounded-xl">
            <CheckCircle className="size-5 text-emerald-450" />
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-card/35 border border-border p-5 rounded-2xl shadow-xl flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider block">Team Conversion Win Rate</span>
            <p className="text-xl font-black text-foreground font-mono leading-none">
              {metrics.winRate}%
            </p>
            <span className="text-[9px] text-muted-foreground leading-none block">Closed won vs closed lost ratio</span>
          </div>
          <div className="p-3 bg-background border border-border rounded-xl">
            <TrendingUp className="size-5 text-sky-450" />
          </div>
        </div>
      </div>

      {/* 2. Forecast Projections Grid */}
      <div className="bg-card/35 border border-border p-5 rounded-2xl shadow-xl space-y-4">
        <h3 className="text-xs font-extrabold text-foreground tracking-wider uppercase flex items-center gap-1.5">
          <Calendar className="size-4 text-indigo-400" />
          Expected Revenue Projections
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Monthly Forecast */}
          <div className="bg-background/50 p-5 rounded-xl border border-border space-y-2">
            <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider">Monthly Expected Revenue</span>
            <p className="text-2xl font-black text-foreground font-mono leading-none">
              INR {Number(forecasts.monthly).toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground leading-relaxed pt-1.5">Weighted deals closing within the current billing cycle.</p>
            <div className="w-full bg-card h-1 rounded-full mt-3 overflow-hidden">
              <div className="h-full bg-primary w-2/3 rounded-full" />
            </div>
          </div>

          {/* Quarterly Forecast */}
          <div className="bg-background/50 p-5 rounded-xl border border-border space-y-2">
            <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider text-indigo-400">Quarterly Projections</span>
            <p className="text-2xl font-black text-indigo-400 font-mono leading-none">
              INR {Number(forecasts.quarterly).toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground leading-relaxed pt-1.5">Expected closed deals for Q2/Q3 operational cycles.</p>
            <div className="w-full bg-card h-1 rounded-full mt-3 overflow-hidden">
              <div className="h-full bg-indigo-450 w-3/4 rounded-full" />
            </div>
          </div>

          {/* Annual Forecast */}
          <div className="bg-background/50 p-5 rounded-xl border border-border space-y-2">
            <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider text-fuchsia-450">Annual Projected Goal</span>
            <p className="text-2xl font-black text-fuchsia-450 font-mono leading-none">
              INR {Number(forecasts.annual).toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground leading-relaxed pt-1.5">Total predicted recurring and pipeline revenues for 2026.</p>
            <div className="w-full bg-card h-1 rounded-full mt-3 overflow-hidden">
              <div className="h-full bg-fuchsia-500 w-4/5 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Groupings and Breakdowns Side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Breakdown */}
        <div className="bg-card/35 border border-border p-5 rounded-2xl shadow-xl space-y-4">
          <h3 className="text-xs font-extrabold text-foreground tracking-wider uppercase flex items-center gap-1.5 border-b border-card pb-3">
            <PieChart className="size-4 text-purple-400" />
            Revenue by Service Package
          </h3>
          <div className="space-y-3">
            {groupings.revenueByService.map((srv: any, idx: number) => {
              const pct = Math.round((srv.value / maxServiceVal) * 100);
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-foreground">{srv.name}</span>
                    <span className="font-bold font-mono text-muted-foreground">INR {Number(srv.value).toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-background border border-border rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Source Breakdown */}
        <div className="bg-card/35 border border-border p-5 rounded-2xl shadow-xl space-y-4">
          <h3 className="text-xs font-extrabold text-foreground tracking-wider uppercase flex items-center gap-1.5 border-b border-card pb-3">
            <Users className="size-4 text-teal-400" />
            Revenue by Lead Source
          </h3>
          <div className="space-y-3">
            {groupings.revenueBySource.map((src: any, idx: number) => {
              const pct = Math.round((src.value / maxSourceVal) * 100);
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-foreground">{src.name}</span>
                    <span className="font-bold font-mono text-muted-foreground">INR {Number(src.value).toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-background border border-border rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-teal-500 to-sky-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Customer Lifetime Value (CLV) Leaderboard */}
      <div className="bg-card/35 border border-border p-5 rounded-2xl shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-card pb-3">
          <div>
            <h3 className="text-xs font-extrabold text-foreground tracking-wider uppercase flex items-center gap-2">
              <Crown className="size-4 text-amber-400 animate-pulse" />
              Customer Lifetime Value (CLV) & Retention Leaderboard
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">Deep AI-predicted revenue profiles based on communication frequency & billing histories.</p>
          </div>
          <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5">
            Premium Predictions
          </Badge>
        </div>

        <div className="border border-border rounded-xl overflow-hidden shadow-inner">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-background border-b border-border text-slate-450 text-[10px] font-bold uppercase tracking-wider">
                <th className="p-3.5">Client Details</th>
                <th className="p-3.5">Industry</th>
                <th className="p-3.5 text-right">Actual Revenue</th>
                <th className="p-3.5 text-right">Predicted CLV</th>
                <th className="p-3.5 text-right">MRR Proj</th>
                <th className="p-3.5 text-center">Repeat Prob</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-foreground">
              {clvLeaderboard.map((c: any, index: number) => (
                <tr key={c.id} className="hover:bg-card/25 transition-all">
                  <td className="p-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="size-7 rounded-lg bg-background border border-border flex items-center justify-center text-xs font-black font-mono text-muted-foreground shrink-0">
                        {index === 0 ? <Crown className="size-3.5 text-amber-400" /> : index + 1}
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-xs">{c.contactName}</p>
                        <p className="text-[10px] text-muted-foreground">{c.company}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3.5 text-muted-foreground font-medium">{c.industry}</td>
                  <td className="p-3.5 text-right font-mono font-semibold">INR {Number(c.actualPaid).toLocaleString()}</td>
                  <td className="p-3.5 text-right font-mono font-bold text-indigo-400">INR {Number(c.predictedClv).toLocaleString()}</td>
                  <td className="p-3.5 text-right font-mono font-semibold text-emerald-450">INR {Number(c.recurringRevenue).toLocaleString()}<span className="text-[9px] text-muted-foreground font-normal">/mo</span></td>
                  <td className="p-3.5 text-center">
                    <div className="inline-flex items-center gap-1 bg-background px-2.5 py-0.5 rounded-full border border-border">
                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <span className="font-bold font-mono text-[10px] text-foreground">{c.repeatProbability}%</span>
                    </div>
                  </td>
                  <td className="p-3.5 text-center">
                    <Link href={`/contacts/${c.id}`}>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[10px] font-bold border border-border text-muted-foreground hover:text-foreground hover:bg-card rounded-lg px-2 flex items-center gap-0.5 ml-auto mr-auto"
                      >
                        Profile
                        <ChevronRight className="size-3" />
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
