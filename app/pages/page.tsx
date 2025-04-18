'use client';

import { useState, useEffect } from 'react';
import { CashuMint, CashuWallet, MintQuoteState, getEncodedTokenV4 } from '@cashu/cashu-ts';
import { generatePrivateKey, getPublicKey, nip19, relayInit, Event } from 'nostr-tools';
import { initRelay, sendGiftWrappedMessage, receiveGiftWrappedMessage, publishP2PKEvent } from '../lib/nostr';

// Mock HODL invoice functions
const createHODLInvoice = async () => 'lnbc...';
const settleHODLInvoice = async (invoiceId: string) => true;

export default function App() {
  const [amount, setAmount] = useState<number>(100);
  const [recipientPubkey, setRecipientPubkey] = useState<string>('');
  const [cashuToken, setCashuToken] = useState<string | null>(null);
  const [quoteId, setQuoteId] = useState<string>('');
  const [recipientPrivkey, setRecipientPrivkey] = useState<string>('');
  const [messageId, setMessageId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [messageToSend, setMessageToSend] = useState<string>('');
  const [receivedMessage, setReceivedMessage] = useState<string>('');
  const [hodlInvoiceId, setHODLInvoiceId] = useState<string>('');

  const [recipientNostrPrivkey, setRecipientNostrPrivkey] = useState<string>('');
  const [recipientP2PKPubkey, setRecipientP2PKPubkey] = useState<string>('');
  const [publishStatus, setPublishStatus] = useState<string>('');

  const mintUrl = 'https://nut.cashu.space';
  const mint = new CashuMint(mintUrl);
  const wallet = new CashuWallet(mint, { unit: 'sat' });

  useEffect(() => {
    initRelay().catch((err) => setError(`Relay init failed: ${err.message}`));
  }, []);

  const validatePubkey = (pubkey: string): boolean => {
    if (!pubkey) return false;
    if (/^[0-9a-f]{64}$/i.test(pubkey)) return true;
    if (pubkey.startsWith('npub')) {
      try {
        const decoded = nip19.decode(pubkey);
        if (decoded.type === 'npub' && /^[0-9a-f]{64}$/i.test(decoded.data)) return true;
        setError('Invalid npub format');
        return false;
      } catch (err) {
        setError(`Invalid npub key: ${(err as Error).message}`);
        return false;
      }
    }
    return false;
  };

  const getP2PKPubkey = async (recipientHexPubkey: string): Promise<string> => {
    // Add more reliable relays
    const relays = [
      'wss://relay.damus.io', 
      'wss://nos.lol', 
      'wss://relay.nostr.band',
      'wss://relay.current.fyi',
      'wss://nostr.fmt.wiz.biz'
    ];
    
    console.log('Searching for P2PK pubkey for:', recipientHexPubkey);
    
    for (const relayUrl of relays) {
      const relay = relayInit(relayUrl);
      try {
        console.log(`Connecting to relay: ${relayUrl}`);
        await relay.connect();
        console.log(`Connected to ${relayUrl}, searching for events...`);
        
        const result = await new Promise<string>((resolve, reject) => {
          console.log(`Subscribing to kind:10019 events from ${recipientHexPubkey}`);
          const sub = relay.sub([{ kinds: [10019], authors: [recipientHexPubkey] }]);
          
          sub.on('event', (event: Event) => {
            console.log('Found event:', event);
            const p2pkTag = event.tags.find((tag) => tag[0] === 'pubkey');
            console.log('P2PK tag:', p2pkTag);
            
            if (p2pkTag && /^[0-9a-f]{66}$/i.test(p2pkTag[1])) {
              console.log('Valid P2PK pubkey found:', p2pkTag[1]);
              resolve(p2pkTag[1]);
              sub.unsub();
            } else {
              console.log('Invalid P2PK tag format');
              reject(new Error('Invalid P2PK public key format'));
            }
          });
          
          sub.on('eose', () => {
            console.log(`End of stored events from ${relayUrl}`);
            sub.unsub();
            reject(new Error('No kind:10019 event found'));
          });
          
          // Increase timeout to give more time for slow relays
          setTimeout(() => {
            console.log(`Timeout fetching from ${relayUrl}`);
            sub.unsub();
            reject(new Error('Timeout fetching kind:10019 event'));
          }, 15000); // Increased to 15 seconds
        });
        
        relay.close();
        console.log('Successfully retrieved P2PK pubkey:', result);
        return result;
      } catch (err) {
        console.error(`Error with relay ${relayUrl}:`, err);
        relay.close();
      }
    }
    
    throw new Error('Failed to fetch P2PK pubkey from all relays');
  };
  const mintCashu = async () => {
    if (!recipientPubkey) {
      setError('Please enter the recipient’s Nostr public key');
      return;
    }
    if (!validatePubkey(recipientPubkey)) return;
    setLoading(true);
    setError(null);
    try {
      let recipientHexPubkey = recipientPubkey;
      if (recipientPubkey.startsWith('npub')) {
        const decoded = nip19.decode(recipientPubkey);
        if (typeof decoded.data === 'string') {
          recipientHexPubkey = decoded.data;
        } else {
          throw new Error('Decoded data is not a valid string');
        }
      }
      const p2pkPubkey = await getP2PKPubkey(recipientHexPubkey);
      await wallet.loadMint();
      const lockedQuote = await wallet.createLockedMintQuote(amount, p2pkPubkey);
      setError(`Please pay invoice: ${lockedQuote.request}`);
      // Simulate payment for testing; in production, wait for payment
      const mintQuoteChecked = await wallet.checkMintQuote(lockedQuote.quote);
      if (mintQuoteChecked.state !== MintQuoteState.PAID) {
        throw new Error('Mint quote not paid');
      }
      const newRecipientPrivkey = generatePrivateKey();
      const proofs = await wallet.mintProofs(amount, lockedQuote, { privateKey: newRecipientPrivkey });
      const token = getEncodedTokenV4({ mint: mintUrl, proofs });
      const newMessageId = await sendGiftWrappedMessage(token);
      setCashuToken(token);
      setQuoteId(lockedQuote.quote);
      setRecipientPrivkey(newRecipientPrivkey);
      setMessageId(newMessageId);
      alert(`Private key for token: ${newRecipientPrivkey} (Save this securely!)`);
    } catch (err) {
      setError(`Failed to mint: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const spendCashu = async () => {
    if (!cashuToken) {
      setError('No token to spend');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const proofs = await wallet.receive(cashuToken);
      const { send: sendProofs } = await wallet.send(Number(amount), proofs);
      const newToken = getEncodedTokenV4({ mint: mintUrl, proofs: sendProofs });
      alert(`Spend successful! New token: ${newToken}`);
      setCashuToken(newToken);
    } catch (err) {
      setError(`Failed to spend: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePublishP2PKEvent = async () => {
    setPublishStatus('');
    if (!recipientNostrPrivkey || !recipientP2PKPubkey) {
      setPublishStatus('Please provide both the recipient Nostr private key and P2PK pubkey.');
      return;
    }
    try {
      setPublishStatus('Publishing...');
      await publishP2PKEvent({
        recipientPrivkey: recipientNostrPrivkey,
        p2pkPubkey: recipientP2PKPubkey
      });
      setPublishStatus('Event published successfully!');
    } catch (err) {
      setPublishStatus(`Failed to publish event: ${(err as Error).message}`);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-lg shadow-md space-y-8">
      <h2 className="text-2xl font-bold text-center mb-4">Cashu Mint & Nostr Gift App</h2>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Recipient Nostr Pubkey (hex or npub):</label>
        <input
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring focus:border-blue-400"
          value={recipientPubkey}
          onChange={e => setRecipientPubkey(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Amount (sats):</label>
        <input
          type="number"
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring focus:border-blue-400"
          value={amount}
          onChange={e => setAmount(Number(e.target.value))}
        />
      </div>
      <div className="flex space-x-4">
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          onClick={mintCashu}
          disabled={loading}
        >
          Mint Cashu Token
        </button>
        <button
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          onClick={spendCashu}
          disabled={loading || !cashuToken}
        >
          Spend Cashu Token
        </button>
      </div>
      {error && <div className="text-red-600 font-medium">{error}</div>}
      <div>
        <h3 className="text-lg font-semibold mb-2">Minted Token</h3>
        <textarea
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring focus:border-blue-400"
          value={cashuToken || ''}
          readOnly
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold mb-2">Publish kind:10019 Event (Recipient Only)</h3>
        <input
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring focus:border-blue-400"
          placeholder="Recipient Nostr Private Key"
          value={recipientNostrPrivkey}
          onChange={e => setRecipientNostrPrivkey(e.target.value)}
        />
        <input
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring focus:border-blue-400"
          placeholder="Recipient P2PK Pubkey"
          value={recipientP2PKPubkey}
          onChange={e => setRecipientP2PKPubkey(e.target.value)}
        />
        <button
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
          onClick={handlePublishP2PKEvent}
        >
          Publish P2PK Event
        </button>
        <div className="text-sm text-gray-600">{publishStatus}</div>
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold mb-2">Gift-wrapped Message</h3>
        <input
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring focus:border-blue-400"
          placeholder="Message to send"
          value={messageToSend}
          onChange={e => setMessageToSend(e.target.value)}
        />
        <button
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50 mt-2"
          onClick={async () => {
            try {
              setLoading(true);
              const id = await sendGiftWrappedMessage(messageToSend);
              setMessageId(id);
              setLoading(false);
            } catch (err) {
              setError(`Failed to send message: ${(err as Error).message}`);
              setLoading(false);
            }
          }}
        >
          Send Gift-wrapped Message
        </button>
        <div className="text-sm text-gray-700">Message ID: {messageId}</div>
        <button
          className="bg-pink-600 text-white px-4 py-2 rounded hover:bg-pink-700 disabled:opacity-50 mt-2"
          onClick={async () => {
            try {
              setLoading(true);
              const msg = await receiveGiftWrappedMessage();
              setReceivedMessage(msg);
              setLoading(false);
            } catch (err) {
              setError(`Failed to receive message: ${(err as Error).message}`);
              setLoading(false);
            }
          }}
        >
          Receive Gift-wrapped Message
        </button>
        <div className="text-sm text-gray-700">Received Message: {receivedMessage}</div>
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold mb-2">HODL Invoice (Mocked)</h3>
        <button
          className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 disabled:opacity-50"
          onClick={async () => {
            try {
              const invoice = await createHODLInvoice();
              setHODLInvoiceId(invoice);
              alert(`HODL Invoice: ${invoice}`);
            } catch (err) {
              setError(`Failed to create HODL invoice: ${(err as Error).message}`);
            }
          }}
        >
          Create HODL Invoice
        </button>
        <button
          className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 disabled:opacity-50"
          onClick={async () => {
            if (!hodlInvoiceId) {
              setError('No HODL invoice to settle');
              return;
            }
            try {
              const settled = await settleHODLInvoice(hodlInvoiceId);
              if (settled) {
                alert('HODL Invoice settled successfully');
              } else {
                alert('Failed to settle HODL invoice');
              }
            } catch (err) {
              setError(`Failed to settle HODL invoice: ${(err as Error).message}`);
            }
          }}
        >
          Settle HODL Invoice
        </button>
      </div>
    </div>
  );
}