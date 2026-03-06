export type OnboardingStep =
  | 'foundation'
  | 'voice_discovery'
  | 'sample_posts'
  | 'upload_content'
  | 'voice_calibration'
  | 'inspiration'
  | 'post_types'
  | 'perspectives'
  | 'sources';

export const STEP_WEIGHTS: Record<OnboardingStep, number> = {
  foundation: 14,        // Required
  voice_discovery: 14,   // A/B style preference picks — critical for aspirational users
  sample_posts: 10,      // Rewrite exercise
  upload_content: 12,    // Voice analysis + Style Bible
  voice_calibration: 10, // A/B calibration
  inspiration: 8,
  post_types: 10,
  perspectives: 10,
  sources: 12,           // Important for content generation
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
    'foundation',
    'voice_discovery',
    'sample_posts',
    'upload_content',
    'voice_calibration',
    'inspiration',
    'post_types',
    'perspectives',
    'sources',
  ];
  return steps.indexOf(step) + 1;
}

export function getStepName(step: OnboardingStep): string {
  const names: Record<OnboardingStep, string> = {
    foundation: 'Foundation',
    voice_discovery: 'Voice Discovery',
    sample_posts: 'Rewrite Exercise',
    upload_content: 'Upload Content',
    voice_calibration: 'Voice Calibration',
    inspiration: 'Inspiration',
    post_types: 'Post Types',
    perspectives: 'Perspectives',
    sources: 'News Sources',
  };
  return names[step];
}

export function getNextStep(currentStep: OnboardingStep): OnboardingStep | null {
  const steps: OnboardingStep[] = [
    'foundation',
    'voice_discovery',
    'sample_posts',
    'upload_content',
    'voice_calibration',
    'inspiration',
    'post_types',
    'perspectives',
    'sources',
  ];
  
  const currentIndex = steps.indexOf(currentStep);
  if (currentIndex === -1 || currentIndex >= steps.length - 1) {
    return null;
  }
  
  return steps[currentIndex + 1];
}

export function getPreviousStep(currentStep: OnboardingStep): OnboardingStep | null {
  const steps: OnboardingStep[] = [
    'foundation',
    'voice_discovery',
    'sample_posts',
    'upload_content',
    'voice_calibration',
    'inspiration',
    'post_types',
    'perspectives',
    'sources',
  ];
  
  const currentIndex = steps.indexOf(currentStep);
  if (currentIndex <= 0) {
    return null;
  }
  
  return steps[currentIndex - 1];
}
