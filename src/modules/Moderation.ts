import { Module, type IsEnabledContext, type ModuleError } from '@kbotdev/plugin-modules';
import type { Piece, Result } from '@sapphire/framework';
import { GuildConfigService } from '../lib/services/GuildConfigService';

export class ModerationModule extends Module {
    public constructor(context: Module.LoaderContext, options: Piece.Options) {
        super(context, {
            ...options,
            name: 'Moderation',
            fullName: 'Moderation Commands',
            description: 'Commands for server moderation',
            enabled: true
        });
    }

    public async IsEnabled(context: IsEnabledContext): Promise<Result<Boolean, ModuleError>> {
        const isEnabled = await GuildConfigService.resolveModuleState({
            guildId: context.guild?.id,
            moduleKey: 'moderation',
            moduleDisplayName: 'Moderation',
            defaultWhenNoGuild: true,
            defaultWhenMissing: true,
            defaultOnError: true,
            logger: this.container.logger
        });

        return this.ok(isEnabled);
    }
}

declare module '@kbotdev/plugin-modules' {
    interface Modules {
        Moderation: true;
    }
} 