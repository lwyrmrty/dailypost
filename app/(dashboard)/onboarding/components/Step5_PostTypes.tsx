'use client';

import { useState } from 'react';
import { POST_TYPES } from '@/lib/constants/onboarding';

interface Step5Props {
  onComplete: (data: { postTypeRatings: PostTypeRating[] }) => void;
  onSkip: () => void;
  initialData?: { postTypeRatings: PostTypeRating[] };
  isEditing?: boolean;
}

export interface PostTypeRating {
  type: string;
  rating: number;
}

export default function Step5PostTypes({ onComplete, onSkip, initialData, isEditing = false }: Step5Props) {
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
    <div className="cardcontent">
      <div className="cardcontent-header">
        <div className="cardcontent-heading">Rate Post Types</div>
        <div className="cardcontent-subheading">
          How often would you like to create each type of post? Rate from 1 (rarely) to 5 (frequently). We use this as a soft signal for the kinds of posts you naturally gravitate toward.
          <br />
        </div>
        <div className="cardcontent-subheading">
          <strong>NOTE:</strong> Ignore the language for the post, this is to help identify the types of post you write, not whether you&apos;d start a post this way.
          <br />
        </div>
      </div>
      {POST_TYPES.map((postType) => (
        <div key={postType.type} className="walkthroughblock more">
          <div className="cardcontent-heading small">{postType.name}</div>
          <div className="cardcontent-subheading sm">{postType.description}<br /></div>
          <div className="textexample">
            <div>&quot;{postType.example}&quot;</div>
          </div>
          <div className="ratingrow gap">
            <div>Rarely - </div>
            {[1, 2, 3, 4, 5].map((value) => (
              <div key={value} className="pillselector-item sq">
                <button
                  type="button"
                  onClick={() => setRating(postType.type, value)}
                  className={`pillselector-button sq w-inline-block ${ratings[postType.type] === value ? 'selected' : ''}`}
                >
                  <div className="buttonheading">{value}</div>
                </button>
              </div>
            ))}
            <div> - Frequently</div>
          </div>
        </div>
      ))}
      <button type="button" onClick={onSkip} hidden aria-hidden="true" tabIndex={-1}>
        Skip
      </button>
      <div className="floatingbutton">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={ratedCount < 4}
          className="submitbutton w-button"
        >
          {isEditing ? 'Save Changes' : 'Continue - Next Step'}
        </button>
      </div>
    </div>
  );
}






