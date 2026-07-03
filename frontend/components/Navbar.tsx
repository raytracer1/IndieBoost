"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthContext";

export default function Navbar() {
  const { user, loading, loginWithGoogle, logout } = useAuth();

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold tracking-tight text-indigo-600">
          IndieBoost
        </Link>

        <div className="flex items-center gap-3">
          {loading ? (
            <div className="w-6 h-6 bg-gray-200 rounded-full animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-3">
              {user.avatar_url && (
                <img
                  src={user.avatar_url}
                  alt=""
                  className="w-7 h-7 rounded-full"
                />
              )}
              <span className="text-sm text-gray-700 hidden sm:inline">
                {user.name || user.email}
              </span>
              <Link
                href="/create"
                className="bg-indigo-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition"
              >
                New Campaign
              </Link>
              <button
                onClick={logout}
                className="text-sm text-gray-500 hover:text-gray-700 transition"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-sm text-gray-600 hover:text-gray-900 transition"
              >
                Sign In
              </Link>
              <Link
                href="/login"
                className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
              >
                Start Campaign
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
