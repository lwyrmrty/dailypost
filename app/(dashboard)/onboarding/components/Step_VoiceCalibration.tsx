'use client';

import { useEffect, useMemo, useState } from 'react';

type CalibrationRating = 'not_accurate' | 'good' | 'great';

interface CalibrationVersion {
  label: string;
  content: string;
  postType?: string;
}

interface PostTypeRating {
  type: string;
  rating: number;
}

export interface CalibrationFeedback {
  batch: number;
  label: string;
  content: string;
  topic: string;
  platform: 'linkedin';
  rating: CalibrationRating;
  postType?: string;
}

interface StepVoiceCalibrationProps {
  onComplete: (data: {
    calibrationFeedback: CalibrationFeedback[];
    voiceAnalysis?: unknown;
    styleBible?: string;
  }) => void;
  onSkip: () => void;
  voiceAnalysis?: unknown;
  styleBible?: string;
  primaryTopics?: string[];
  postTypeRatings?: PostTypeRating[];
  isEditing?: boolean;
}

const REQUIRED_APPROVED_COUNT = 5;
const REQUIRED_BATCH_SIZE = 10;

const RATING_LABELS: Record<CalibrationRating, string> = {
  not_accurate: 'Not Accurate',
  good: 'Good',
  great: 'Great',
};

