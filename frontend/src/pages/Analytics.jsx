import { useEffect, useState } from "react";
import { getStats, getMessages } from "../api";
import StatsCard from "../components/StatsCard";
import Spinner from "../components/Spinner";

export default function Analytics() {
  const [stats, setStats] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [s, m] = await Promise.all([
        getStats(),
        getMessages(),
      ]);
      if (!cancelled) {
        setStats(s.data);
        setMessages(m.data);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <Spinner text="Loading analytics..." />;

  const conversionRate =
    stats.leads.total > 0
      ? Math.round((stats.leads.converted / stats.leads.total) * 100)
      : 0;

  const replyRate =
    stats.leads.total > 0
      ? Math.round((stats.leads.replied / stats.leads.total) * 100)
      : 0;

  const statusGroups = [
    { label: "New", count: stats.leads.new, color: "bg-gray-400" },
    { label: "Contacted", count: stats.leads.contacted, color: "bg-blue-400" },
    { label: "Replied", count: stats.leads.replied, color: "bg-green-400" },
    {
      label: "Converted",
      count: stats.leads.converted,
      color: "bg-purple-400",
    },
    { label: "Ignored", count: stats.leads.ignored || 0, color: "bg-red-300" },
  ];

  const maxCount = Math.max(...statusGroups.map((g) => g.count), 1);

  const recentSent = messages
    .filter((m) => m.status === "sent" || m.status === "replied")
    .slice(0, 5);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Analytics</h1>
      <p className="text-gray-500 mb-6">Track your outreach performance</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatsCard
          label="Total Leads"
          value={stats.leads.total}
          color="indigo"
        />
        <StatsCard
          label="Emails Sent"
          value={stats.messages.sent}
          color="blue"
        />
        <StatsCard label="Reply Rate" value={`${replyRate}%`} color="green" />
        <StatsCard
          label="Conversion Rate"
          value={`${conversionRate}%`}
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Lead Pipeline</h2>
          <div className="flex flex-col gap-3">
            {statusGroups.map((group) => (
              <div key={group.label} className="flex items-center gap-3">
                <span className="text-sm text-gray-500 w-20">
                  {group.label}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                  <div
                    className={`${group.color} h-5 rounded-full transition-all duration-500`}
                    style={{ width: `${(group.count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700 w-6 text-right">
                  {group.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Message stats */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Message Stats</h2>
          <div className="flex flex-col gap-3">
            {[
              {
                label: "Total Generated",
                value: stats.messages.total,
                color: "text-gray-700",
              },
              {
                label: "Drafts",
                value: stats.messages.draft,
                color: "text-amber-600",
              },
              {
                label: "Sent",
                value: stats.messages.sent,
                color: "text-blue-600",
              },
              {
                label: "Follow-ups Due",
                value: stats.followUpsDue,
                color: "text-red-500",
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex justify-between items-center py-2 border-b border-gray-50"
              >
                <span className="text-sm text-gray-500">{row.label}</span>
                <span className={`text-sm font-bold ${row.color}`}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Recent Activity</h2>
        {recentSent.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">
            No emails sent yet — go to Dashboard to start your outreach!
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {recentSent.map((msg) => (
              <div
                key={msg._id}
                className="flex items-center justify-between py-2 border-b border-gray-50"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {msg.lead?.name}
                  </p>
                  <p className="text-xs text-gray-400">{msg.subject}</p>
                </div>
                <div className="text-right">
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      msg.status === "replied"
                        ? "bg-green-100 text-green-600"
                        : "bg-blue-100 text-blue-600"
                    }`}
                  >
                    {msg.status}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">
                    {msg.sentAt
                      ? new Date(msg.sentAt).toLocaleDateString()
                      : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
