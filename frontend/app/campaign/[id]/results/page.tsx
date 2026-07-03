"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import MetricTile from "@/components/MetricTile";
import ROIBreakdown from "@/components/ROIBreakdown";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

interface ResultsData {
  campaign_id: number;
  budget: number;
  goal: string;
  status: string;
  product_url: string;
  product_name: string;
  totals: {
    visits: number;
    signups: number;
    conversions: number;
    total_cost: number;
  };
  roi: {
    cost_per_signup: number;
    cost_per_visit: number;
  };
  agents: Array<{
    executor_id: number;
    executor_name: string;
    category: string;
    status: string;
    cost: number;
    visits: number;
    signups: number;
    conversions: number;
    notes: string | null;
  }>;
  attribution: Record<
    string,
    { visits: number; signups: number; cost: number }
  >;
}

export default function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [results, setResults] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchResults() {
      try {
        const res = await fetch(`${API_BASE}/api/campaigns/${id}/results`);
        if (!res.ok) throw new Error("Failed to load results");
        const data = await res.json();
        setResults(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    fetchResults();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-red-600 mb-4">{error || "Results not found"}</p>
        <Link
          href={`/campaign/${id}`}
          className="text-indigo-600 hover:underline"
        >
          Back to campaign
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          href={`/campaign/${id}`}
          className="text-gray-400 hover:text-gray-600"
        >
          ← Back
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          Results: {results.product_name}
        </h1>
        <span className="text-sm text-gray-500">
          ${results.budget} · {results.goal}
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <MetricTile
          label="Total Visits"
          value={results.totals.visits.toLocaleString()}
        />
        <MetricTile
          label="Signups"
          value={results.totals.signups.toLocaleString()}
        />
        <MetricTile
          label="Conversions"
          value={results.totals.conversions.toLocaleString()}
        />
        <MetricTile
          label="Cost/Signup"
          value={`$${results.roi.cost_per_signup.toFixed(2)}`}
        />
        <MetricTile
          label="Total Spend"
          value={`$${results.totals.total_cost.toFixed(0)}`}
        />
      </div>

      {/* Attribution Chart */}
      <div className="mb-8">
        <ROIBreakdown
          attribution={results.attribution}
          totalVisits={results.totals.visits}
        />
      </div>

      {/* Agent Details */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Agent Performance
        </h2>
        <div className="space-y-3">
          {results.agents.map((agent) => {
            const costPerSignup =
              agent.signups > 0
                ? (agent.cost / agent.signups).toFixed(2)
                : "—";
            return (
              <div
                key={agent.executor_id}
                className="bg-white rounded-xl border border-gray-200 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">
                      {agent.executor_name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {agent.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-500">
                      {agent.visits.toLocaleString()} visits
                    </span>
                    <span className="text-gray-500">
                      {agent.signups.toLocaleString()} signups
                    </span>
                    <span className="text-gray-500">
                      ${costPerSignup}/signup
                    </span>
                  </div>
                </div>
                {agent.notes && (
                  <p className="text-xs text-gray-400">{agent.notes}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
