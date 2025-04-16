import type { NextApiRequest, NextApiResponse } from 'next';
import { CashuMint, CashuWallet, MintQuoteState, getEncodedTokenV4, Proof } from '@cashu/cashu-ts';
import { generatePrivateKey, getPublicKey, finishEvent } from 'nostr-tools';
import { sendGiftWrappedMessage } from '../lib/nostr';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const mintUrl = 'https://testnut.cashu.space'; // Testnet mint
  const mint = new CashuMint(mintUrl);
  const wallet = new CashuWallet(mint, { unit: 'sat' });

  // Load mint keys and keysets
  await wallet.loadMint();

  if (req.method === 'POST') {
    const { amount, recipientPubkey } = req.body;

    try {
      // Step 1: Create a P2PK-locked mint quote
      const lockedQuote = await wallet.createLockedMintQuote(amount, recipientPubkey);

      // Step 2: Simulate paying the invoice (in a real app, user pays the Lightning invoice)
      const mintQuoteChecked = await wallet.checkMintQuote(lockedQuote.quote);
      if (mintQuoteChecked.state !== MintQuoteState.PAID) {
        return res.status(400).json({
          error: 'Mint quote not paid',
          invoice: lockedQuote.request,
        });
      }

      // Step 3: Mint P2PK-locked proofs
      const recipientPrivkey = generatePrivateKey(); // For testing
      const proofs = await wallet.mintProofs(amount, lockedQuote, {
        privateKey: recipientPrivkey,
      });

      // Step 4: Encode the token (v4 format)
      const token = getEncodedTokenV4({ mint: mintUrl, proofs });

      // Step 5: Send the token via Nostr gift-wrapped message
      const messageId = await sendGiftWrappedMessage(token);

      res.status(200).json({ token, quoteId: lockedQuote.quote, recipientPrivkey, messageId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Failed to mint: ${errorMessage}` });
    }
  } else if (req.method === 'PUT') {
    const { token, recipientPrivkey, amount } = req.body;

    try {
      // Step 6: Receive and validate the token
      const proofs = await wallet.receive(token); // Get proofs from token

      // Step 7: Spend the P2PK-locked proofs (assuming mint verifies P2PK lock)
      const { send: sendProofs } = await wallet.send(Number(amount), proofs);

      // Step 8: Encode the spent proofs as a new token
      const newToken = getEncodedTokenV4({ mint: mintUrl, proofs: sendProofs });

      res.status(200).json({ success: true, newToken });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ error: `Failed to spend: ${errorMessage}` });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}