import axios from 'axios';

const MINT = process.env.NEXT_PUBLIC_CASHU_MINT_URL!;

/** Create a P2PK lock for recipient’s pubkey */
export async function createP2PKLock(pubkey: string) {
  const { data } = await axios.post(`${MINT}/lock`, { pubkey });
  return data; // { lock: string }
}

/** Mint Cashu ecash locked by P2PK */
export async function mintCashu(amount: number, lock: string) {
  const { data } = await axios.post(`${MINT}/mint`, { amount, lock });
  return data; // { token: string, proofs: [...] }
}

/** Spend (redeem) a P2PK-locked Cashu token */
export async function spendCashu(token: string, signatures: string[]) {
  const { data } = await axios.post(`${MINT}/spend`, {
    token,
    witness: { signatures },
  });
  return data; // redeemed proofs
}
