import { relayInit, generatePrivateKey, getPublicKey, finishEvent, nip04 } from 'nostr-tools';

// Singleton relay instance
const relay = relayInit('wss://relay.damus.io');

// Sender and receiver keys (persist these in a real app)
const senderPrivateKey = generatePrivateKey();
const senderPublicKey = getPublicKey(senderPrivateKey);
const receiverPrivateKey = generatePrivateKey();
const receiverPublicKey = getPublicKey(receiverPrivateKey);

export async function initRelay() {
  await relay.connect();
  relay.on('connect', () => console.log(`Connected to ${relay.url}`));
  relay.on('error', () => console.log(`Failed to connect to ${relay.url}`));
}

export async function sendGiftWrappedMessage(content: string): Promise<string> {
  const encrypted = await nip04.encrypt(senderPrivateKey, receiverPublicKey, content);
  const event = finishEvent({
    kind: 1059, // NIP-17 gift wrap
    content: encrypted,
    tags: [['p', receiverPublicKey]],
    created_at: Math.floor(Date.now() / 1000),
  }, senderPrivateKey);

  await relay.publish(event);
  return event.id; // Return event ID for feedback
}

export async function receiveGiftWrappedMessage(): Promise<string> {
  return new Promise((resolve, reject) => {
    const sub = relay.sub([{ kinds: [1059], authors: [senderPublicKey] }]);
    sub.on('event', async (event) => {
      if (event.tags.some(tag => tag[1] === receiverPublicKey)) {
        const decrypted = await nip04.decrypt(receiverPrivateKey, senderPublicKey, event.content);
        resolve(decrypted);
        sub.unsub(); // Stop subscription after receiving
      }
    });
    sub.on('eose', () => sub.unsub()); // End of stored events
    setTimeout(() => reject(new Error('No message received')), 5000); // Timeout after 5s
  });
}