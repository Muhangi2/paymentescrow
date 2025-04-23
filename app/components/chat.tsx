import { useState } from 'react';
import { sendNIP17 } from '../utils/nostr';

export default function Chat() {
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-2">Send Gift-Wrapped Nostr Message</h2>
      <input
        className="border p-2 w-full mb-2"
        placeholder="Recipient Public Key"
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
      />
      <textarea
        className="border p-2 w-full mb-2"
        rows={4}
        placeholder="Your message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded"
        onClick={() => sendNIP17(recipient, message)}
      >
        Send Message
      </button>
    </div>
  );
}
