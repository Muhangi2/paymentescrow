// 'use client';

// import { useState, useEffect } from 'react';
// import {
//   relayInit,
//   generatePrivateKey,
//   getPublicKey,
//   nip04,
//   finishEvent,
//   Event
// } from 'nostr-tools';
// import { CashuMint, CashuWallet } from '@cashu/cashu-ts';
// import axios from 'axios';
// import toast, { Toaster } from 'react-hot-toast';

// const relay = relayInit('wss://relay.damus.io');
// async function initRelay() {
//   if (relay.status === 0 || relay.status === 3) {
//     relay.on('connect', () => console.log(`Connected to ${relay.url}`));
//     relay.on('error', () => console.error(`Failed to connect to ${relay.url}`));
//     await relay.connect();
//   }
// }


// const senderPrivateKey = generatePrivateKey();
// const senderPublicKey = getPublicKey(senderPrivateKey);
// const receiverPrivateKey = generatePrivateKey();
// const receiverPublicKey = getPublicKey(receiverPrivateKey);

// ///aside testing 
// // Function to get wallet info
// async function infohandler() {
//     try {
//       const data = await wallet.getMintInfo();
//       console.log(data, "datatatatataaaaaa");
//       return data;
//     } catch (error) {
//       console.error("Error fetching wallet info:", error);
//       throw error;
//     }
//   }
  



// const CASHU_MINT_URL = process.env.NEXT_PUBLIC_CASHU_MINT_URL!;
// const mint = new CashuMint(CASHU_MINT_URL);
// const wallet = new CashuWallet(mint);

// // const data=await wallet.getMintInfo();
// // console.log(data,"datatatatataaaaaa")


// async function createP2PKLock(pubkey: string) {
//   const { data } = await axios.post(`${CASHU_MINT_URL}/lock`, { pubkey });
//   return data.lock;
// }
// async function mintCashu(amount: number, lock: string) {

//   const { data } = await axios.post(`${CASHU_MINT_URL}/mint`, { amount, lock });
//   return data.token;
//   console.log(data.token)
// }
// async function spendCashu(token: string, sig: string) {
//   const { data } = await axios.post(`${CASHU_MINT_URL}/spend`, {
//     token,
//     witness: { signatures: [sig] }
//   });
//   return data;
// }

// export async function sendGiftWrapped(content: string): Promise<string> {
//   try {
//     await initRelay();
//     const encrypted = await nip04.encrypt(senderPrivateKey, receiverPublicKey, content);
//     const event = finishEvent(
//       {
//         kind: 1059,
//         content: encrypted,
//         tags: [['p', receiverPublicKey]],
//         created_at: Math.floor(Date.now() / 1000),
//       },
//       senderPrivateKey
//     );

//     await relay.publish(event);
//     console.log('Gift-wrapped message sent:', event);
//     return event.id;
//   } catch (error) {
//     console.error('Failed to send message:', error);
//     throw new Error(`Send failed: ${error}`);
//   }
// }

// export async function receiveGiftWrapped(): Promise<string> {
//   await initRelay();
//   return new Promise((resolve, reject) => {
//     const sub = relay.sub([{ kinds: [1059], authors: [senderPublicKey] }]);
//     sub.on('event', async (evt: Event) => {
//       if (evt.tags.some((t) => t[0] === 'p' && t[1] === receiverPublicKey)) {
//         sub.unsub();
//         const decrypted = await nip04.decrypt(receiverPrivateKey, senderPublicKey, evt.content);
//         resolve(decrypted);
//       }
//     });
//     sub.on('eose', () => {
//       sub.unsub();
//       reject(new Error('No message'));
//     });
//     setTimeout(() => {
//       sub.unsub();
//       reject(new Error('Timeout'));
//     }, 10000);
//   });
// }


