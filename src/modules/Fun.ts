import { Module, type IsEnabledContext, type ModuleError } from '@kbotdev/plugin-modules';
import type { Piece, Result } from '@sapphire/framework';
import { GuildConfigService } from '../lib/services/GuildConfigService';

export class FunModule extends Module {
    public constructor(context: Module.LoaderContext, options: Piece.Options) {
        super(context, {
            ...options,
            name: 'Fun',
            fullName: 'Fun Commands',
            description: 'Entertainment and fun commands',
            enabled: true
        });
    }

    public async IsEnabled(context: IsEnabledContext): Promise<Result<Boolean, ModuleError>> {
        const isEnabled = await GuildConfigService.resolveModuleState({
            guildId: context.guild?.id,
            moduleKey: 'fun',
            moduleDisplayName: 'Fun',
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
        Fun: true;
    }
} 