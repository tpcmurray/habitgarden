'use client';

import { useEffect, useState } from 'react';

interface Milestone {
  type: 'streak_7' | 'streak_30' | 'streak_100';
  cosmetic: {
    type: 'hat' | 'companion' | 'landmark';
    value: string;
  };
  streakSnapshot: number;
}

interface CelebrationOverlayProps {
  milestone: Milestone;
  buddy: string;
  onClose: () => void;
}

const TIER_INFO = {
  streak_7: {
    tier: 'Bronze',
    icon: '🔥',
    color: 'from-amber-400 to-amber-600',
    particles: ['🎉', '✨', '🌟'],
  },
  streak_30: {
    tier: 'Silver',
    icon: '⭐',
    color: 'from-gray-300 to-gray-500',
    particles: ['🌟', '💫', '✨'],
  },
  streak_100: {
    tier: 'Gold',
    icon: '🏆',
    color: 'from-yellow-400 to-yellow-600',
    particles: ['🏆', '💎', '🌟', '✨'],
  },
};

const MESSAGES = {
  streak_7: (buddy: string, cosmetic: string) => 
    `🔥 7 days straight! ${buddy} earned a ${cosmetic}!`,
  streak_30: (buddy: string, cosmetic: string) => 
    `⭐ 30 days! ${buddy} made a new friend: ${cosmetic}!`,
  streak_100: (buddy: string, cosmetic: string) => 
    `🏆 100 DAYS! ${buddy} built something amazing: ${cosmetic}!`,
};

export function CelebrationOverlay({ milestone, buddy, onClose }: CelebrationOverlayProps) {
  const [isVisible, setIsVisible] = useState(false);
  const tier = TIER_INFO[milestone.type];
  const message = MESSAGES[milestone.type](buddy, milestone.cosmetic.value);

  useEffect(() => {
    // Trigger entrance animation
    setTimeout(() => setIsVisible(true), 50);

    // Auto-dismiss after 4 seconds
    const timeout = setTimeout(() => {
      handleClose();
    }, 4000);

    return () => clearTimeout(timeout);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for exit animation
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
        isVisible ? 'bg-black/50' : 'bg-black/0 pointer-events-none'
      }`}
      onClick={handleClose}
    >
      {/* Confetti particles */}
      {isVisible && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {tier.particles.map((particle, idx) => (
            <span
              key={idx}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-20px',
                animationDelay: `${idx * 0.2}s`,
                animationDuration: `${2 + Math.random()}s`,
              }}
            >
              {particle}
            </span>
          ))}
        </div>
      )}

      {/* Card */}
      <div 
        className={`relative bg-white rounded-3xl p-8 text-center shadow-2xl transform transition-all duration-500 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background gradient */}
        <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${tier.color} opacity-10`} />

        {/* Content */}
        <div className="relative z-10">
          {/* Icon */}
          <div className="text-6xl mb-4 animate-bounce">
            {milestone.cosmetic.value}
          </div>

          {/* Tier badge */}
          <div className={`inline-block px-4 py-1 rounded-full bg-gradient-to-r ${tier.color} text-white text-sm font-bold mb-4`}>
            {tier.icon} {tier.tier} Tier!
          </div>

          {/* Message */}
          <p className="text-lg font-medium text-gray-800 mb-2">
            {message}
          </p>

          {/* Streak */}
          <p className="text-sm text-gray-500">
            {milestone.streakSnapshot} day streak 🎯
          </p>

          {/* Tap to dismiss hint */}
          <p className="text-xs text-gray-400 mt-4">
            Tap anywhere to continue
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti 2s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
