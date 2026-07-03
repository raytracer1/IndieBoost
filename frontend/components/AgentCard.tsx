interface AgentCardProps {
  name: string;
  category: string;
  status: string;
  cost: number;
  visits: number;
  signups: number;
  conversions: number;
  notes?: string | null;
}

const categoryColors: Record<string, string> = {
  seo: "bg-green-100 text-green-800",
  reddit: "bg-orange-100 text-orange-800",
  twitter: "bg-blue-100 text-blue-800",
  newsletter: "bg-purple-100 text-purple-800",
};

const statusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600",
  running: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

export default function AgentCard({ name, category, status, cost, visits, signups, conversions, notes }: AgentCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${categoryColors[category] || "bg-gray-100 text-gray-600"}`}>
            {category.toUpperCase()}
          </span>
          <h3 className="font-semibold text-gray-900">{name}</h3>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[status] || "bg-gray-100 text-gray-600"}`}>
          {status}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-lg font-bold text-gray-900">{visits.toLocaleString()}</div>
          <div className="text-xs text-gray-500">Visits</div>
        </div>
        <div>
          <div className="text-lg font-bold text-gray-900">{signups.toLocaleString()}</div>
          <div className="text-xs text-gray-500">Signups</div>
        </div>
        <div>
          <div className="text-lg font-bold text-gray-900">${cost.toFixed(0)}</div>
          <div className="text-xs text-gray-500">Cost</div>
        </div>
      </div>

      {notes && <p className="text-xs text-gray-500 leading-relaxed">{notes}</p>}
    </div>
  );
}
