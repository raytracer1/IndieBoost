import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold tracking-tight text-indigo-600">
          IndieBoost
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/create"
            className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            Start Campaign
          </Link>
        </div>
      </div>
    </nav>
  );
}
