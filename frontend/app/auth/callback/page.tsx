"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");

    if (!code) {
      setError("No authorization code received from Google.");
      return;
    }

    // Exchange code for JWT via backend
    fetch("/api/auth/google/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Authentication failed");
        }
        return res.json();
      })
      .then((data) => {
        if (data.token) {
          localStorage.setItem("indieboost_token", data.token);
          router.push("/create");
        } else {
          setError("No token received from server.");
        }
      })
      .catch((err) => {
        setError(err.message || "Authentication failed");
      });
  }, [searchParams, router]);

  if (error) {
    return (
      <div>
        <p className="text-red-600 mb-4">{error}</p>
        <a href="/login" className="text-indigo-600 hover:underline">
          Back to Sign In
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
      <Suspense
        fallback={
          <div>
            <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Loading...</p>
          </div>
        }
      >
        <CallbackHandler />
      </Suspense>
    </div>
  );
}
