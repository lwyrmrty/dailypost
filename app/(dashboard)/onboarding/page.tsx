'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import ProgressBar from './components/ProgressBar';
import Step1Foundation, { FoundationData } from './components/Step1_Foundation';
import StepVoiceDiscovery, { VoiceDiscoveryPreferences } from './components/Step_VoiceDiscovery';
import Step2SamplePosts, { RewritePair } from './components/Step2_SamplePosts';
import Step3UploadContent from './components/Step3_UploadContent';
import StepVoiceCalibration, { CalibrationFeedback } from './components/Step_VoiceCalibration';
import Step4Inspiration, { InspirationAccount } from './components/Step4_Inspiration';
import Step5PostTypes, { PostTypeRating } from './components/Step5_PostTypes';
import Step7TopicPerspectives, { TopicPerspective } from './components/Step7_TopicPerspectives';
import Step8Sources, { SelectedSource } from './components/Step8_Sources';
import { calculateProgress, OnboardingStep } from '@/lib/utils/onboarding';

interface OnboardingData {
  foundation?: FoundationData;
  voiceDiscovery?: VoiceDiscoveryPreferences;
  samplePosts?: string[];
  rewriteExercises?: RewritePair[];
  uploadedContent?: string[];
  voiceAnalysis?: unknown;
  styleBible?: string;
  calibrationFeedback?: CalibrationFeedback[];
  inspirationAccounts?: InspirationAccount[];
  postTypeRatings?: PostTypeRating[];
  topicPerspectives?: TopicPerspective[];
  sources?: SelectedSource[];
}

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<OnboardingStep[]>([]);
  const [data, setData] = useState<OnboardingData>({});
  const [saving, setSaving] = useState(false);

  const progress = calculateProgress(completedSteps);
  const totalSteps = 9;

  // Save progress to backend
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

  // Load existing progress on mount
  useEffect(() => {
    async function loadProgress() {
      if (!session?.user?.id) return;
      
      try {
        const response = await fetch(`/api/onboarding?userId=${session.user.id}`);
        if (response.ok) {
          const savedData = await response.json();
          if (savedData) {
            setData(savedData);
            setCompletedSteps(savedData.completedSteps || []);
            // Resume from where they left off
            if (savedData.completedSteps?.length > 0) {
              setCurrentStep(savedData.completedSteps.length + 1);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load progress:', error);
      }
    }
    loadProgress();
  }, [session]);

  // Step flow:
  // 1: Foundation  2: Voice Discovery  3: Rewrite Exercise  4: Upload Content
  // 5: Voice Calibration  6: Inspiration  7: Post Types  8: Topic Perspectives  9: Sources

  function completeStep(stepKey: OnboardingStep, newData: OnboardingData, nextStep: number) {
    const newCompleted = [...completedSteps];
    if (!newCompleted.includes(stepKey)) {
      newCompleted.push(stepKey);
    }
    setData(newData);
    setCompletedSteps(newCompleted);
    saveProgress(newData, newCompleted);
    setCurrentStep(nextStep);
  }

  function handleStep1Complete(foundationData: FoundationData) {
    completeStep('foundation', { ...data, foundation: foundationData }, 2);
  }

  function handleVoiceDiscoveryComplete(stepData: { voiceDiscovery: VoiceDiscoveryPreferences }) {
    completeStep('voice_discovery', { ...data, voiceDiscovery: stepData.voiceDiscovery }, 3);
  }

  function handleRewriteComplete(stepData: { samplePosts: string[]; rewriteExercises?: RewritePair[] }) {
    completeStep('sample_posts', {
      ...data,
      samplePosts: stepData.samplePosts,
      rewriteExercises: stepData.rewriteExercises,
    }, 4);
  }

  function handleUploadComplete(stepData: { uploadedContent: string[]; voiceAnalysis?: unknown; styleBible?: string }) {
    completeStep('upload_content', {
      ...data,
      uploadedContent: stepData.uploadedContent,
      voiceAnalysis: stepData.voiceAnalysis,
      styleBible: stepData.styleBible,
    }, 5);
  }

  function handleCalibrationComplete(stepData: { calibrationFeedback: CalibrationFeedback[] }) {
    completeStep('voice_calibration', { ...data, calibrationFeedback: stepData.calibrationFeedback }, 6);
  }

  function handleInspirationComplete(stepData: { inspirationAccounts: InspirationAccount[] }) {
    completeStep('inspiration', { ...data, inspirationAccounts: stepData.inspirationAccounts }, 7);
  }

  function handlePostTypesComplete(stepData: { postTypeRatings: PostTypeRating[] }) {
    completeStep('post_types', { ...data, postTypeRatings: stepData.postTypeRatings }, 8);
  }

  function handlePerspectivesComplete(stepData: { topicPerspectives: TopicPerspective[] }) {
    completeStep('perspectives', { ...data, topicPerspectives: stepData.topicPerspectives }, 9);
  }

  async function handleSourcesComplete(stepData: { sources: SelectedSource[] }) {
    const newData2 = { ...data, sources: stepData.sources };
    const newCompleted = [...completedSteps];
    if (!newCompleted.includes('sources')) {
      newCompleted.push('sources');
    }
    setData(newData2);
    setCompletedSteps(newCompleted);
    await saveProgress(newData2, newCompleted);

    // Save sources to database
    if (session?.user?.id && stepData.sources.length > 0) {
      for (const source of stepData.sources) {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: session.user.id,
            sourceUrl: source.sourceUrl,
            sourceName: source.sourceName,
            sourceType: source.sourceType,
            priority: source.priority,
          }),
        });
      }
    }
    
    // Complete onboarding
    if (session?.user?.id) {
      await fetch('/api/onboarding/complete', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id }),
      });
    }
    router.push('/dashboard');
  }

  function handleSkip() {
    setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  }

  function handleBack() {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Set up your voice profile</h1>
          <p className="text-gray-600 mt-2">
            This helps us generate content that sounds like you
          </p>
        </div>

        {/* Progress */}
        <ProgressBar 
          progress={progress} 
          currentStep={currentStep} 
          totalSteps={totalSteps} 
        />

        {/* Navigation */}
        {currentStep > 1 && (
          <button
            type="button"
            onClick={handleBack}
            className="mb-6 text-gray-600 hover:text-gray-900 flex items-center gap-1"
          >
            ← Back to previous step
          </button>
        )}

        {/* Saving indicator */}
        {saving && (
          <div className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
            Saving...
          </div>
        )}

        {/* Steps */}
        <div className="bg-white rounded-2xl shadow-sm p-8">
          {currentStep === 1 && (
            <Step1Foundation
              onComplete={handleStep1Complete}
              initialData={data.foundation}
            />
          )}

          {currentStep === 2 && (
            <StepVoiceDiscovery
              onComplete={handleVoiceDiscoveryComplete}
              onSkip={handleSkip}
              initialData={data.voiceDiscovery ? { voiceDiscovery: data.voiceDiscovery } : undefined}
            />
          )}

          {currentStep === 3 && (
            <Step2SamplePosts
              onComplete={handleRewriteComplete}
              onSkip={handleSkip}
              initialData={data.samplePosts ? { samplePosts: data.samplePosts } : undefined}
              postingExperience={data.foundation?.postingExperience}
            />
          )}

          {currentStep === 4 && (
            <Step3UploadContent
              onComplete={handleUploadComplete}
              onSkip={handleSkip}
              initialData={data.uploadedContent ? { uploadedContent: data.uploadedContent } : undefined}
              rewritePairs={data.rewriteExercises}
              jobDescription={data.foundation?.jobDescription}
              postingExperience={data.foundation?.postingExperience}
              voiceDiscovery={data.voiceDiscovery}
            />
          )}

          {currentStep === 5 && (
            <StepVoiceCalibration
              onComplete={handleCalibrationComplete}
              onSkip={handleSkip}
              styleBible={data.styleBible as string | undefined}
              primaryTopics={data.foundation?.primaryTopics}
            />
          )}

          {currentStep === 6 && (
            <Step4Inspiration
              onComplete={handleInspirationComplete}
              onSkip={handleSkip}
              initialData={data.inspirationAccounts ? { inspirationAccounts: data.inspirationAccounts } : undefined}
            />
          )}

          {currentStep === 7 && (
            <Step5PostTypes
              onComplete={handlePostTypesComplete}
              onSkip={handleSkip}
              initialData={data.postTypeRatings ? { postTypeRatings: data.postTypeRatings } : undefined}
            />
          )}

          {currentStep === 8 && (
            <Step7TopicPerspectives
              onComplete={handlePerspectivesComplete}
              onSkip={handleSkip}
              primaryTopics={data.foundation?.primaryTopics || []}
              initialData={data.topicPerspectives ? { topicPerspectives: data.topicPerspectives } : undefined}
            />
          )}

          {currentStep === 9 && (
            <Step8Sources
              onComplete={handleSourcesComplete}
              onSkip={() => {
                if (session?.user?.id) {
                  fetch('/api/onboarding/complete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: session.user.id }),
                  });
                }
                router.push('/dashboard');
              }}
              initialData={data.sources ? { sources: data.sources } : undefined}
            />
          )}
        </div>

        {/* Skip to dashboard if enough progress */}
        {progress >= 65 && currentStep < 8 && (
          <div className="text-center mt-6">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="text-blue-600 hover:underline"
            >
              Skip remaining steps and go to dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

