'use client';

import { useState } from 'react';

interface VoiceAnalysis {
  avgSentenceLength: number;
  vocabularyLevel: string;
  questionUsage: string;
  humorLevel: string;
  structurePreference: string;
  insights: string;
  [key: string]: unknown;
}

interface Step3Props {
  onComplete: (data: { uploadedContent: string[]; voiceAnalysis?: VoiceAnalysis }) => void;
  onSkip: () => void;
  initialData?: { uploadedContent: string[] };
}

export default function Step3UploadContent({ onComplete, onSkip, initialData }: Step3Props) {
  const [content, setContent] = useState(initialData?.uploadedContent?.join('\n\n---\n\n') || '');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<VoiceAnalysis | null>(null);
  const [error, setError] = useState('');

  async function analyzeVoice() {
    setAnalyzing(true);
    setError('');
    
    const posts = content.split(/\n\n---\n\n|\n---\n/).filter(p => p.trim().length > 0);
    
    try {
      const response = await fetch('/api/onboarding/analyze-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posts }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze voice');
      }

      const data = await response.json();
      setAnalysis(data.analysis);
    } catch {
      setError('Failed to analyze voice. You can still continue without analysis.');
    } finally {
      setAnalyzing(false);
    }
  }

  function handleSubmit() {
    const posts = content.split(/\n\n---\n\n|\n---\n/).filter(p => p.trim().length > 0);
    onComplete({ 
      uploadedContent: posts,
      voiceAnalysis: analysis || undefined,
    });
  }

  const postCount = content.split(/\n\n---\n\n|\n---\n/).filter(p => p.trim().length > 0).length;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Upload past content</h2>
        <p className="text-gray-600">
          Paste 10-20 of your past posts, articles, or professional writing. 
          This helps us deeply understand your voice.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Past Content (separate posts with &quot;---&quot;)
        </label>
        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setAnalysis(null);
          }}
          placeholder={`Paste your content here...

Example format:

This is my first post about AI and its impact on startups. I believe that...

---

Here's another post I wrote about climate tech innovation...

---

Third post goes here...`}
          className="w-full border border-gray-300 rounded-lg p-4 h-96 font-mono text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <div className="flex justify-between mt-2">
          <p className="text-sm text-gray-600">
            Detected {postCount} post{postCount !== 1 ? 's' : ''}
          </p>
          {postCount >= 5 && !analysis && (
            <button
              type="button"
              onClick={analyzeVoice}
              disabled={analyzing}
              className="text-sm text-blue-600 hover:underline"
            >
              {analyzing ? 'Analyzing...' : 'Analyze my voice'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          {error}
        </div>
      )}

      {analysis && (
        <div className="border border-blue-200 rounded-xl p-6 bg-blue-50">
          <h3 className="font-semibold mb-4 text-blue-900">Voice Profile Analysis</h3>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="font-medium text-blue-700">Average Sentence Length</dt>
              <dd className="text-blue-900">{analysis.avgSentenceLength} words</dd>
            </div>
            <div>
              <dt className="font-medium text-blue-700">Vocabulary Level</dt>
              <dd className="text-blue-900 capitalize">{analysis.vocabularyLevel}</dd>
            </div>
            <div>
              <dt className="font-medium text-blue-700">Question Usage</dt>
              <dd className="text-blue-900 capitalize">{analysis.questionUsage}</dd>
            </div>
            <div>
              <dt className="font-medium text-blue-700">Humor Level</dt>
              <dd className="text-blue-900 capitalize">{analysis.humorLevel}</dd>
            </div>
            <div className="col-span-2">
              <dt className="font-medium text-blue-700">Structure Preference</dt>
              <dd className="text-blue-900 capitalize">{analysis.structurePreference}</dd>
            </div>
            <div className="col-span-2">
              <dt className="font-medium text-blue-700">Insights</dt>
              <dd className="text-blue-900">{analysis.insights}</dd>
            </div>
          </dl>
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
          disabled={postCount < 5}
          className="flex-1 bg-blue-600 text-white rounded-lg py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
        >
          {postCount < 5 ? `Add ${5 - postCount} more posts` : 'Continue'}
        </button>
      </div>
    </div>
  );
}

