'use client';

import { useState } from 'react';

interface VoiceAnalysis {
  sentencePatterns?: {
    avgLength: number;
    variability: string;
    preferredStructures?: string[];
  };
  openingPatterns?: {
    style: string;
    examples?: string[];
    hookLength: string;
  };
  closingPatterns?: {
    style: string;
  };
  vocabulary?: {
    level: string;
    jargonUsage: string;
    signatureWords?: string[];
    transitionWords?: string[];
  };
  tone?: {
    primary: string;
    formality: number;
    warmth: number;
    confidence: string;
  };
  personality?: {
    humorStyle: string;
    opinionStrength: string;
    contrarianism: string;
  };
  formatting?: {
    lineBreakUsage: string;
    emojiUsage: string;
    emphasisStyle?: string[];
  };
  perspective?: {
    pointOfView: string;
    storytellingVsAnalysis: number;
  };
  uniqueQuirks?: string[];
  voiceSummary?: string;
  exampleReconstruction?: string;
  // Legacy fields for backwards compatibility
  avgSentenceLength?: number;
  vocabularyLevel?: string;
  questionUsage?: string;
  humorLevel?: string;
  structurePreference?: string;
  insights?: string;
  [key: string]: unknown;
}

interface Step3Props {
  onComplete: (data: { uploadedContent: string[]; voiceAnalysis?: VoiceAnalysis }) => void;
  onSkip: () => void;
  initialData?: { uploadedContent: string[] };
}

function AnalysisDisplay({ analysis }: { analysis: VoiceAnalysis }) {
  // Support both new rich format and legacy format
  const isRichFormat = !!analysis.voiceSummary;

  if (!isRichFormat) {
    // Legacy display
    return (
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
            <dt className="font-medium text-blue-700">Insights</dt>
            <dd className="text-blue-900">{analysis.insights}</dd>
          </div>
        </dl>
      </div>
    );
  }

  return (
    <div className="border border-blue-200 rounded-xl p-6 bg-blue-50 space-y-6">
      <div>
        <h3 className="font-semibold text-lg text-blue-900">Your Voice DNA</h3>
        <p className="text-blue-800 mt-2 leading-relaxed">{analysis.voiceSummary}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        {analysis.tone && (
          <>
            <div>
              <dt className="font-medium text-blue-700">Tone</dt>
              <dd className="text-blue-900 capitalize">{analysis.tone.primary}</dd>
            </div>
            <div>
              <dt className="font-medium text-blue-700">Formality</dt>
              <dd className="text-blue-900">{analysis.tone.formality}/10</dd>
            </div>
          </>
        )}

        {analysis.sentencePatterns && (
          <>
            <div>
              <dt className="font-medium text-blue-700">Avg Sentence Length</dt>
              <dd className="text-blue-900">{analysis.sentencePatterns.avgLength} words</dd>
            </div>
            <div>
              <dt className="font-medium text-blue-700">Sentence Variety</dt>
              <dd className="text-blue-900 capitalize">{analysis.sentencePatterns.variability?.replace('_', ' ')}</dd>
            </div>
          </>
        )}

        {analysis.personality && (
          <>
            <div>
              <dt className="font-medium text-blue-700">Humor Style</dt>
              <dd className="text-blue-900 capitalize">{analysis.personality.humorStyle?.replace('_', ' ')}</dd>
            </div>
            <div>
              <dt className="font-medium text-blue-700">Opinion Strength</dt>
              <dd className="text-blue-900 capitalize">{analysis.personality.opinionStrength?.replace(/_/g, ' ')}</dd>
            </div>
          </>
        )}

        {analysis.perspective && (
          <>
            <div>
              <dt className="font-medium text-blue-700">Point of View</dt>
              <dd className="text-blue-900 capitalize">{analysis.perspective.pointOfView?.replace(/_/g, ' ')}</dd>
            </div>
            <div>
              <dt className="font-medium text-blue-700">Storytelling vs Analysis</dt>
              <dd className="text-blue-900">
                {analysis.perspective.storytellingVsAnalysis <= 3 ? 'Data-driven' :
                 analysis.perspective.storytellingVsAnalysis >= 7 ? 'Storyteller' : 'Balanced'}
              </dd>
            </div>
          </>
        )}

        {analysis.vocabulary && (
          <div>
            <dt className="font-medium text-blue-700">Vocabulary</dt>
            <dd className="text-blue-900 capitalize">{analysis.vocabulary.level}</dd>
          </div>
        )}

        {analysis.openingPatterns && (
          <div>
            <dt className="font-medium text-blue-700">Opening Style</dt>
            <dd className="text-blue-900 capitalize">{analysis.openingPatterns.style}</dd>
          </div>
        )}
      </div>

      {analysis.vocabulary?.signatureWords && analysis.vocabulary.signatureWords.length > 0 && (
        <div>
          <h4 className="font-medium text-blue-700 text-sm mb-2">Your Signature Phrases</h4>
          <div className="flex flex-wrap gap-2">
            {analysis.vocabulary.signatureWords.map((word, i) => (
              <span key={i} className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full">
                {word}
              </span>
            ))}
          </div>
        </div>
      )}

      {analysis.uniqueQuirks && analysis.uniqueQuirks.length > 0 && (
        <div>
          <h4 className="font-medium text-blue-700 text-sm mb-2">Distinctive Quirks</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            {analysis.uniqueQuirks.map((quirk, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">&#x2022;</span>
                {quirk}
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.exampleReconstruction && (
        <div>
          <h4 className="font-medium text-blue-700 text-sm mb-2">Sample in Your Voice</h4>
          <blockquote className="text-sm text-blue-800 italic border-l-2 border-blue-300 pl-3">
            &quot;{analysis.exampleReconstruction}&quot;
          </blockquote>
          <p className="text-xs text-blue-600 mt-1">AI-generated example to verify voice accuracy</p>
        </div>
      )}
    </div>
  );
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
          This helps us deeply understand your voice. The more samples you provide,
          the more accurately we can match your style.
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
            {postCount >= 5 && postCount < 10 && ' (10+ recommended for best results)'}
          </p>
          {postCount >= 5 && !analysis && (
            <button
              type="button"
              onClick={analyzeVoice}
              disabled={analyzing}
              className="text-sm text-blue-600 hover:underline"
            >
              {analyzing ? 'Analyzing your voice...' : 'Analyze my voice'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          {error}
        </div>
      )}

      {analysis && <AnalysisDisplay analysis={analysis} />}

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
