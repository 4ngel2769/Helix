import { Module, type IsEnabledContext, type ModuleError } from '@kbotdev/plugin-modules';
import type { Piece, Result } from '@sapphire/framework';
import { GuildConfigService } from '../lib/services/GuildConfigService';
import { PermissionFlagsBits } from 'discord.js';

export class VerificationModule extends Module {
    public constructor(context: Module.LoaderContext, options: Piece.Options) {
        super(context, {
            ...options,
            name: 'Verification',
            fullName: 'Verification System',
            description: 'Server verification system and configuration',
            enabled: true
        });
    }

    public requiredPermissions = [
        PermissionFlagsBits.Administrator,
        PermissionFlagsBits.ManageGuild,
        PermissionFlagsBits.ModerateMembers
    ];

    public async IsEnabled(context: IsEnabledContext): Promise<Result<Boolean, ModuleError>> {
        const isEnabled = await GuildConfigService.resolveModuleState({
            guildId: context.guild?.id,
            moduleKey: 'verification',
            moduleDisplayName: 'Verification',
            defaultWhenNoGuild: false,
            defaultWhenMissing: false,
            defaultOnError: false,
            logger: this.container.logger
        });

        return this.ok(isEnabled);
    }
}

declare module '@kbotdev/plugin-modules' {
    interface Modules {
        Verification: true;
    }
} 