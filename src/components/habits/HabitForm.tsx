'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface HabitFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const EMOJI_OPTIONS = [
  '🐛', '🦋', '🐞', '🐝', '🐜', '🦀',
  '🐢', '🐍', '🦎', '🐊', '🐅', '🐆',
  '🦓', '🦍', '🦧', '🐘', '🦛', '🦏',
  '🐪', '🐫', '🦒', '🦘', '🐃', '🐂',
  '🐄', '🐎', '🐖', '🐏', '🐑', '🦙',
  '🐐', '🦌', '🐕', '🐩', '🦮', '🐈',
  '🐓', '🦃', '🦚', '🦜', '🦢', '🦩',
  '🐇', '🦝', '🦨', '🦡', '🦫', '🦦',
  '🌱', '🌿', '☘️', '🍀', '🌾', '🌵',
  '🌴', '🌳', '🌲', '🌺', '🌸', '🌻',
];

export function HabitForm({ onSuccess, onCancel }: HabitFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [direction, setDirection] = useState<'build' | 'break'>('build');
  const [name, setName] = useState('');
  const [type, setType] = useState<'binary' | 'measured'>('binary');
  const [targetValue, setTargetValue] = useState<number | undefined>();
  const [targetUnit, setTargetUnit] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekdays' | 'weekends' | 'custom'>('daily');
  const [customDays, setCustomDays] = useState([false, false, false, false, false, false, false]);
  const [reminderTime, setReminderTime] = useState('');
  const [emojiBuddy, setEmojiBuddy] = useState('');

  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          emojiBuddy,
          direction,
          type,
          targetValue: type === 'measured' ? targetValue : null,
          targetUnit: type === 'measured' ? targetUnit : null,
          frequency,
          customDays: frequency === 'custom' ? customDays : null,
          reminderTime: reminderTime || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create habit');
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const canProceedStep2 = name.trim().length > 0 && name.trim().length <= 50;
  const canSubmit = emojiBuddy.length > 0;

  return (
    <form onSubmit={handleSubmit} className="p-4">
      {/* Progress indicator */}
      <div className="flex gap-2 mb-6">
        <div className={`h-1 flex-1 rounded ${step >= 1 ? 'bg-green-500' : 'bg-gray-200'}`} />
        <div className={`h-1 flex-1 rounded ${step >= 2 ? 'bg-green-500' : 'bg-gray-200'}`} />
        <div className={`h-1 flex-1 rounded ${step >= 3 ? 'bg-green-500' : 'bg-gray-200'}`} />
      </div>

      {/* Step 1: Direction & Name */}
      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">What are you working on?</h3>
          
          {/* Direction Toggle */}
          <div className="form-group">
            <label className="form-label">I want to...</label>
            <div className="form-toggle-group">
              <button
                type="button"
                className={`form-toggle ${direction === 'build' ? 'selected' : ''}`}
                onClick={() => setDirection('build')}
              >
                🌱 Build a new habit
              </button>
              <button
                type="button"
                className={`form-toggle ${direction === 'break' ? 'selected' : ''}`}
                onClick={() => setDirection('break')}
              >
                🔨 Break a bad habit
              </button>
            </div>
          </div>

          {/* Name Input */}
          <div className="form-group">
            <label className="form-label">Habit name</label>
            <input
              type="text"
              className="form-input"
              placeholder={direction === 'build' ? 'e.g., Meditate daily' : 'e.g., Stop checking phone'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
            />
            <p className="text-xs text-gray-500 mt-1">{name.length}/50</p>
          </div>

          {/* Type Toggle (only for building) */}
          {direction === 'build' && (
            <div className="form-group">
              <label className="form-label">How will you track it?</label>
              <div className="form-toggle-group">
                <button
                  type="button"
                  className={`form-toggle ${type === 'binary' ? 'selected' : ''}`}
                  onClick={() => setType('binary')}
                >
                  ✓ Yes/No each day
                </button>
                <button
                  type="button"
                  className={`form-toggle ${type === 'measured' ? 'selected' : ''}`}
                  onClick={() => setType('measured')}
                >
                  📊 Track a number
                </button>
              </div>
            </div>
          )}

          {/* Target for measured */}
          {type === 'measured' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="form-group">
                <label className="form-label">Goal</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="20"
                  value={targetValue || ''}
                  onChange={(e) => setTargetValue(parseInt(e.target.value) || undefined)}
                  min={1}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Unit</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="minutes"
                  value={targetUnit}
                  onChange={(e) => setTargetUnit(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Frequency */}
          <div className="form-group">
            <label className="form-label">How often?</label>
            <div className="form-toggle-group flex-wrap">
              {['daily', 'weekdays', 'weekends'].map((freq) => (
                <button
                  key={freq}
                  type="button"
                  className={`form-toggle ${frequency === freq ? 'selected' : ''}`}
                  onClick={() => {
                    setFrequency(freq as any);
                    setCustomDays([false, false, false, false, false, false, false]);
                  }}
                >
                  {freq === 'daily' && 'Every day'}
                  {freq === 'weekdays' && 'Weekdays'}
                  {freq === 'weekends' && 'Weekends'}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Days */}
          {frequency === 'custom' && (
            <div className="form-group">
              <label className="form-label">Select days</label>
              <div className="flex gap-2 justify-center">
                {days.map((day, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`w-10 h-10 rounded-full text-sm font-medium ${
                      customDays[idx]
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                    onClick={() => {
                      const newDays = [...customDays];
                      newDays[idx] = !newDays[idx];
                      setCustomDays(newDays);
                    }}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Reminder */}
          <div className="form-group">
            <label className="form-label">Reminder (optional)</label>
            <input
              type="time"
              className="form-input"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="btn btn-primary w-full"
            disabled={!canProceedStep2}
            onClick={() => setStep(2)}
          >
            Next: Choose your buddy →
          </button>
        </div>
      )}

      {/* Step 2: Choose Emoji Buddy */}
      {step === 2 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Choose your buddy! 🐛</h3>
          <p className="text-sm text-gray-600">Pick an emoji that represents your habit</p>

          <div className="emoji-grid">
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className={`emoji-option ${emojiBuddy === emoji ? 'selected' : ''}`}
                onClick={() => setEmojiBuddy(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              className="btn btn-secondary flex-1"
              onClick={() => setStep(1)}
            >
              ← Back
            </button>
            <button
              type="button"
              className="btn btn-primary flex-1"
              disabled={!canSubmit}
              onClick={() => setStep(3)}
            >
              Next: Review →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Looks good? 🎉</h3>

          {/* Preview Card */}
          <div className="card text-center py-6">
            <div className="text-5xl mb-3">{emojiBuddy}</div>
            <div className="font-semibold text-gray-900">{name}</div>
            <div className="text-sm text-gray-500 mt-1">
              {direction === 'build' ? '🌱 Building' : '🔨 Breaking'} • {frequency}
              {type === 'measured' && ` • ${targetValue} ${targetUnit}`}
            </div>
            {reminderTime && (
              <div className="text-xs text-gray-400 mt-2">
                ⏰ Reminder at {reminderTime}
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              className="btn btn-secondary flex-1"
              onClick={() => setStep(2)}
            >
              ← Back
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Habit! 🌱'}
            </button>
          </div>

          {onCancel && (
            <button
              type="button"
              className="w-full text-sm text-gray-500 py-2"
              onClick={onCancel}
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </form>
  );
}
