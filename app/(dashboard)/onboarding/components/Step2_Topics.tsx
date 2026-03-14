'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { TOPIC_OPTIONS } from '@/lib/constants/onboarding';
import {
  normalizeTopicLabel,
  normalizeTopicLabels,
  sanitizeTopicLabel,
  sanitizeTopicLabels,
} from '@/lib/topics';
import { FoundationData } from '@/lib/utils/foundation';

interface Step2TopicsProps {
  onComplete: (data: Pick<FoundationData, 'primaryTopics' | 'avoidTopics'>) => void;
  initialData?: FoundationData;
  isEditing?: boolean;
}

export default function Step2Topics({ onComplete, initialData, isEditing = false }: Step2TopicsProps) {
  const initialPrimaryTopics = useMemo(
    () => sanitizeTopicLabels(initialData?.primaryTopics || []),
    [initialData?.primaryTopics]
  );
  const initialAvoidTopics = useMemo(
    () => sanitizeTopicLabels(initialData?.avoidTopics || []),
    [initialData?.avoidTopics]
  );
  const [primaryTopics, setPrimaryTopics] = useState<string[]>(sanitizeTopicLabels(initialData?.primaryTopics || []));
  const [avoidTopics, setAvoidTopics] = useState<string[]>(sanitizeTopicLabels(initialData?.avoidTopics || []));
  const [customTopic, setCustomTopic] = useState('');
  const [editingTopics, setEditingTopics] = useState<Record<number, string>>({});
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>(
    initialData?.primaryTopics?.length ? sanitizeTopicLabels(initialData.primaryTopics) : []
  );
  const [topicsReady, setTopicsReady] = useState(!!initialData?.primaryTopics?.length);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [topicsError, setTopicsError] = useState('');
  const customTopicInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchTopicSuggestions() {
      if (!initialData?.jobDescription?.trim() || !initialData.postingGoals?.length || topicsReady) {
        return;
      }

      setLoadingTopics(true);
      setTopicsError('');

      try {
        const res = await fetch('/api/onboarding/suggest-topics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobDescription: initialData.jobDescription,
            goals: initialData.postingGoals,
          }),
        });

        if (!res.ok) {
          throw new Error('Failed to fetch suggestions');
        }

        const data = await res.json() as { topics: string[] };
        const normalizedTopics = normalizeTopicLabels(data.topics || []);
        setSuggestedTopics(normalizedTopics);
        setPrimaryTopics((prev) => {
          if (prev.length > 0) {
            return prev;
          }

          return normalizedTopics;
        });
      } catch {
        setTopicsError('Could not load topic suggestions. You can still pick topics manually.');
      } finally {
        setLoadingTopics(false);
        setTopicsReady(true);
      }
    }

    void fetchTopicSuggestions();
  }, [initialData, topicsReady]);

  const topicOptions = useMemo(() => {
    const seen = new Set<string>();
    const merged = [...(suggestedTopics.length > 0 ? suggestedTopics : TOPIC_OPTIONS), ...primaryTopics];

    return merged.filter((topic) => {
      const trimmed = topic.trim();
      if (!trimmed) {
        return false;
      }

      const key = trimmed.toLowerCase();
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }, [primaryTopics, suggestedTopics]);

  const normalizedPrimaryTopics = useMemo(
    () => sanitizeTopicLabels(primaryTopics),
    [primaryTopics]
  );
  const normalizedAvoidTopics = useMemo(
    () => sanitizeTopicLabels(avoidTopics),
    [avoidTopics]
  );
  const hasChanges = useMemo(
    () => (
      JSON.stringify(normalizedPrimaryTopics) !== JSON.stringify(initialPrimaryTopics)
      || JSON.stringify(normalizedAvoidTopics) !== JSON.stringify(initialAvoidTopics)
    ),
    [initialAvoidTopics, initialPrimaryTopics, normalizedAvoidTopics, normalizedPrimaryTopics]
  );
  const normalizedCustomTopic = useMemo(
    () => normalizeTopicLabel(customTopic),
    [customTopic]
  );
  const canAddCustomTopic = Boolean(
    normalizedCustomTopic
      && !topicOptions.some((topic) => normalizeTopicLabel(topic).toLowerCase() === normalizedCustomTopic.toLowerCase())
  );

  function toggleTopic(topic: string, isPrimary: boolean) {
    if (isPrimary) {
      setEditingTopics({});
      setPrimaryTopics((prev) =>
        prev.includes(topic) ? prev.filter((item) => item !== topic) : [...prev, topic]
      );

      if (!primaryTopics.includes(topic)) {
        setAvoidTopics((prev) => prev.filter((item) => item !== topic));
      }

      return;
    }

    setEditingTopics({});
    setAvoidTopics((prev) =>
      prev.includes(topic) ? prev.filter((item) => item !== topic) : [...prev, topic]
    );

    if (!avoidTopics.includes(topic)) {
      setPrimaryTopics((prev) => prev.filter((item) => item !== topic));
    }
  }

  function addCustomTopic() {
    if (!normalizedCustomTopic) {
      return;
    }

    if (topicOptions.some((topic) => normalizeTopicLabel(topic).toLowerCase() === normalizedCustomTopic.toLowerCase())) {
      return;
    }

    setEditingTopics({});
    setPrimaryTopics((prev) => sanitizeTopicLabels([...prev, normalizedCustomTopic]));
    setSuggestedTopics((prev) => normalizeTopicLabels([...prev, normalizedCustomTopic]));
    setCustomTopic('');
    customTopicInputRef.current?.focus();
  }

  function updatePrimaryTopic(index: number, value: string) {
    setEditingTopics((prev) => ({
      ...prev,
      [index]: value,
    }));
  }

  function commitPrimaryTopic(index: number) {
    const draftTopic = editingTopics[index];
    setPrimaryTopics((prev) => {
      const next = [...prev];
      const previousTopic = next[index] || '';
      const nextTopicValue = draftTopic ?? previousTopic;
      const normalizedTopic = sanitizeTopicLabel(nextTopicValue);

      if (!normalizedTopic) {
        next.splice(index, 1);
        return next;
      }

      const duplicateIndex = next.findIndex((topic, topicIndex) => (
        topicIndex !== index && topic.trim().toLowerCase() === normalizedTopic.toLowerCase()
      ));

      if (duplicateIndex !== -1) {
        next.splice(index, 1);
      } else {
        next[index] = normalizedTopic;
      }

      setSuggestedTopics((prevSuggestions) => {
        const replaced = prevSuggestions.map((topic) => (
          topic === previousTopic ? normalizedTopic : topic
        ));
        const seen = new Set<string>();
        return [...replaced, normalizedTopic].filter((topic) => {
          const key = topic.trim().toLowerCase();
          if (!key || seen.has(key)) {
            return false;
          }
          seen.add(key);
          return true;
        });
      });

      return next;
    });
    setEditingTopics((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  }

  function removePrimaryTopic(index: number) {
    setEditingTopics((prev) => {
      const next: Record<number, string> = {};
      Object.entries(prev).forEach(([key, value]) => {
        const numericKey = Number(key);
        if (numericKey < index) {
          next[numericKey] = value;
        } else if (numericKey > index) {
          next[numericKey - 1] = value;
        }
      });
      return next;
    });
    setPrimaryTopics((prev) => prev.filter((_, topicIndex) => topicIndex !== index));
  }

  function handleSubmit() {
    if (normalizedPrimaryTopics.length === 0) {
      return;
    }

    onComplete({
      primaryTopics: normalizedPrimaryTopics,
      avoidTopics: normalizedAvoidTopics,
    });
  }

  return (
    <div className="cardcontent">
      <div className="cardcontent-header">
        <div className="cardcontent-heading">What topics do you want to post about?</div>
        <div className="cardcontent-subheading">
          This will provide you with easy-prompts around things you want to post about. We&apos;ve suggested some below, but feel free to add more.
          <br />
        </div>
        {topicsError ? <div className="cardcontent-subheading">{topicsError}<br /></div> : null}
      </div>

      {loadingTopics ? (
        <div className="buttonselectors">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="pillselector-item">
              <div className="pillselector-button w-inline-block">
                <div className="buttonheading">&nbsp;</div>
              </div>
            </div>
          ))}
        </div>
      ) : topicsReady ? (
        <>
          <div className="buttonselectors">
            {primaryTopics.map((topic, index) => (
              <div key={`${topic}-${index}`} className="pillselector-item">
                <div className="pillselector-button w-inline-block selected topicpill-editable">
                  <div className="buttonheading topicpill-heading">
                    <input
                      type="text"
                      size={Math.max((editingTopics[index] ?? topic).trim().length, 2)}
                      value={editingTopics[index] ?? topic}
                      onChange={(event) => updatePrimaryTopic(index, event.target.value)}
                      onBlur={() => commitPrimaryTopic(index)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          commitPrimaryTopic(index);
                          (event.target as HTMLInputElement).blur();
                        }
                      }}
                      className="topicpill-input"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removePrimaryTopic(index)}
                    className="topicpill-remove"
                    aria-label={`Remove ${topic}`}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
            {topicOptions.filter((topic) => !primaryTopics.includes(topic)).map((topic) => (
              <div key={topic} className="pillselector-item">
                <button
                  type="button"
                  onClick={() => toggleTopic(topic, true)}
                  className="pillselector-button w-inline-block"
                >
                  <div className="buttonheading">{topic}</div>
                </button>
              </div>
            ))}
          </div>
          <div
            className="rowcard withfield"
            onClick={() => customTopicInputRef.current?.focus()}
          >
            <div className="alignrow-2 aligncenter fill">
              <input
                ref={customTopicInputRef}
                className="formfields w-input"
                maxLength={256}
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTopic())}
                placeholder="Type new topic here.."
                type="text"
                style={{
                  background: 'transparent',
                  border: 'none',
                  boxShadow: 'none',
                  height: 'auto',
                  marginBottom: 0,
                  padding: '10px 12px',
                  flex: 1,
                  minWidth: '220px',
                }}
              />
            </div>
            <div className="rowcard-actions">
              <button
                type="button"
                onClick={addCustomTopic}
                disabled={!canAddCustomTopic}
                className={`bulkaction-button w-inline-block${canAddCustomTopic ? ' active' : ''}`}
              >
                <div>Add Topic</div>
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="rowcard">
          <div className="buttonsubheading">Add your role and posting goals first so we can suggest the best topics for you.</div>
        </div>
      )}

      {avoidTopics.length > 0 && (
        <div className="buttonselectors">
          {avoidTopics.map((topic) => (
            <div key={topic} className="pillselector-item">
              <button type="button" onClick={() => toggleTopic(topic, false)} className="pillselector-button selected w-inline-block">
                <div className="buttonheading">{topic}</div>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="floatingbutton">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={normalizedPrimaryTopics.length === 0 || loadingTopics || !topicsReady || (isEditing && !hasChanges)}
          className="submitbutton w-button"
        >
          {isEditing ? 'Save Changes' : 'Continue - Next Step'}
        </button>
      </div>
    </div>
  );
}
