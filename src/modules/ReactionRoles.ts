import { Module, type IsEnabledContext, type ModuleError } from '@kbotdev/plugin-modules';
import type { Piece, Result } from '@sapphire/framework';
import { Guild } from '../models/Guild';

export class ReactionRolesModule extends Module {
    public constructor(context: Module.LoaderContext, options: Piece.Options) {
        super(context, {
            ...options,
            name: 'ReactionRoles',
            fullName: 'Reaction Roles',
            description: 'Create and manage role selection menus for server members',
            enabled: true
        });
    }

    public async IsEnabled(context: IsEnabledContext): Promise<Result<Boolean, ModuleError>> {
        if (!context.guild) return this.ok(false);
        const guildData = await Guild.findOne({ guildId: context.guild.id });
        const isEnabled = guildData?.modules?.reactionRoles ?? true;
        return this.ok(isEnabled);
    }
}

declare module '@kbotdev/plugin-modules' {
    interface Modules {
        ReactionRoles: true;
    }
}