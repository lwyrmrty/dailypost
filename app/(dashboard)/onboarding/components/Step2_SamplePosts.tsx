'use client';

import { useState } from 'react';
import { SAMPLE_STORIES } from '@/lib/constants/onboarding';

interface Step2Props {
  onComplete: (data: { samplePosts: string[] }) => void;
  onSkip: () => void;
  initialData?: { samplePosts: string[] };
}

export default function Step2SamplePosts({ onComplete, onSkip, initialData }: Step2Props) {
  const [posts, setPosts] = useState<Record<number, string>>(
    initialData?.samplePosts?.reduce((acc, post, idx) => ({ ...acc, [idx]: post }), {}) || {}
  );

  function handleSubmit() {
    const writtenPosts = Object.values(posts).filter(p => p.trim().length > 0);
    if (writtenPosts.length >= 2) {
      onComplete({ samplePosts: writtenPosts });
    }
  }

  const writtenCount = Object.values(posts).filter(p => p.trim().length > 50).length;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Write a few sample posts</h2>
        <p className="text-gray-600">
          This helps us capture your natural voice. Write at least 2 posts as you normally would.
        </p>
      </div>

      {SAMPLE_STORIES.map((story, idx) => (
        <div key={idx} className="border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Sample Story
            </span>
            <h3 className="font-semibold text-lg mt-1">{story.title}</h3>
            <p className="text-gray-600 mt-1">{story.summary}</p>
            <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
              {story.topic}
            </span>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Write a LinkedIn post about this story
            </label>
            <textarea
              value={posts[idx] || ''}
              onChange={(e) => setPosts(prev => ({ ...prev, [idx]: e.target.value }))}
              placeholder="Write in your natural voice... Don't worry about being perfect, we want to learn how you naturally express yourself."
              className="w-full border border-gray-300 rounded-lg p-4 h-40 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-500">
                {posts[idx]?.length || 0} characters
              </span>
              {(posts[idx]?.length || 0) >= 50 && (
                <span className="text-xs text-green-600">✓ Good length</span>
              )}
            </div>
          </div>
        </div>
      ))}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onSkip}
          className="flex-1 border border-gray-300 rounded-lg py-3 font-medium hover:bg-gray-50 transition-colors"
        >
          Skip This Step
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={writtenCount < 2}
          className="flex-1 bg-blue-600 text-white rounded-lg py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
        >
          Continue ({writtenCount}/2 minimum)
        </button>
      </div>
    </div>
  );
}





