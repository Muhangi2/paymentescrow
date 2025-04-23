import Link from 'next/link';

export default function Home() {
  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Nostr-Cashu App</h1>
      <nav className="space-x-4">
        <Link href="/chat"><h1 className="text-blue-600">Chat</h1></Link>
        <Link href="/p2pk"><h1 className="text-green-600">P2PK Token</h1></Link>
        <Link href="/invoice"><h1 className="text-purple-600">Invoice</h1></Link>
      </nav>
    </div>
  );
}
