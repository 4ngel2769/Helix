import { Module, type IsEnabledContext, type ModuleError } from '@kbotdev/plugin-modules';
import type { Piece, Result } from '@sapphire/framework';
import { GuildConfigService } from '../lib/services/GuildConfigService';

export class LevelingModule extends Module {
    public constructor(context: Module.LoaderContext, options: Piece.Options) {
        super(context, {
            ...options,
            name: 'Leveling',
            fullName: 'Leveling',
            description: 'XP and level tracking system',
            enabled: true
        });
    }

    public async isEnabled(context: IsEnabledContext): Promise<Result<boolean, ModuleError>> {
        const isEnabled = await GuildConfigService.resolveModuleState({
            guildId: context.guild?.id,
            moduleKey: 'leveling',
            moduleDisplayName: 'Leveling',
            defaultWhenNoGuild: false,
            defaultWhenMissing: false,
            defaultOnError: true,
            logger: this.container.logger
        });

        return this.ok(isEnabled);
    }
}

declare module '@kbotdev/plugin-modules' {
    interface Modules {
        Leveling: true;
    }
}
