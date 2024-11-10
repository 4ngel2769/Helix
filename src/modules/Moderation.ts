import { Module, type IsEnabledContext, type ModuleError } from '@kbotdev/plugin-modules';
import type { Piece, Result } from '@sapphire/framework';
import { Guild } from '../models/Guild';

export class ModerationModule extends Module {
    public constructor(context: Module.LoaderContext, options: Piece.Options) {
        super(context, {
            ...options,
            fullName: 'Moderation Commands',
            description: 'Commands for server moderation',
            enabled: true
        });
    }

    public async IsEnabled(context: IsEnabledContext): Promise<Result<Boolean, ModuleError>> {
        // Check if moderation is enabled for this guild
        if (!context.guild) return this.ok(true); // Default to enabled if no guild
        
        const guildData = await Guild.findOne({ guildId: context.guild.id });
        const isEnabled = guildData?.isModeration ?? true; // Default to true if not set
        
        return this.ok(isEnabled);
    }
}

declare module '@kbotdev/plugin-modules' {
    interface Modules {
        ModerationModule: true;
    }
} 