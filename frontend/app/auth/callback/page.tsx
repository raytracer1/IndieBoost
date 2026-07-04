"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Google OAuth redirects here after backend sets the httpOnly cookie
// Just redirect to /create — AuthContext will read the cookie
export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/create");
  }, [router]);

  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4" />
      <p className="text-gray-600">Signing you in...</p>
    </div>
  );
}
