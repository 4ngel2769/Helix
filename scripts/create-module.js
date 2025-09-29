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
        console.log('🚀 Helix Advanced Module Generator\n');
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

        // Create sample command
        const createSample = await this.question('Create a sample command? (y/n): ');
        this.moduleData.createSample = createSample.toLowerCase() === 'y';

        if (this.moduleData.createSample) {
            await this.collectCommandInfo();
        }

        console.log('\n📋 Module Summary:');
        console.log(`Name: ${this.moduleData.name}`);
        console.log(`Description: ${this.moduleData.description}`);
        console.log(`Audience: ${this.moduleData.audience.name}`);
        console.log(`Default Enabled: ${this.moduleData.defaultEnabled}`);
        console.log(`Emoji: ${this.moduleData.emoji}`);
        if (this.moduleData.createSample) {
            console.log(`Sample Command: ${this.moduleData.command.name}`);
            console.log(`Command Type: ${this.moduleData.command.type}`);
            if (this.moduleData.command.subcommands.length > 0) {
                console.log(`Subcommands: ${this.moduleData.command.subcommands.map(s => s.name).join(', ')}`);
            }
        }

        const confirm = await this.question('\nProceed with creation? (y/n): ');
        if (confirm.toLowerCase() !== 'y') {
            throw new Error('Generation cancelled');
        }
    }

async scanExistingCommands() {
    const commandsDir = path.join(this.srcDir, 'commands');
    const existingCommands = new Set();
    
    try {
        const dirs = await fs.readdir(commandsDir);
        
        for (const dir of dirs) {
            const dirPath = path.join(commandsDir, dir);
            const stat = await fs.lstat(dirPath);
            
            if (stat.isDirectory()) {
                const files = await fs.readdir(dirPath);
                for (const file of files) {
                    if (file.endsWith('.ts') && !file.includes('README')) {
                        const commandName = file.replace('.ts', '');
                        existingCommands.add(commandName.toLowerCase());
                    }
                }
            }
        }
    } catch (error) {
        console.warn('Could not scan existing commands:', error.message);
    }
    
    return existingCommands;
}

