"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      localStorage.setItem("indieboost_token", token);
      router.push("/create");
    } else {
      setError("No token received from Google. Please try again.");
    }
  }, [searchParams, router]);

  if (error) {
    return (
      <div>
        <p className="text-red-600 mb-4">{error}</p>
        <a href="/" className="text-indigo-600 hover:underline">
          Back to Home
        </a>
      </div>
    );
  }

  return (
    <div>
      <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4" />
      <p className="text-gray-600">Signing you in...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <Suspense fallback={
        <div>
          <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      }>
        <CallbackHandler />
      </Suspense>
    </div>
  );
}
