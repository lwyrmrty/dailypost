'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // Show loading state while checking session
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  const isActive = (path: string) => pathname?.startsWith(path);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              {/* Logo */}
              <Link 
                href="/dashboard" 
                className="flex items-center px-2 text-xl font-bold text-gray-900"
              >
                DailyPost
              </Link>
              
              {/* Nav Links */}
              <div className="hidden sm:ml-8 sm:flex sm:space-x-4">
                <Link
                  href="/dashboard"
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium ${
                    isActive('/dashboard') && !isActive('/dashboard/') 
                      ? 'text-blue-600' 
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/chat"
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium ${
                    isActive('/chat') 
                      ? 'text-blue-600' 
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  Chat
                </Link>
                <Link
                  href="/settings"
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium ${
                    isActive('/settings') 
                      ? 'text-blue-600' 
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  Settings
                </Link>
              </div>
            </div>
            
            {/* Right side */}
            <div className="flex items-center space-x-4">
              {/* User menu */}
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-700">
                  {session?.user?.name || session?.user?.email}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile nav */}
      <div className="sm:hidden border-b border-gray-200 bg-white">
        <div className="flex space-x-4 px-4 py-2">
          <Link
            href="/dashboard"
            className={`text-sm font-medium ${
              isActive('/dashboard') ? 'text-blue-600' : 'text-gray-700'
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/chat"
            className={`text-sm font-medium ${
              isActive('/chat') ? 'text-blue-600' : 'text-gray-700'
            }`}
          >
            Chat
          </Link>
          <Link
            href="/settings"
            className={`text-sm font-medium ${
              isActive('/settings') ? 'text-blue-600' : 'text-gray-700'
            }`}
          >
            Settings
          </Link>
        </div>
      </div>

      {/* Main content */}
      <main>{children}</main>
    </div>
  );
}
