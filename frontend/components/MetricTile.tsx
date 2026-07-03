interface MetricTileProps {
  label: string;
  value: string | number;
  sublabel?: string;
}

export default function MetricTile({ label, value, sublabel }: MetricTileProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-1">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-2xl font-bold text-gray-900">{value}</span>
      {sublabel && <span className="text-xs text-gray-400">{sublabel}</span>}
    </div>
  );
}
