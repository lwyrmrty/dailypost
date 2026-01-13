'use client';

import { useState } from 'react';

interface Step7Props {
  onComplete: (data: { topicPerspectives: TopicPerspective[] }) => void;
  onSkip: () => void;
  primaryTopics: string[];
  initialData?: { topicPerspectives: TopicPerspective[] };
}

export interface TopicPerspective {
  topic: string;
  perspective: string;
}

export default function Step7TopicPerspectives({ 
  onComplete, 
  onSkip, 
  primaryTopics,
  initialData 
}: Step7Props) {
  const [perspectives, setPerspectives] = useState<Record<string, string>>(
    initialData?.topicPerspectives?.reduce(
      (acc, p) => ({ ...acc, [p.topic]: p.perspective }), 
      {}
    ) || {}
  );

  // Take top 5 topics to get perspectives on
  const topicsToAsk = primaryTopics.slice(0, 5);

  function updatePerspective(topic: string, perspective: string) {
    setPerspectives(prev => ({ ...prev, [topic]: perspective }));
  }

  function handleSubmit() {
    const topicPerspectives = Object.entries(perspectives)
      .filter(([, perspective]) => perspective.trim().length > 0)
      .map(([topic, perspective]) => ({ topic, perspective }));
    onComplete({ topicPerspectives });
  }

  const completedCount = Object.values(perspectives).filter(p => p.trim().length > 50).length;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Share your perspectives</h2>
        <p className="text-gray-600">
          For your top topics, write a brief thesis or perspective. 
          This helps us capture your unique point of view.
        </p>
      </div>

      <div className="space-y-6">
        {topicsToAsk.map((topic, idx) => (
          <div key={topic} className="border border-gray-200 rounded-xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-medium">
                {idx + 1}
              </span>
              <div>
                <h3 className="font-semibold">{topic}</h3>
                <p className="text-sm text-gray-600">
                  What&apos;s your unique perspective or thesis on this topic?
                </p>
              </div>
            </div>
            
            <textarea
              value={perspectives[topic] || ''}
              onChange={(e) => updatePerspective(topic, e.target.value)}
              placeholder={`e.g., "I believe ${topic.toLowerCase()} is undergoing a fundamental shift because... The key insight most people miss is..."`}
              className="w-full border border-gray-300 rounded-lg p-4 h-32 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-500">
                {perspectives[topic]?.length || 0} characters
              </span>
              {(perspectives[topic]?.length || 0) >= 50 && (
                <span className="text-xs text-green-600">✓ Good length</span>
              )}
            </div>
          </div>
        ))}
      </div>

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
          disabled={completedCount < 2}
          className="flex-1 bg-blue-600 text-white rounded-lg py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
        >
          Complete Onboarding ({completedCount}/{Math.min(topicsToAsk.length, 2)} minimum)
        </button>
      </div>
    </div>
  );
}





