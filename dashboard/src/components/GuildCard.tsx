'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Guild } from '@/contexts/UserContext';
import { useUser } from '@/contexts/UserContext';

interface GuildCardProps {
  guild: Guild;
}

const GuildCard = ({ guild }: GuildCardProps) => {
  const { clientId } = useUser();

  const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&guild_id=${guild.id}&permissions=8&scope=bot%20applications.commands`;

  return (
    <div className="bg-gray-800 rounded-lg p-4 flex flex-col items-center text-center">
      <Image
        src={guild.icon || 'https://cdn.discordapp.com/embed/avatars/0.png'}
        alt={guild.name}
        width={64}
        height={64}
        className={`rounded-full mb-4 ${!guild.hasBot ? 'grayscale' : ''}`}
      />
      <h3 className="font-bold mb-2">{guild.name}</h3>
      {guild.hasBot ? (
        <Link
          href={`/dashboard/guilds/${guild.id}`}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded w-full"
        >
          Manage
        </Link>
      ) : (
        <a
          href={inviteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full"
        >
          Add Bot
        </a>
      )}
    </div>
  );
};

export default GuildCard;
