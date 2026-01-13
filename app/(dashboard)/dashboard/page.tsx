'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import PostCard from './components/PostCard';
import DatePicker from './components/DatePicker';
import { GeneratedPost } from '@/lib/db/schema';

interface DashboardData {
  user: {
    id: string;
    name: string | null;
    email: string;
    onboardingCompleted: boolean;
  };
  posts: GeneratedPost[];
  selectedDate: string;
}

interface PostPair {
  linkedin: GeneratedPost | null;
  x: GeneratedPost | null;
  sourceUrl: string;
  sourceTitle: string;
  topic: string | null;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [platform, setPlatform] = useState<'linkedin' | 'x'>('linkedin');

  const selectedDate = dateParam || new Date().toISOString().split('T')[0];

  useEffect(() => {
    async function fetchData() {
      if (status !== 'authenticated' || !session?.user?.id) {
        return;
      }
      
      setLoading(true);
      try {
        const response = await fetch(`/api/dashboard?date=${selectedDate}&userId=${session.user.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError('Failed to load dashboard');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [selectedDate, session, status]);

  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto py-16 px-4 text-center">
        <div className="animate-pulse text-gray-500">Loading dashboard...</div>
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

  if (!data.user.onboardingCompleted) {
    return (
      <div className="container mx-auto py-16 px-4 text-center">
        <h1 className="text-3xl font-bold mb-4">Welcome to DailyPost!</h1>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          Complete your voice profile setup to start generating personalized content suggestions.
        </p>
        <Link
          href="/onboarding"
          className="inline-block bg-blue-600 text-white rounded-lg px-6 py-3 font-medium hover:bg-blue-700 transition-colors"
        >
          Complete Setup
        </Link>
      </div>
    );
  }

  // Group posts by source story URL to pair LinkedIn and X versions
  const postPairs: PostPair[] = [];
  const processedUrls = new Set<string>();

  for (const post of data.posts) {
    const url = post.sourceStoryUrl || post.id; // fallback to id if no URL
    
    if (processedUrls.has(url)) continue;
    processedUrls.add(url);

    const linkedinPost = data.posts.find(p => p.sourceStoryUrl === url && p.platform === 'linkedin') || null;
    const xPost = data.posts.find(p => p.sourceStoryUrl === url && p.platform === 'x') || null;

    // Only add if we have at least one version
    if (linkedinPost || xPost) {
      postPairs.push({
        linkedin: linkedinPost,
        x: xPost,
        sourceUrl: url,
        sourceTitle: linkedinPost?.sourceStoryTitle || xPost?.sourceStoryTitle || '',
        topic: linkedinPost?.topic || xPost?.topic || null,
      });
    }
  }

  // For posts without pairs, add them individually
  const pairedUrls = new Set(postPairs.map(p => p.sourceUrl));
  for (const post of data.posts) {
    const url = post.sourceStoryUrl || post.id;
    if (!pairedUrls.has(url)) {
      postPairs.push({
        linkedin: post.platform === 'linkedin' ? post : null,
        x: post.platform === 'x' ? post : null,
        sourceUrl: url,
        sourceTitle: post.sourceStoryTitle || '',
        topic: post.topic,
      });
    }
  }

  const currentPosts = postPairs
    .map(pair => platform === 'linkedin' ? pair.linkedin : pair.x)
    .filter((post): post is GeneratedPost => post !== null);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Today&apos;s Suggestions</h1>
            <p className="text-gray-600 mt-1">
              Review and post your AI-generated content
            </p>
          </div>
          <DatePicker selectedDate={selectedDate} />
        </div>
      </div>

      {data.posts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm">
          <div className="text-6xl mb-4">📝</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No posts for this date
          </h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Posts are generated daily at 11pm. Check back tomorrow for fresh suggestions, 
            or use the chat to create posts on-demand.
          </p>
          <Link
            href="/chat"
            className="inline-block bg-blue-600 text-white rounded-lg px-6 py-3 font-medium hover:bg-blue-700 transition-colors"
          >
            Create Post Now
          </Link>
        </div>
      ) : (
        <>
          {/* Platform Toggle */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Viewing:</span>
              <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-white">
                <button
                  onClick={() => setPlatform('linkedin')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    platform === 'linkedin'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <span className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold ${
                    platform === 'linkedin' ? 'bg-white/20' : 'bg-blue-600 text-white'
                  }`}>
                    in
                  </span>
                  LinkedIn
                </button>
                <button
                  onClick={() => setPlatform('x')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    platform === 'x'
                      ? 'bg-black text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <span className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold ${
                    platform === 'x' ? 'bg-white/20' : 'bg-black text-white'
                  }`}>
                    𝕏
                  </span>
                  X
                </button>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {postPairs.length} post ideas • {currentPosts.length} {platform === 'linkedin' ? 'LinkedIn' : 'X'} versions
            </div>
          </div>

          {/* Posts Grid */}
          <div className="grid md:grid-cols-2 gap-4">
            {currentPosts.map(post => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>

          {/* Empty state for missing platform versions */}
          {currentPosts.length === 0 && postPairs.length > 0 && (
            <div className="text-center py-12 bg-white rounded-xl">
              <p className="text-gray-600">
                No {platform === 'linkedin' ? 'LinkedIn' : 'X'} versions available. 
                Switch to {platform === 'linkedin' ? 'X' : 'LinkedIn'} to see posts.
              </p>
            </div>
          )}
        </>
      )}

      {/* Stats */}
      {data.posts.length > 0 && (
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-2xl font-bold text-gray-900">{postPairs.length}</div>
            <div className="text-sm text-gray-600">Post Ideas</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-2xl font-bold text-green-600">
              {data.posts.filter(p => p.status === 'posted' || p.status === 'posted_edited').length}
            </div>
            <div className="text-sm text-gray-600">Posted</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-2xl font-bold text-blue-600">
              {data.posts.filter(p => p.status === 'saved').length}
            </div>
            <div className="text-sm text-gray-600">Saved for Later</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-2xl font-bold text-gray-400">
              {data.posts.filter(p => p.status === 'suggested').length}
            </div>
            <div className="text-sm text-gray-600">Pending Review</div>
          </div>
        </div>
      )}
    </div>
  );
}
