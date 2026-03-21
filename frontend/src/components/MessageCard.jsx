import { sendEmail, regenerateMsg, updateMessage } from '../api';

export default function MessageCard({ message, profile, onUpdate }) {
  const statusColors = {
    draft:   'bg-gray-100  text-gray-600',
    sent:    'bg-blue-100  text-blue-600',
    opened:  'bg-amber-100 text-amber-600',
    replied: 'bg-green-100 text-green-600',
    bounced: 'bg-red-100   text-red-600',
  };

  const msgId      = message['_id'];
  const msgSubject = message['subject'];
  const msgBody    = message['body'];
  const msgStatus  = message['status'];
  const msgSentAt  = message['sentAt'];
  const msgFollowUpDate  = message['followUpDate'];
  const msgFollowUpSent  = message['followUpSent'];
  const leadName   = message['lead'] ? message['lead']['name'] : '';
  const leadCompany = message['lead'] ? message['lead']['company'] : '';

  async function handleSend() {
    try {
      await sendEmail(msgId);
      alert('Email sent!');
      onUpdate();
    } catch (err) {
      alert('Failed to send: ' + err['message']);
    }
  }

  async function handleRegenerate() {
    const instructions = prompt('Any specific instructions? (or leave blank)');
    try {
      await regenerateMsg(msgId, profile, instructions);
      alert('Message regenerated!');
      onUpdate();
    } catch {
      alert('Regeneration failed');
    }
  }

  async function handleMarkReplied() {
    await updateMessage(msgId, { status: 'replied' });
    onUpdate();
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-gray-900 text-sm">{msgSubject}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            To: {leadName} · {leadCompany}
          </p>
        </div>
        <span className={'text-xs px-2 py-1 rounded-full font-medium ' + (statusColors[msgStatus] || '')}>
          {msgStatus}
        </span>
      </div>

      <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-line leading-relaxed">
        {msgBody}
      </p>

      {msgSentAt && (
        <p className="text-xs text-gray-400">
          Sent: {new Date(msgSentAt)['toLocaleDateString']()}
          {msgFollowUpDate && !msgFollowUpSent && (
            <span> · Follow-up: {new Date(msgFollowUpDate)['toLocaleDateString']()}</span>
          )}
        </p>
      )}

      <div className="flex gap-2 flex-wrap">
        {msgStatus === 'draft' && (
          <button
            onClick={handleSend}
            className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors"
          >
            Send Email
          </button>
        )}
        <button
          onClick={handleRegenerate}
          className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          Regenerate
        </button>
        {msgStatus === 'sent' && (
          <button
            onClick={handleMarkReplied}
            className="text-xs bg-green-50 text-green-600 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
          >
            Mark Replied
          </button>
        )}
      </div>
    </div>
  );
}