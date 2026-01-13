'use client';

interface ProgressBarProps {
  progress: number;
  currentStep: number;
  totalSteps: number;
}

export default function ProgressBar({ progress, currentStep, totalSteps }: ProgressBarProps) {
  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-sm font-medium text-gray-700">
          {progress}% complete
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      {progress >= 65 && (
        <p className="text-sm text-green-600 mt-2">
          ✓ You&apos;ve completed enough to start generating posts!
        </p>
      )}
    </div>
  );
}






