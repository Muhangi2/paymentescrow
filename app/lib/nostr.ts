import { relayInit, generatePrivateKey, getPublicKey, finishEvent, nip04, Event } from 'nostr-tools';

// Singleton relay instance (wss://relay.damus.io is reliable and public)
const relay = relayInit('wss://relay.damus.io');

// Key pairs (generated once; in a real app, persist these securely)
const senderPrivateKey = generatePrivateKey();
const senderPublicKey = getPublicKey(senderPrivateKey);
const receiverPrivateKey = generatePrivateKey();
const receiverPublicKey = getPublicKey(receiverPrivateKey);

// Initialize relay connection
export async function initRelay(): Promise<void> {
  try {
    if (relay.status === 0 || relay.status === 3) { // 0 = disconnected, 3 = error
      await relay.connect();
    }
    relay.on('connect', () => console.log(`Connected to ${relay.url}`));
    relay.on('error', () => console.error(`Failed to connect to ${relay.url}`));
  } catch (error) {
    console.error('Relay initialization failed:', error);
    throw new Error('Could not connect to relay');
  }
}

// Send a gift-wrapped message (NIP-17)
export async function sendGiftWrappedMessage(content: string): Promise<string> {
  try {
    await initRelay(); // Ensure relay is connected
    const encrypted = await nip04.encrypt(senderPrivateKey, receiverPublicKey, content);
    const event = finishEvent({
      kind: 1059, // NIP-17 gift wrap
      content: encrypted,
      tags: [['p', receiverPublicKey]],
      created_at: Math.floor(Date.now() / 1000),
    }, senderPrivateKey);

    await relay.publish(event);
    console.log('Gift-wrapped message sent:', event);
    return event.id;
  } catch (error) {
    console.error('Failed to send message:', error);
    throw new Error(`Send failed: ${error}`);
  }
}

// Receive and decrypt a gift-wrapped message
export async function receiveGiftWrappedMessage(): Promise<string> {
  try {
    await initRelay(); // Ensure relay is connected
    return new Promise((resolve, reject) => {
      const sub = relay.sub([{ kinds: [1059], authors: [senderPublicKey] }]);
      sub.on('event', async (event: Event) => {
        if (event.tags.some(tag => tag[0] === 'p' && tag[1] === receiverPublicKey)) {
          try {
            const decrypted = await nip04.decrypt(receiverPrivateKey, senderPublicKey, event.content);
            console.log('Message received and decrypted:', decrypted);
            resolve(decrypted);
            sub.unsub(); // Stop subscription after first match
          } catch (decryptionError) {
            reject(new Error(`Decryption failed: ${decryptionError}`));
          }
        }
      });
      sub.on('eose', () => {
        console.log('End of stored events');
        sub.unsub();
      });
      setTimeout(() => {
        sub.unsub();
        reject(new Error('No message received within 5 seconds'));
      }, 5000); // Timeout to prevent hanging
    });
  } catch (error) {
    console.error('Failed to receive message:', error);
    throw new Error(`Receive failed: ${error}`);
  }
}

// Export keys for debugging or UI display (optional)
export { senderPublicKey, receiverPublicKey };