'use client';

import { useUser } from '@/contexts/UserContext';
import GuildCard from './GuildCard';

const GuildList = () => {
  const { guilds, loading } = useUser();

  if (loading) {
    return <div>Loading servers...</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {guilds.map((guild) => (
        <GuildCard key={guild.id} guild={guild} />
      ))}
    </div>
  );
};

export default GuildList;
