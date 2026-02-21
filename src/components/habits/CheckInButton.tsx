'use client';

import { useState } from 'react';

interface CheckInButtonProps {
  habitId: number;
  emojiBuddy: string;
  habitName: string;
  type: 'binary' | 'measured';
  targetValue?: number;
  targetUnit?: string;
  completed?: boolean;
  currentValue?: number;
  onSuccess?: () => void;
}

export function CheckInButton({
  habitId,
  emojiBuddy,
  habitName,
  type,
  targetValue,
  targetUnit,
  completed = false,
  currentValue,
  onSuccess,
}: CheckInButtonProps) {
  const [loading, setLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(completed);
  const [animating, setAnimating] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [value, setValue] = useState(currentValue || targetValue || 0);

  const handleToggle = async () => {
    if (type === 'measured') {
      setShowInput(true);
      return;
    }

    setLoading(true);
    setAnimating(true);

    try {
      const response = await fetch('/api/checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habit_id: habitId,
          completed: !isCompleted,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to check in');
      }

      setIsCompleted(!isCompleted);
      onSuccess?.();
    } catch (error) {
      console.error('Check-in error:', error);
    } finally {
      setLoading(false);
      setTimeout(() => setAnimating(false), 500);
    }
  };

  const handleValueSubmit = async () => {
    setLoading(true);
    setAnimating(true);

    try {
      const response = await fetch('/api/checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habit_id: habitId,
          completed: value > 0,
          value: value,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to check in');
      }

      setIsCompleted(value > 0);
      setShowInput(false);
      onSuccess?.();
    } catch (error) {
      console.error('Check-in error:', error);
    } finally {
      setLoading(false);
      setTimeout(() => setAnimating(false), 500);
    }
  };

  const completionPercentage = targetValue ? Math.min(100, (value / targetValue) * 100) : 0;
  const isPartial = completionPercentage > 0 && completionPercentage < 50;
  const isGood = completionPercentage >= 50 && completionPercentage < 100;
  const isComplete = completionPercentage >= 100;

  // Show input overlay for measured habits
  if (showInput) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">{emojiBuddy}</div>
            <div className="font-semibold text-gray-900">{habitName}</div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              How much did you do?
            </label>
            <div className="text-center text-3xl font-bold text-green-600 mb-2">
              {value} {targetUnit}
            </div>
            {targetValue && (
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    isComplete ? 'bg-green-500' : isGood ? 'bg-yellow-400' : 'bg-orange-400'
                  }`}
                  style={{ width: `${Math.min(100, completionPercentage)}%` }}
                />
              </div>
            )}
            {targetValue && (
              <p className="text-xs text-gray-500 mt-1 text-center">
                Goal: {targetValue} {targetUnit}
              </p>
            )}
          </div>

          {/* Slider */}
          {targetValue && (
            <input
              type="range"
              min={0}
              max={targetValue * 2}
              value={value}
              onChange={(e) => setValue(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
          )}

          {/* Quick buttons */}
          <div className="flex gap-2 mt-4">
            {[0, Math.floor((targetValue || 10) / 2), targetValue || 10].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setValue(v ?? 0)}
                className="flex-1 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                {v || '0'}
              </button>
            ))}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={() => setShowInput(false)}
              className="flex-1 btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleValueSubmit}
              disabled={loading}
              className="flex-1 btn btn-primary"
            >
              {loading ? 'Saving...' : 'Done! ✓'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
        isCompleted
          ? 'bg-green-100 text-green-700 border-2 border-green-500'
          : 'bg-green-500 text-white hover:bg-green-600'
      } ${animating ? 'animate-bounce' : ''}`}
    >
      <div className="flex items-center justify-center gap-3">
        <span className="text-2xl">{emojiBuddy}</span>
        <span>
          {isCompleted
            ? 'Done for today! 🎉'
            : type === 'measured'
            ? `Log ${targetUnit || 'progress'}`
            : 'Mark as done'}
        </span>
      </div>
    </button>
  );
}
