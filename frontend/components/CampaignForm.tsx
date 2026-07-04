"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";


export default function CampaignForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("signups");
  const [budget, setBudget] = useState(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    

    try {
      const res = await fetch(`/api/campaigns`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          
        },
        body: JSON.stringify({ url, name: name || undefined, goal, budget }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create campaign");
      }

      const campaign = await res.json();
      router.push(`/campaign/${campaign.id}/select`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      <h2 className="text-lg font-semibold text-gray-900">Campaign Details</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      {/* Product URL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Product URL <span className="text-red-500">*</span>
        </label>
        <input
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://myapp.com"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* Product Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Product Name <span className="text-gray-400 text-xs">(auto-detected if empty)</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. MyApp"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* Goal */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Goal</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: "signups", label: "Signups" },
            { value: "visits", label: "Visits" },
            { value: "waitlist", label: "Waitlist" },
          ].map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => setGoal(g.value)}
              className={`px-3 py-2 text-sm font-medium rounded-lg border transition ${
                goal === g.value
                  ? "bg-indigo-50 border-indigo-500 text-indigo-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Budget */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Budget: <span className="text-indigo-600 font-bold">${budget}</span>
        </label>
        <input
          type="range"
          min={5}
          max={100}
          step={5}
          value={budget}
          onChange={(e) => setBudget(Number(e.target.value))}
          className="w-full accent-indigo-600"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>$5</span>
          <span>$50</span>
          <span>$100</span>
        </div>
      </div>

      {/* Agents preview */}
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-gray-500 mb-2">
          {budget < 20 ? "2 AI agents" : budget < 50 ? "3 AI agents" : "4 AI agents"} will be assigned:
        </p>
        <div className="flex flex-wrap gap-1">
          {["SEO", "Reddit", "Twitter", "Newsletter"]
            .slice(0, budget < 20 ? 2 : budget < 50 ? 3 : 4)
            .map((agent) => (
              <span key={agent} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                {agent}
              </span>
            ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !url}
        className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {loading ? "Creating..." : "Generate Growth Plan"}
      </button>
    </form>
  );
}
