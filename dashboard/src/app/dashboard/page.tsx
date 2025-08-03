'use client';

import { useUser } from '@/contexts/UserContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import GuildList from '@/components/GuildList';

const DashboardPage = () => {
  const { isAuthenticated, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return null; // Or a message telling to log in
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Your Servers</h1>
      <GuildList />
    </div>
  );
};

export default DashboardPage;
