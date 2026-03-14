'use client';

import { useState } from 'react';
import { POSTING_GOALS } from '@/lib/constants/onboarding';
import { buildJobDescription, FoundationData } from '@/lib/utils/foundation';

interface Step1Props {
  onComplete: (data: Pick<FoundationData, 'role' | 'focus' | 'differentiator' | 'jobDescription' | 'postingGoals'>) => void;
  initialData?: FoundationData;
  isEditing?: boolean;
}

export default function Step1Foundation({ onComplete, initialData, isEditing = false }: Step1Props) {
  const [postingGoals, setPostingGoals] = useState<string[]>(initialData?.postingGoals || []);
  const [role, setRole] = useState(initialData?.role || '');
  const [focus, setFocus] = useState(initialData?.focus || initialData?.jobDescription || '');
  const [differentiator, setDifferentiator] = useState(initialData?.differentiator || '');

  function toggleGoal(goalId: string) {
    const newGoals = postingGoals.includes(goalId)
      ? postingGoals.filter(g => g !== goalId)
      : [...postingGoals, goalId];
    setPostingGoals(newGoals);
  }

  function handleSubmit() {
    const jobDescription = buildJobDescription(role, focus, differentiator);
    if (jobDescription && postingGoals.length > 0) {
      onComplete({
        role: role.trim(),
        focus: focus.trim(),
        differentiator: differentiator.trim() || undefined,
        jobDescription,
        postingGoals,
      });
    }
  }

  const isValid = role.trim().length > 0 && focus.trim().length > 0 && postingGoals.length > 0;

  return (
    <>
      <div className="cardcontent">
        <div className="cardcontent-header">
          <div className="cardcontent-heading">Let&apos;s start with the basics</div>
          <div className="cardcontent-subheading">
            This helps us understand your context and interests.
            <br />
          </div>
        </div>
        <div className="fieldrow">
          <div className="fieldblock">
            <label htmlFor="role" className="fieldlabel">What&apos;s your role</label>
            <input
              id="role"
              className="textfield w-input"
              maxLength={256}
              value={role}
              onChange={(e) => setRole(e.target.value)}
              type="text"
            />
          </div>
          <div className="fieldblock">
            <label htmlFor="focus" className="fieldlabel">What do your focus on?</label>
            <input
              id="focus"
              className="textfield w-input"
              maxLength={256}
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              type="text"
            />
          </div>
        </div>
        <div className="fieldrow">
          <div className="fieldblock">
            <label htmlFor="differentiator" className="fieldlabel">What makes your perspective distinctive?</label>
            <input
              id="differentiator"
              className="textfield w-input"
              maxLength={256}
              value={differentiator}
              onChange={(e) => setDifferentiator(e.target.value)}
              type="text"
            />
          </div>
        </div>
      </div>

      <div className="cardcontent">
        <div className="cardcontent-header">
          <div className="cardcontent-heading">What are your posting goals?</div>
          <div className="cardcontent-subheading">
            This helps us understand the tone and intent of the posts that we write. <strong>Select at least one.</strong>
            <br />
          </div>
        </div>
        <div className="buttonselectors">
          {POSTING_GOALS.map((goal) => (
            <div key={goal.id} className="buttonsector-item">
              <button
                type="button"
                onClick={() => toggleGoal(goal.id)}
                className={`buttonselector-button w-inline-block ${postingGoals.includes(goal.id) ? 'selected' : ''}`}
              >
                <div className="buttonheading">{goal.label}</div>
                <div className="buttonsubheading">{goal.description}</div>
              </button>
            </div>
          ))}
        </div>
        <div className="floatingbutton">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid}
            className="submitbutton w-button"
          >
            {isEditing ? 'Save Changes' : 'Continue - Next Step'}
          </button>
        </div>
      </div>
    </>
  );
}


