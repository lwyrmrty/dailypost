'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Step1Foundation from './components/Step1_Foundation';
import Step2Topics from './components/Step2_Topics';
import StepVoiceDiscovery, { VoiceDiscoveryPreferences } from './components/Step_VoiceDiscovery';
import Step2SamplePosts, { RewritePair } from './components/Step2_SamplePosts';
import Step3UploadContent from './components/Step3_UploadContent';
import StepGenerateVoice from './components/Step_GenerateVoice';
import StepVoiceCalibration, { CalibrationFeedback } from './components/Step_VoiceCalibration';
import Step5PostTypes, { PostTypeRating } from './components/Step5_PostTypes';
import StoredSideNav from '../components/StoredSideNav';
import { calculateProgress, OnboardingStep } from '@/lib/utils/onboarding';
import { FoundationData } from '@/lib/utils/foundation';

interface OnboardingData {
  foundation?: FoundationData;
  voiceDiscovery?: VoiceDiscoveryPreferences;
  samplePosts?: string[];
  rewriteExercises?: RewritePair[];
  uploadedContent?: string[];
  voiceAnalysis?: unknown;
  styleBible?: string;
  calibrationFeedback?: CalibrationFeedback[];
  postTypeRatings?: PostTypeRating[];
  onboardingCompleted?: boolean;
}

const STEP_ORDER: OnboardingStep[] = [
  'about_goals',
  'topics',
  'voice_discovery',
  'sample_posts',
  'post_types',
  'upload_content',
  'generate_voice',
  'voice_calibration',
];

const STEP_LABELS: Record<OnboardingStep, string> = {
  about_goals: 'About You',
  topics: 'Topics',
  voice_discovery: 'Tone',
  sample_posts: 'Writing',
  post_types: 'Rate Post Types',
  upload_content: 'Past Posts',
  generate_voice: 'Analyze Writing Style',
  voice_calibration: 'Rank Sample Posts',
};

const STEP_PROGRESS: Record<OnboardingStep, number> = {
  about_goals: 0,
  topics: 12,
  voice_discovery: 25,
  sample_posts: 37,
  post_types: 50,
  upload_content: 62,
  generate_voice: 75,
  voice_calibration: 88,
};

const STEP_QUERY_TO_NUMBER: Partial<Record<OnboardingStep, number>> = {
  about_goals: 1,
  topics: 2,
  voice_discovery: 3,
  sample_posts: 4,
  post_types: 5,
  upload_content: 6,
  generate_voice: 7,
  voice_calibration: 8,
};

function dedupeSteps(steps: OnboardingStep[]) {
  return Array.from(new Set(steps));
}

function normalizeCompletedSteps(savedData: OnboardingData & { completedSteps?: string[] }) {
  const normalized: OnboardingStep[] = [];

  for (const step of savedData.completedSteps || []) {
    if (step === 'foundation') {
      normalized.push('about_goals', 'topics');
      continue;
    }

    if (step === 'upload_content') {
      normalized.push('upload_content');
      if (savedData.styleBible || savedData.voiceAnalysis) {
        normalized.push('generate_voice');
      }
      continue;
    }

    if (step === 'voice_calibration') {
      if (savedData.styleBible || savedData.voiceAnalysis) {
        normalized.push('generate_voice');
      }
      normalized.push('voice_calibration');
      continue;
    }

    if (step === 'inspiration' || step === 'perspectives' || step === 'sources') {
      continue;
    }

    if (STEP_ORDER.includes(step as OnboardingStep)) {
      normalized.push(step as OnboardingStep);
    }
  }

  return dedupeSteps(normalized);
}

