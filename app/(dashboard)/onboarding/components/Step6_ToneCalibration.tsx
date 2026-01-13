'use client';

import { useState } from 'react';
import { TONE_EXAMPLES } from '@/lib/constants/onboarding';

interface Step6Props {
  onComplete: (data: { tonePreferences: TonePreferences }) => void;
  onSkip: () => void;
  initialData?: { tonePreferences: TonePreferences };
}

export interface TonePreferences {
  primary: string;
  secondary: string;
  blend: Record<string, number>;
}

type ToneKey = keyof typeof TONE_EXAMPLES;

export default function Step6ToneCalibration({ onComplete, onSkip, initialData }: Step6Props) {
  const [selectedTones, setSelectedTones] = useState<ToneKey[]>(
    initialData?.tonePreferences 
      ? [initialData.tonePreferences.primary as ToneKey, initialData.tonePreferences.secondary as ToneKey].filter(Boolean)
      : []
  );
  const [blend, setBlend] = useState<Record<string, number>>(
    initialData?.tonePreferences?.blend || {}
  );

  function toggleTone(tone: ToneKey) {
    setSelectedTones(prev => {
      if (prev.includes(tone)) {
        const newBlend = { ...blend };
        delete newBlend[tone];
        setBlend(newBlend);
        return prev.filter(t => t !== tone);
      }
      if (prev.length >= 2) {
        // Replace the oldest selection
        const newBlend = { ...blend };
        delete newBlend[prev[0]];
        newBlend[tone] = 50;
        setBlend(newBlend);
        return [prev[1], tone];
      }
      setBlend(prev_blend => ({ ...prev_blend, [tone]: 50 }));
      return [...prev, tone];
    });
  }

  function updateBlend(tone: string, value: number) {
    setBlend(prev => {
      const newBlend = { ...prev, [tone]: value };
      // Ensure the other tone gets the remaining percentage
      const otherTone = selectedTones.find(t => t !== tone);
      if (otherTone) {
        newBlend[otherTone] = 100 - value;
      }
      return newBlend;
    });
  }

  function handleSubmit() {
    const tonePreferences: TonePreferences = {
      primary: selectedTones[0] || '',
      secondary: selectedTones[1] || '',
      blend,
    };
    onComplete({ tonePreferences });
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Calibrate your tone</h2>
        <p className="text-gray-600">
          Select up to 2 tones that best represent how you want to sound. 
          Then adjust the blend.
        </p>
      </div>

      <div className="space-y-4">
        {(Object.entries(TONE_EXAMPLES) as [ToneKey, typeof TONE_EXAMPLES[ToneKey]][]).map(([key, tone]) => (
          <button
            key={key}
            type="button"
            onClick={() => toggleTone(key)}
            className={`w-full text-left border rounded-xl p-5 transition-colors ${
              selectedTones.includes(key)
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold">{tone.name}</h3>
              {selectedTones.includes(key) && (
                <span className="text-blue-600 text-sm">
                  {selectedTones.indexOf(key) === 0 ? 'Primary' : 'Secondary'}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-3">{tone.description}</p>
            <div className="bg-white rounded-lg p-3 text-sm text-gray-700 italic border border-gray-100">
              &quot;{tone.example}&quot;
            </div>
          </button>
        ))}
      </div>

      {selectedTones.length === 2 && (
        <div className="border border-gray-200 rounded-xl p-6">
          <h3 className="font-medium mb-4">Adjust your tone blend</h3>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{TONE_EXAMPLES[selectedTones[0]].name}</span>
              <span className="font-medium">{TONE_EXAMPLES[selectedTones[1]].name}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={blend[selectedTones[0]] || 50}
              onChange={(e) => updateBlend(selectedTones[0], parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>{blend[selectedTones[0]] || 50}%</span>
              <span>{blend[selectedTones[1]] || 50}%</span>
            </div>
          </div>
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
          onClick={handleSubmit}
          disabled={selectedTones.length === 0}
          className="flex-1 bg-blue-600 text-white rounded-lg py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}






