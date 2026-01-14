export type OnboardingStep = 
  | 'foundation'
  | 'sample_posts'
  | 'upload_content'
  | 'inspiration'
  | 'post_types'
  | 'tone'
  | 'perspectives'
  | 'sources';

export const STEP_WEIGHTS: Record<OnboardingStep, number> = {
  foundation: 18, // Required
  sample_posts: 11,
  upload_content: 11,
  inspiration: 11,
  post_types: 12,
  tone: 12,
  perspectives: 11,
  sources: 14, // Important for content generation
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
    'sample_posts',
    'upload_content',
    'inspiration',
    'post_types',
    'tone',
    'perspectives',
    'sources',
  ];
  return steps.indexOf(step) + 1;
}

export function getStepName(step: OnboardingStep): string {
  const names: Record<OnboardingStep, string> = {
    foundation: 'Foundation',
    sample_posts: 'Sample Posts',
    upload_content: 'Upload Content',
    inspiration: 'Inspiration',
    post_types: 'Post Types',
    tone: 'Tone',
    perspectives: 'Perspectives',
    sources: 'News Sources',
  };
  return names[step];
}

export function getNextStep(currentStep: OnboardingStep): OnboardingStep | null {
  const steps: OnboardingStep[] = [
    'foundation',
    'sample_posts',
    'upload_content',
    'inspiration',
    'post_types',
    'tone',
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
    'sample_posts',
    'upload_content',
    'inspiration',
    'post_types',
    'tone',
    'perspectives',
    'sources',
  ];
  
  const currentIndex = steps.indexOf(currentStep);
  if (currentIndex <= 0) {
    return null;
  }
  
  return steps[currentIndex - 1];
}
