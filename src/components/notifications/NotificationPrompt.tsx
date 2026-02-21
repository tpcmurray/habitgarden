'use client';

import { useState, useEffect } from 'react';

interface NotificationPromptProps {
  onDismiss?: () => void;
}

export function NotificationPrompt({ onDismiss }: NotificationPromptProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed
    const wasDismissed = localStorage.getItem('notificationPromptDismissed');
    if (wasDismissed) {
      setDismissed(true);
      return;
    }

    // Check if iOS Safari
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    const isStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;

    // Show prompt for iOS users who haven't installed as PWA
    if (isIOS && isSafari && !isStandalone) {
      setShowPrompt(true);
    }
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('notificationPromptDismissed', 'true');
    onDismiss?.();
  };

  if (!showPrompt || dismissed) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pb-6 px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={handleDismiss}
      />
      
      {/* Prompt Card */}
      <div className="relative bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full animate-slide-up">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
        
        <div className="text-center">
          <div className="text-4xl mb-3">🔔</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Enable Notifications
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            To receive reminders and celebrate your streaks, install Habit Garden on your home screen.
          </p>
          
          {/* iOS Install Steps */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-xs font-medium text-gray-700 mb-2">How to install:</p>
            <ol className="text-xs text-gray-600 space-y-1">
              <li>1. Tap the <span className="font-bold">Share</span> button</li>
              <li>2. Scroll down and tap</li>
              <li>3. Tap <span className="font-bold">Add to Home Screen</span></li>
            </ol>
          </div>
          
          <button
            onClick={handleDismiss}
            className="w-full py-2 px-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
