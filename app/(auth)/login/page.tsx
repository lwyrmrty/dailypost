'use client';

import { signIn } from 'next-auth/react';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function LinkedInLoginButton() {
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const authError = searchParams.get('error');
  const linkedinConnected = searchParams.get('linkedin') === 'connected';

  async function handleLinkedInSignIn() {
    setLoading(true);
    await signIn('linkedin', { callbackUrl: '/dashboard' });
  }

  return (
    <div className="space-y-6">
      {linkedinConnected && (
        <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg text-sm">
          LinkedIn reconnected successfully.
        </div>
      )}

      {authError && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
          LinkedIn sign-in failed. Please try again.
        </div>
      )}

      <button
        type="button"
        onClick={handleLinkedInSignIn}
        disabled={loading}
        className="w-full bg-[#0A66C2] text-white rounded-lg py-3 font-medium hover:bg-[#004182] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Redirecting to LinkedIn...' : 'Continue with LinkedIn'}
      </button>

      <p className="text-sm text-gray-500 text-center">
        Your LinkedIn account is used for both sign-in and publishing access.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-600 mt-2">Sign in with LinkedIn to access DailyPost</p>
        </div>
        
        <Suspense fallback={<div className="text-center py-4">Loading...</div>}>
          <LinkedInLoginButton />
        </Suspense>
        
        <p className="text-center text-gray-600 mt-6">
          First-time teammates can use the same LinkedIn button to create an account.
        </p>
      </div>
    </div>
  );
}
