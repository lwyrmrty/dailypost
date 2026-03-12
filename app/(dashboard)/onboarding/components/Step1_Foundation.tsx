'use client';

import { useState } from 'react';
import { TOPIC_OPTIONS, POSTING_GOALS } from '@/lib/constants/onboarding';

interface Step1Props {
  onComplete: (data: FoundationData) => void;
  initialData?: FoundationData;
}

export interface FoundationData {
  jobDescription: string;
  primaryTopics: string[];
  avoidTopics: string[];
  postingGoals: string[];
}

export default function Step1Foundation({ onComplete, initialData }: Step1Props) {
  const [jobDescription, setJobDescription] = useState(initialData?.jobDescription || '');
  const [primaryTopics, setPrimaryTopics] = useState<string[]>(initialData?.primaryTopics || []);
  const [avoidTopics, setAvoidTopics] = useState<string[]>(initialData?.avoidTopics || []);
  const [postingGoals, setPostingGoals] = useState<string[]>(initialData?.postingGoals || []);
  const [customTopic, setCustomTopic] = useState('');
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);
  const [topicsReady, setTopicsReady] = useState(!!(initialData?.primaryTopics?.length));
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [topicsError, setTopicsError] = useState('');

  async function fetchTopicSuggestions(jd: string, goals: string[]) {
    if (!jd.trim() || goals.length === 0) return;
    setLoadingTopics(true);
    setTopicsError('');
    try {
      const res = await fetch('/api/onboarding/suggest-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription: jd, goals }),
      });
      if (!res.ok) throw new Error('Failed to fetch suggestions');
      const data = await res.json() as { topics: string[] };
      setSuggestedTopics(data.topics || []);
      // Pre-select suggested topics that aren't already selected
      setPrimaryTopics(prev => {
        const merged = [...prev];
        for (const t of data.topics || []) {
          if (!merged.includes(t)) merged.push(t);
        }
        return merged;
      });
      setTopicsReady(true);
    } catch {
      setTopicsError('Could not load topic suggestions. You can still pick topics manually.');
      setTopicsReady(true);
    } finally {
      setLoadingTopics(false);
    }
  }

  function handleJobDescriptionBlur() {
    if (jobDescription.trim() && postingGoals.length > 0 && !topicsReady) {
      fetchTopicSuggestions(jobDescription, postingGoals);
    }
  }

  function toggleTopic(topic: string, isPrimary: boolean) {
    if (isPrimary) {
      setPrimaryTopics(prev => 
        prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
      );
      if (!primaryTopics.includes(topic)) {
        setAvoidTopics(prev => prev.filter(t => t !== topic));
      }
    } else {
      setAvoidTopics(prev => 
        prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
      );
      if (!avoidTopics.includes(topic)) {
        setPrimaryTopics(prev => prev.filter(t => t !== topic));
      }
    }
  }

  function addCustomTopic() {
    if (customTopic && !primaryTopics.includes(customTopic)) {
      setPrimaryTopics(prev => [...prev, customTopic]);
      setCustomTopic('');
    }
  }

  function toggleGoal(goalId: string) {
    const newGoals = postingGoals.includes(goalId)
      ? postingGoals.filter(g => g !== goalId)
      : [...postingGoals, goalId];
    setPostingGoals(newGoals);
    // Trigger suggestions if job description is filled and topics not yet loaded
    if (jobDescription.trim() && !topicsReady && newGoals.length > 0) {
      fetchTopicSuggestions(jobDescription, newGoals);
    }
  }

  function handleSubmit() {
    if (jobDescription && postingGoals.length > 0 && primaryTopics.length > 0) {
      onComplete({ jobDescription, primaryTopics, avoidTopics, postingGoals });
    }
  }

  const isValid = jobDescription.length > 0 && postingGoals.length > 0 && primaryTopics.length > 0;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Let&apos;s start with the basics</h2>
        <p className="text-gray-600">This helps us understand your context and interests</p>
      </div>

      {/* Job Description */}
      <div>
        <label className="block text-sm font-medium mb-2">
          What do you do? (1-2 sentences) <span className="text-red-500">*</span>
        </label>
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          onBlur={handleJobDescriptionBlur}
          placeholder="e.g., I'm a Partner at a deep tech VC fund focused on AI, climate, and frontier technologies"
          className="w-full border border-gray-300 rounded-lg p-3 h-24 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {/* Posting Goals */}
      <div>
        <label className="block text-sm font-medium mb-1">
          What are your posting goals? <span className="text-red-500">*</span>
        </label>
        <p className="text-sm text-gray-500 mb-3">Select at least one to continue</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {POSTING_GOALS.map(goal => (
            <button
              key={goal.id}
              type="button"
              onClick={() => toggleGoal(goal.id)}
              className={`p-4 rounded-lg border text-left transition-colors ${
                postingGoals.includes(goal.id)
                  ? 'bg-blue-50 border-blue-500'
                  : 'bg-white border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="font-medium">{goal.label}</div>
              <div className="text-sm text-gray-600">{goal.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Topics — shown after job description blur + at least one goal */}
      {loadingTopics && (
        <div className="space-y-3">
          <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-9 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {!loadingTopics && !topicsReady && (
        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400">
          Fill in what you do and select a goal above — we&apos;ll suggest relevant topics for you.
        </div>
      )}

      {!loadingTopics && topicsReady && (
        <>
          {/* Primary Topics */}
          <div>
            <label className="block text-sm font-medium mb-1">
              What topics do you want to post about? <span className="text-red-500">*</span>
            </label>
            {suggestedTopics.length > 0 && (
              <p className="text-sm text-gray-500 mb-3">We&apos;ve suggested some based on your profile — deselect any that don&apos;t fit and add more below.</p>
            )}
            {topicsError && (
              <p className="text-sm text-amber-600 mb-3">{topicsError}</p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
              {/* Suggested topics first */}
              {suggestedTopics.map(topic => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => toggleTopic(topic, true)}
                  className={`p-2 rounded-lg border text-left text-sm transition-colors ${
                    primaryTopics.includes(topic)
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : avoidTopics.includes(topic)
                      ? 'bg-red-50 border-red-300 text-red-700 opacity-50'
                      : 'bg-white border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {topic}
                </button>
              ))}
              {/* Predefined topics not already in suggested */}
              {TOPIC_OPTIONS.filter(t => !suggestedTopics.includes(t)).map(topic => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => toggleTopic(topic, true)}
                  className={`p-2 rounded-lg border text-left text-sm transition-colors ${
                    primaryTopics.includes(topic)
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : avoidTopics.includes(topic)
                      ? 'bg-red-50 border-red-300 text-red-700 opacity-50'
                      : 'bg-white border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTopic())}
                placeholder="Add custom topic"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={addCustomTopic}
                className="px-4 py-2 bg-gray-200 rounded-lg text-sm hover:bg-gray-300 transition-colors"
              >
                Add
              </button>
            </div>
            {primaryTopics.length > 0 && (
              <p className="text-sm text-gray-600 mt-2">
                Selected: {primaryTopics.length} topics
              </p>
            )}
          </div>

          {/* Avoid Topics */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Topics to avoid (optional)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {['Politics', 'Religion', 'Specific Politicians', 'Cryptocurrency', 'Controversial Social Issues'].map(topic => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => toggleTopic(topic, false)}
                  className={`p-2 rounded-lg border text-left text-sm transition-colors ${
                    avoidTopics.includes(topic)
                      ? 'bg-red-50 border-red-500 text-red-700'
                      : 'bg-white border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!isValid}
        className="w-full bg-blue-600 text-white rounded-lg py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
      >
        Continue
      </button>
    </div>
  );
}





