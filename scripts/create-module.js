const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

class ModuleGenerator {
    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        this.srcDir = path.join(__dirname, '..', 'src');
        this.moduleData = {};
    }

    async question(prompt) {
        return new Promise((resolve) => {
            this.rl.question(prompt, resolve);
        });
    }

    async collectModuleInfo() {
        console.log('🚀 Helix Module Generator\n');
        console.log('This will create a new command module with all necessary files.\n');

        // Module name
        this.moduleData.name = await this.question('Module name (e.g., "Music", "Economy"): ');
        if (!this.moduleData.name.trim()) {
            throw new Error('Module name is required');
        }
        this.moduleData.name = this.moduleData.name.trim();

        // Clean name for file/folder names
        this.moduleData.cleanName = this.moduleData.name.replace(/\s+/g, '');
        this.moduleData.lowerName = this.moduleData.cleanName.toLowerCase();

        // Description
        this.moduleData.description = await this.question('Module description: ');
        
        // Target audience
        console.log('\nWho can use this module?');
        console.log('1. Everyone (users)');
        console.log('2. Moderators');
        console.log('3. Administrators');
        console.log('4. Bot Developers only');
        
        const audience = await this.question('Choose (1-4): ');
        const audiences = {
            '1': { name: 'users', precondition: null, permissions: [] },
            '2': { name: 'moderators', precondition: 'ModeratorOnly', permissions: ['ModerateMembers'] },
            '3': { name: 'administrators', precondition: 'GuildOnly', permissions: ['Administrator'] },
            '4': { name: 'developers', precondition: 'OwnerOnly', permissions: [] }
        };
        
        if (!audiences[audience]) {
            throw new Error('Invalid audience selection');
        }
        this.moduleData.audience = audiences[audience];

        // Default enabled state
        const defaultEnabled = await this.question('Enable by default? (y/n): ');
        this.moduleData.defaultEnabled = defaultEnabled.toLowerCase() === 'y';

        // Emoji for the module
        this.moduleData.emoji = await this.question('Emoji for module (Unicode or Discord emoji ID): ') || '⚙️';

        // Required permissions
        if (this.moduleData.audience.permissions.length > 0) {
            console.log(`\nRequired permissions: ${this.moduleData.audience.permissions.join(', ')}`);
        }

        // Create sample command
        const createSample = await this.question('Create a sample command? (y/n): ');
        this.moduleData.createSample = createSample.toLowerCase() === 'y';

        if (this.moduleData.createSample) {
            this.moduleData.sampleCommandName = await this.question('Sample command name: ') || 'example';
            this.moduleData.sampleCommandDesc = await this.question('Sample command description: ') || 'Example command for this module';
        }

        console.log('\n📋 Module Summary:');
        console.log(`Name: ${this.moduleData.name}`);
        console.log(`Description: ${this.moduleData.description}`);
        console.log(`Audience: ${this.moduleData.audience.name}`);
        console.log(`Default Enabled: ${this.moduleData.defaultEnabled}`);
        console.log(`Emoji: ${this.moduleData.emoji}`);
        if (this.moduleData.createSample) {
            console.log(`Sample Command: ${this.moduleData.sampleCommandName}`);
        }

        const confirm = await this.question('\nProceed with creation? (y/n): ');
        if (confirm.toLowerCase() !== 'y') {
            throw new Error('Generation cancelled');
        }
    }

    async createDirectories() {
        const dirs = [
            path.join(this.srcDir, 'modules'),
            path.join(this.srcDir, 'commands', this.moduleData.cleanName)
        ];

        for (const dir of dirs) {
            try {
                await fs.mkdir(dir, { recursive: true });
            } catch (error) {
                if (error.code !== 'EEXIST') throw error;
            }
        }
    }

    generateModuleFile() {
        const permissions = this.moduleData.audience.permissions.length > 0 
            ? `\n    public requiredPermissions = [\n        ${this.moduleData.audience.permissions.map(p => `PermissionFlagsBits.${p}`).join(',\n        ')}\n    ];`
            : '';

        return `import { Module, type IsEnabledContext, type ModuleError } from '@kbotdev/plugin-modules';
import type { Piece, Result } from '@sapphire/framework';
import { Guild } from '../models/Guild';${this.moduleData.audience.permissions.length > 0 ? `\nimport { PermissionFlagsBits } from 'discord.js';` : ''}

export class ${this.moduleData.cleanName}Module extends Module {
    public constructor(context: Module.LoaderContext, options: Piece.Options) {
        super(context, {
            ...options,
            name: '${this.moduleData.cleanName}',
            fullName: '${this.moduleData.name}',
            description: '${this.moduleData.description}',
            enabled: true
        });
    }${permissions}

    public async IsEnabled(context: IsEnabledContext): Promise<Result<Boolean, ModuleError>> {
        if (!context.guild) return this.ok(false);
        const guildData = await Guild.findOne({ guildId: context.guild.id });
        const isEnabled = guildData?.modules?.${this.moduleData.lowerName} ?? ${this.moduleData.defaultEnabled};
        return this.ok(isEnabled);
    }
}

declare module '@kbotdev/plugin-modules' {
    interface Modules {
        ${this.moduleData.cleanName}: true;
    }
}
`;
    }

    generateSampleCommand() {
        if (!this.moduleData.createSample) return null;

        const preconditions = this.moduleData.audience.precondition 
            ? `\n    preconditions: ['${this.moduleData.audience.precondition}']` 
            : '';

        const permissions = this.moduleData.audience.permissions.length > 0
            ? `\n                .setDefaultMemberPermissions(${this.moduleData.audience.permissions.map(p => `PermissionFlagsBits.${p}`).join(' | ')})`
            : '';

        return `import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ModuleCommand } from '@kbotdev/plugin-modules';
import type { ${this.moduleData.cleanName}Module } from '../../modules/${this.moduleData.cleanName}';
import { EmbedBuilder, MessageFlags${this.moduleData.audience.permissions.length > 0 ? ', PermissionFlagsBits' : ''} } from 'discord.js';
import config from '../../config';

@ApplyOptions<Command.Options>({
    name: '${this.moduleData.sampleCommandName}',
    description: '${this.moduleData.sampleCommandDesc}'${preconditions}
})
export class ${this.moduleData.sampleCommandName.charAt(0).toUpperCase() + this.moduleData.sampleCommandName.slice(1)}Command extends ModuleCommand<${this.moduleData.cleanName}Module> {
    public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
        super(context, {
            ...options,
            module: '${this.moduleData.cleanName}',
            description: '${this.moduleData.sampleCommandDesc}',
            enabled: true
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName('${this.moduleData.sampleCommandName}')
                .setDescription('${this.moduleData.sampleCommandDesc}')${permissions}
                .addStringOption((option) =>
                    option
                        .setName('input')
                        .setDescription('Example input parameter')
                        .setRequired(false)
                )
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
        const input = interaction.options.getString('input') || 'No input provided';

        const embed = new EmbedBuilder()
            .setColor(config.bot.embedColor.default)
            .setTitle(\`\${this.moduleData.name} - \${this.moduleData.sampleCommandName.charAt(0).toUpperCase() + this.moduleData.sampleCommandName.slice(1)}\`)
            .setDescription(\`This is a sample command for the \${this.moduleData.name} module.\`)
            .addFields({
                name: 'Your Input',
                value: \`\\\`\\\`\\\`\\n\${input}\\n\\\`\\\`\\\`\`,
                inline: false
            })
            .setTimestamp();

        return interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral
        });
    }
}
`;
    }

    async updateModulesConfig() {
        const configPath = path.join(this.srcDir, 'config', 'modules.ts');
        
        try {
            let content = await fs.readFile(configPath, 'utf8');
            
            // Find the moduleConfigs object and add new module
            const newModuleConfig = `    ${this.moduleData.lowerName}: {
        name: '${this.moduleData.name}',
        description: '${this.moduleData.description}',
        emoji: '${this.moduleData.emoji}',
        defaultEnabled: ${this.moduleData.defaultEnabled}${this.moduleData.audience.permissions.length > 0 ? `,\n        requiredPermissions: [${this.moduleData.audience.permissions.map(p => `PermissionsBitField.Flags.${p}`).join(', ')}]` : ''}
    },`;

            // Insert before the closing brace of moduleConfigs
            content = content.replace(
                /(\} as const;)/,
                `${newModuleConfig}\n$1`
            );

            await fs.writeFile(configPath, content);
            console.log('✅ Updated modules config');
        } catch (error) {
            console.warn('⚠️ Could not update modules config automatically:', error.message);
            console.log('\n📝 Please manually add this to your modules.ts config:');
            console.log(`\n${this.moduleData.lowerName}: {
    name: '${this.moduleData.name}',
    description: '${this.moduleData.description}',
    emoji: '${this.moduleData.emoji}',
    defaultEnabled: ${this.moduleData.defaultEnabled}${this.moduleData.audience.permissions.length > 0 ? `,\n    requiredPermissions: [${this.moduleData.audience.permissions.map(p => `PermissionsBitField.Flags.${p}`).join(', ')}]` : ''}
},`);
        }
    }

    async updateGuildModel() {
        const modelPath = path.join(this.srcDir, 'models', 'Guild.ts');
        
        try {
            let content = await fs.readFile(modelPath, 'utf8');
            
            // Check if the field already exists
            if (content.includes(`is${this.moduleData.cleanName}Module`)) {
                console.log('⚠️ Module field already exists in Guild model');
                return;
            }

            // Add to LegacyModuleFlags interface if it doesn't exist
            const legacyFlag = `  is${this.moduleData.cleanName}Module?: boolean;`;
            content = content.replace(
                /(interface LegacyModuleFlags \{[^}]*)/,
                `$1\n${legacyFlag}`
            );

            // Add to schema
            const schemaField = `  is${this.moduleData.cleanName}Module: { type: Boolean, default: ${this.moduleData.defaultEnabled} },`;
            content = content.replace(
                /(\/\/ Legacy module flags.*?\n[^}]*)/s,
                `$1\n${schemaField}`
            );

            // Add to pre-save middleware sync logic
            const syncToNew = `  if (this.isModified('is${this.moduleData.cleanName}Module')) {
    this.modules.${this.moduleData.lowerName} = this.is${this.moduleData.cleanName}Module ?? ${this.moduleData.defaultEnabled};
  }`;

            const syncToLegacy = `  if (this.isModified('modules.${this.moduleData.lowerName}')) {
    this.is${this.moduleData.cleanName}Module = this.modules.${this.moduleData.lowerName};
  }`;

            content = content.replace(
                /(\/\/ Sync from legacy to new system[^]*?)(  \/\/ Sync from new system to legacy)/,
                `$1${syncToNew}\n  \n$2`
            );

            content = content.replace(
                /(\/\/ Sync from new system to legacy[^]*?)(  next\(\);)/,
                `$1${syncToLegacy}\n  \n$2`
            );

            await fs.writeFile(modelPath, content);
            console.log('✅ Updated Guild model');
        } catch (error) {
            console.warn('⚠️ Could not update Guild model automatically:', error.message);
            console.log('\n📝 Please manually add this to your Guild model:');
            console.log(`\n// In LegacyModuleFlags interface:\nis${this.moduleData.cleanName}Module?: boolean;\n`);
            console.log(`// In schema:\nis${this.moduleData.cleanName}Module: { type: Boolean, default: ${this.moduleData.defaultEnabled} },\n`);
        }
    }

    async createPrecondition() {
        if (!this.moduleData.audience.precondition || this.moduleData.audience.precondition === 'GuildOnly') {
            return; // These already exist
        }

        if (this.moduleData.audience.precondition === 'OwnerOnly' || this.moduleData.audience.precondition === 'ModeratorOnly') {
            return; // These already exist based on your files
        }

        // Create custom precondition if needed
        const preconditionPath = path.join(this.srcDir, 'preconditions', `${this.moduleData.audience.precondition}.ts`);
        
        try {
            await fs.access(preconditionPath);
            console.log('✅ Precondition already exists');
        } catch {
            // Create precondition file
            const preconditionContent = this.generatePrecondition();
            await fs.writeFile(preconditionPath, preconditionContent);
            console.log(`✅ Created precondition: ${this.moduleData.audience.precondition}`);
        }
    }

    generatePrecondition() {
        return `import { Precondition } from '@sapphire/framework';
import type { Message } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import { GuildMember, PermissionFlagsBits } from 'discord.js';

export class ${this.moduleData.audience.precondition}Precondition extends Precondition {
    public override async messageRun(message: Message) {
        return this.checkPermissions(message.member);
    }

    public override async chatInputRun(interaction: ChatInputCommandInteraction) {
        return this.checkPermissions(interaction.member as GuildMember);
    }

    private checkPermissions(member: GuildMember | null) {
        if (!member) return this.error({ message: 'This command can only be used in a server!' });
        
        const hasPermission = member.permissions.has([${this.moduleData.audience.permissions.map(p => `PermissionFlagsBits.${p}`).join(', ')}]);
        
        return hasPermission
            ? this.ok()
            : this.error({ message: 'You do not have permission to use this command!' });
    }
}

declare module '@sapphire/framework' {
    interface Preconditions {
        ${this.moduleData.audience.precondition}: never;
    }
}
`;
    }

    async writeFiles() {
        const files = [
            {
                path: path.join(this.srcDir, 'modules', `${this.moduleData.cleanName}.ts`),
                content: this.generateModuleFile()
            }
        ];

        if (this.moduleData.createSample) {
            files.push({
                path: path.join(this.srcDir, 'commands', this.moduleData.cleanName, `${this.moduleData.sampleCommandName}.ts`),
                content: this.generateSampleCommand()
            });
        }

        for (const file of files) {
            await fs.writeFile(file.path, file.content);
            console.log(`✅ Created: ${path.relative(this.srcDir, file.path)}`);
        }
    }

    async generateREADME() {
        const readmePath = path.join(this.srcDir, 'commands', this.moduleData.cleanName, 'README.md');
        
        const readmeContent = `# ${this.moduleData.name} Module

${this.moduleData.description}

## Configuration

- **Target Audience**: ${this.moduleData.audience.name}
- **Default Enabled**: ${this.moduleData.defaultEnabled ? 'Yes' : 'No'}
- **Required Permissions**: ${this.moduleData.audience.permissions.length > 0 ? this.moduleData.audience.permissions.join(', ') : 'None'}

## Commands

${this.moduleData.createSample ? `### \`/${this.moduleData.sampleCommandName}\`
${this.moduleData.sampleCommandDesc}

**Usage**: \`/${this.moduleData.sampleCommandName} [input]\`
**Parameters**:
- \`input\` (optional): Example input parameter` : 'No commands created yet. Add your commands to this directory.'}

