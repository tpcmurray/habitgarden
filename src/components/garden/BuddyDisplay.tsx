'use client';

import { Mood } from '@/lib/garden/moods';

interface BuddyDisplayProps {
  emoji: string;
  mood: Mood;
  showAnimation?: boolean;
  size?: 'small' | 'medium' | 'large';
  hat?: string | null;
}

const moodEmojis: Record<Mood, string> = {
  ecstatic: '🤩',
  happy: '😄',
  content: '😊',
  neutral: '😐',
  sad: '😟',
  very_sad: '😢',
  dormant: '😴',
};

export function BuddyDisplay({
  emoji,
  mood,
  showAnimation = false,
  size = 'medium',
  hat = null,
}: BuddyDisplayProps) {
  const moodEmoji = moodEmojis[mood];

  const sizeClasses = {
    small: {
      buddy: 'text-2xl',
      mood: 'text-sm',
      badge: 'w-5 h-5 -right-1 -bottom-1',
    },
    medium: {
      buddy: 'text-3xl',
      mood: 'text-lg',
      badge: 'w-6 h-6 -right-2 -bottom-2',
    },
    large: {
      buddy: 'text-5xl',
      mood: 'text-2xl',
      badge: 'w-10 h-10 -right-3 -bottom-3',
    },
  };

  const sizes = sizeClasses[size];

  // Animation classes based on mood
  const getAnimationClass = () => {
    if (!showAnimation) return '';
    if (mood === 'ecstatic') return 'animate-bounce';
    if (mood === 'happy' || mood === 'content') return 'animate-pulse';
    return '';
  };

  return (
    <div className="relative inline-flex">
      {/* Hat (positioned above the buddy) */}
      {hat && (
        <span
          className={`absolute -top-4 left-1/2 -translate-x-1/2 ${size === 'small' ? 'text-lg' : size === 'medium' ? 'text-2xl' : 'text-4xl'}`}
          role="img"
          aria-label={`Hat: ${hat}`}
        >
          {hat}
        </span>
      )}
      <span
        className={`${sizes.buddy} ${getAnimationClass()}`}
        role="img"
        aria-label={`Buddy: ${emoji}, mood: ${mood}`}
      >
        {emoji}
      </span>
      <span
        className={`absolute ${sizes.badge} flex items-center justify-center bg-white rounded-full shadow-sm ${sizes.mood}`}
        role="img"
        aria-label={`Mood: ${mood}`}
      >
        {moodEmoji}
      </span>
    </div>
  );
}
