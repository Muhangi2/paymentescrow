import { useState } from 'react';
import { createInvoice, checkInvoice } from '../utils/lnbits';

export default function Invoice() {
  const [amount, setAmount] = useState(0);
  const [memo, setMemo] = useState('');
  const [pr, setPr] = useState('');
  const [hash, setHash] = useState('');
  const [status, setStatus] = useState('');

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-2">HODL Invoice</h2>
      <input
        type="number"
        className="border p-2 w-full mb-2"
        placeholder="Amount (sats)"
        onChange={(e) => setAmount(+e.target.value)}
      />
      <input
        className="border p-2 w-full mb-2"
        placeholder="Memo"
        onChange={(e) => setMemo(e.target.value)}
      />
      <button className="bg-indigo-600 text-white px-4 py-2 mb-2" onClick={async () => {
          const d = await createInvoice(amount, memo);
          setPr(d.payment_request);
          setHash(d.payment_hash);
      }}>
        Create Invoice
      </button>
      {pr && <pre className="bg-gray-100 p-2 mb-2">{pr}</pre>}
      <button className="bg-yellow-600 text-white px-4 py-2 mb-2" onClick={async () => {
          const d = await checkInvoice(hash);
          setStatus(d.paid ? 'Paid' : 'Unpaid');
      }}>
        Check Status
      </button>
      {status && <p className="mt-2">Status: {status}</p>}
    </div>
  );
}
