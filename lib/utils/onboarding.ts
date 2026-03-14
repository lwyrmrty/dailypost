export type OnboardingStep =
  | 'about_goals'
  | 'topics'
  | 'voice_discovery'
  | 'sample_posts'
  | 'post_types'
  | 'upload_content'
  | 'generate_voice'
  | 'voice_calibration'

export const STEP_WEIGHTS: Record<OnboardingStep, number> = {
  about_goals: 14,
  topics: 12,
  voice_discovery: 12,
  sample_posts: 10,
  post_types: 10,
  upload_content: 16,
  generate_voice: 16,
  voice_calibration: 10,
};

export function calculateProgress(completedSteps: OnboardingStep[]): number {
  let progress = 0;
  
  completedSteps.forEach(step => {
    progress += STEP_WEIGHTS[step] || 0;
  });
  
  return Math.min(progress, 100);
}

export function canGeneratePosts(progress: number): boolean {
  return progress >= 65;
}

export function getStepNumber(step: OnboardingStep): number {
  const steps: OnboardingStep[] = [
    'about_goals',
    'topics',
    'voice_discovery',
    'sample_posts',
    'post_types',
    'upload_content',
    'generate_voice',
    'voice_calibration',
  ];
  return steps.indexOf(step) + 1;
}

export function getStepName(step: OnboardingStep): string {
  const names: Record<OnboardingStep, string> = {
    about_goals: 'About & Goals',
    topics: 'Topics',
    voice_discovery: 'Discover Your Voice',
    sample_posts: 'Writing Samples',
    post_types: 'Post Types',
    upload_content: 'Upload Past Content',
    generate_voice: 'Generate Voice',
    voice_calibration: 'Voice Validation',
  };
  return names[step];
}

export function getNextStep(currentStep: OnboardingStep): OnboardingStep | null {
  const steps: OnboardingStep[] = [
    'about_goals',
    'topics',
    'voice_discovery',
    'sample_posts',
    'post_types',
    'upload_content',
    'generate_voice',
    'voice_calibration',
  ];
  
  const currentIndex = steps.indexOf(currentStep);
  if (currentIndex === -1 || currentIndex >= steps.length - 1) {
    return null;
  }
  
  return steps[currentIndex + 1];
}

export function getPreviousStep(currentStep: OnboardingStep): OnboardingStep | null {
  const steps: OnboardingStep[] = [
    'about_goals',
    'topics',
    'voice_discovery',
    'sample_posts',
    'post_types',
    'upload_content',
    'generate_voice',
    'voice_calibration',
  ];
  
  const currentIndex = steps.indexOf(currentStep);
  if (currentIndex <= 0) {
    return null;
  }
  
  return steps[currentIndex - 1];
}
