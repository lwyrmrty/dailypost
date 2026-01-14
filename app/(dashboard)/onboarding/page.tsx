'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import ProgressBar from './components/ProgressBar';
import Step1Foundation, { FoundationData } from './components/Step1_Foundation';
import Step2SamplePosts from './components/Step2_SamplePosts';
import Step3UploadContent from './components/Step3_UploadContent';
import Step4Inspiration, { InspirationAccount } from './components/Step4_Inspiration';
import Step5PostTypes, { PostTypeRating } from './components/Step5_PostTypes';
import Step6ToneCalibration, { TonePreferences } from './components/Step6_ToneCalibration';
import Step7TopicPerspectives, { TopicPerspective } from './components/Step7_TopicPerspectives';
import Step8Sources, { SelectedSource } from './components/Step8_Sources';
import { calculateProgress, OnboardingStep } from '@/lib/utils/onboarding';

interface OnboardingData {
  foundation?: FoundationData;
  samplePosts?: string[];
  uploadedContent?: string[];
  voiceAnalysis?: unknown;
  inspirationAccounts?: InspirationAccount[];
  postTypeRatings?: PostTypeRating[];
  tonePreferences?: TonePreferences;
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
  const totalSteps = 8;

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

  function handleStep1Complete(foundationData: FoundationData) {
    const newData = { ...data, foundation: foundationData };
    const newCompleted = [...completedSteps];
    if (!newCompleted.includes('foundation')) {
      newCompleted.push('foundation');
    }
    setData(newData);
    setCompletedSteps(newCompleted);
    saveProgress(newData, newCompleted);
    setCurrentStep(2);
  }

  function handleStep2Complete(stepData: { samplePosts: string[] }) {
    const newData = { ...data, samplePosts: stepData.samplePosts };
    const newCompleted = [...completedSteps];
    if (!newCompleted.includes('sample_posts')) {
      newCompleted.push('sample_posts');
    }
    setData(newData);
    setCompletedSteps(newCompleted);
    saveProgress(newData, newCompleted);
    setCurrentStep(3);
  }

  function handleStep3Complete(stepData: { uploadedContent: string[]; voiceAnalysis?: unknown }) {
    const newData = { ...data, uploadedContent: stepData.uploadedContent, voiceAnalysis: stepData.voiceAnalysis };
    const newCompleted = [...completedSteps];
    if (!newCompleted.includes('upload_content')) {
      newCompleted.push('upload_content');
    }
    setData(newData);
    setCompletedSteps(newCompleted);
    saveProgress(newData, newCompleted);
    setCurrentStep(4);
  }

  function handleStep4Complete(stepData: { inspirationAccounts: InspirationAccount[] }) {
    const newData = { ...data, inspirationAccounts: stepData.inspirationAccounts };
    const newCompleted = [...completedSteps];
    if (!newCompleted.includes('inspiration')) {
      newCompleted.push('inspiration');
    }
    setData(newData);
    setCompletedSteps(newCompleted);
    saveProgress(newData, newCompleted);
    setCurrentStep(5);
  }

  function handleStep5Complete(stepData: { postTypeRatings: PostTypeRating[] }) {
    const newData = { ...data, postTypeRatings: stepData.postTypeRatings };
    const newCompleted = [...completedSteps];
    if (!newCompleted.includes('post_types')) {
      newCompleted.push('post_types');
    }
    setData(newData);
    setCompletedSteps(newCompleted);
    saveProgress(newData, newCompleted);
    setCurrentStep(6);
  }

  function handleStep6Complete(stepData: { tonePreferences: TonePreferences }) {
    const newData = { ...data, tonePreferences: stepData.tonePreferences };
    const newCompleted = [...completedSteps];
    if (!newCompleted.includes('tone')) {
      newCompleted.push('tone');
    }
    setData(newData);
    setCompletedSteps(newCompleted);
    saveProgress(newData, newCompleted);
    setCurrentStep(7);
  }

  function handleStep7Complete(stepData: { topicPerspectives: TopicPerspective[] }) {
    const newData = { ...data, topicPerspectives: stepData.topicPerspectives };
    const newCompleted = [...completedSteps];
    if (!newCompleted.includes('perspectives')) {
      newCompleted.push('perspectives');
    }
    setData(newData);
    setCompletedSteps(newCompleted);
    saveProgress(newData, newCompleted);
    setCurrentStep(8);
  }

  async function handleStep8Complete(stepData: { sources: SelectedSource[] }) {
    const newData = { ...data, sources: stepData.sources };
    const newCompleted = [...completedSteps];
    if (!newCompleted.includes('sources')) {
      newCompleted.push('sources');
    }
    setData(newData);
    setCompletedSteps(newCompleted);
    await saveProgress(newData, newCompleted);
    
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
            <Step2SamplePosts
              onComplete={handleStep2Complete}
              onSkip={handleSkip}
              initialData={data.samplePosts ? { samplePosts: data.samplePosts } : undefined}
            />
          )}
          
          {currentStep === 3 && (
            <Step3UploadContent
              onComplete={handleStep3Complete}
              onSkip={handleSkip}
              initialData={data.uploadedContent ? { uploadedContent: data.uploadedContent } : undefined}
            />
          )}
          
          {currentStep === 4 && (
            <Step4Inspiration
              onComplete={handleStep4Complete}
              onSkip={handleSkip}
              initialData={data.inspirationAccounts ? { inspirationAccounts: data.inspirationAccounts } : undefined}
            />
          )}
          
          {currentStep === 5 && (
            <Step5PostTypes
              onComplete={handleStep5Complete}
              onSkip={handleSkip}
              initialData={data.postTypeRatings ? { postTypeRatings: data.postTypeRatings } : undefined}
            />
          )}
          
          {currentStep === 6 && (
            <Step6ToneCalibration
              onComplete={handleStep6Complete}
              onSkip={handleSkip}
              initialData={data.tonePreferences ? { tonePreferences: data.tonePreferences } : undefined}
            />
          )}
          
          {currentStep === 7 && (
            <Step7TopicPerspectives
              onComplete={handleStep7Complete}
              onSkip={handleSkip}
              primaryTopics={data.foundation?.primaryTopics || []}
              initialData={data.topicPerspectives ? { topicPerspectives: data.topicPerspectives } : undefined}
            />
          )}
          
          {currentStep === 8 && (
            <Step8Sources
              onComplete={handleStep8Complete}
              onSkip={() => {
                // Complete without sources
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
        {progress >= 65 && currentStep < 7 && (
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

