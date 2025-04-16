'use client'; // Required for client-side code

import { useState, useEffect } from 'react';
import { CashuMint, CashuWallet, MintQuoteState, getEncodedTokenV4, Proof } from '@cashu/cashu-ts';
import { generatePrivateKey, getPublicKey, nip19 } from 'nostr-tools';
import { initRelay, sendGiftWrappedMessage } from '../lib/nostr';

export default function CashuTest() {
  const [amount, setAmount] = useState<number>(100);
  const [recipientPubkey, setRecipientPubkey] = useState<string>('');
  const [cashuToken, setCashuToken] = useState<string | null>(null);
  const [quoteId, setQuoteId] = useState<string>('');
  const [recipientPrivkey, setRecipientPrivkey] = useState<string>('');
  const [messageId, setMessageId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Valid test Nostr public key
  const testPubkey = 'npub1fwe3u8p4lcmstd8e4t37r4p4yzwr66v7uuy8z4lywawp6u5l6m2q95w3ya';

  // Initialize Cashu wallet
  const mintUrl = 'https://testnut.cashu.space';
  const mint = new CashuMint(mintUrl);
  const wallet = new CashuWallet(mint, { unit: 'sat' });

  // Initialize Nostr relay
  useEffect(() => {
    initRelay().catch((err) => setError(`Relay init failed: ${err instanceof Error ? err.message : 'Unknown error'}`));
  }, []);

  // Validate Nostr public key (hex or npub)
  const validatePubkey = (pubkey: string): boolean => {
    if (!pubkey) return false;
    if (/^[0-9a-f]{64}$/i.test(pubkey)) {
      return true;
    }
    if (pubkey.startsWith('npub')) {
      try {
        const decoded = nip19.decode(pubkey);
        if (decoded.type === 'npub' && typeof decoded.data === 'string' && /^[0-9a-f]{64}$/i.test(decoded.data)) {
          return true;
        }
        setError('Invalid npub format: decoded data is not a valid public key');
        return false;
      } catch (err) {
        setError(`Invalid npub key: ${err instanceof Error ? err.message : 'Unknown error'}`);
        return false;
      }
    }
    return false;
  };

  const mintCashu = async () => {
    if (!recipientPubkey) {
      setError('Please enter the recipient’s Nostr public key');
      return;
    }
    if (!validatePubkey(recipientPubkey)) {
      return; // Error set in validatePubkey
    }
    setLoading(true);
    setError(null);
    try {
      // Convert npub to hex
      let pubkeyToSend = recipientPubkey;
      if (pubkeyToSend.startsWith('npub')) {
        const decoded = nip19.decode(pubkeyToSend);
        pubkeyToSend = decoded.data as string;
      }

      // Load mint keys
      await wallet.loadMint();

      // Step 1: Create P2PK-locked mint quote
      const lockedQuote = await wallet.createLockedMintQuote(amount, pubkeyToSend);

      // Step 2: Simulate paying invoice
      const mintQuoteChecked = await wallet.checkMintQuote(lockedQuote.quote);
      if (mintQuoteChecked.state !== MintQuoteState.PAID) {
        setError(`Mint quote not paid. Invoice: ${lockedQuote.request}`);
        return;
      }

      // Step 3: Mint P2PK-locked proofs
      const newRecipientPrivkey = generatePrivateKey();
      const proofs = await wallet.mintProofs(amount, lockedQuote, {
        privateKey: newRecipientPrivkey,
      });

      // Step 4: Encode token
      const token = getEncodedTokenV4({ mint: mintUrl, proofs });

      // Step 5: Send via Nostr
      const newMessageId = await sendGiftWrappedMessage(token);

      // Update state
      setCashuToken(token);
      setQuoteId(lockedQuote.quote);
      setRecipientPrivkey(newRecipientPrivkey);
      setMessageId(newMessageId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to mint: ${errorMessage}`);
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
      // Step 6: Receive token
      const proofs = await wallet.receive(cashuToken);

      // Step 7: Spend proofs
      const { send: sendProofs } = await wallet.send(Number(amount), proofs);

      // Step 8: Encode new token
      const newToken = getEncodedTokenV4({ mint: mintUrl, proofs: sendProofs });

      setError(null);
      alert(`Spend successful! New token: ${newToken}`);
      setCashuToken(newToken);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to spend: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`${label} copied to clipboard!`);
  };

  const useTestPubkey = () => {
    setRecipientPubkey(testPubkey);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold text-center mb-6">Cashu P2PK Wallet</h2>

        {/* Amount Input */}
        <div className="mb-4">
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
            Amount (sats)
          </label>
          <input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            placeholder="Enter amount"
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            disabled={loading}
            aria-describedby="amount-help"
          />
          <p id="amount-help" className="mt-1 text-sm text-gray-500">
            The amount in satoshis to mint or spend.
          </p>
        </div>

        {/* Recipient Public Key Input */}
        <div className="mb-4">
          <label htmlFor="recipientPubkey" className="block text-sm font-medium text-gray-700">
            Recipient Address (Nostr Public Key)
            <span
              className="ml-1 text-indigo-600 cursor-help"
              title="The recipient’s Nostr public key locks the token (P2PK) and receives the message. Get it from their Shopstr profile, Nostr client (e.g., Damus, Amethyst), or use the test key."
            >
              ⓘ
            </span>
          </label>
          <div className="mt-1 flex">
            <input
              id="recipientPubkey"
              type="text"
              value={recipientPubkey}
              onChange={(e) => setRecipientPubkey(e.target.value)}
              placeholder="Enter npub or hex public key"
              className="flex-1 block w-full border-gray-300 rounded-l-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              disabled={loading}
              aria-describedby="pubkey-help"
            />
            <button
              onClick={useTestPubkey}
              className="bg-indigo-200 text-indigo-800 py-2 px-3 rounded-r-md hover:bg-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={loading}
              title="Use a test public key"
            >
              Test Key
            </button>
          </div>
          <p id="pubkey-help" className="mt-1 text-sm text-gray-500">
            Paste a Nostr public key (npub or hex) from a Shopstr profile, Nostr client, or click “Test Key”.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {/* Buttons */}
        <div className="mb-4 flex flex-col space-y-2">
          <button
            onClick={mintCashu}
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-busy={loading}
          >
            {loading ? 'Processing...' : 'Mint and Send P2PK-Locked Token'}
          </button>
          {cashuToken && (
            <button
              onClick={spendCashu}
              disabled={loading}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              aria-busy={loading}
            >
              {loading ? 'Processing...' : 'Spend P2PK-Locked Token'}
            </button>
          )}
        </div>

        {/* Outputs */}
        {cashuToken && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Recipient Address (Nostr Public Key)
              </label>
              <div className="mt-1 flex items-center">
                <p className="text-sm text-gray-900 break-all">{recipientPubkey}</p>
                <button
                  onClick={() => copyToClipboard(recipientPubkey, 'Recipient Address')}
                  className="ml-2 text-indigo-600 hover:text-indigo-800"
                  aria-label="Copy recipient address"
                >
                  📋
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Cashu Token</label>
              <div className="mt-1 flex items-center">
                <p className="text-sm text-gray-900 break-all">{cashuToken}</p>
                <button
                  onClick={() => copyToClipboard(cashuToken, 'Token')}
                  className="ml-2 text-indigo-600 hover:text-indigo-800"
                  aria-label="Copy token"
                >
                  📋
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Nostr Message ID</label>
              <div className="mt-1 flex items-center">
                <p className="text-sm text-gray-900 break-all">{messageId}</p>
                <button
                  onClick={() => copyToClipboard(messageId, 'Message ID')}
                  className="ml-2 text-indigo-600 hover:text-indigo-800"
                  aria-label="Copy message ID"
                >
                  📋
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}