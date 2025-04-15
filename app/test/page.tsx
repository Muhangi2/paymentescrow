'use client'; // Required for client-side code in App Router

import { useState, useEffect } from 'react';
import { initRelay, sendGiftWrappedMessage, receiveGiftWrappedMessage, senderPublicKey, receiverPublicKey } from '../lib/nostr';

export default function TestPage() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    initRelay().catch((err: Error) => setMessage(`Relay init failed: ${err.message}`));
  }, []);

  const handleTestNostr = async () => {
    try {
      setMessage('Sending...');
      const eventId = await sendGiftWrappedMessage('Hello, NIP-17 test from Next.js!');
      setMessage(`Message sent (ID: ${eventId.slice(0, 10)}...), waiting for receipt...`);
      const decrypted = await receiveGiftWrappedMessage();
      setMessage(`Received: "${decrypted}" (Sender: ${senderPublicKey.slice(0, 10)}..., Receiver: ${receiverPublicKey.slice(0, 10)}...)`);
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Nostr Test</h1>
      <button onClick={handleTestNostr}>Run Nostr Test</button>
      <p>{message}</p>
    </div>
  );
}