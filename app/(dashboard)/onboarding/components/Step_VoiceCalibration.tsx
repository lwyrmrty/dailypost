'use client';

import { useState } from 'react';

interface CalibrationVersion {
  label: string;
  content: string;
}

export interface CalibrationFeedback {
  selectedVersion: string;
  reasoning: string;
  platform: string;
}

interface StepVoiceCalibrationProps {
  onComplete: (data: { calibrationFeedback: CalibrationFeedback[] }) => void;
  onSkip: () => void;
  styleBible?: string;
  primaryTopics?: string[];
}

export default function StepVoiceCalibration({
  onComplete,
  onSkip,
  styleBible,
  primaryTopics,
}: StepVoiceCalibrationProps) {
  const [versions, setVersions] = useState<CalibrationVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [reasoning, setReasoning] = useState('');
  const [feedback, setFeedback] = useState<CalibrationFeedback[]>([]);
  const [round, setRound] = useState(0);
  const [error, setError] = useState('');

  const topics = primaryTopics?.length ? primaryTopics : ['technology trends'];
  const maxRounds = 2;

  async function generateVersions() {
    if (!styleBible) {
      setError('Voice analysis required before calibration. Go back and complete the upload step.');
      return;
    }

    setLoading(true);
    setError('');
    setSelected(null);
    setReasoning('');

    try {
      const topic = topics[round % topics.length];
      const platform = round === 0 ? 'linkedin' : 'x';

      const response = await fetch('/api/onboarding/calibrate-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ styleBible, topic, platform }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate calibration posts');
      }

      const data = await response.json();
      setVersions(data.versions);
    } catch {
      setError('Failed to generate sample posts. You can skip this step.');
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(label: string) {
    setSelected(label);
  }

  function handleSubmitRound() {
    if (!selected) return;

    const platform = round === 0 ? 'linkedin' : 'x';
    const newFeedback = [
      ...feedback,
      { selectedVersion: selected, reasoning, platform },
    ];
    setFeedback(newFeedback);

    if (round + 1 < maxRounds) {
      setRound(round + 1);
      setVersions([]);
      setSelected(null);
      setReasoning('');
    } else {
      onComplete({ calibrationFeedback: newFeedback });
    }
  }

  // Auto-generate on first render and when moving to next round
  if (versions.length === 0 && !loading && !error) {
    generateVersions();
  }

  const platformLabel = round === 0 ? 'LinkedIn' : 'X';

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Voice calibration</h2>
        <p className="text-gray-600">
          We generated {platformLabel} posts using your voice profile.
          Pick the one that sounds most like something you&apos;d actually post.
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Round {round + 1} of {maxRounds} &middot; {platformLabel}
        </p>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-r-transparent" />
          <p className="text-gray-600 mt-4">Generating sample posts in your voice...</p>
        </div>
      )}

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          {error}
        </div>
      )}

      {versions.length > 0 && (
        <div className="space-y-4">
          {versions.map((version) => (
            <button
              key={version.label}
              type="button"
              onClick={() => handleSelect(version.label)}
              className={`w-full text-left border-2 rounded-xl p-6 transition-all ${
                selected === version.label
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  selected === version.label
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {version.label}
                </span>
                {selected === version.label && (
                  <span className="text-sm text-blue-600 font-medium">Selected</span>
                )}
              </div>
              <p className="text-gray-900 whitespace-pre-line leading-relaxed text-sm">
                {version.content}
              </p>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div>
          <label className="block text-sm font-medium mb-2">
            What makes this one sound most like you? (optional)
          </label>
          <textarea
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            placeholder="e.g., 'The tone is right but I'd never use that opening' or 'This one nails my style but I'd be more direct'"
            className="w-full border border-gray-300 rounded-lg p-4 h-24 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      )}

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
          onClick={handleSubmitRound}
          disabled={!selected}
          className="flex-1 bg-blue-600 text-white rounded-lg py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
        >
          {round + 1 < maxRounds ? `Next (${platformLabel})` : 'Complete Calibration'}
        </button>
      </div>
    </div>
  );
}
