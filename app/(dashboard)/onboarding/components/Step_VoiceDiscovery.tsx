'use client';

import { useState } from 'react';

/**
 * Voice Discovery — "Tinder for writing styles"
 *
 * Shows pairs of posts about the SAME topic written in contrasting styles.
 * The user picks which they prefer. After 6 rounds we know their preferences
 * across: boldness, evidence style, formality, humor, length, and stance.
 *
 * This works for EVERYONE — both established writers refining their voice
 * and aspirational writers discovering what they want to sound like.
 */

interface StylePair {
  dimension: string;
  dimensionLabel: string;
  topic: string;
  optionA: { label: string; content: string; trait: string };
  optionB: { label: string; content: string; trait: string };
}

const STYLE_PAIRS: StylePair[] = [
  {
    dimension: 'boldness',
    dimensionLabel: 'How you take positions',
    topic: 'AI replacing jobs',
    optionA: {
      label: 'Bold & Direct',
      trait: 'bold_contrarian',
      content: `Most "AI will take your job" takes are lazy thinking.\n\nThe real story? AI is exposing which jobs were already broken. If your entire role can be replaced by a prompt, that role wasn't a career — it was a holding pattern.\n\nHarsh? Maybe. But founders building the next decade need to hear it.`,
    },
    optionB: {
      label: 'Balanced & Nuanced',
      trait: 'balanced_nuanced',
      content: `The "AI replacing jobs" conversation deserves more nuance than it usually gets.\n\nSome roles will transform. Some will disappear. Many new ones will emerge. The pattern isn't new — we've seen it with every major technology shift.\n\nThe real question isn't "will AI take jobs?" but "how do we prepare people for what's next?"`,
    },
  },
  {
    dimension: 'evidence_style',
    dimensionLabel: 'How you make your case',
    topic: 'Climate tech investment',
    optionA: {
      label: 'Data & Numbers',
      trait: 'data_driven',
      content: `Climate tech funding hit $140B in 2025. But here's what the headline misses:\n\n- 68% went to proven categories (solar, EVs, batteries)\n- Only 12% to frontier tech (fusion, DAC, long-duration storage)\n- Early-stage deals down 23% YoY\n\nWe're scaling what works. We're not funding what's next. That's a problem.`,
    },
    optionB: {
      label: 'Stories & Narrative',
      trait: 'narrative_storytelling',
      content: `Last month I visited a carbon capture startup in Iceland. 12 engineers in a converted fish processing plant, running equipment that sounds like a jet engine.\n\nTheir CEO told me something that stuck: "Everyone wants to fund the software layer of climate. Nobody wants to fund the part where you actually touch atoms."\n\nShe's right. And that's why we're in trouble.`,
    },
  },
  {
    dimension: 'formality',
    dimensionLabel: 'How formal you sound',
    topic: 'A startup raising its Series B',
    optionA: {
      label: 'Polished & Professional',
      trait: 'formal_polished',
      content: `Excited to share that Meridian Robotics has closed a $85M Series B, led by our fund with participation from Sequoia and Founders Fund.\n\nMeridian's approach to warehouse automation represents a fundamental shift in how physical work gets done. Their full-stack integration of hardware, perception, and planning sets them apart.\n\nProud to support this exceptional team as they scale.`,
    },
    optionB: {
      label: 'Casual & Conversational',
      trait: 'casual_conversational',
      content: `So Meridian Robotics just raised $85M and I need to tell you why I'm pumped about this one.\n\nMost warehouse robotics companies are glorified conveyor belts with sensors. Meridian actually built the whole thing — hardware, vision system, planning — from scratch. It's the real deal.\n\nI've been working with this team for 2 years and honestly? They're just getting started.`,
    },
  },
  {
    dimension: 'humor',
    dimensionLabel: 'How you use humor',
    topic: 'Tech industry hype cycles',
    optionA: {
      label: 'Witty & Playful',
      trait: 'uses_humor',
      content: `My favorite part of every hype cycle is watching the same VCs who called something "transformative" in January call it "overhyped" by September.\n\nWe did it with crypto. We did it with the metaverse. We're doing it with AI agents right now.\n\nThe technology is real. The timelines are fake. And somehow we fall for it every single time.`,
    },
    optionB: {
      label: 'Straight & Serious',
      trait: 'straight_serious',
      content: `Hype cycles are a structural feature of technology markets, not a bug.\n\nThey serve an important function: they attract capital and talent to emerging areas faster than rational analysis alone would justify. The correction is painful, but the net effect is acceleration.\n\nThe key for investors: maintain conviction through the trough. That's where the real returns live.`,
    },
  },
  {
    dimension: 'length',
    dimensionLabel: 'How much you say',
    topic: 'Advice for first-time founders',
    optionA: {
      label: 'Short & Punchy',
      trait: 'concise_punchy',
      content: `Advice for first-time founders:\n\nTalk to customers before writing code.\nHire slow, fire fast.\nYour first idea is probably wrong.\nRunway is everything.\nIgnore most advice (including this).`,
    },
    optionB: {
      label: 'Detailed & Thorough',
      trait: 'detailed_thorough',
      content: `After backing 40+ first-time founders, here are the patterns I've seen separate those who make it from those who don't:\n\n1. They validate before they build. Not with surveys — with actual purchase intent. The founders who struggle most are the ones who spent 6 months building something nobody asked for.\n\n2. They're honest about what they don't know. The best first-time founders hire a complement, not a clone. If you're technical, your first hire should scare you with how good they are at selling.\n\n3. They treat runway as a countdown clock, not a safety net. Every month of runway is a month of runway. Sounds obvious, but the number of founders who burn 18 months of cash in 12 months is staggering.`,
    },
  },
  {
    dimension: 'stance',
    dimensionLabel: 'How you engage the audience',
    topic: 'The future of remote work',
    optionA: {
      label: 'Opinionated & Declarative',
      trait: 'opinionated_declarative',
      content: `The return-to-office push is the biggest talent arbitrage opportunity in a decade.\n\nEvery company forcing people back to HQ is handing their best people to competitors who figured out distributed work. Full stop.\n\nThe companies winning the next decade are being built right now by teams that will never share an office. Bet on it.`,
    },
    optionB: {
      label: 'Curious & Question-Driven',
      trait: 'curious_socratic',
      content: `Something I've been thinking about with the RTO debate:\n\nWhat if both sides are right?\n\nWhat if some work genuinely IS better in person — and some roles genuinely never need an office?\n\nWhat if the real innovation isn't "remote vs. office" but designing organizations that are intentional about which is which?\n\nCurious what others are seeing. What's actually working at your company?`,
    },
  },
];

