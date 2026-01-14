import { Module, type IsEnabledContext, type ModuleError } from '@kbotdev/plugin-modules';
import type { Piece, Result } from '@sapphire/framework';
import { Guild } from '../models/Guild';
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
        try {
            if (!context.guild) return this.ok(false);
            const guildData = await Guild.findOne({ guildId: context.guild.id });
            const isEnabled = guildData?.isVerificationModule ?? false;
            return this.ok(isEnabled);
        } catch (error) {
            this.container.logger.error('Error checking Verification module status:', error);
            return this.ok(false); // Default to disabled on error
        }
    }
}

declare module '@kbotdev/plugin-modules' {
    interface Modules {
        Verification: true;
    }
} 