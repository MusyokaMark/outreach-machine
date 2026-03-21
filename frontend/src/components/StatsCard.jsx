export default function StatsCard({ label, value, color = "indigo" }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600",
    green: "bg-green-50  text-green-600",
    amber: "bg-amber-50  text-amber-600",
    blue: "bg-blue-50   text-blue-600",
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <div
        className={`inline-block px-3 py-1 rounded-lg text-2xl font-bold ${colors[color]}`}
      >
        {value ?? "—"}
      </div>
    </div>
  );
}
