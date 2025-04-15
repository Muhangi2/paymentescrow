import { initRelay, sendGiftWrappedMessage, receiveGiftWrappedMessage } from '../lib/nostr';

async function testNostr() {
  try {
    await initRelay();
    const eventId = await sendGiftWrappedMessage('Hello, NIP-17 test!');
    console.log('Event ID:', eventId);
    const decrypted = await receiveGiftWrappedMessage();
    console.log('Decrypted message:', decrypted);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testNostr();