import './globals.css';
import type { Metadata } from 'next/metadata';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Singr Karaoke Connect - Modern Karaoke Management Platform',
  description: 'Transform your karaoke experience with Singr Karaoke Connect. Direct OpenKJ integration, mobile app for singers, and modern management tools.',
  keywords: 'karaoke, OpenKJ, song requests, karaoke management, karaoke app, venue management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
          {children}
        </div>
        <Toaster />
      </body>
    </html>
  );
}