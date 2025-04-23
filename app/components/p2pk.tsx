import { useState } from 'react';
import { createP2PKLock, mintCashu, spendCashu } from '../utils/cashu';

export default function P2PK() {
  const [pubkey, setPubkey] = useState('');
  const [amount, setAmount] = useState(0);
  const [lock, setLock] = useState('');
  const [token, setToken] = useState('');
  const [sig, setSig] = useState('');

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-2">P2PK-Locked Cashu Token</h2>
      <input
        className="border p-2 w-full mb-2"
        placeholder="Recipient Public Key"
        onChange={(e) => setPubkey(e.target.value)}
      />
      <button className="bg-gray-500 text-white px-4 py-2 mb-2" onClick={async () => {
          const res = await createP2PKLock(pubkey);
          setLock(res.lock);
      }}>
        Create Lock
      </button>

      <input
        type="number"
        className="border p-2 w-full mb-2"
        placeholder="Amount (sats)"
        onChange={(e) => setAmount(+e.target.value)}
      />
      <button className="bg-green-600 text-white px-4 py-2 mb-2" onClick={async () => {
          const res = await mintCashu(amount, lock);
          setToken(res.token);
      }}>
        Mint Token
      </button>

      <textarea
        className="border p-2 w-full mb-2"
        rows={2}
        placeholder="Schnorr signature for Proof.secret"
        onChange={(e) => setSig(e.target.value)}
      />
      <button className="bg-red-600 text-white px-4 py-2" onClick={async () => {
          await spendCashu(token, [sig]);
          alert('Token spent!');
      }}>
        Spend Token
      </button>
    </div>
  );
}
