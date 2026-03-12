'use client';

import { useState } from 'react';

const REWRITE_EXERCISES = [
  {
    topic: 'AI in Enterprise',
    generic: `Artificial intelligence is transforming enterprise software. Companies are increasingly adopting AI solutions to improve efficiency and reduce costs. This trend is expected to continue as the technology matures and becomes more accessible to organizations of all sizes. Business leaders should consider how AI can be integrated into their operations.`,
    context: 'A generic take on AI adoption',
  },
  {
    topic: 'Startup Fundraising',
    generic: `A notable startup has successfully raised a significant Series B round. The funding will be used to expand the team and accelerate product development. Investors expressed confidence in the company\'s growth trajectory and market opportunity. This round reflects continued investor interest in the sector.`,
    context: 'A bland fundraising announcement',
  },
  {
    topic: 'Industry Shift',
    generic: `The technology industry is undergoing a major transition. Traditional approaches are being replaced by new methodologies that promise better outcomes. While some experts are optimistic about these changes, others urge caution. It will be interesting to see how this plays out over the next few years.`,
    context: 'A safe, noncommittal industry observation',
  },
];

interface Step2Props {
  onComplete: (data: { samplePosts: string[]; rewriteExercises: RewritePair[] }) => void;
  onSkip: () => void;
  initialData?: { samplePosts: string[] };
}

export interface RewritePair {
  original: string;
  rewrite: string;
  topic: string;
}

export default function Step2SamplePosts({ onComplete, onSkip, initialData }: Step2Props) {
  const minRequired = 2;

  const [rewrites, setRewrites] = useState<Record<number, string>>(
    initialData?.samplePosts?.reduce((acc, post, idx) => ({ ...acc, [idx]: post }), {}) || {}
  );

  function handleSubmit() {
    const pairs: RewritePair[] = [];
    const posts: string[] = [];

    REWRITE_EXERCISES.forEach((exercise, idx) => {
      const rewrite = rewrites[idx]?.trim();
      if (rewrite && rewrite.length > 50) {
        pairs.push({
          original: exercise.generic,
          rewrite,
          topic: exercise.topic,
        });
        posts.push(rewrite);
      }
    });

    if (pairs.length >= minRequired) {
      onComplete({ samplePosts: posts, rewriteExercises: pairs });
    }
  }

  const completedCount = Object.values(rewrites).filter(r => r.trim().length > 50).length;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Rewrite in your voice</h2>
        <>
          <p className="text-gray-600">
            Below are generic, AI-sounding posts. Rewrite at least {minRequired} of them the way
            <strong> you</strong> would actually say it. Don&apos;t worry about the topic &mdash;
            we&apos;re learning <em>how</em> you write, not <em>what</em> you write about.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Change the tone, restructure, add personality, be opinionated &mdash; make it yours.
          </p>
        </>
      </div>

      {REWRITE_EXERCISES.map((exercise, idx) => (
        <div key={idx} className="border border-gray-200 rounded-xl p-6 space-y-4">
          <div>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              {exercise.context}
            </span>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 text-gray-500 text-sm leading-relaxed border-l-4 border-gray-200">
            {exercise.generic}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Your version
            </label>
            <textarea
              value={rewrites[idx] || ''}
              onChange={(e) => setRewrites(prev => ({ ...prev, [idx]: e.target.value }))}
              placeholder="Rewrite this in your own voice... Be yourself. Be opinionated. Write it the way you'd actually post it."
              className="w-full border border-gray-300 rounded-lg p-4 h-40 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-500">
                {rewrites[idx]?.length || 0} characters
              </span>
              {(rewrites[idx]?.length || 0) >= 50 && (
                <span className="text-xs text-green-600">Ready</span>
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
          disabled={completedCount < minRequired}
          className="flex-1 bg-blue-600 text-white rounded-lg py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
        >
          Continue ({completedCount}/{minRequired} minimum)
        </button>
      </div>
    </div>
  );
}