// Update collectCommandInfo method
async collectCommandInfo() {
    console.log('\n📝 Command Configuration');
    
    // Scan for existing commands
    const existingCommands = await this.scanExistingCommands();
    
    let commandName;
    while (true) {
        commandName = await this.question('Command name: ') || 'example';
        
        if (existingCommands.has(commandName.toLowerCase())) {
            console.log(`❌ Command "${commandName}" already exists. Please choose a different name.`);
        } else {
            break;
        }
    }
    
    this.moduleData.command = {
        name: commandName,
        description: await this.question('Command description: ') || 'Example command',
        type: 'slash',
        contextMenus: [],
        subcommands: [],
        options: [],
        modals: false
    };

        // Command type selection
        console.log('\nCommand Types:');
        console.log('1. Slash command only');
        console.log('2. Text (prefix) command only');
        console.log('3. Both slash and text commands');
        console.log('4. Context menu only');
        console.log('5. Slash + Context menus');
        
        const cmdType = await this.question('Choose command type (1-5): ');
        const cmdTypes = {
            '1': 'slash',
            '2': 'text',
            '3': 'both',
            '4': 'context',
            '5': 'slash-context'
        };
        
        this.moduleData.command.type = cmdTypes[cmdType] || 'slash';

        // Context menus
        if (this.moduleData.command.type === 'context' || this.moduleData.command.type === 'slash-context') {
            const userContext = await this.question('Add user context menu? (y/n): ');
            const messageContext = await this.question('Add message context menu? (y/n): ');
            
            if (userContext.toLowerCase() === 'y') {
                this.moduleData.command.contextMenus.push('user');
            }
            if (messageContext.toLowerCase() === 'y') {
                this.moduleData.command.contextMenus.push('message');
            }
        }

        // Subcommands
        if (this.moduleData.command.type.includes('slash')) {
            const hasSubcommands = await this.question('Does this command have subcommands? (y/n): ');
            
            if (hasSubcommands.toLowerCase() === 'y') {
                await this.collectSubcommands();
            } else {
                await this.collectOptions();
            }
        }

        // Modal support
        if (this.moduleData.command.type.includes('slash')) {
            const hasModal = await this.question('Does this command use modals? (y/n): ');
            this.moduleData.command.modals = hasModal.toLowerCase() === 'y';
        }
    }

    async collectSubcommands() {
        console.log('\n🔧 Adding Subcommands');
        
        while (true) {
            const subName = await this.question('Subcommand name (or "done" to finish): ');
            if (subName.toLowerCase() === 'done') break;
            
            const subDesc = await this.question(`Description for "${subName}": `);
            
            const subcommand = {
                name: subName,
                description: subDesc,
                options: []
            };

            // Add options to subcommand
            console.log(`\nAdding options to subcommand "${subName}"`);
            await this.collectOptionsForSubcommand(subcommand);
            
            this.moduleData.command.subcommands.push(subcommand);
        }
    }

    async collectOptionsForSubcommand(subcommand) {
        while (true) {
            const optName = await this.question('Option name (or "done" to finish): ');
            if (optName.toLowerCase() === 'done') break;
            
            const option = await this.createOption(optName);
            subcommand.options.push(option);
        }
    }

    async collectOptions() {
        console.log('\n⚙️ Adding Options');
        
        while (true) {
            const optName = await this.question('Option name (or "done" to finish): ');
            if (optName.toLowerCase() === 'done') break;
            
            const option = await this.createOption(optName);
            this.moduleData.command.options.push(option);
        }
    }

    async createOption(name) {
        console.log('\nOption Types:');
        console.log('1. String');
        console.log('2. Integer');
        console.log('3. Boolean');
        console.log('4. User');
        console.log('5. Channel');
        console.log('6. Role');
        console.log('7. Mentionable');
        console.log('8. Number');
        console.log('9. Attachment');
        
        const optType = await this.question('Option type (1-9): ');
        const types = {
            '1': 'String',
            '2': 'Integer', 
            '3': 'Boolean',
            '4': 'User',
            '5': 'Channel',
            '6': 'Role',
            '7': 'Mentionable',
            '8': 'Number',
            '9': 'Attachment'
        };

        const description = await this.question(`Description for "${name}": `);
        const required = await this.question(`Is "${name}" required? (y/n): `);
        
        const option = {
            name,
            type: types[optType] || 'String',
            description,
            required: required.toLowerCase() === 'y',
            choices: []
        };

        // Add choices for string/integer options
        if (option.type === 'String' || option.type === 'Integer') {
            const hasChoices = await this.question(`Add choices for "${name}"? (y/n): `);
            if (hasChoices.toLowerCase() === 'y') {
                await this.collectChoices(option);
            }
        }

        return option;
    }

    async collectChoices(option) {
        console.log(`\nAdding choices for "${option.name}"`);
        
        while (true) {
            const choiceName = await this.question('Choice name (or "done" to finish): ');
            if (choiceName.toLowerCase() === 'done') break;
            
            const choiceValue = await this.question(`Value for "${choiceName}": `);
            
            option.choices.push({
                name: choiceName,
                value: option.type === 'Integer' ? parseInt(choiceValue) : choiceValue
            });
        }
    }

    async createDirectories() {
        const dirs = [
            path.join(this.srcDir, 'modules'),
            path.join(this.srcDir, 'commands', this.moduleData.cleanName)
        ];

        // Create modals directory if needed
        if (this.moduleData.command?.modals) {
            dirs.push(path.join(this.srcDir, 'interaction-handlers', 'modals'));
        }

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

    generateAdvancedCommand() {
        if (!this.moduleData.createSample) return null;

        const cmd = this.moduleData.command;
        const preconditions = this.moduleData.audience.precondition 
            ? `\n    preconditions: ['${this.moduleData.audience.precondition}']` 
            : '';

        const permissions = this.moduleData.audience.permissions.length > 0
            ? `\n                .setDefaultMemberPermissions(${this.moduleData.audience.permissions.map(p => `PermissionFlagsBits.${p}`).join(' | ')})`
            : '';

        // Generate imports
        let imports = `import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ModuleCommand } from '@kbotdev/plugin-modules';
import type { ${this.moduleData.cleanName}Module } from '../../modules/${this.moduleData.cleanName}';
import { EmbedBuilder, MessageFlags`;

        if (this.moduleData.audience.permissions.length > 0) {
            imports += ', PermissionFlagsBits';
        }

        if (cmd.type.includes('context') || cmd.contextMenus.length > 0) {
            imports += ', ApplicationCommandType';
        }

        if (cmd.modals) {
            imports += ', ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle';
        }

        // Add Message import if text commands are enabled
        if (cmd.type.includes('text') || cmd.type === 'both') {
            imports += ', Message';
        }

        imports += ` } from 'discord.js';
import config from '../../config';`;

        // Generate class
        let classContent = `
@ApplyOptions<Command.Options>({
    name: '${cmd.name}',
    description: '${cmd.description}'${preconditions}
})
export class ${cmd.name.charAt(0).toUpperCase() + cmd.name.slice(1)}Command extends ModuleCommand<${this.moduleData.cleanName}Module> {
    public constructor(context: ModuleCommand.LoaderContext, options: ModuleCommand.Options) {
        super(context, {
            ...options,
            module: '${this.moduleData.cleanName}',
            description: '${cmd.description}',
            enabled: true
        });
    }`;

        // Generate slash command registration
        if (cmd.type.includes('slash')) {
            classContent += `

    public override registerApplicationCommands(registry: Command.Registry) {`;

            // Slash command
            if (cmd.type !== 'context') {
                classContent += `
        registry.registerChatInputCommand((builder) =>
            builder
                .setName('${cmd.name}')
                .setDescription('${cmd.description}')${permissions}`;

                // Add subcommands
                if (cmd.subcommands.length > 0) {
                    for (const sub of cmd.subcommands) {
                        classContent += `
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('${sub.name}')
                        .setDescription('${sub.description}')`;
                        
                        // Add options to subcommand
                        for (const opt of sub.options) {
                            classContent += this.generateOptionCode(opt, '                        ');
                        }

                        classContent += `
                )`;
                    }
                } else {
                    // Add direct options
                    for (const opt of cmd.options) {
                        classContent += this.generateOptionCode(opt, '                ');
                    }
                }

                classContent += `
        );`;
            }

            // Context menus
            for (const contextType of cmd.contextMenus) {
                const menuType = contextType === 'user' ? 'User' : 'Message';
                classContent += `
        
        registry.registerContextMenuCommand({
            name: '${cmd.description}',
            type: ApplicationCommandType.${menuType}
        });`;
            }

            classContent += `
    }`;
        }

        // Generate command handlers
        if (cmd.type.includes('slash') && cmd.type !== 'context') {
            classContent += this.generateSlashHandler(cmd);
        }

        if (cmd.contextMenus.length > 0) {
            classContent += this.generateContextHandler(cmd);
        }

        if (cmd.type.includes('text')) {
            classContent += this.generateTextHandler(cmd);
        }

        if (cmd.modals) {
            classContent += this.generateModalHandler(cmd);
        }

        classContent += '\n}';

        return imports + classContent;
    }

    generateOptionCode(option, indent) {
        const methodMap = {
            'String': 'addStringOption',
            'Integer': 'addIntegerOption',
            'Boolean': 'addBooleanOption',
            'User': 'addUserOption',
            'Channel': 'addChannelOption',
            'Role': 'addRoleOption',
            'Mentionable': 'addMentionableOption',
            'Number': 'addNumberOption',
            'Attachment': 'addAttachmentOption'
        };

        let code = `
${indent}.${methodMap[option.type]}((option) =>
${indent}    option
${indent}        .setName('${option.name}')
${indent}        .setDescription('${option.description}')
${indent}        .setRequired(${option.required})`;

        // Add choices if they exist
        if (option.choices.length > 0) {
            code += `
${indent}        .addChoices(`;
            for (let i = 0; i < option.choices.length; i++) {
                const choice = option.choices[i];
                code += `
${indent}            { name: '${choice.name}', value: ${typeof choice.value === 'string' ? `'${choice.value}'` : choice.value} }`;
                if (i < option.choices.length - 1) code += ',';
            }
            code += `
${indent}        )`;
        }

        code += `
${indent})`;

        return code;
    }

    generateSlashHandler(cmd) {
        let handler = `

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {`;

        if (cmd.subcommands.length > 0) {
            handler += `
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {`;
            
            for (const sub of cmd.subcommands) {
                handler += `
            case '${sub.name}': {
                // Handle ${sub.name} subcommand`;
                
                // Generate option getting code
                for (const opt of sub.options) {
                    handler += `
                const ${opt.name} = interaction.options.get${opt.type}('${opt.name}'${opt.required ? ', true' : ''});`;
                }

                handler += `
                
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor.default)
                    .setTitle('${this.moduleData.emoji} ${sub.name.charAt(0).toUpperCase() + sub.name.slice(1)}')
                    .setDescription('Subcommand executed successfully!')
                    .setTimestamp();

                return interaction.reply({
                    embeds: [embed],
                    flags: MessageFlags.Ephemeral
                });
            }`;
            }

            handler += `
            default:
                return interaction.reply({
                    content: 'Invalid subcommand.',
                    flags: MessageFlags.Ephemeral
                });
        }`;
        } else {
            // Generate option getting code for main command
            for (const opt of cmd.options) {
                handler += `
        const ${opt.name} = interaction.options.get${opt.type}('${opt.name}'${opt.required ? ', true' : ''});`;
            }

            handler += `

        const embed = new EmbedBuilder()
            .setColor(config.bot.embedColor.default)
            .setTitle('${this.moduleData.emoji} ${cmd.name.charAt(0).toUpperCase() + cmd.name.slice(1)}')
            .setDescription('Command executed successfully!')
            .setTimestamp();

        return interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral
        });`;
        }

        handler += `
    }`;

        return handler;
    }

    generateContextHandler(cmd) {
        return `

    public override async contextMenuRun(interaction: Command.ContextMenuCommandInteraction) {
        let target;
        
        if (interaction.isUserContextMenuCommand()) {
            target = interaction.targetUser;
        } else if (interaction.isMessageContextMenuCommand()) {
            target = interaction.targetMessage;
        }

        const embed = new EmbedBuilder()
            .setColor(config.bot.embedColor.default)
            .setTitle('${this.moduleData.emoji} Context Menu Action')
            .setDescription('Context menu command executed successfully!')
            .setTimestamp();

        return interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral
        });
    }`;
    }

    generateTextHandler(cmd) {
        return `

    public override async messageRun(message: Message) {
        const embed = new EmbedBuilder()
            .setColor(config.bot.embedColor.default)
            .setTitle('${this.moduleData.emoji} ${cmd.name.charAt(0).toUpperCase() + cmd.name.slice(1)}')
            .setDescription('Text command executed successfully!')
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }`;
    }

    generateModalHandler(cmd) {
        return `

    // Example modal interaction (you may want to move this to a separate interaction handler)
    private async showModal(interaction: Command.ChatInputCommandInteraction) {
        const modal = new ModalBuilder()
            .setCustomId('${cmd.name}-modal')
            .setTitle('${cmd.description}');

        const textInput = new TextInputBuilder()
            .setCustomId('text-input')
            .setLabel('Enter your text')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const row = new ActionRowBuilder<TextInputBuilder>()
            .addComponents(textInput);

        modal.addComponents(row);

        return interaction.showModal(modal);
    }`;
    }

    async updateModulesConfig() {
        const configPath = path.join(this.srcDir, 'config', 'modules.ts');
        
        try {
            let content = await fs.readFile(configPath, 'utf8');
            
            // Check if module already exists
            if (content.includes(`${this.moduleData.lowerName}:`)) {
                console.log('⚠️ Module already exists in config, skipping update');
                return;
            }
            
            const newModuleConfig = `    ${this.moduleData.lowerName}: {
        name: '${this.moduleData.name}',
        description: '${this.moduleData.description}',
        emoji: '${this.moduleData.emoji}',
        defaultEnabled: ${this.moduleData.defaultEnabled}${this.moduleData.audience.permissions.length > 0 ? `,\n        requiredPermissions: [${this.moduleData.audience.permissions.map(p => `PermissionsBitField.Flags.${p}`).join(', ')}]` : ''}
    },`;

            content = content.replace(
                /(\} as const;)/,
                `${newModuleConfig}\n$1`
            );

            await fs.writeFile(configPath, content);
            console.log('✅ Updated modules config');
        } catch (error) {
            console.warn('⚠️ Could not update modules config automatically:', error.message);
        }
    }

    async updateGuildModel() {
        const modelPath = path.join(this.srcDir, 'models', 'Guild.ts');
        
        try {
            let content = await fs.readFile(modelPath, 'utf8');
            
            if (content.includes(`is${this.moduleData.cleanName}Module`)) {
                console.log('⚠️ Module field already exists in Guild model');
                return;
            }

            // Add to LegacyModuleFlags interface
            const legacyFlag = `  is${this.moduleData.cleanName}Module?: boolean;`;
            content = content.replace(
                /(interface LegacyModuleFlags \{[^}]*)/,
                `$1\n${legacyFlag}`
            );

            // Add to schema
            const schemaField = `  is${this.moduleData.cleanName}Module: { type: Boolean, default: ${this.moduleData.defaultEnabled} },`;
            content = content.replace(
                /(isWelcomingModule: \{ type: Boolean, default: false \},)/,
                `$1\n${schemaField}`
            );

            // Add to pre-save middleware
            const syncToNew = `  if (this.isModified('is${this.moduleData.cleanName}Module')) {
    this.modules.${this.moduleData.lowerName} = this.is${this.moduleData.cleanName}Module ?? ${this.moduleData.defaultEnabled};
  }`;

            const syncToLegacy = `  if (this.isModified('modules.${this.moduleData.lowerName}')) {
    this.is${this.moduleData.cleanName}Module = this.modules.${this.moduleData.lowerName};
  }`;

            content = content.replace(
                /(if \(this\.isModified\('isWelcomingModule'\)\) \{[^}]+\})/,
                `$1\n${syncToNew}`
            );

            content = content.replace(
                /(if \(this\.isModified\('modules\.welcoming'\)\) \{[^}]+\})/,
                `$1\n${syncToLegacy}`
            );

            await fs.writeFile(modelPath, content);
            console.log('✅ Updated Guild model');
        } catch (error) {
            console.warn('⚠️ Could not update Guild model automatically:', error.message);
        }
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
                path: path.join(this.srcDir, 'commands', this.moduleData.cleanName, `${this.moduleData.command.name}.ts`),
                content: this.generateAdvancedCommand()
            });

            // Generate modal handler if needed
            if this.moduleData.command.modals) {
                files.push({
                    path: path.join(this.srcDir, 'interaction-handlers', 'modals', `${this.moduleData.command.name}Modal.ts`),
                    content: this.generateModalInteractionHandler()
                });
            }
        }

        for (const file of files) {
            await fs.writeFile(file.path, file.content);
            console.log(`✅ Created: ${path.relative(this.srcDir, file.path)}`);
        }
    }

    generateModalInteractionHandler() {
        return `import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ModalSubmitInteraction, MessageFlags, EmbedBuilder } from 'discord.js';
import config from '../../config';

export class ${this.moduleData.command.name.charAt(0).toUpperCase() + this.moduleData.command.name.slice(1)}ModalHandler extends InteractionHandler {
    public constructor(context: InteractionHandler.Context, options: InteractionHandler.Options) {
        super(context, {
            ...options,
            interactionHandlerType: InteractionHandlerTypes.ModalSubmit
        });
    }

    public override parse(interaction: ModalSubmitInteraction) {
        if (interaction.customId !== '${this.moduleData.command.name}-modal') return this.none();
        return this.some();
    }

    public async run(interaction: ModalSubmitInteraction) {
        const textInput = interaction.fields.getTextInputValue('text-input');

        const embed = new EmbedBuilder()
            .setColor(config.bot.embedColor.success)
            .setTitle('${this.moduleData.emoji} Modal Submitted')
            .setDescription('Your modal submission was processed successfully!')
            .addFields({
                name: 'Your Input',
                value: \`\\\`\\\`\\\`\\n\${textInput}\\n\\\`\\\`\\\`\`,
                inline: false
            })
            .setTimestamp();

        return interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral
        });
    }
}`;
    }

    async generateREADME() {
        const readmePath = path.join(this.srcDir, 'commands', this.moduleData.cleanName, 'README.md');
        
        let commandDocs = 'No commands created yet.';
        
        if (this.moduleData.createSample) {
            const cmd = this.moduleData.command;
            commandDocs = `### \`${cmd.type.includes('slash') ? '/' : ''}${cmd.name}\`
${cmd.description}

**Type**: ${cmd.type}
**Usage**: \`/${cmd.name}\``;

            if (cmd.subcommands.length > 0) {
                commandDocs += '\n**Subcommands**:\n';
                for (const sub of cmd.subcommands) {
                    commandDocs += `- \`${sub.name}\`: ${sub.description}\n`;
                }
            }

            if (cmd.options.length > 0) {
                commandDocs += '\n**Options**:\n';
                for (const opt of cmd.options) {
                    commandDocs += `- \`${opt.name}\` (${opt.type}${opt.required ? ', required' : ''}): ${opt.description}\n`;
                }
            }

            if (cmd.contextMenus.length > 0) {
                commandDocs += `\n**Context Menus**: ${cmd.contextMenus.join(', ')}\n`;
            }

            if (cmd.modals) {
                commandDocs += '\n**Uses Modals**: Yes\n';
            }
        }

        const readmeContent = `# ${this.moduleData.name} Module

${this.moduleData.description}

## Configuration

- **Target Audience**: ${this.moduleData.audience.name}
- **Default Enabled**: ${this.moduleData.defaultEnabled ? 'Yes' : 'No'}
- **Required Permissions**: ${this.moduleData.audience.permissions.length > 0 ? this.moduleData.audience.permissions.join(', ') : 'None'}

## Commands

${commandDocs}

## Setup

1. Enable the module in your server using \`/configmodule\`
2. ${this.moduleData.audience.permissions.length > 0 ? `Ensure the bot has the required permissions: ${this.moduleData.audience.permissions.join(', ')}` : 'No additional setup required'}

## Development

To add new commands to this module:
1. Create a new file in \`src/commands/${this.moduleData.cleanName}/\`
2. Extend \`ModuleCommand<${this.moduleData.cleanName}Module>\`
3. Set the module property to \`'${this.moduleData.cleanName}'\`

### Features Used
${this.moduleData.createSample ? `
- **Command Type**: ${this.moduleData.command.type}
- **Subcommands**: ${this.moduleData.command.subcommands.length > 0 ? 'Yes' : 'No'}
- **Context Menus**: ${this.moduleData.command.contextMenus.length > 0 ? 'Yes' : 'No'}
- **Modals**: ${this.moduleData.command.modals ? 'Yes' : 'No'}
- **Options**: ${this.moduleData.command.options.length > 0 ? 'Yes' : 'No'}
` : 'No sample command created'}
`;

        await fs.writeFile(readmePath, readmeContent);
        console.log(`✅ Created: commands/${this.moduleData.cleanName}/README.md`);
    }

    async run() {
        try {
            await this.collectModuleInfo();
            await this.createDirectories();
            await this.writeFiles();
            await this.updateModulesConfig();
            await this.updateGuildModel();
            await this.generateREADME();

            console.log('\n🎉 Advanced Module created successfully!');
            console.log('\n📋 Next Steps:');
            console.log('1. Run `npm run build` to compile the TypeScript');
            console.log('2. Restart your bot to load the new module');
            console.log('3. Use `/configmodule` to enable the module in your server');
            if (this.moduleData.createSample) {
                console.log(`4. Test the command: \`/${this.moduleData.command.name}\``);
                if (this.moduleData.command.modals) {
                    console.log('5. Test modal interactions');
                }
                if (this.moduleData.command.contextMenus.length > 0) {
                    console.log('6. Test context menu commands');
                }
            }
            console.log(`7. Add more commands to src/commands/${this.moduleData.cleanName}/`);

        } catch (error) {
            console.error('\n❌ Error:', error.message);
        } finally {
            this.rl.close();
        }
    }
}

// Run the generator
const generator = new ModuleGenerator();
generator.run();
