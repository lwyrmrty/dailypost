'use client';

import { useState } from 'react';
import { POST_TYPES } from '@/lib/constants/onboarding';

interface Step5Props {
  onComplete: (data: { postTypeRatings: PostTypeRating[] }) => void;
  onSkip: () => void;
  initialData?: { postTypeRatings: PostTypeRating[] };
}

export interface PostTypeRating {
  type: string;
  rating: number;
}

export default function Step5PostTypes({ onComplete, onSkip, initialData }: Step5Props) {
  const [ratings, setRatings] = useState<Record<string, number>>(
    initialData?.postTypeRatings?.reduce(
      (acc, r) => ({ ...acc, [r.type]: r.rating }), 
      {}
    ) || {}
  );

  function setRating(type: string, rating: number) {
    setRatings(prev => ({ ...prev, [type]: rating }));
  }

  function handleSubmit() {
    const postTypeRatings = Object.entries(ratings).map(([type, rating]) => ({
      type,
      rating,
    }));
    onComplete({ postTypeRatings });
  }

  const ratedCount = Object.keys(ratings).length;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Rate post types</h2>
        <p className="text-gray-600">
          How often would you like to create each type of post? 
          Rate from 1 (rarely) to 5 (frequently).
        </p>
      </div>

      <div className="space-y-4">
        {POST_TYPES.map((postType) => (
          <div 
            key={postType.type} 
            className="border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold">{postType.name}</h3>
                <p className="text-sm text-gray-600">{postType.description}</p>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm text-gray-700 italic">
              &quot;{postType.example}&quot;
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 w-16">Rarely</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(postType.type, value)}
                    className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                      ratings[postType.type] === value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <span className="text-sm text-gray-500 w-20">Frequently</span>
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
          disabled={ratedCount < 4}
          className="flex-1 bg-blue-600 text-white rounded-lg py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
        >
          Continue ({ratedCount}/{POST_TYPES.length} rated)
        </button>
      </div>
    </div>
  );
}