// const LNBITS_API = process.env.NEXT_PUBLIC_LNBITS_API_ENDPOINT!;
// const LNBITS_KEY = process.env.NEXT_PUBLIC_LNBITS_API_KEY!;
// async function createInvoice(amount: number, memo: string) {
//   const { data } = await axios.post(
//     `${LNBITS_API}/api/v1/payments`,
//     { out: false, amount, memo, hold_invoice: true },
//     { headers: { 'X-Api-Key': LNBITS_KEY, 'Content-Type': 'application/json' } }
//   );
//   return data;
// }
// async function checkInvoice(hash: string) {
//   const { data } = await axios.get(
//     `${LNBITS_API}/api/v1/payments/${hash}`,
//     { headers: { 'X-Api-Key': LNBITS_KEY } }
//   );
//   return data;
// }

// export default function App() {
//   // Nostrb codebaseee
//   const [msg, setMsg] = useState('');
//   const [received, setReceived] = useState('');

  
//   const [amount, setAmount] = useState(100);
//   const [invoice, setInvoice] = useState('');
//   const [invHash, setInvHash] = useState('');
//   const [invStatus, setInvStatus] = useState('');

//   // Cashu P2PKk
//   const [pubkey, setPubkey] = useState('');
//   const [lock, setLock] = useState('');
//   const [token, setToken] = useState('');
//   const [signature, setSignature] = useState('');

//   useEffect(() => {
//     initRelay().catch((err) => toast.error(err.message));
//   }, []);

//   // State for wallet info
//   const [walletInfo, setWalletInfo] = useState(null);
//   const [loading, setLoading] = useState(false);
//    // Handler for wallet info button
//    const handleWalletInfo = async () => {
//     setLoading(true);
//     try {
//       const info = await infohandler();
//       //@ts-ignore
//       setWalletInfo(info);
//       toast.success('Wallet info fetched successfully');
//     } catch (error) {
//       toast.error('Failed to fetch wallet info');
//     } finally {
//       setLoading(false);
//     }
//   };
//   return (
//     <div className="p-6 space-y-6 max-w-2xl mx-auto">
//       <Toaster position="top-right" />
//       <h1 className="text-3xl font-bold text-center">Unified Cashu + Nostr App</h1>

//       {/* Gift-wrapped Nostr */}
//       <div className="border p-4 rounded">
//         <h2 className="font-semibold">NIP-17 Gift Message</h2>
//         <textarea
//           className="border p-2 w-full mb-2"
//           rows={3}
//           placeholder="Message"
//           value={msg}
//           onChange={(e) => setMsg(e.target.value)}
//         />
//         <button
//           className="bg-blue-600 text-white px-4 py-2 rounded"
//           onClick={async () => {
//             try {
//               const id = await sendGiftWrapped(msg);
//               toast.success(`Sent event ID: ${id}`);
//               setMsg('');
//               setReceived('');
//             } catch (e: any) {
//               toast.error(e.message);
//             }
//           }}
//         >
//           Send Gift
//         </button>
//         <button
//           className="ml-2 bg-gray-600 text-white px-4 py-2 rounded"
//           onClick={async () => {
//             try {
//               const txt = await receiveGiftWrapped();
//               setReceived(txt);
//               toast.success('Message received');
//             } catch (e: any) {
//               toast.error(e.message);
//             }
//           }}
//         >
//           Receive Gift
//         </button>
//         {received && <p className="mt-2">Received: {received}</p>}
//       </div>

