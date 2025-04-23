import axios from 'axios';

const API = process.env.NEXT_PUBLIC_LNBITS_API_ENDPOINT!;
const KEY = process.env.NEXT_PUBLIC_LNBITS_API_KEY!;

/** Create a HODL invoice (hold until settled) */
export async function createInvoice(amount: number, memo: string) {
  const { data } = await axios.post(
    `${API}/api/v1/payments`,
    { out: false, amount, memo, hold_invoice: true },
    { headers: { 'X-Api-Key': KEY, 'Content-Type': 'application/json' } }
  );
  return data;
}

/** Check invoice status by payment_hash */
export async function checkInvoice(hash: string) {
  const { data } = await axios.get(`${API}/api/v1/payments/${hash}`, {
    headers: { 'X-Api-Key': KEY },
  });
  return data;
}
