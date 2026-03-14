'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const isOnboardingRoute = pathname?.startsWith('/onboarding');
  const isDashboardHomeRoute = pathname === '/dashboard';

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id) {
      return;
    }
    let cancelled = false;
    if (!pathname?.startsWith('/onboarding')) {
      setOnboardingCompleted(null);
    }
    fetch('/api/me')
      .then(async (res) => {
        if (res.ok) {
          return res.json();
        }

        if ((res.status === 401 || res.status === 404) && !cancelled) {
          await signOut({ callbackUrl: '/login' });
        }

        return null;
      })
      .then((data) => {
        if (!cancelled && data) {
          setOnboardingCompleted(data.onboardingCompleted ?? false);
        }
        if (!cancelled && !data && !pathname?.startsWith('/onboarding')) {
          setOnboardingCompleted(true);
        }
      })
      .catch(() => {
        if (!cancelled) setOnboardingCompleted(true);
      });
    return () => {
      cancelled = true;
    };
  }, [status, session?.user?.id, pathname]);

  // Show loading state while checking session
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.replace('/login');
    return null;
  }

  // First-time users: redirect to onboarding if not completed
  if (
    session?.user?.id &&
    onboardingCompleted === false &&
    !isOnboardingRoute
  ) {
    router.replace('/onboarding');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Setting up your account...</div>
      </div>
    );
  }

  // Still checking onboarding status for non-onboarding routes
  if (
    session?.user?.id &&
    onboardingCompleted === null &&
    !isOnboardingRoute
  ) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  const isActive = (path: string) => pathname?.startsWith(path);

  if (isOnboardingRoute || isDashboardHomeRoute) {
    return <main>{children}</main>;
  }

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
                  onClick={() => signOut({ callbackUrl: '/login' })}
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
