"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";


interface Executor {
  id: number;
  name: string;
  category: string;
  webhook_url: string | null;
  is_public: number;
  user_id: number | null;
  creator_name?: string;
}

interface Campaign {
  id: number;
  budget: number;
  goal: string;
  product_name: string;
  product_url: string;
}

export default function SelectAgentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [executors, setExecutors] = useState<Executor[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("indieboost_token");
    if (!token) { router.push("/login"); return; }

    async function load() {
      try {
        const [campaignRes, executorsRes] = await Promise.all([
          fetch(`/api/campaigns/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`/api/executors`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (!campaignRes.ok) throw new Error("Campaign not found");
        if (!executorsRes.ok) throw new Error("Failed to load agents");

        const c = await campaignRes.json();
        const e = await executorsRes.json();
        setCampaign(c);
        setExecutors(e);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, router]);

  function toggleExecutor(executorId: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(executorId)) next.delete(executorId);
      else next.add(executorId);
      return next;
    });
  }

  async function handleLaunch() {
    if (selected.size === 0) return;
    setLaunching(true);
    setError("");

    const token = localStorage.getItem("indieboost_token");
    try {
      const res = await fetch(`/api/campaigns/${id}/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ executor_ids: Array.from(selected) }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to launch");
      }
      router.push(`/campaign/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to launch");
    } finally {
      setLaunching(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && !campaign) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Link href="/create" className="text-indigo-600 hover:underline">
          Back to Create
        </Link>
      </div>
    );
  }

  const budgetPerAgent = campaign ? Math.round((campaign.budget / (selected.size || 1)) * 100) / 100 : 0;
  const builtIn = executors.filter((e) => !e.webhook_url);
  const custom = executors.filter((e) => e.webhook_url);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href={`/campaign/${id}`} className="text-sm text-gray-400 hover:text-gray-600">
          ← Back to campaign
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">
          Select Agents
        </h1>
        {campaign && (
          <p className="text-sm text-gray-500 mt-1">
            {campaign.product_name} · ${campaign.budget} budget · {campaign.goal}
          </p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
          {error}
        </div>
      )}

      {/* Built-in agents */}
      {builtIn.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Platform Agents
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {builtIn.map((executor) => {
              const isSelected = selected.has(executor.id);
              return (
                <button
                  key={executor.id}
                  onClick={() => toggleExecutor(executor.id)}
                  className={`text-left p-4 rounded-xl border-2 transition ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">{executor.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      executor.category === "seo" ? "bg-green-100 text-green-700" :
                      executor.category === "reddit" ? "bg-orange-100 text-orange-700" :
                      executor.category === "twitter" ? "bg-blue-100 text-blue-700" :
                      executor.category === "newsletter" ? "bg-purple-100 text-purple-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {executor.category}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Built-in simulation agent</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Custom webhook agents */}
      {custom.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Community Agents
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {custom.map((executor) => {
              const isSelected = selected.has(executor.id);
              const isOwn = String(executor.user_id) === "1"; // demo user
              return (
                <button
                  key={executor.id}
                  onClick={() => toggleExecutor(executor.id)}
                  className={`text-left p-4 rounded-xl border-2 transition ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">{executor.name}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {executor.category}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {isOwn ? "Your agent" : `by ${executor.creator_name || "community"}`}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary & Launch */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 sticky bottom-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-sm text-gray-500">
              {selected.size} agent{selected.size !== 1 ? "s" : ""} selected
            </span>
            <span className="text-sm text-gray-400 ml-3">
              ≈ ${budgetPerAgent}/agent
            </span>
          </div>
          <button
            onClick={handleLaunch}
            disabled={selected.size === 0 || launching}
            className="bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {launching ? "Launching..." : "Launch Campaign"}
          </button>
        </div>
      </div>
    </div>
  );
}
