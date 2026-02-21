import type { Metadata, Viewport } from 'next';
import { SessionProvider } from 'next-auth/react';
import { AuthProvider } from '@/lib/auth/provider';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'Habit Garden 🌱',
  description:
    'A cozy, emoji-powered habit tracker that turns personal consistency into a living visual world.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Habit Garden',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-b from-garden-sky/20 to-white">
        <AuthProvider>
          <div className="mx-auto max-w-md min-h-screen flex flex-col">
            <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h1 className="text-xl font-bold text-green-700">🌱 Habit Garden</h1>
            </header>
            <main className="flex-1">{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