//       {/* HODL Invoice */}
//       <div className="border p-4 rounded">
//         <h2 className="font-semibold">HODL Invoice</h2>
//         <p className="text-sm text-gray-600 mb-2">
//           Note: After creating, pay the invoice using a Lightning wallet (e.g., Wallet of Satoshi) to
//           update status to Paid.
//         </p>
//         <div className="flex space-x-2 mb-2">
//           <input
//             type="number"
//             className="border p-2 flex-1"
//             value={amount}
//             onChange={(e) => setAmount(+e.target.value)}
//           />
//           <button
//             className="bg-green-600 text-white px-4 py-2 rounded"
//             onClick={async () => {
//               try {
//                 const inv = await createInvoice(amount, 'Competency Test');
//                 setInvoice(inv.payment_request);
//                 setInvHash(inv.payment_hash);
//                 setInvStatus('');
//                 toast.success('HODL invoice created');
//               } catch (e: any) {
//                 toast.error(e.message);
//               }
//             }}
//           >
//             Create
//           </button>
//         </div>
//         {invoice && <pre className="mt-2 bg-gray-100 p-2 break-words">{invoice}</pre>}
//         <button
//           className="mt-2 bg-yellow-600 text-white px-4 py-2 rounded"
//           onClick={async () => {
//             try {
//               const st = await checkInvoice(invHash);
//               setInvStatus(st.paid ? 'Paid' : 'Unpaid');
//               toast.success(`Invoice ${st.paid ? 'paid' : 'unpaid'}`);
//             } catch (e: any) {
//               toast.error(e.message);
//             }
//           }}
//         >
//           Check Status
//         </button>
//         {invStatus && <p className="mt-2">Status: {invStatus}</p>}
//       </div>

//  {/* Wallet Info Section */}
//  <div className="border p-4 rounded">
//         <h2 className="font-semibold">Cashu Wallet Info</h2>
//         <button
//           className="bg-purple-600 text-white px-4 py-2 rounded"
//           onClick={handleWalletInfo}
//           disabled={loading}
//         >
//           {loading ? 'Loading...' : 'Get Wallet Info'}
//         </button>
        
//         {walletInfo && (
//           <div className="mt-4">
//             <h3 className="font-medium">Mint Info:</h3>
//             <pre className="bg-gray-100 p-3 mt-2 rounded overflow-auto">
//               {JSON.stringify(walletInfo, null, 2)}
//             </pre>
//           </div>
//         )}
//       </div>
//       {/* P2PK Cashu Token */}
//       <div className="border p-4 rounded">
//         <h2 className="font-semibold">P2PK Cashu Token</h2>
//         <input
//           className="border p-2 w-full mb-2"
//           placeholder="Recipient PubKey"
//           value={pubkey}
//           onChange={(e) => setPubkey(e.target.value)}
//         />
//         <button
//           className="bg-gray-600 text-white px-4 py-2 rounded mb-2"
//           onClick={async () => {
//             try {
//               const l = await createP2PKLock(pubkey);
//               setLock(l);
//               setToken('');
//               setSignature('');
//               toast.success('P2PK lock created');
//             } catch (e: any) {
//               toast.error(e.message);
//             }
//           }}
//         >
//           Lock
//         </button>
//         <div className="flex space-x-2 mb-2">
//           <input
//             type="number"
//             className="border p-2 flex-1"
//             placeholder="Amount (sats)"
//             value={amount}
//             onChange={(e) => setAmount(+e.target.value)}
//           />
//           <button
//             className="bg-indigo-600 text-white px-4 py-2 rounded"
//             onClick={async () => {
//               try {
//                 const t = await mintCashu(amount, lock);
//                 setToken(t);
//                 toast.success('Token minted');
//               } catch (e: any) {
//                 toast.error(e.message);
//               }
//             }}
//           >
//             Mint
//           </button>
//         </div>
//         {token && (
//           <textarea
//             className="border p-2 w-full mb-2 break-words"
//             rows={2}
//             readOnly
//             value={token}
//           />
//         )}
//         <textarea
//           className="border p-2 w-full mb-2"
//           rows={2}
//           placeholder="Signature (hex)"
//           value={signature}
//           onChange={(e) => setSignature(e.target.value)}
//         />
//         <button
//           className="bg-red-600 text-white px-4 py-2 rounded"
//           onClick={async () => {
//             try {
//               await spendCashu(token, signature);
//               toast.success('Token spent');
//               setPubkey('');
//               setLock('');
//               setToken('');
//               setSignature('');
//             } catch (e: any) {
//               toast.error(e.message);
//             }
//           }}
//         >
//           Spend
//         </button>
//       </div>
//     </div>
//   );
// }