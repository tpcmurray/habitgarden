'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { BottomNav } from '@/components/navigation/BottomNav';

interface NotificationSettings {
  enabled: boolean;
  morningEnabled: boolean;
  eveningEnabled: boolean;
  morningTime: string;
  eveningTime: string;
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationSettings>({
    enabled: true,
    morningEnabled: true,
    eveningEnabled: false,
    morningTime: '08:00',
    eveningTime: '20:00',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    // Load notification preferences
    fetchNotificationSettings();
  }, []);

  async function fetchNotificationSettings() {
    try {
      const res = await fetch('/api/notifications/preferences');
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setNotifications(data);
        }
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  }

  async function saveNotificationSettings() {
    setSaving(true);
    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notifications),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    } finally {
      setSaving(false);
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-100 to-green-50 flex items-center justify-center">
        <div className="text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 to-green-50 pb-20">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">⚙️ Settings</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        {/* Account Section */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Account
          </h2>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-xl">
                  {session?.user?.image ? (
                    <img 
                      src={session.user.image} 
                      alt="Profile" 
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    '🌱'
                  )}
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {session?.user?.name || 'User'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {session?.user?.email}
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="w-full p-4 text-left text-red-600 hover:bg-red-50 transition-colors flex items-center justify-between"
            >
              <span>Sign Out</span>
              <span>→</span>
            </button>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Notifications
          </h2>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {/* Master Toggle */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">Enable Notifications</div>
                <div className="text-sm text-gray-500">Receive reminders from your buddies</div>
              </div>
              <button
                onClick={() => {
                  setNotifications({ ...notifications, enabled: !notifications.enabled });
                  setTimeout(saveNotificationSettings, 100);
                }}
                className={`w-12 h-6 rounded-full transition-colors ${
                  notifications.enabled ? 'bg-green-600' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                    notifications.enabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Morning Reminder */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-medium text-gray-900">Morning Reminder</div>
                  <div className="text-sm text-gray-500">Get reminded to start your day</div>
                </div>
                <button
                  onClick={() => {
                    setNotifications({ ...notifications, morningEnabled: !notifications.morningEnabled });
                    setTimeout(saveNotificationSettings, 100);
                  }}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    notifications.morningEnabled ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                      notifications.morningEnabled ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
              {notifications.morningEnabled && (
                <input
                  type="time"
                  value={notifications.morningTime}
                  onChange={(e) => {
                    setNotifications({ ...notifications, morningTime: e.target.value });
                  }}
                  onBlur={saveNotificationSettings}
                  className="w-full p-2 border border-gray-200 rounded-lg text-gray-900"
                />
              )}
            </div>

            {/* Evening Reminder */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-medium text-gray-900">Evening Check-in</div>
                  <div className="text-sm text-gray-500">Review and complete your habits</div>
                </div>
                <button
                  onClick={() => {
                    setNotifications({ ...notifications, eveningEnabled: !notifications.eveningEnabled });
                    setTimeout(saveNotificationSettings, 100);
                  }}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    notifications.eveningEnabled ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                      notifications.eveningEnabled ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
              {notifications.eveningEnabled && (
                <input
                  type="time"
                  value={notifications.eveningTime}
                  onChange={(e) => {
                    setNotifications({ ...notifications, eveningTime: e.target.value });
                  }}
                  onBlur={saveNotificationSettings}
                  className="w-full p-2 border border-gray-200 rounded-lg text-gray-900"
                />
              )}
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            About
          </h2>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-gray-900">Version</span>
                <span className="text-gray-500">1.0.0</span>
              </div>
            </div>
            <a 
              href="https://github.com/tpcmurray/habitgarden" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-4 flex items-center justify-between text-gray-900 hover:bg-gray-50"
            >
              <span>View on GitHub</span>
              <span>→</span>
            </a>
          </div>
        </div>

        {/* Save indicator */}
        {saved && (
          <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-full shadow-lg">
            ✓ Settings saved
          </div>
        )}

        {saving && (
          <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-gray-600 text-white px-4 py-2 rounded-full shadow-lg">
            Saving...
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
