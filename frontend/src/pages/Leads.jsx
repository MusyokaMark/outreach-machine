import { useEffect, useState } from "react";
import { getLeads } from "../api";
import LeadCard from "../components/LeadCard";

const defaultProfile = {
  service: "",
  skills: "",
  experience: "",
  results: "",
};

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const profile =
    JSON.parse(localStorage.getItem("profile") || "null") || defaultProfile;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await getLeads();
      if (!cancelled) setLeads(data);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshLeads() {
    const { data } = await getLeads();
    setLeads(data);
  }

  const filtered = leads.filter((lead) => {
    const matchStatus = filter === "all" || lead.status === filter;
    const matchSearch =
      lead.name.toLowerCase().includes(search.toLowerCase()) ||
      lead.company.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-500">{leads.length} total leads</p>
        </div>
        <button
          onClick={refreshLeads}
          className="text-sm bg-gray-100 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or company..."
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 flex-1 min-w-48"
        />
        {["all", "new", "contacted", "replied", "converted", "ignored"].map(
          (s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                filter === s
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s}
            </button>
          ),
        )}
      </div>

      {/* Lead Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No leads found</p>
          <p className="text-sm mt-1">
            Go to Dashboard and scrape LinkedIn to find leads
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((lead) => (
            <LeadCard
              key={lead._id}
              lead={lead}
              profile={profile}
              onUpdate={refreshLeads}
              onDelete={(id) => setLeads((l) => l.filter((x) => x._id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
