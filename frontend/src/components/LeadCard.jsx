import { updateLead, deleteLead, generateMsg } from "../api";

export default function LeadCard({ lead, profile, onUpdate, onDelete }) {
  const statusColors = {
    new: "bg-gray-100   text-gray-600",
    contacted: "bg-blue-100   text-blue-600",
    replied: "bg-green-100  text-green-600",
    converted: "bg-purple-100 text-purple-600",
    ignored: "bg-red-100    text-red-600",
  };

  const leadId = lead["_id"];
  const leadName = lead["name"];
  const leadTitle = lead["title"];
  const leadCompany = lead["company"];
  const leadLocation = lead["location"];
  const leadEmail = lead["email"];
  const leadStatus = lead["status"];
  const linkedinUrl = lead["linkedinUrl"];

  async function handleGenerate() {
    try {
      await generateMsg(leadId, profile);
      alert("Message generated for " + leadName);
      onUpdate();
    } catch {
      alert("Failed to generate message");
    }
  }

  async function handleDelete() {
    if (!confirm("Delete " + leadName + "?")) return;
    await deleteLead(leadId);
    onDelete(leadId);
  }

  async function handleStatusChange(e) {
    await updateLead(leadId, { status: e["target"]["value"] });
    onUpdate();
  }

  function handleLinkedin() {
    window.open(linkedinUrl);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{leadName}</h3>
          <p className="text-sm text-gray-500">{leadTitle}</p>
          <p className="text-sm text-gray-400">
            {leadCompany} · {leadLocation}
          </p>
        </div>
        <span
          className={
            "text-xs px-2 py-1 rounded-full font-medium " +
            (statusColors[leadStatus] || "")
          }
        >
          {leadStatus}
        </span>
      </div>

      {leadEmail && <p className="text-xs text-gray-400">{leadEmail}</p>}

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handleGenerate}
          className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Generate Message
        </button>

        {linkedinUrl && (
          <button
            onClick={handleLinkedin}
            className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
          >
            LinkedIn
          </button>
        )}

        <select
          value={leadStatus}
          onChange={handleStatusChange}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600"
        >
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="replied">Replied</option>
          <option value="converted">Converted</option>
          <option value="ignored">Ignored</option>
        </select>

        <button
          onClick={handleDelete}
          className="text-xs bg-red-50 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
