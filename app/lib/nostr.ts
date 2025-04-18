import { relayInit, generatePrivateKey, getPublicKey, finishEvent, nip04,nip19, Event } from 'nostr-tools';



// Singleton relay instance
const relay = relayInit('wss://relay.damus.io');

// Key pairs (generated once; in a real app, persist these securely)
const senderPrivateKey = generatePrivateKey();
const senderPublicKey = getPublicKey(senderPrivateKey);
const receiverPrivateKey = generatePrivateKey();
const receiverPublicKey = getPublicKey(receiverPrivateKey);

console.log('P2PK Private Keyyyyyyyyyyyyyy:', senderPrivateKey);
console.log('P2PK Public Key:', senderPublicKey);

// Initialize relay connection
export async function initRelay(): Promise<void> {
  try {
    if (relay.status === 0 || relay.status === 3) {
      relay.on('connect', () => console.log(`Connected to ${relay.url}`));
      relay.on('error', () => console.error(`Failed to connect to ${relay.url}`));
      await relay.connect();
    }
  } catch (error) {
    console.error('Relay initialization failed:', error);
    throw new Error('Could not connect to relay');
  }
}

// Send a gift-wrapped message (NIP-17)
export async function sendGiftWrappedMessage(content: string): Promise<string> {
  try {
    await initRelay();
    const encrypted = await nip04.encrypt(senderPrivateKey, receiverPublicKey, content);
    const event = finishEvent({
      kind: 1059,
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
    await initRelay();
    return new Promise((resolve, reject) => {
      const sub = relay.sub([{ kinds: [1059], authors: [senderPublicKey] }]);
      sub.on('event', async (event: Event) => {
        if (event.tags.some(tag => tag[0] === 'p' && tag[1] === receiverPublicKey)) {
          try {
            const decrypted = await nip04.decrypt(receiverPrivateKey, senderPublicKey, event.content);
            console.log('Message received and decrypted:', decrypted);
            resolve(decrypted);
            sub.unsub();
          } catch (decryptionError) {
            reject(new Error(`Decryption failed: ${decryptionError}`));
          }
        }
      });
      sub.on('eose', () => {
        reject(new Error('No message found'));
        sub.unsub();
      });
      setTimeout(() => {
        sub.unsub();
        reject(new Error('Timeout: No message received'));
      }, 10000);
    });
  } catch (error) {
    console.error('Failed to receive message:', error);
    throw new Error(`Receive failed: ${error}`);
  }
}

// Publish a kind:10019 event with a P2PK pubkey
export async function publishP2PKEvent({
  recipientPrivkey,
  p2pkPubkey,
  relayUrl = 'wss://relay.damus.io'
}: {
  recipientPrivkey: string,
  p2pkPubkey: string,
  relayUrl?: string
}) {
  const relay = relayInit(relayUrl);
  relay.on('connect', () => console.log(`Connected to ${relay.url}`));
  relay.on('error', () => console.error(`Failed to connect to ${relay.url}`));
  await relay.connect();
  
  // Add this conversion code to handle nsec format
  let hexPrivkey = recipientPrivkey;
  if (recipientPrivkey.startsWith('nsec')) {
    try {
      const decoded = nip19.decode(recipientPrivkey);
      if (decoded.type === 'nsec') {
        hexPrivkey = decoded.data;
      }
    } catch (err) {
      throw new Error(`Invalid nsec key: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  
  const pubkey = getPublicKey(hexPrivkey);
  const event = {
    kind: 10019,
    created_at: Math.floor(Date.now() / 1000),
    tags: [['pubkey', p2pkPubkey]],
    content: '',
    pubkey
  };
  
  const signed = finishEvent(event, hexPrivkey);
  
  try {
    await relay.publish(signed);
    relay.close();
    return 'Event published successfully';
  } catch (err) {
    relay.close();
    throw new Error(`Failed to publish event: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export { senderPublicKey, receiverPublicKey };