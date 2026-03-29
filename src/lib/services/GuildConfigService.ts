import { getAllModuleKeys, getModuleConfig } from '../../config/modules';
import { Guild, type IGuild } from '../../models/Guild';

interface ResolveModuleStateOptions {
    guildId: string | null | undefined;
    moduleKey: string;
    moduleDisplayName?: string;
    defaultWhenNoGuild: boolean;
    defaultWhenMissing: boolean;
    defaultOnError: boolean;
    logger?: { error: (...args: unknown[]) => void };
}

export class GuildConfigService {
    public static buildDefaultModules(): Record<string, boolean> {
        const modules: Record<string, boolean> = {};

        getAllModuleKeys().forEach((moduleKey) => {
            const moduleConfig = getModuleConfig(moduleKey);
            if (moduleConfig) {
                modules[moduleKey] = moduleConfig.defaultEnabled;
            }
        });

        return modules;
    }

    public static createDefaultGuildData(guildId: string): { guildId: string; modules: Record<string, boolean> } {
        return {
            guildId,
            modules: this.buildDefaultModules()
        };
    }

    public static async getOrCreateGuildData(guildId: string): Promise<IGuild> {
        const guildData = await Guild.findOneAndUpdate(
            { guildId },
            { $setOnInsert: this.createDefaultGuildData(guildId) },
            { upsert: true, new: true }
        );

        if (!guildData) {
            throw new Error(`Failed to load or create guild data for ${guildId}`);
        }

        return guildData;
    }

    public static async resolveModuleState({
        guildId,
        moduleKey,
        moduleDisplayName,
        defaultWhenNoGuild,
        defaultWhenMissing,
        defaultOnError,
        logger
    }: ResolveModuleStateOptions): Promise<boolean> {
        if (!guildId) {
            return defaultWhenNoGuild;
        }

        try {
            const guildData = await Guild.findOne({ guildId });
            return guildData?.modules?.[moduleKey] ?? defaultWhenMissing;
        } catch (error) {
            logger?.error(`Error checking ${moduleDisplayName ?? moduleKey} module status:`, error);
            return defaultOnError;
        }
    }
}
