'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function BottomNav() {
  const pathname = usePathname();
  
  const isActive = (path: string) => {
    if (path === '/garden') {
      return pathname === '/garden' || pathname === '/';
    }
    return pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="max-w-md mx-auto flex justify-around py-3">
        <Link 
          href="/garden" 
          className={`flex flex-col items-center ${isActive('/garden') ? 'text-green-600' : 'text-gray-500'}`}
        >
          <span className="text-2xl">🌱</span>
          <span className="text-xs">Garden</span>
        </Link>
        <Link 
          href="/stats" 
          className={`flex flex-col items-center ${isActive('/stats') ? 'text-green-600' : 'text-gray-500'}`}
        >
          <span className="text-2xl">📊</span>
          <span className="text-xs">Stats</span>
        </Link>
        <Link 
          href="/settings" 
          className={`flex flex-col items-center ${isActive('/settings') ? 'text-green-600' : 'text-gray-500'}`}
        >
          <span className="text-2xl">⚙️</span>
          <span className="text-xs">Settings</span>
        </Link>
      </div>
    </nav>
  );
}
