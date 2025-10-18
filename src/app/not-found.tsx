'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home page after a brief delay
    const timeout = setTimeout(() => {
      router.push('/');
    }, 2000);

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--color-bg-primary)] via-blue-900 to-black flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-[var(--color-text-primary)] mb-4">404</h1>
        <p className="text-xl text-[var(--color-text-secondary)] mb-2">Page not found</p>
        <p className="text-sm text-[var(--color-text-tertiary)]">Redirecting to dashboard...</p>
      </div>
    </div>
  );
}