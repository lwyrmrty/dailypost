'use client';

import { useEffect, useState } from 'react';
import type { RewritePair } from './Step2_SamplePosts';
import type { VoiceDiscoveryPreferences } from './Step_VoiceDiscovery';

interface VoiceAnalysis {
  sentencePatterns?: {
    avgLength: number;
    variability: string;
  };
  openingPatterns?: {
    style: string;
  };
  vocabulary?: {
    level: string;
    signatureWords?: string[];
  };
  tone?: {
    primary: string;
    formality: number;
  };
  personality?: {
    humorStyle: string;
    opinionStrength: string;
  };
  perspective?: {
    pointOfView: string;
    storytellingVsAnalysis: number;
  };
  uniqueQuirks?: string[];
  voiceSummary?: string;
  exampleReconstruction?: string;
  [key: string]: unknown;
}

interface PostTypeRating {
  type: string;
  rating: number;
}

interface StepGenerateVoiceProps {
  onComplete: (data: { voiceAnalysis?: VoiceAnalysis; styleBible?: string; resetCalibration?: boolean }) => void;
  uploadedContent?: string[];
  rewritePairs?: RewritePair[];
  jobDescription?: string;
  voiceDiscovery?: VoiceDiscoveryPreferences;
  postTypeRatings?: PostTypeRating[];
  initialAnalysis?: VoiceAnalysis;
  initialStyleBible?: string;
  isEditing?: boolean;
}

