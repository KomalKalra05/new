'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { isAuthenticated, signOut } from '@/lib/actions/auth.action';
import { useRouter } from 'next/navigation';

const RootLayout = ({ children }: { children: ReactNode }) => {
  const [auth, setAuth] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      const res = await isAuthenticated();
      setAuth(res);
      if (!res) {
        router.push('/sign-in');
      }
    }
    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    await signOut();
    router.push('/sign-in');
  };

  return (
    <div className="root-layout">
      <nav className="flex justify-between items-center p-4">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="logo" height={32} width={38} />
          <h2 className="text-primary-100">MockLy</h2>
        </Link>
        {auth && (
          <button
            onClick={handleLogout}
            className="bg-gradient-to-r from-purple-900 to-blue-950 text-white font-semibold px-4 py-2 rounded-full shadow-md hover:opacity-90 transition"
          >
            Logout
          </button>
        )}
      </nav>
      {children}
    </div>
  );
};

export default RootLayout;