## Setup

1. Enable the module in your server using \`/configmodule\`
2. ${this.moduleData.audience.permissions.length > 0 ? `Ensure the bot has the required permissions: ${this.moduleData.audience.permissions.join(', ')}` : 'No additional setup required'}

## Development

To add new commands to this module:
1. Create a new file in \`src/commands/${this.moduleData.cleanName}/\`
2. Extend \`ModuleCommand<${this.moduleData.cleanName}Module>\`
3. Set the module property to \`'${this.moduleData.cleanName}'\`
`;

        await fs.writeFile(readmePath, readmeContent);
        console.log(`✅ Created: commands/${this.moduleData.cleanName}/README.md`);
    }

    async run() {
        try {
            await this.collectModuleInfo();
            await this.createDirectories();
            await this.writeFiles();
            await this.createPrecondition();
            await this.updateModulesConfig();
            await this.updateGuildModel();
            await this.generateREADME();

            console.log('\n🎉 Module created successfully!');
            console.log('\n  Next Steps:');
            console.log('1. Run `npm run build` to compile the TypeScript');
            console.log('2. Restart your bot to load the new module');
            console.log('3. Use `/configmodule` to enable the module in your server');
            if (this.moduleData.createSample) {
                console.log(`4. Test the sample command: \`/${this.moduleData.sampleCommandName}\``);
            }
            console.log(`5. Add more commands to src/commands/${this.moduleData.cleanName}/`);

        } catch (error) {
            console.error('\n❌ Error:', error.message);
        } finally {
            this.rl.close();
        }
    }
}

const generator = new ModuleGenerator();
generator.run();
