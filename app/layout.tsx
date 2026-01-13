import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { SessionProvider } from 'next-auth/react';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'DailyPost - AI-Powered Content Creation',
  description: 'Generate LinkedIn and X posts in your unique voice, powered by AI. Wake up to fresh, on-brand content suggestions every day.',
  keywords: ['AI', 'content creation', 'LinkedIn', 'Twitter', 'X', 'social media', 'automation'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
