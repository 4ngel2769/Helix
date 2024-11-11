import { Module, type IsEnabledContext, type ModuleError } from '@kbotdev/plugin-modules';
import type { Piece, Result } from '@sapphire/framework';
import { Guild } from '../models/Guild';

export class AdministrationModule extends Module {
    public constructor(context: Module.LoaderContext, options: Piece.Options) {
        super(context, {
            ...options,
            name: 'Administration',
            fullName: 'Administration Commands',
            description: 'Server administration and management commands',
            enabled: true
        });
    }

    public async IsEnabled(context: IsEnabledContext): Promise<Result<Boolean, ModuleError>> {
        if (!context.guild) return this.ok(false);
        const guildData = await Guild.findOne({ guildId: context.guild.id });
        const isEnabled = guildData?.isAdministration ?? true;
        return this.ok(isEnabled);
    }
}

declare module '@kbotdev/plugin-modules' {
    interface Modules {
        Administration: true;
    }
} 