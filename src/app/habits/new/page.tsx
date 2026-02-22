'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewHabitPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: {
    name: string;
    emojiBuddy: string;
    direction: 'build' | 'break';
    type: 'binary' | 'measured';
    targetValue?: number;
    targetUnit?: string;
    frequency: string;
    reminderTime?: string;
  }) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create habit');
      }

      router.push('/garden');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4">
      <Link
        href="/garden"
        className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
      >
        ← Back to Garden
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Habit</h1>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <NewHabitForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
}

interface NewHabitFormProps {
  onSubmit: (data: {
    name: string;
    emojiBuddy: string;
    direction: 'build' | 'break';
    type: 'binary' | 'measured';
    targetValue?: number;
    targetUnit?: string;
    frequency: string;
    reminderTime?: string;
  }) => void;
  isSubmitting: boolean;
}

function NewHabitForm({ onSubmit, isSubmitting }: NewHabitFormProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    emojiBuddy: '🌱',
    direction: 'build' as 'build' | 'break',
    type: 'binary' as 'binary' | 'measured',
    targetValue: 1,
    targetUnit: '',
    frequency: 'daily',
    reminderTime: '',
  });

  const emojis = ['🌱', '🏃', '📚', '💪', '🧘', '💧', '🍎', '😴', '🎯', '✍️', '🎨', '🎵', '🌟', '🦋', '🐱', '🐕', '🌸', '🍀', '🌈', '☀️', '🌙', '🔥', '💡', '🎁', '⭐', '🌻', '🦋', '🐝', '🪴', '🌲'];

  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (step === 1 && !formData.name.trim()) {
      return;
    }
    if (step === 2 && !formData.emojiBuddy) {
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = () => {
    onSubmit(formData);
  };

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-2 flex-1 rounded-full ${
              s <= step ? 'bg-green-500' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">What habit do you want to build?</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Habit Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => updateFormData({ name: e.target.value })}
              placeholder="e.g., Read for 20 minutes"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 placeholder-gray-400"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Building or breaking?
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => updateFormData({ direction: 'build' })}
                className={`flex-1 p-3 rounded-lg border-2 ${
                  formData.direction === 'build'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                🏗️ Build
                <span className="block text-xs">Create a new habit</span>
              </button>
              <button
                type="button"
                onClick={() => updateFormData({ direction: 'break' })}
                className={`flex-1 p-3 rounded-lg border-2 ${
                  formData.direction === 'break'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                🔨 Break
                <span className="block text-xs">Stop a bad habit</span>
              </button>
            </div>
          </div>

          <button
            onClick={handleNext}
            disabled={!formData.name.trim()}
            className="w-full py-3 bg-green-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}

      {/* Step 2: Choose Buddy */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Choose your habit buddy</h2>
          <p className="text-sm text-gray-500">This emoji will represent your habit in the garden</p>

          <div className="grid grid-cols-6 gap-2">
            {emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => updateFormData({ emojiBuddy: emoji })}
                className={`text-3xl p-2 rounded-lg ${
                  formData.emojiBuddy === emoji
                    ? 'bg-green-100 border-2 border-green-500'
                    : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleBack}
              className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium"
            >
              ← Back
            </button>
            <button
              onClick={handleNext}
              className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Frequency & Reminder */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">How often?</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Frequency
            </label>
            <select
              value={formData.frequency}
              onChange={(e) => updateFormData({ frequency: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 bg-white"
            >
              <option value="daily">Daily</option>
              <option value="weekdays">Weekdays</option>
              <option value="weekends">Weekends</option>
              <option value="custom">Custom days</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reminder time (optional)
            </label>
            <input
              type="time"
              value={formData.reminderTime}
              onChange={(e) => updateFormData({ reminderTime: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg text-gray-900"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleBack}
              className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium"
            >
              ← Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : '✨ Create Habit'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
