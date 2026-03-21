import { useEffect, useState } from "react";
import { getStats, scrapeLeads, generateBulk, sendBulk } from "../api";
import StatsCard from "../components/StatsCard";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setQuery] = useState("");
  const [maxLeads, setMaxLeads] = useState(10);
  const [profile, setProfile] = useState({
    service: "",
    skills: "",
    experience: "",
    results: "",
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await getStats();
      if (!cancelled) setStats(data);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshStats() {
    const { data } = await getStats();
    setStats(data);
  }

  async function handleScrape() {
    if (!searchQuery) return alert("Enter a search query");
    setLoading(true);
    try {
      await scrapeLeads({ searchQuery, maxLeads });
      alert(
        `Scraping started for "${searchQuery}" — check Leads page in a minute!`,
      );
      refreshStats();
    } catch {
      alert("Scrape failed — check your LinkedIn credentials in .env");
    }
    setLoading(false);
  }

  async function handleGenerateBulk() {
    if (!profile.service) return alert("Fill in your profile first");
    setLoading(true);
    try {
      await generateBulk(profile);
      alert("AI is generating messages for all new leads!");
      refreshStats();
    } catch {
      alert("Generation failed");
    }
    setLoading(false);
  }

  async function handleSendBulk() {
    if (!confirm("Send all draft emails now?")) return;
    setLoading(true);
    try {
      await sendBulk();
      alert("Sending all draft emails!");
      refreshStats();
    } catch {
      alert("Send failed");
    }
    setLoading(false);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Dashboard</h1>
      <p className="text-gray-500 mb-6">Your outreach pipeline at a glance</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatsCard
          label="Total Leads"
          value={stats?.leads?.total}
          color="indigo"
        />
        <StatsCard
          label="Contacted"
          value={stats?.leads?.contacted}
          color="blue"
        />
        <StatsCard
          label="Replied"
          value={stats?.leads?.replied}
          color="green"
        />
        <StatsCard
          label="Converted"
          value={stats?.leads?.converted}
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Find Leads</h2>
          <input
            value={searchQuery}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. marketing manager Nairobi"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <div className="flex items-center gap-3 mb-4">
            <label className="text-sm text-gray-500">Max leads:</label>
            <input
              type="number"
              value={maxLeads}
              onChange={(e) => setMaxLeads(Number(e.target.value))}
              className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
              min={1}
              max={50}
            />
          </div>
          <button
            onClick={handleScrape}
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Running..." : "Scrape LinkedIn"}
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Your Profile</h2>
          {[
            { key: "service", placeholder: "e.g. Social media management" },
            {
              key: "skills",
              placeholder: "e.g. Instagram, TikTok, Facebook Ads",
            },
            {
              key: "experience",
              placeholder: "e.g. 3 years managing SME accounts",
            },
            {
              key: "results",
              placeholder: "e.g. Grew a page from 200 to 15k followers",
            },
          ].map(({ key, placeholder }) => (
            <input
              key={key}
              value={profile[key]}
              onChange={(e) =>
                setProfile((p) => ({ ...p, [key]: e.target.value }))
              }
              placeholder={placeholder}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 md:col-span-2">
          <h2 className="font-semibold text-gray-900 mb-4">Bulk Actions</h2>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleGenerateBulk}
              disabled={loading}
              className="bg-amber-500 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors"
            >
              AI Generate All Messages
            </button>
            <button
              onClick={handleSendBulk}
              disabled={loading}
              className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              Send All Draft Emails
            </button>
            <button
              onClick={refreshStats}
              className="bg-gray-100 text-gray-700 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Refresh Stats
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <StatsCard
              label="Emails Sent"
              value={stats?.messages?.sent}
              color="blue"
            />
            <StatsCard
              label="Drafts Pending"
              value={stats?.messages?.draft}
              color="amber"
            />
            <StatsCard
              label="Follow-ups Due"
              value={stats?.followUpsDue}
              color="indigo"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
