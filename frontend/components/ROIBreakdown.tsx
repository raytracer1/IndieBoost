interface AttributionData {
  visits: number;
  signups: number;
  cost: number;
}

interface ROIBreakdownProps {
  attribution: Record<string, AttributionData>;
  totalVisits: number;
}

const categoryLabels: Record<string, string> = {
  seo: "SEO",
  reddit: "Reddit",
  twitter: "X (Twitter)",
  newsletter: "Newsletter",
};

const barColors: Record<string, string> = {
  seo: "bg-green-500",
  reddit: "bg-orange-500",
  twitter: "bg-blue-500",
  newsletter: "bg-purple-500",
};

export default function ROIBreakdown({ attribution, totalVisits }: ROIBreakdownProps) {
  const entries = Object.entries(attribution);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-4">Attribution Breakdown</h3>

      {/* Bar chart */}
      <div className="space-y-3 mb-4">
        {entries.map(([key, data]) => {
          const pct = totalVisits > 0 ? (data.visits / totalVisits) * 100 : 0;
          return (
            <div key={key}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{categoryLabels[key] || key}</span>
                <span className="text-gray-900 font-medium">{data.visits.toLocaleString()} visits</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${barColors[key] || "bg-gray-400"}`}
                  style={{ width: `${Math.max(pct, 1)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 border-b border-gray-100">
            <th className="text-left py-2 font-medium">Source</th>
            <th className="text-right py-2 font-medium">Visits</th>
            <th className="text-right py-2 font-medium">Signups</th>
            <th className="text-right py-2 font-medium">Cost</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([key, data]) => (
            <tr key={key} className="border-b border-gray-50">
              <td className="py-2 font-medium text-gray-900">{categoryLabels[key] || key}</td>
              <td className="py-2 text-right text-gray-600">{data.visits.toLocaleString()}</td>
              <td className="py-2 text-right text-gray-600">{data.signups.toLocaleString()}</td>
              <td className="py-2 text-right text-gray-600">${data.cost.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
