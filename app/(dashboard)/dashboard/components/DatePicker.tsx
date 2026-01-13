'use client';

import { useRouter } from 'next/navigation';
import { format, addDays, subDays, parseISO } from 'date-fns';

interface DatePickerProps {
  selectedDate: string;
}

export default function DatePicker({ selectedDate }: DatePickerProps) {
  const router = useRouter();
  const date = parseISO(selectedDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isToday = selectedDate === format(today, 'yyyy-MM-dd');
  const isFuture = date > today;

  function navigateToDate(newDate: Date) {
    const dateString = format(newDate, 'yyyy-MM-dd');
    router.push(`/dashboard?date=${dateString}`);
  }

  function goToPreviousDay() {
    navigateToDate(subDays(date, 1));
  }

  function goToNextDay() {
    if (!isFuture) {
      navigateToDate(addDays(date, 1));
    }
  }

  function goToToday() {
    navigateToDate(today);
  }

  return (
    <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1">
      <button
        onClick={goToPreviousDay}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Previous day"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      <div className="flex items-center gap-2 px-3">
        <span className="font-medium text-gray-900">
          {isToday ? 'Today' : format(date, 'MMM d, yyyy')}
        </span>
        {!isToday && (
          <button
            onClick={goToToday}
            className="text-xs text-blue-600 hover:underline"
          >
            Go to today
          </button>
        )}
      </div>
      
      <button
        onClick={goToNextDay}
        disabled={isFuture || isToday}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Next day"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Calendar picker */}
      <input
        type="date"
        value={selectedDate}
        max={format(today, 'yyyy-MM-dd')}
        onChange={(e) => navigateToDate(parseISO(e.target.value))}
        className="sr-only"
        id="date-picker"
      />
      <label
        htmlFor="date-picker"
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </label>
    </div>
  );
}






