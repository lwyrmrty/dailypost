'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface UserData {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  onboardingProgress: number;
  onboardingCompleted: boolean;
}

interface ProfileData {
  jobDescription: string | null;
  primaryTopics: string[] | null;
  avoidTopics: string[] | null;
  postingGoals: string[] | null;
}

interface SourceData {
  id: string;
  sourceName: string;
  sourceUrl: string;
  isActive: boolean;
  priority: number;
}

interface SettingsData {
  user: UserData;
  profile: ProfileData | null;
  sources: SourceData[];
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    async function fetchData() {
      if (status !== 'authenticated' || !session?.user?.id) {
        return;
      }

      try {
        const response = await fetch(`/api/settings?userId=${session.user.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch settings');
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError('Failed to load settings');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [session, status, router]);

  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto py-16 px-4 text-center">
        <div className="animate-pulse text-gray-500">Loading settings...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto py-16 px-4 text-center">
        <p className="text-red-600">{error || 'Something went wrong'}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

      {/* Account Section */}
      <section className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Account</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <p className="text-gray-900">{data.user.name || 'Not set'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <p className="text-gray-900">{data.user.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Created
            </label>
            <p className="text-gray-900">
              {data.user.createdAt ? new Date(data.user.createdAt).toLocaleDateString() : 'Unknown'}
            </p>
          </div>
        </div>
      </section>

      {/* Voice Profile Section */}
      <section className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Voice Profile</h2>
          <Link
            href="/onboarding"
            className="text-blue-600 hover:underline text-sm"
          >
            Edit Profile
          </Link>
        </div>
        
        {data.profile ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Description
              </label>
              <p className="text-gray-900">{data.profile.jobDescription || 'Not set'}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary Topics
              </label>
              <div className="flex flex-wrap gap-2">
                {(data.profile.primaryTopics || []).map((topic, i) => (
                  <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
                    {topic}
                  </span>
                ))}
                {(!data.profile.primaryTopics || data.profile.primaryTopics.length === 0) && (
                  <span className="text-gray-500">No topics set</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Topics to Avoid
              </label>
              <div className="flex flex-wrap gap-2">
                {(data.profile.avoidTopics || []).map((topic, i) => (
                  <span key={i} className="px-2 py-1 bg-red-100 text-red-800 text-sm rounded">
                    {topic}
                  </span>
                ))}
                {(!data.profile.avoidTopics || data.profile.avoidTopics.length === 0) && (
                  <span className="text-gray-500">None</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Onboarding Progress
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${data.user.onboardingProgress || 0}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600">
                  {data.user.onboardingProgress || 0}%
                </span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">
            No voice profile yet.{' '}
            <Link href="/onboarding" className="text-blue-600 hover:underline">
              Complete onboarding
            </Link>
          </p>
        )}
      </section>

      {/* News Sources Section */}
      <section className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">News Sources</h2>
        {data.sources.length > 0 ? (
          <div className="space-y-3">
            {data.sources.map((source) => (
              <div 
                key={source.id} 
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div>
                  <p className="font-medium text-gray-900">{source.sourceName}</p>
                  <p className="text-sm text-gray-500 truncate max-w-md">
                    {source.sourceUrl}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs rounded ${
                    source.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {source.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-sm text-gray-500">
                    Priority: {source.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">
            Using default news sources. Custom sources coming soon.
          </p>
        )}
      </section>

      {/* Danger Zone */}
      <section className="bg-white rounded-xl shadow-sm p-6 border border-red-200">
        <h2 className="text-xl font-semibold text-red-600 mb-4">Danger Zone</h2>
        <p className="text-gray-600 mb-4">
          These actions are irreversible. Please be certain.
        </p>
        <div className="space-y-3">
          <button
            className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            onClick={() => alert('Coming soon: Export all your data')}
          >
            Export Data
          </button>
          <button
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors ml-3"
            onClick={() => alert('Coming soon: Delete account')}
          >
            Delete Account
          </button>
        </div>
      </section>
    </div>
  );
}