function getFirstIncompleteStep(completedSteps: OnboardingStep[]) {
  const firstIncompleteIndex = STEP_ORDER.findIndex((step) => !completedSteps.includes(step));
  return firstIncompleteIndex === -1 ? null : firstIncompleteIndex + 1;
}

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<OnboardingStep[]>([]);
  const [data, setData] = useState<OnboardingData>({});
  const [saving, setSaving] = useState(false);
  const [hasEverCompletedOnboarding, setHasEverCompletedOnboarding] = useState(false);

  const totalSteps = STEP_ORDER.length;
  const activeStepKey = STEP_ORDER[currentStep - 1];
  const requestedStep = searchParams.get('step') as OnboardingStep | null;
  const requestedStepNumber = requestedStep ? STEP_QUERY_TO_NUMBER[requestedStep] ?? null : null;

  async function saveProgress(newData: OnboardingData, newCompletedSteps: OnboardingStep[]) {
    if (!session?.user?.id) return;

    setSaving(true);
    try {
      await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newData,
          userId: session.user.id,
          completedSteps: newCompletedSteps,
          progress: calculateProgress(newCompletedSteps),
        }),
      });
    } catch (error) {
      console.error('Failed to save progress:', error);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    async function loadProgress() {
      if (!session?.user?.id) return;

      try {
        const response = await fetch(`/api/onboarding?userId=${session.user.id}`);
        if (response.ok) {
          const savedData = await response.json();
          if (savedData) {
            const normalizedCompletedSteps = normalizeCompletedSteps(savedData);
            setData(savedData);
            setCompletedSteps(normalizedCompletedSteps);
            setHasEverCompletedOnboarding(
              Boolean(savedData.onboardingCompleted || normalizedCompletedSteps.includes('voice_calibration'))
            );

            if (requestedStepNumber) {
              setCurrentStep(requestedStepNumber);
            } else {
              const firstIncomplete = getFirstIncompleteStep(normalizedCompletedSteps);
              if (firstIncomplete) {
                setCurrentStep(firstIncomplete);
              } else {
                setCurrentStep(totalSteps);
              }
            }
          } else if (requestedStepNumber) {
            setCurrentStep(requestedStepNumber);
          }
        }
      } catch (error) {
        console.error('Failed to load progress:', error);
      }
    }
    loadProgress();
  }, [requestedStepNumber, session, totalSteps]);

  function getNextStepNumber(nextCompletedSteps: OnboardingStep[]) {
    const nextStep = getFirstIncompleteStep(nextCompletedSteps);
    return nextStep ?? totalSteps;
  }

  function completeStep(
    stepKey: OnboardingStep,
    newData: OnboardingData,
    nextStep?: number,
    options?: { stayOnStep?: boolean }
  ) {
    const newCompleted = dedupeSteps([...completedSteps, stepKey]);
    setData(newData);
    setCompletedSteps(newCompleted);
    void saveProgress(newData, newCompleted);
    if (options?.stayOnStep) {
      setCurrentStep(STEP_QUERY_TO_NUMBER[stepKey] ?? currentStep);
      return;
    }
    setCurrentStep(nextStep ?? getNextStepNumber(newCompleted));
  }

  function handleAboutGoalsComplete(stepData: Pick<FoundationData, 'role' | 'focus' | 'differentiator' | 'jobDescription' | 'postingGoals'>) {
    completeStep('about_goals', {
      ...data,
      foundation: {
        role: stepData.role,
        focus: stepData.focus,
        differentiator: stepData.differentiator,
        jobDescription: stepData.jobDescription,
        postingGoals: stepData.postingGoals,
        primaryTopics: data.foundation?.primaryTopics || [],
        avoidTopics: data.foundation?.avoidTopics || [],
      },
    }, undefined, { stayOnStep: hasEverCompletedOnboarding });
  }

  function handleTopicsComplete(stepData: Pick<FoundationData, 'primaryTopics' | 'avoidTopics'>) {
    completeStep('topics', {
      ...data,
      foundation: {
        role: data.foundation?.role || '',
        focus: data.foundation?.focus || '',
        differentiator: data.foundation?.differentiator,
        jobDescription: data.foundation?.jobDescription || '',
        postingGoals: data.foundation?.postingGoals || [],
        primaryTopics: stepData.primaryTopics,
        avoidTopics: stepData.avoidTopics,
      },
    }, undefined, { stayOnStep: hasEverCompletedOnboarding });
  }

  function handleVoiceDiscoveryComplete(stepData: { voiceDiscovery: VoiceDiscoveryPreferences }) {
    completeStep('voice_discovery', { ...data, voiceDiscovery: stepData.voiceDiscovery }, undefined, {
      stayOnStep: hasEverCompletedOnboarding,
    });
  }

  function handleRewriteComplete(stepData: { samplePosts: string[]; rewriteExercises?: RewritePair[] }) {
    completeStep('sample_posts', {
      ...data,
      samplePosts: stepData.samplePosts,
      rewriteExercises: stepData.rewriteExercises,
    }, undefined, { stayOnStep: hasEverCompletedOnboarding });
  }

  function handlePostTypesComplete(stepData: { postTypeRatings: PostTypeRating[] }) {
    completeStep('post_types', { ...data, postTypeRatings: stepData.postTypeRatings }, undefined, {
      stayOnStep: hasEverCompletedOnboarding,
    });
  }

  function handleUploadComplete(stepData: { uploadedContent: string[] }) {
    completeStep('upload_content', {
      ...data,
      uploadedContent: stepData.uploadedContent,
    }, undefined, { stayOnStep: hasEverCompletedOnboarding });
  }

  function handleGenerateVoiceComplete(stepData: { voiceAnalysis?: unknown; styleBible?: string; resetCalibration?: boolean }) {
    const nextData = {
      ...data,
      voiceAnalysis: stepData.voiceAnalysis,
      styleBible: stepData.styleBible,
      calibrationFeedback: stepData.resetCalibration ? undefined : data.calibrationFeedback,
    };
    if (stepData.resetCalibration) {
      const nextCompletedSteps = dedupeSteps(
        [...completedSteps.filter((step) => step !== 'voice_calibration'), 'generate_voice']
      );
      setData(nextData);
      setCompletedSteps(nextCompletedSteps);
      void saveProgress(nextData, nextCompletedSteps);
      if (hasEverCompletedOnboarding) {
        setCurrentStep(STEP_QUERY_TO_NUMBER.generate_voice ?? currentStep);
      }
      return;
    }

    completeStep('generate_voice', nextData, undefined, {
      stayOnStep: hasEverCompletedOnboarding,
    });
  }

  async function handleCalibrationComplete(stepData: {
    calibrationFeedback: CalibrationFeedback[];
    voiceAnalysis?: unknown;
    styleBible?: string;
  }) {
    const newData = {
      ...data,
      calibrationFeedback: stepData.calibrationFeedback,
      voiceAnalysis: stepData.voiceAnalysis ?? data.voiceAnalysis,
      styleBible: stepData.styleBible ?? data.styleBible,
    };
    const newCompleted = dedupeSteps([...completedSteps, 'voice_calibration']);
    setData(newData);
    setCompletedSteps(newCompleted);
    setHasEverCompletedOnboarding(true);
    void saveProgress(newData, newCompleted);
    if (hasEverCompletedOnboarding) {
      setCurrentStep(STEP_QUERY_TO_NUMBER.voice_calibration ?? currentStep);
      return;
    }

    if (session?.user?.id) {
      try {
        await fetch('/api/onboarding/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: session.user.id }),
        });
      } catch (error) {
        console.error('Failed to complete onboarding:', error);
      }
    }

    router.push('/dashboard');
  }

  return (
    <div className="pagewrapper">
      {hasEverCompletedOnboarding ? <StoredSideNav currentSection="onboarding" /> : null}
      <div className="pageblock">
        {!hasEverCompletedOnboarding && (
          <div className="stephero">
            <img
              src="/webflow-assets/images/postieslogofinallite.svg"
              loading="lazy"
              alt=""
              className="welcomelogo"
            />
            <div className="setupheader">Set up your voice profile</div>
            <div className="setupsubheader">This helps us generate content that sounds like you</div>
          </div>
        )}

        {activeStepKey && (
          <div className="stepswrapper">
            <div className="stepstext">
              <div>
                Step {currentStep} <span className="dim">of</span> {totalSteps} - {STEP_LABELS[activeStepKey]}
              </div>
              <div>
                {STEP_PROGRESS[activeStepKey]}% <span className="dim">complete</span>
              </div>
            </div>
            <div className="stepsprogress">
              {STEP_ORDER.map((step, index) => {
                const isCompleted = completedSteps.includes(step);
                const isCurrent = step === activeStepKey;

                return (
                  <button
                    key={step}
                    type="button"
                    onClick={() => {
                      if (hasEverCompletedOnboarding || isCompleted || index + 1 === currentStep) {
                        setCurrentStep(index + 1);
                      }
                    }}
                    className={`stepblock w-inline-block ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current w--current' : ''}`}
                  />
                );
              })}
            </div>
          </div>
        )}

        <div className="pagecontainer inner">
          <div className="containtercard">
            <div className="form-block w-form">
              <div hidden>{saving ? 'Saving...' : ''}</div>
              <form onSubmit={(event) => event.preventDefault()}>
                {currentStep === 1 && (
                  <Step1Foundation
                    onComplete={handleAboutGoalsComplete}
                    initialData={data.foundation}
                    isEditing={hasEverCompletedOnboarding}
                  />
                )}

                {currentStep === 2 && (
                  <Step2Topics
                    onComplete={handleTopicsComplete}
                    initialData={data.foundation}
                    isEditing={hasEverCompletedOnboarding}
                  />
                )}

                {currentStep === 3 && (
                  <StepVoiceDiscovery
                    onComplete={handleVoiceDiscoveryComplete}
                    onSkip={() => {}}
                    initialData={data.voiceDiscovery ? { voiceDiscovery: data.voiceDiscovery } : undefined}
                    isEditing={hasEverCompletedOnboarding}
                  />
                )}

                {currentStep === 4 && (
                  <Step2SamplePosts
                    onComplete={handleRewriteComplete}
                    onSkip={() => {}}
                    isEditing={hasEverCompletedOnboarding}
                    initialData={
                      data.samplePosts || data.rewriteExercises
                        ? {
                            samplePosts: data.samplePosts,
                            rewriteExercises: data.rewriteExercises,
                          }
                        : undefined
                    }
                  />
                )}

                {currentStep === 5 && (
                  <Step5PostTypes
                    onComplete={handlePostTypesComplete}
                    onSkip={() => {}}
                    initialData={data.postTypeRatings ? { postTypeRatings: data.postTypeRatings } : undefined}
                    isEditing={hasEverCompletedOnboarding}
                  />
                )}

                {currentStep === 6 && (
                  <Step3UploadContent
                    onComplete={handleUploadComplete}
                    initialData={data.uploadedContent ? { uploadedContent: data.uploadedContent } : undefined}
                    isEditing={hasEverCompletedOnboarding}
                  />
                )}

                {currentStep === 7 && (
                  <StepGenerateVoice
                    onComplete={handleGenerateVoiceComplete}
                    uploadedContent={data.uploadedContent}
                    rewritePairs={data.rewriteExercises}
                    jobDescription={data.foundation?.jobDescription}
                    voiceDiscovery={data.voiceDiscovery}
                    postTypeRatings={data.postTypeRatings}
                    initialAnalysis={data.voiceAnalysis as Record<string, unknown> | undefined}
                    initialStyleBible={data.styleBible as string | undefined}
                    isEditing={hasEverCompletedOnboarding}
                  />
                )}

                {currentStep === 8 && (
                  <StepVoiceCalibration
                    onComplete={handleCalibrationComplete}
                    onSkip={() => {}}
                    voiceAnalysis={data.voiceAnalysis}
                    styleBible={data.styleBible as string | undefined}
                    primaryTopics={data.foundation?.primaryTopics}
                    postTypeRatings={data.postTypeRatings}
                    isEditing={hasEverCompletedOnboarding}
                  />
                )}
              </form>
              <div className="w-form-done">
                <div>Thank you! Your submission has been received!</div>
              </div>
              <div className="w-form-fail">
                <div>Oops! Something went wrong while submitting the form.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

