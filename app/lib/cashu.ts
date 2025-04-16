// import { CashuMint, CashuWallet, Proof } from '@cashu/cashu-ts';

// // Assuming a local Cashu mint is running at http://localhost:3338
// const mint = new CashuMint('http://localhost:3338');
// const wallet = new CashuWallet(mint);

// // Generate a key pair for the token lock
// const lockingPrivateKey = generatePrivateKey();
// const lockingPublicKey = getPublicKey(lockingPrivateKey);

// // Create a P2PK-locked token
// async function createP2PKToken() {
//   const { proofs } = await wallet.requestMint(100); // Request 100 satoshis
//   const lockedProofs = proofs.map(proof => ({
//     ...proof,
//     tags: [['pubkey', lockingPublicKey], ['locktime', String(Math.floor(Date.now() / 1000) + 3600)]], // 1-hour lock
//   }));
//   console.log('P2PK-locked token created:', lockedProofs);
//   return lockedProofs;
// }

// // Spend the P2PK-locked token
// async function spendP2PKToken(proofs: Proof[]) {
//   const spendable = await wallet.send(100, proofs, lockingPrivateKey); // Sign with the private key
//   console.log('Token spent:', spendable);
// }

// // Test it
// (async () => {
//   const proofs = await createP2PKToken();
//   await spendP2PKToken(proofs);
// })();