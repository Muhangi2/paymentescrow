import { nip04, relayInit, getPublicKey, generatePrivateKey } from 'nostr-tools';

/**
 * Initialize sender keys: env var or generate new (NIP-06)
 */
export function initNostrKeys() {
  const sk = process.env.NEXT_PUBLIC_NOSTR_PRIVATE_KEY || generatePrivateKey();
  const pk = process.env.NEXT_PUBLIC_NOSTR_PUBLIC_KEY || getPublicKey(sk);
  return { sk, pk };
}

/**
 * Send NIP-17 gift-wrapped message via a relay
 */
export async function sendNIP17(recipientPk: string, message: string) {
  const { sk, pk } = initNostrKeys();
  // Encrypt message (NIP-44)
  const encrypted = await nip04.encrypt(sk, recipientPk, message);
  // Wrap in a kind=1059 event (NIP-59 gift-wrap)
  const event = {
    kind: 1059,
    pubkey: pk,
    created_at: Math.floor(Date.now() / 1000),
    tags: [['p', recipientPk]],
    content: encrypted,
  };
  // Publish to relay
  const relay = relayInit('wss://relay.damus.io');
  await relay.connect();
  await relay.publish(event);
}