export default function StepVoiceCalibration({
  onComplete,
  onSkip,
  voiceAnalysis,
  styleBible,
  primaryTopics,
  postTypeRatings,
  isEditing = false,
}: StepVoiceCalibrationProps) {
  const [versions, setVersions] = useState<CalibrationVersion[]>([]);
  const [ratings, setRatings] = useState<Record<string, CalibrationRating>>({});
  const [feedback, setFeedback] = useState<CalibrationFeedback[]>([]);
  const [batch, setBatch] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [activeStyleBible, setActiveStyleBible] = useState(styleBible);
  const [activeVoiceAnalysis, setActiveVoiceAnalysis] = useState<unknown>(voiceAnalysis);

  const topics = useMemo(
    () => (primaryTopics?.length ? primaryTopics : ['industry trends', 'how your market is changing']),
    [primaryTopics]
  );

  const activeTopic = topics[(batch - 1) % topics.length];
  const ratedCount = versions.filter((version) => ratings[version.label]).length;
  const approvedCount = versions.filter((version) => {
    const rating = ratings[version.label];
    return rating === 'good' || rating === 'great';
  }).length;
  const historicalApprovedCount = feedback.filter((item) => item.rating === 'good' || item.rating === 'great').length;
  const totalApprovedCount = historicalApprovedCount + approvedCount;
  const canSubmit = versions.length === REQUIRED_BATCH_SIZE && ratedCount === versions.length && !loading;

  useEffect(() => {
    setActiveStyleBible(styleBible);
  }, [styleBible]);

  useEffect(() => {
    setActiveVoiceAnalysis(voiceAnalysis);
  }, [voiceAnalysis]);

  async function generateBatch() {
    if (!activeStyleBible) {
      setError('Generate your voice first before starting validation.');
      setVersions([]);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/onboarding/calibrate-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          styleBible: activeStyleBible,
          topic: activeTopic,
          platform: 'linkedin',
          postTypeRatings,
          feedback,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to generate validation posts');
      }

      const data = await response.json();
      if (!Array.isArray(data.versions) || data.versions.length !== REQUIRED_BATCH_SIZE) {
        throw new Error('The validation batch was incomplete. Please try again.');
      }

      setVersions(data.versions);
      setRatings({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate validation posts.');
      setVersions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void generateBatch();
    // Regenerate whenever the batch advances or the source voice changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch, activeStyleBible]);

  function setRating(label: string, rating: CalibrationRating) {
    setRatings((prev) => ({ ...prev, [label]: rating }));
  }

  function handleSubmitBatch() {
    const batchFeedback: CalibrationFeedback[] = versions.map((version) => ({
      batch,
      label: version.label,
      content: version.content,
      topic: activeTopic,
      platform: 'linkedin',
      rating: ratings[version.label],
      postType: version.postType,
    }));

    const allFeedback = [...feedback, ...batchFeedback];

    if (totalApprovedCount >= REQUIRED_APPROVED_COUNT) {
      onComplete({
        calibrationFeedback: allFeedback,
        voiceAnalysis: activeVoiceAnalysis,
        styleBible: activeStyleBible,
      });
      return;
    }

    setFeedback(allFeedback);
    setInfo(
      `Saved this batch of ratings. We now have ${totalApprovedCount} of ${REQUIRED_APPROVED_COUNT} posts rated Good or Great. We will use those stronger samples, plus the misses you marked Not Accurate, to improve the next set.`
    );
    setBatch((prev) => prev + 1);
  }

  return (
    <div className="cardcontent">
      <div className="flexrow">
        <div className="_40col">
          <div className="cardcontent-header">
            <div className="cardcontent-heading">Rank Sample Posts</div>
            <div className="cardcontent-subheading">
              Rate all 10 generated LinkedIn posts. Once at least 5 feel Good or Great, we can trust that your voice profile is strong enough to use.
              <br />
            </div>
            <div className="cardcontent-subheading">
              Rate these less on the topics you would write, more that you could see this being how you might write about this topic.
              <br />
            </div>
          </div>
          <div className="labeltxt pulldown">{totalApprovedCount} of {REQUIRED_APPROVED_COUNT} Good or Great posts</div>
          {info ? <div className="smalltext">{info}</div> : null}
          {error ? <div className="smalltext">{error}</div> : null}
          <button type="button" onClick={onSkip} hidden aria-hidden="true" tabIndex={-1}>
            Skip
          </button>
          <div>
            <div className="floatingbutton leftalign">
              <button
                type="button"
                onClick={handleSubmitBatch}
                disabled={!canSubmit || totalApprovedCount < REQUIRED_APPROVED_COUNT}
                className="submitbutton w-inline-block"
              >
                <div>{isEditing ? 'Save Changes' : 'Finish!'}</div>
              </button>
            </div>
          </div>
          <div>
            <div className="floatingbutton leftalign">
              <button
                type="button"
                onClick={() => {
                  if (canSubmit) {
                    handleSubmitBatch();
                  }
                }}
                disabled={!canSubmit || totalApprovedCount >= REQUIRED_APPROVED_COUNT}
                className="submitbutton dark w-inline-block"
              >
                <div>Generate 10 More Posts</div>
              </button>
            </div>
          </div>
        </div>
        <div className="_60col">
          {loading && (
            <div
              style={{
                display: 'flex',
                minHeight: '420px',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: '420px',
                  border: '1.5px solid #d8e0db',
                  borderRadius: '16px',
                  background: 'linear-gradient(180deg, #f9fbfa 0%, #f1f5f3 100%)',
                  padding: '28px 24px',
                  textAlign: 'center',
                  boxShadow: '0 18px 50px rgba(3, 28, 37, 0.08)',
                }}
              >
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    margin: '0 auto 16px',
                    borderRadius: '999px',
                    background: '#002e3d',
                    opacity: 0.16,
                  }}
                  className="animate-pulse"
                />
                <div
                  style={{
                    marginBottom: '8px',
                    color: '#002e3d',
                  }}
                  className="buttonheading animate-pulse"
                >
                  Generating 10 fresh validation posts...
                </div>
                <div className="smalltext" style={{ color: '#36525b' }}>
                  We&apos;re creating a stronger batch in your voice and varying the hooks, angles, and structure so you can judge whether this really sounds like you.
                </div>
              </div>
            </div>
          )}
          {!loading && versions.map((version) => (
            <div key={version.label} className="postsample">
              <div className="buttonheading">Post {version.label}</div>
              <div className="buttonsubheading large" style={{ whiteSpace: 'pre-line' }}>{version.content}</div>
              <div className="ratingrow">
                {(Object.keys(RATING_LABELS) as CalibrationRating[]).map((rating) => (
                  <div key={rating} className="pillselector-item fill">
                    <button
                      type="button"
                      onClick={() => setRating(version.label, rating)}
                      className={`pillselector-button row w-inline-block ${rating === 'not_accurate' ? 'red' : ''} ${ratings[version.label] === rating && rating === 'great' ? 'full' : ''} ${ratings[version.label] === rating ? 'selected' : ''}`}
                    >
                      <div className="buttonheading">{RATING_LABELS[rating]}</div>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
