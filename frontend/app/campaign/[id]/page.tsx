"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import AgentCard from "@/components/AgentCard";
import MetricTile from "@/components/MetricTile";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

interface AgentData {
  executor_id: number;
  executor_name: string;
  category: string;
  status: string;
  cost: number;
  visits: number;
  signups: number;
  conversions: number;
  notes: string | null;
}

interface CampaignDetail {
  id: number;
  budget: number;
  goal: string;
  status: string;
  product_url: string;
  product_name: string;
  executions: AgentData[];
  created_at: string;
}

export default function CampaignDashboard({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  async function fetchCampaign() {
    try {
      const res = await fetch(`${API_BASE}/api/campaigns/${id}`);
      if (!res.ok) throw new Error("Campaign not found");
      const data = await res.json();
      setCampaign(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCampaign();
  }, [id]);

  // Poll for updates when campaign is running
  useEffect(() => {
    if (campaign?.status === "running") {
      const interval = setInterval(fetchCampaign, 2000);
      return () => clearInterval(interval);
    }
  }, [campaign?.status]);

  async function handleStart() {
    setStarting(true);
    try {
      const res = await fetch(`${API_BASE}/api/campaigns/${id}/start`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to start");
      await fetchCampaign();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start");
    } finally {
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-red-600 mb-4">{error || "Campaign not found"}</p>
        <Link href="/create" className="text-indigo-600 hover:underline">
          Create a new campaign
        </Link>
      </div>
    );
  }

  const totals = (campaign.executions || []).reduce(
    (acc, ex) => ({
      visits: acc.visits + ex.visits,
      signups: acc.signups + ex.signups,
      conversions: acc.conversions + ex.conversions,
      cost: acc.cost + ex.cost,
    }),
    { visits: 0, signups: 0, conversions: 0, cost: 0 }
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {campaign.product_name}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {campaign.product_url} · Created{" "}
            {new Date(campaign.created_at).toLocaleDateString()}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                campaign.status === "completed"
                  ? "bg-green-100 text-green-700"
                  : campaign.status === "running"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {campaign.status}
            </span>
            <span className="text-sm text-gray-500">
              Budget: ${campaign.budget} · Goal: {campaign.goal}
            </span>
          </div>
        </div>

        {campaign.status === "draft" && (
          <button
            onClick={handleStart}
            disabled={starting}
            className="bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {starting ? "Starting..." : "Start Campaign"}
          </button>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricTile
          label="Total Visits"
          value={totals.visits.toLocaleString()}
        />
        <MetricTile
          label="Signups"
          value={totals.signups.toLocaleString()}
        />
        <MetricTile
          label="Conversions"
          value={totals.conversions.toLocaleString()}
        />
        <MetricTile
          label="Cost per Signup"
          value={`$${totals.signups > 0 ? (totals.cost / totals.signups).toFixed(2) : "—"}`}
        />
      </div>

      {/* Agent Cards */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Active Agents ({campaign.executions?.length || 0})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(campaign.executions || []).map((agent) => (
            <AgentCard
              key={agent.executor_id}
              name={agent.executor_name}
              category={agent.category}
              status={agent.status}
              cost={agent.cost}
              visits={agent.visits}
              signups={agent.signups}
              conversions={agent.conversions}
              notes={agent.notes}
            />
          ))}
        </div>
      </div>

      {/* Link to Results */}
      {campaign.status === "completed" && totals.visits > 0 && (
        <Link
          href={`/campaign/${id}/results`}
          className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium"
        >
          View Detailed Results →
        </Link>
      )}
    </div>
  );
}