function AnalysisDisplay({ analysis }: { analysis: VoiceAnalysis }) {
  return (
    <div className="walkthroughblock resultsblock">
      <div>
        <div className="cardcontent-heading small">Your Voice DNA</div>
        {analysis.voiceSummary && (
          <div className="resultstext main">{analysis.voiceSummary}<br /></div>
        )}
      </div>

      <div className="columnswrapper">
        {analysis.tone && (
          <>
            <div className="rowcolumns">
              <div className="cardcontent-heading mini">Tone</div>
              <div className="resultstext">{analysis.tone.primary}<br /></div>
            </div>
            <div className="rowcolumns">
              <div className="cardcontent-heading mini">Formality</div>
              <div className="resultstext">{analysis.tone.formality}/10<br /></div>
            </div>
          </>
        )}
        {analysis.sentencePatterns && (
          <>
            <div className="rowcolumns">
              <div className="cardcontent-heading mini">Avg Sentence Length</div>
              <div className="resultstext">{analysis.sentencePatterns.avgLength} words<br /></div>
            </div>
            <div className="rowcolumns">
              <div className="cardcontent-heading mini">Sentence Variety</div>
              <div className="resultstext">{analysis.sentencePatterns.variability?.replace(/_/g, ' ')}<br /></div>
            </div>
          </>
        )}
        {analysis.personality && (
          <>
            <div className="rowcolumns">
              <div className="cardcontent-heading mini">Humor Style</div>
              <div className="resultstext">{analysis.personality.humorStyle?.replace(/_/g, ' ')}<br /></div>
            </div>
            <div className="rowcolumns">
              <div className="cardcontent-heading mini">Opinion Strength</div>
              <div className="resultstext">{analysis.personality.opinionStrength?.replace(/_/g, ' ')}<br /></div>
            </div>
          </>
        )}
        {analysis.perspective && (
          <>
            <div className="rowcolumns">
              <div className="cardcontent-heading mini">Point of View</div>
              <div className="resultstext">{analysis.perspective.pointOfView?.replace(/_/g, ' ')}<br /></div>
            </div>
            <div className="rowcolumns">
              <div className="cardcontent-heading mini">Storytelling vs Analysis</div>
              <div className="resultstext">
                {analysis.perspective.storytellingVsAnalysis <= 3
                  ? 'Data-driven'
                  : analysis.perspective.storytellingVsAnalysis >= 7
                    ? 'Storyteller'
                    : 'Balanced'}
                <br />
              </div>
            </div>
          </>
        )}
        {analysis.vocabulary && (
          <div className="rowcolumns">
            <div className="cardcontent-heading mini">Vocabulary</div>
            <div className="resultstext">{analysis.vocabulary.level}<br /></div>
          </div>
        )}
        {analysis.openingPatterns && (
          <div className="rowcolumns">
            <div className="cardcontent-heading mini">Opening Style</div>
            <div className="resultstext">{analysis.openingPatterns.style}<br /></div>
          </div>
        )}
      </div>

      {analysis.vocabulary?.signatureWords && analysis.vocabulary.signatureWords.length > 0 && (
        <div>
          <div className="cardcontent-heading mini">Signature Words</div>
          <div className="pillsrow">
            {analysis.vocabulary.signatureWords.map((word, index) => (
              <div key={index} className="pillblock">
                <div>{word}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {analysis.uniqueQuirks && analysis.uniqueQuirks.length > 0 && (
        <div>
          <div className="cardcontent-heading mini">Distinctive Quirks</div>
          <div className="bulletscol">
            {analysis.uniqueQuirks.map((quirk, index) => (
              <div key={index} className="bulletsrow">
                <div className="bulletscircle" />
                <div>{quirk}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function StepGenerateVoice({
  onComplete,
  uploadedContent,
  rewritePairs,
  jobDescription,
  voiceDiscovery,
  postTypeRatings,
  initialAnalysis,
  initialStyleBible,
  isEditing = false,
}: StepGenerateVoiceProps) {
  const [analysis, setAnalysis] = useState<VoiceAnalysis | null>(initialAnalysis || null);
  const [styleBible, setStyleBible] = useState<string | null>(initialStyleBible || null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeStage, setAnalyzeStage] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const [error, setError] = useState('');
  const [hasFreshAnalysis, setHasFreshAnalysis] = useState(false);

  const STAGES = [
    'Reading your writing samples...',
    'Identifying patterns and quirks...',
    'Building your voice fingerprint...',
    'Generating your Style Bible...',
  ];

  async function analyzeVoice() {
    if (!uploadedContent || uploadedContent.length < 5) {
      setError('Add at least 5 past posts before generating your voice.');
      return null;
    }

    setAnalyzing(true);
    setAnalyzeStage(0);
    setError('');
    setTimedOut(false);

    const stageInterval = setInterval(() => {
      setAnalyzeStage((prev) => Math.min(prev + 1, STAGES.length - 1));
    }, 8000);

    const timeoutId = setTimeout(() => {
      clearInterval(stageInterval);
      setTimedOut(true);
      setAnalyzing(false);
      setError('This is taking longer than expected. Try again to regenerate your voice.');
    }, 90000);

    try {
      const response = await fetch('/api/onboarding/analyze-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          posts: uploadedContent,
          rewritePairs,
          jobDescription,
          voiceDiscovery,
          postTypeRatings,
        }),
      });

      clearInterval(stageInterval);
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to analyze voice');
      }

      const data = await response.json();
      setAnalysis(data.analysis);
      setStyleBible(data.styleBible || null);

      if (!data.styleBible) {
        setError('We generated voice analysis, but not a full Style Bible. Please try again.');
        return null;
      }

      setHasFreshAnalysis(true);

      return {
        analysis: data.analysis as VoiceAnalysis | undefined,
        styleBible: data.styleBible as string,
      };
    } catch {
      if (!timedOut) {
        setError('Failed to analyze voice. You can try again.');
      }

      return null;
    } finally {
      clearInterval(stageInterval);
      clearTimeout(timeoutId);
      setAnalyzing(false);
    }
  }

  const canContinue = !!styleBible && !!analysis && !analyzing;

  return (
    <div className="cardcontent">
      <div className="cardcontent-header">
        <div className="cardcontent-heading">Time to analyze your voice</div>
        <div className="cardcontent-subheading">
          We will take all the responses from the previous steps to help create your &quot;Voice DNA&quot;, so that we can write posts like you would.
          <br />
        </div>
      </div>

      {!analysis && !analyzing && (
        <button
          type="button"
          onClick={() => {
            void analyzeVoice();
          }}
          className="widebutton dark w-inline-block"
        >
          <div>Analyze My Voice</div>
        </button>
      )}

      {analysis && !analyzing && (
        <button
          type="button"
          onClick={() => {
            void analyzeVoice();
          }}
          className="widebutton dark w-inline-block"
        >
          <div>Re-analyze Voice</div>
        </button>
      )}

      {analyzing && (
        <div className="analyzingposts">
          <div>
            <div className="alignrow">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" className="loadingicon">
                <path d="M16 16L19 19M18 12H22M8 8L5 5M16 8L19 5M8 16L5 19M2 12H6M12 2V6M12 18V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="loadingtext">{STAGES[analyzeStage]}</div>
            </div>
            <div className="loadingbar">
              <div className="loadingprogress" style={{ width: `${((analyzeStage + 1) / STAGES.length) * 90}%` }} />
            </div>
            <div className="smalltext">This usually takes 30 - 40 seconds...</div>
          </div>
        </div>
      )}

      {error ? <div className="smalltext">{error}</div> : null}

      {analysis && <AnalysisDisplay analysis={analysis} />}

      {styleBible && (
        <div className="walkthroughblock resultsblock">
          <div className="cardcontent-heading small">Style Bible</div>
          <div className="resultstext main" style={{ whiteSpace: 'pre-line' }}>{styleBible}<br /></div>
        </div>
      )}

      <div className="floatingbutton">
        <button
          type="button"
          onClick={() => onComplete({
            voiceAnalysis: analysis || undefined,
            styleBible: styleBible || undefined,
            resetCalibration: isEditing && hasFreshAnalysis,
          })}
          disabled={!canContinue}
          className="submitbutton w-button"
        >
          {isEditing ? 'Save Changes' : 'Continue - View Sample Posts'}
        </button>
      </div>
    </div>
  );
}
