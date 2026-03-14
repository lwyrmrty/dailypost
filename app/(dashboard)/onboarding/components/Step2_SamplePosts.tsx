'use client';

import { useState } from 'react';

const WRITING_DIRECTIVES = [
  {
    topic: 'Take a stance',
    directive: 'Write a post with a strong opinion on something you care about.',
    helper: 'Pick something you genuinely believe and say it the way you actually would on LinkedIn.',
  },
  {
    topic: 'Teach something',
    directive: 'Write a post explaining a trend in your space to smart non-experts.',
    helper: 'Aim to make the idea clear without dumbing it down. Show how you naturally explain things.',
  },
  {
    topic: 'Personal insight',
    directive: 'Write a post about a lesson, pattern, or belief shaped by your experience.',
    helper: 'This can be reflective, opinionated, or story-driven, whatever feels most natural to you.',
  },
  {
    topic: 'Share something',
    directive: 'Write a post celebrating news, a milestone, or an announcement for yourself or another person or company.',
    helper: 'Think about how you naturally share wins, signal enthusiasm, and add context or meaning.',
  },
];

interface Step2Props {
  onComplete: (data: { samplePosts: string[]; rewriteExercises: RewritePair[] }) => void;
  onSkip: () => void;
  initialData?: { samplePosts?: string[]; rewriteExercises?: RewritePair[] };
  isEditing?: boolean;
}

export interface RewritePair {
  original: string;
  rewrite: string;
  topic: string;
}

export default function Step2SamplePosts({ onComplete, onSkip, initialData, isEditing = false }: Step2Props) {
  const minRequired = 2;

  const [rewrites, setRewrites] = useState<Record<number, string>>(
    initialData?.rewriteExercises?.reduce((acc, pair, idx) => ({ ...acc, [idx]: pair.rewrite }), {})
      || initialData?.samplePosts?.reduce((acc, post, idx) => ({ ...acc, [idx]: post }), {})
      || {}
  );

  function handleSubmit() {
    const pairs: RewritePair[] = [];
    WRITING_DIRECTIVES.forEach((exercise, idx) => {
      const rewrite = rewrites[idx]?.trim();
      if (rewrite && rewrite.length > 50) {
        pairs.push({
          original: exercise.directive,
          rewrite,
          topic: exercise.topic,
        });
      }
    });

    if (pairs.length >= minRequired) {
      onComplete({ samplePosts: [], rewriteExercises: pairs });
    }
  }

  const completedCount = Object.values(rewrites).filter(r => r.trim().length > 50).length;

  return (
    <div className="cardcontent">
      <div className="cardcontent-header">
        <div className="cardcontent-heading">Write in your voice</div>
        <div className="cardcontent-subheading">
          Below are a few guided writing prompts. Complete at least {minRequired} the way<strong> you</strong> would actually post them. We&apos;re learning how you naturally express ideas across different kinds of LinkedIn posts.
          <br />
        </div>
      </div>
      {WRITING_DIRECTIVES.map((exercise, idx) => (
        <div key={idx} className="walkthroughblock more">
          <div className="cardcontent-heading small">{exercise.topic}</div>
          <div className="cardcontent-subheading sm">
            <strong>{exercise.directive} </strong>
            {exercise.helper}
            <br />
          </div>
          <textarea
            maxLength={5000}
            value={rewrites[idx] || ''}
            onChange={(e) => setRewrites(prev => ({ ...prev, [idx]: e.target.value }))}
            className="textfield tall w-input"
          />
        </div>
      ))}
      <button type="button" onClick={onSkip} hidden aria-hidden="true" tabIndex={-1}>
        Skip
      </button>
      <div className="floatingbutton">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={completedCount < minRequired}
          className="submitbutton w-button"
        >
          {isEditing ? 'Save Changes' : 'Continue - Next Step'}
        </button>
      </div>
    </div>
  );
}
