import { Module, type IsEnabledContext, type ModuleError } from '@kbotdev/plugin-modules';
import type { Piece, Result } from '@sapphire/framework';
import { Guild } from '../models/Guild';

export class WelcomingModule extends Module {
    public constructor(context: Module.LoaderContext, options: Piece.Options) {
        super(context, {
            ...options,
            name: 'Welcoming',
            fullName: 'Welcome System',
            description: 'Welcome message and configuration commands',
            enabled: true
        });
    }

    public async IsEnabled(context: IsEnabledContext): Promise<Result<Boolean, ModuleError>> {
        if (!context.guild) return this.ok(false);
        const guildData = await Guild.findOne({ guildId: context.guild.id });
        const isEnabled = guildData?.isWelcomingModule ?? false;
        return this.ok(isEnabled);
    }
}

declare module '@kbotdev/plugin-modules' {
    interface Modules {
        Welcoming: true;
    }
} 