export interface VoiceDiscoveryPreferences {
  picks: Array<{
    dimension: string;
    chosenTrait: string;
    confidence: 'strong' | 'slight';
  }>;
  summary: Record<string, string>;
}

interface StepVoiceDiscoveryProps {
  onComplete: (data: { voiceDiscovery: VoiceDiscoveryPreferences }) => void;
  onSkip: () => void;
  initialData?: { voiceDiscovery: VoiceDiscoveryPreferences };
  isEditing?: boolean;
}

export default function StepVoiceDiscovery({ onComplete, onSkip, initialData, isEditing = false }: StepVoiceDiscoveryProps) {
  const [currentPair, setCurrentPair] = useState(0);
  const [picks, setPicks] = useState<VoiceDiscoveryPreferences['picks']>(
    initialData?.voiceDiscovery?.picks || []
  );
  const [selected, setSelected] = useState<'A' | 'B' | null>(null);
  const [confidence, setConfidence] = useState<'strong' | 'slight'>('strong');

  const pair = STYLE_PAIRS[currentPair];
  const isLastPair = currentPair >= STYLE_PAIRS.length - 1;

  function handleNext() {
    if (!selected || !pair) return;

    const chosenTrait = selected === 'A' ? pair.optionA.trait : pair.optionB.trait;
    const newPicks = [
      ...picks,
      { dimension: pair.dimension, chosenTrait, confidence },
    ];
    setPicks(newPicks);

    if (isLastPair) {
      // Build summary
      const summary: Record<string, string> = {};
      newPicks.forEach(pick => {
        summary[pick.dimension] = pick.chosenTrait;
      });

      onComplete({
        voiceDiscovery: { picks: newPicks, summary },
      });
    } else {
      setCurrentPair(currentPair + 1);
      setSelected(null);
      setConfidence('strong');
    }
  }

  if (!pair) return null;

  return (
    <div className="cardcontent">
      <div className="cardcontent-header">
        <div className="cardcontent-heading">Discover your voice and tone</div>
        <div className="cardcontent-subheading">
          Which version sounds more like how you <strong>want</strong> to write? Pick the one that feels more &quot;you&quot; - or the you you want to be.
          <br />
        </div>
      </div>
      <div>
        <div className="labeltxt">
          {pair.dimensionLabel} <span className="dim">-</span> Round {currentPair + 1} <span className="dim">of</span> {STYLE_PAIRS.length}
        </div>
        <div className="stepsprogress dark">
          {STYLE_PAIRS.map((_, idx) => (
            <div
              key={idx}
              className={`stepblock w-inline-block ${idx < currentPair || idx === currentPair ? 'current' : ''}`}
            />
          ))}
        </div>
      </div>
      <div className="walkthroughblock">
        <div className="buttonselectors">
          {[
            { key: 'A' as const, option: pair.optionA },
            { key: 'B' as const, option: pair.optionB },
          ].map(({ key, option }) => (
            <div key={key} className="splitselector-item">
              <button
                type="button"
                onClick={() => setSelected(key)}
                className={`optionselector-button w-inline-block ${selected === key ? 'selected' : ''}`}
              >
                <div className="buttonheading">{option.label}</div>
                <div className="buttonsubheading large" style={{ whiteSpace: 'pre-line' }}>
                  {option.content}
                </div>
              </button>
            </div>
          ))}
        </div>
        {selected && (
          <div className="buttonselectors aligncenter">
            <div className="labeltxt nospace">How strong is your preference?</div>
            <div className="pillselector-item">
              <button
                type="button"
                onClick={() => setConfidence('strong')}
                className={`pillselector-button w-inline-block ${confidence === 'strong' ? 'selected' : ''}`}
              >
                <div className="buttonheading">Strongly prefer this</div>
              </button>
            </div>
            <div className="pillselector-item">
              <button
                type="button"
                onClick={() => setConfidence('slight')}
                className={`pillselector-button w-inline-block ${confidence === 'slight' ? 'selected' : ''}`}
              >
                <div className="buttonheading">Slightly prefer this</div>
              </button>
            </div>
          </div>
        )}
      </div>
      <button type="button" onClick={onSkip} hidden aria-hidden="true" tabIndex={-1}>
        Skip
      </button>
      <div className="floatingbutton">
        <button
          type="button"
          onClick={handleNext}
          disabled={!selected}
          className="submitbutton w-button"
        >
          {isEditing ? 'Save Changes' : isLastPair ? 'Continue - Next Step' : 'Continue - Next Pick'}
        </button>
      </div>
    </div>
  );
}
