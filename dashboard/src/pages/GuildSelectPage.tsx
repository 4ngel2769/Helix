import { useState } from 'react';
import { Search, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useGuilds } from '@/hooks/useGuilds';
import { getGuildIconUrl } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export default function GuildSelectPage() {
  const { guilds, isLoading } = useGuilds();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBotPresent, setFilterBotPresent] = useState(true);
  const navigate = useNavigate();

  const filteredGuilds = guilds.filter((guild) => {
    const matchesSearch = guild.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = !filterBotPresent || guild.botPresent;
    return matchesSearch && matchesFilter;
  });

  const guildWithBot = guilds.filter((g) => g.botPresent);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-helix" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Select a Server</h1>
        <p className="text-muted-foreground">
          Choose a server to configure Helix settings
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="text-2xl font-bold text-foreground">{guilds.length}</div>
          <div className="text-sm text-muted-foreground">Total Servers</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="text-2xl font-bold text-green-600">{guildWithBot.length}</div>
          <div className="text-sm text-muted-foreground">Servers with Helix</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="text-2xl font-bold text-orange-600">
            {guilds.length - guildWithBot.length}
          </div>
          <div className="text-sm text-muted-foreground">Servers without Helix</div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search servers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-helix"
          />
        </div>
        <button
          onClick={() => setFilterBotPresent(!filterBotPresent)}
          className={`px-4 py-2 rounded-lg border transition-colors ${
            filterBotPresent
              ? 'bg-helix text-white border-helix'
              : 'bg-card border-border hover:bg-accent'
          }`}
        >
          {filterBotPresent ? 'Showing: With Helix' : 'Showing: All Servers'}
        </button>
      </div>

      {/* Guilds Grid */}
      {filteredGuilds.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground">No servers found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGuilds.map((guild) => (
            <div
              key={guild.id}
              className="bg-card border border-border rounded-lg p-6 hover:border-helix transition-colors"
            >
              <div className="flex items-start gap-4 mb-4">
                <img
                  src={getGuildIconUrl(guild)}
                  alt={guild.name}
                  className="w-16 h-16 rounded-full"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect width="64" height="64" fill="%233b66ff"/%3E%3C/svg%3E';
                  }}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate">{guild.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {guild.botPresent ? (
                      <span className="flex items-center gap-1 text-sm text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        Helix is here
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-sm text-orange-600">
                        <XCircle className="w-4 h-4" />
                        Helix not added
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {guild.botPresent ? (
                <button
                  onClick={() => navigate(`/dashboard/guild/${guild.id}`)}
                  className="w-full px-4 py-2 bg-helix text-white rounded-lg hover:bg-helix-dark transition-colors"
                >
                  Configure
                </button>
              ) : (
                <a
                  href={`https://discord.com/api/oauth2/authorize?client_id=${import.meta.env.VITE_DISCORD_CLIENT_ID}&permissions=8&guild_id=${guild.id}&scope=bot%20applications.commands`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full px-4 py-2 bg-secondary text-secondary-foreground text-center rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  Invite Helix
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
