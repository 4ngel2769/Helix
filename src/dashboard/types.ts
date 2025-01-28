import type { 
    OAuth2Guild, 
    APIUser, 
    APIGuild
} from 'discord.js';
import type { AuthData } from '@sapphire/plugin-api';

export interface DiscordUser extends APIUser {
    guilds?: OAuth2Guild[];
    accessToken?: string;
    refreshToken?: string;
}

export interface Server extends Omit<APIGuild, 'permissions'> {
    permissions?: string;
    hasBot: boolean;
    icon: string;
}

declare module '@sapphire/plugin-api' {
    interface ApiRequest {
        auth?: AuthData | null;
    }
} 