import { useEffect, useState } from "react";
import { getMessages } from "../api";
import MessageCard from "../components/MessageCard";

const defaultProfile = { service: "", skills: "", experience: "", results: "" };

export default function Messages() {
  const [messages, setMessages] = useState([]);
  const [filter, setFilter] = useState("all");
  const profile =
    JSON.parse(localStorage.getItem("profile") || "null") || defaultProfile;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await getMessages();
      if (!cancelled) setMessages(data);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshMessages() {
    const { data } = await getMessages();
    setMessages(data);
  }

  const filtered =
    filter === "all" ? messages : messages.filter((m) => m.status === filter);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <button
          onClick={refreshMessages}
          className="text-sm bg-gray-100 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Refresh
        </button>
      </div>
      <p className="text-gray-500 mb-6">{messages.length} total messages</p>

      <div className="flex gap-2 mb-4 flex-wrap">
        {["all", "draft", "sent", "opened", "replied", "bounced"].map((s) => (
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
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No messages found</p>
          <p className="text-sm mt-1">
            Generate messages from the Dashboard or Leads page
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((msg) => (
            <MessageCard
              key={msg._id}
              message={msg}
              profile={profile}
              onUpdate={refreshMessages}
            />
          ))}
        </div>
      )}
    </div>
  );
}
