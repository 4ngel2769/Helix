const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

class ModuleDeleter {
    constructor() {
        this.srcDir = path.join(__dirname, '..', 'src');
        this.availableModules = [];
        this.selectedModules = [];
        this.currentIndex = 0;
    }

    createReadlineInterface() {
        if (this.rl) {
            this.rl.close();
        }
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    async question(prompt) {
        this.createReadlineInterface();
        return new Promise((resolve) => {
            this.rl.question(prompt, (answer) => {
                resolve(answer);
            });
        });
    }

    async scanExistingModules() {
        const modulesDir = path.join(this.srcDir, 'modules');
        const commandsDir = path.join(this.srcDir, 'commands');
        
        try {
            const moduleFiles = await fs.readdir(modulesDir);
            const commandDirs = await fs.readdir(commandsDir);
            
            this.availableModules = [];
            
            for (const file of moduleFiles) {
                if (file.endsWith('.ts') && !file.includes('index')) {
                    const moduleName = file.replace('.ts', '');
                    
                    // Skip core modules that shouldn't be deleted
                    const coreModules = ['General', 'Administration', 'Verification'];
                    if (coreModules.includes(moduleName)) continue;
                    
                    const moduleInfo = {
                        name: moduleName,
                        fileName: file,
                        hasCommands: commandDirs.includes(moduleName),
                        commandCount: 0,
                        selected: false
                    };
                    
                    // Count commands in module
                    if (moduleInfo.hasCommands) {
                        try {
                            const cmdDir = path.join(commandsDir, moduleName);
                            const cmdFiles = await fs.readdir(cmdDir);
                            moduleInfo.commandCount = cmdFiles.filter(f => f.endsWith('.ts') && !f.includes('README')).length;
                        } catch (error) {
                            moduleInfo.commandCount = 0;
                        }
                    }
                    
                    this.availableModules.push(moduleInfo);
                }
            }
            
            if (this.availableModules.length === 0) {
                throw new Error('No deletable modules found. Only core modules (General, Administration, Verification) exist.');
            }
            
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error('Modules directory not found. Make sure you\'re running this from the project root.');
            }
            throw error;
        }
    }

    clearScreen() {
        console.clear();
    }

    displayModuleList() {
        this.clearScreen();
        console.log('🗑️  Helix Module Deleter\n');
        console.log('Use ↑/↓ arrows to navigate, SPACE to select/deselect, ENTER to proceed\n');
        console.log('Available Modules:\n');
        
        this.availableModules.forEach((module, index) => {
            const isActive = index === this.currentIndex;
            const isSelected = module.selected;
            
            let line = '';
            
            // Cursor indicator
            line += isActive ? '> ' : '  ';
            
            // Selection checkbox
            line += isSelected ? '[✓] ' : '[ ] ';
            
            // Module name
            line += module.name;
            
            // Commands info
            if (module.hasCommands) {
                line += ` (${module.commandCount} command${module.commandCount !== 1 ? 's' : ''})`;
            } else {
                line += ' (no commands)';
            }
            
            // Highlight active line
            if (isActive) {
                console.log(`\x1b[36m${line}\x1b[0m`); // Cyan
            } else if (isSelected) {
                console.log(`\x1b[33m${line}\x1b[0m`); // Yellow
            } else {
                console.log(line);
            }
        });
        
        console.log('\nSelected modules:', this.selectedModules.length);
        if (this.selectedModules.length > 0) {
            console.log('Will delete:', this.selectedModules.map(m => m.name).join(', '));
        }
        
        console.log('\nControls:');
        console.log('  ↑/↓ - Navigate');
        console.log('  SPACE - Select/Deselect');
        console.log('  ENTER - Proceed with deletion');
        console.log('  ESC/q - Cancel');
    }

    async handleKeyPress() {
        return new Promise((resolve) => {
            // Ensure we're in raw mode for key detection
            process.stdin.setRawMode(true);
            process.stdin.resume();
            process.stdin.setEncoding('utf8');
            
            const onData = (key) => {
                // Reset stdin back to normal mode
                process.stdin.setRawMode(false);
                process.stdin.pause();
                process.stdin.removeListener('data', onData);
                resolve(key);
            };
            
            process.stdin.once('data', onData);
        });
    }

    async interactiveSelection() {
        this.displayModuleList();
        
        while (true) {
            const key = await this.handleKeyPress();
            
            switch (key) {
                case '\u001b[A': // Up arrow
                    this.currentIndex = Math.max(0, this.currentIndex - 1);
                    this.displayModuleList();
                    break;
                    
                case '\u001b[B': // Down arrow
                    this.currentIndex = Math.min(this.availableModules.length - 1, this.currentIndex + 1);
                    this.displayModuleList();
                    break;
                    
                case ' ': // Space
                    const currentModule = this.availableModules[this.currentIndex];
                    currentModule.selected = !currentModule.selected;
                    
                    if (currentModule.selected) {
                        this.selectedModules.push(currentModule);
                    } else {
                        this.selectedModules = this.selectedModules.filter(m => m.name !== currentModule.name);
                    }
                    
                    this.displayModuleList();
                    break;
                    
                case '\r': // Enter
                case '\n':
                    if (this.selectedModules.length === 0) {
                        console.log('\n❌ No modules selected for deletion.');
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        this.displayModuleList();
                        break;
                    }
                    // Reset stdin to normal mode before returning
                    process.stdin.setRawMode(false);
                    process.stdin.pause();
                    return;
                    
                case '\u001b': // ESC
                case 'q':
                case '\u0003': // Ctrl+C
                    process.stdin.setRawMode(false);
                    process.stdin.pause();
                    throw new Error('Deletion cancelled by user');
                    
                default:
                    this.displayModuleList();
                    break;
            }
        }
    }

    async confirmDeletion() {
        // Ensure stdin is in normal mode for text input
        process.stdin.setRawMode(false);
        process.stdin.resume();
        
        console.log('\n⚠️  DELETION CONFIRMATION\n');
        console.log('You are about to permanently delete the following modules:\n');
        
        for (const module of this.selectedModules) {
            console.log(`📦 ${module.name}`);
            console.log(`   - Module file: src/modules/${module.fileName}`);
            
            if (module.hasCommands) {
                console.log(`   - Commands directory: src/commands/${module.name}/ (${module.commandCount} files)`);
            }
            
            console.log(`   - Database references will be cleaned up`);
            console.log(`   - Config entries will be removed\n`);
        }
        
        console.log('⚠️  This action cannot be undone!\n');
        
        let confirm1;
        while (true) {
            confirm1 = await this.question('Type "DELETE" (in caps) to proceed: ');
            if (confirm1 === 'DELETE') {
                break;
            } else if (confirm1.toLowerCase() === 'cancel' || confirm1.toLowerCase() === 'no') {
                throw new Error('Deletion cancelled by user');
            } else {
                console.log('❌ Please type exactly "DELETE" (in capitals) to confirm, or "cancel" to abort.');
            }
        }
        
        let confirm2;
        while (true) {
            confirm2 = await this.question('Are you absolutely sure? (yes/no): ');
            if (confirm2.toLowerCase() === 'yes') {
                break;
            } else if (confirm2.toLowerCase() === 'no') {
                throw new Error('Deletion cancelled - final confirmation denied');
            } else {
                console.log('❌ Please type "yes" or "no".');
            }
        }
    }

    async deleteModuleFiles(module) {
        const deletedFiles = [];
        
        try {
            // Delete module file
            const modulePath = path.join(this.srcDir, 'modules', module.fileName);
            try {
                await fs.unlink(modulePath);
                deletedFiles.push(`modules/${module.fileName}`);
            } catch (error) {
                console.warn(`⚠️ Could not delete module file: ${error.message}`);
            }
            
            // Delete commands directory
            if (module.hasCommands) {
                const commandsPath = path.join(this.srcDir, 'commands', module.name);
                try {
                    await this.deleteDirectory(commandsPath);
                    deletedFiles.push(`commands/${module.name}/`);
                } catch (error) {
                    console.warn(`⚠️ Could not delete commands directory: ${error.message}`);
                }
            }
            
            // Delete any interaction handlers for this module
            const interactionHandlersDir = path.join(this.srcDir, 'interaction-handlers');
            try {
                const handlers = await fs.readdir(interactionHandlersDir);
                for (const handler of handlers) {
                    if (handler.toLowerCase().includes(module.name.toLowerCase()) && handler.endsWith('.ts')) {
                        const handlerPath = path.join(interactionHandlersDir, handler);
                        try {
                            await fs.unlink(handlerPath);
                            deletedFiles.push(`interaction-handlers/${handler}`);
                        } catch (error) {
                            console.warn(`⚠️ Could not delete handler ${handler}: ${error.message}`);
                        }
                    }
                }
            } catch (error) {
                // Interaction handlers directory might not exist
            }
            
            // Check for modal handlers
            const modalsDir = path.join(this.srcDir, 'interaction-handlers', 'modals');
            try {
                const modals = await fs.readdir(modalsDir);
                for (const modal of modals) {
                    if (modal.toLowerCase().includes(module.name.toLowerCase()) && modal.endsWith('.ts')) {
                        const modalPath = path.join(modalsDir, modal);
                        try {
                            await fs.unlink(modalPath);
                            deletedFiles.push(`interaction-handlers/modals/${modal}`);
                        } catch (error) {
                            console.warn(`⚠️ Could not delete modal ${modal}: ${error.message}`);
                        }
                    }
                }
            } catch (error) {
                // Modals directory might not exist
            }
            
        } catch (error) {
            console.error(`❌ Error deleting files for ${module.name}:`, error.message);
        }
        
        return deletedFiles;
    }

    async deleteDirectory(dirPath) {
        try {
            const files = await fs.readdir(dirPath);
            
            for (const file of files) {
                const filePath = path.join(dirPath, file);
                const stat = await fs.lstat(filePath);
                
                if (stat.isDirectory()) {
                    await this.deleteDirectory(filePath);
                } else {
                    await fs.unlink(filePath);
                }
            }
            
            await fs.rmdir(dirPath);
        } catch (error) {
            console.error(`Error deleting directory ${dirPath}:`, error.message);
            throw error;
        }
    }

    async updateModulesConfig() {
        const configPath = path.join(this.srcDir, 'config', 'modules.ts');
        
        try {
            let content = await fs.readFile(configPath, 'utf8');
            let modified = false;
            
            for (const module of this.selectedModules) {
                const moduleKey = module.name.toLowerCase();
                
                // More precise regex to match the module entry
                const moduleRegex = new RegExp(`\\s*${moduleKey}:\\s*\\{[^}]*\\},?\\s*`, 'gs');
                const newContent = content.replace(moduleRegex, '');
                
                if (newContent !== content) {
                    content = newContent;
                    modified = true;
                    console.log(`✅ Removed ${module.name} from modules config`);
                }
            }
            
            if (modified) {
                await fs.writeFile(configPath, content);
                console.log('✅ Updated modules.ts config file');
            }
            
        } catch (error) {
            console.warn('⚠️ Could not update modules config automatically:', error.message);
            console.log('Please manually remove the module entries from src/config/modules.ts');
        }
    }

    async updateGuildModel() {
        const modelPath = path.join(this.srcDir, 'models', 'Guild.ts');
        
        try {
            let content = await fs.readFile(modelPath, 'utf8');
            let modified = false;
            
            for (const module of this.selectedModules) {
                const moduleField = `is${module.name}Module`;
                
                // Remove from LegacyModuleFlags interface
                const interfaceRegex = new RegExp(`\\s*${moduleField}\\?:\\s*boolean;\\s*`, 'g');
                content = content.replace(interfaceRegex, '');
                
                // Remove from schema
                const schemaRegex = new RegExp(`\\s*${moduleField}:\\s*\\{[^}]*\\},?\\s*`, 'g');
                content = content.replace(schemaRegex, '');
                
                // Remove from pre-save middleware (both directions)
                const syncToNewRegex = new RegExp(`\\s*if \\(this\\.isModified\\('${moduleField}'\\)\\) \\{[^}]*\\}\\s*`, 'gs');
                content = content.replace(syncToNewRegex, '');
                
                const syncToLegacyRegex = new RegExp(`\\s*if \\(this\\.isModified\\('modules\\.${module.name.toLowerCase()}'\\)\\) \\{[^}]*\\}\\s*`, 'gs');
                content = content.replace(syncToLegacyRegex, '');
                
                modified = true;
                console.log(`✅ Removed ${module.name} from Guild model`);
            }
            
            if (modified) {
                await fs.writeFile(modelPath, content);
                console.log('✅ Updated Guild.ts model file');
            }
            
        } catch (error) {
            console.warn('⚠️ Could not update Guild model automatically:', error.message);
            console.log('Please manually remove the module fields from src/models/Guild.ts');
        }
    }

    async cleanupDatabase() {
        console.log('\n📋 Database Cleanup Required:');
        console.log('The following database operations should be performed manually:');
        console.log('');
        
        for (const module of this.selectedModules) {
            console.log(`For ${module.name} module:`);
            console.log(`  - Remove 'modules.${module.name.toLowerCase()}' field from all guild documents`);
            console.log(`  - Remove 'is${module.name}Module' field from all guild documents`);
            console.log('');
        }
        
        console.log('MongoDB Commands:');
        for (const module of this.selectedModules) {
            const moduleKey = module.name.toLowerCase();
            console.log(`db.guilds.updateMany({}, { $unset: { "modules.${moduleKey}": "", "is${module.name}Module": "" } });`);
        }
        console.log('');
    }

    async performDeletion() {
        console.log('\n🗑️  Starting module deletion...\n');
        
        const allDeletedFiles = [];
        
        for (const module of this.selectedModules) {
            console.log(`\n📦 Deleting ${module.name} module...`);
            
            const deletedFiles = await this.deleteModuleFiles(module);
            allDeletedFiles.push(...deletedFiles);
            
            for (const file of deletedFiles) {
                console.log(`   ✅ Deleted: ${file}`);
            }
        }
        
        // Update configuration files
        console.log('\n📝 Updating configuration files...');
        await this.updateModulesConfig();
        await this.updateGuildModel();
        
        // Show database cleanup info
        await this.cleanupDatabase();
        
        return allDeletedFiles;
    }

    async generateDeletionReport(deletedFiles) {
        const reportPath = path.join(this.srcDir, '..', 'module-deletion-report.md');
        
        const reportContent = `# Module Deletion Report

**Date**: ${new Date().toISOString()}
**Deleted Modules**: ${this.selectedModules.map(m => m.name).join(', ')}

## Deleted Files

${deletedFiles.map(file => `- ${file}`).join('\n')}

## Manual Cleanup Required

### Database Operations
The following MongoDB commands should be executed:

\`\`\`javascript
${this.selectedModules.map(module => {
    const moduleKey = module.name.toLowerCase();
    return `db.guilds.updateMany({}, { $unset: { "modules.${moduleKey}": "", "is${module.name}Module": "" } });`;
}).join('\n')}
\`\`\`

### Verification Steps
1. Run \`npm run build\` to recompile TypeScript
2. Restart the bot to ensure modules are unloaded
3. Execute the database cleanup commands
4. Verify that the modules no longer appear in \`/configmodule\`

## Rollback Information
To restore these modules, you would need:
1. The deleted source files (restore from git if available)
2. Re-add module configurations to \`src/config/modules.ts\`
3. Re-add fields to \`src/models/Guild.ts\`
4. Rebuild and restart the bot
`;

        await fs.writeFile(reportPath, reportContent);
        console.log(`\n📄 Deletion report saved to: module-deletion-report.md`);
    }

    async run() {
        try {
            console.log('🔍 Scanning for existing modules...\n');
            await this.scanExistingModules();
            
            console.log(`Found ${this.availableModules.length} deletable modules:\n`);
            this.availableModules.forEach(module => {
                console.log(`  📦 ${module.name} ${module.hasCommands ? `(${module.commandCount} commands)` : '(no commands)'}`);
            });
            
            console.log('\n🎮 Starting interactive selection...');
            await new Promise(resolve => setTimeout(resolve, 1500)); // Brief pause
            
            await this.interactiveSelection();
            
            if (this.selectedModules.length === 0) {
                console.log('\n❌ No modules selected for deletion.');
                return;
            }
            
            await this.confirmDeletion();
            
            const deletedFiles = await this.performDeletion();
            
            await this.generateDeletionReport(deletedFiles);
            
            console.log('\n🎉 Module deletion completed successfully!');
            console.log('\n📋 Next Steps:');
            console.log('1. Run `npm run build` to recompile TypeScript');
            console.log('2. Restart your bot to unload the deleted modules');
            console.log('3. Execute the database cleanup commands shown above');
            console.log('4. Check the deletion report for full details');
            console.log('5. Verify modules no longer appear in `/configmodule`');
            
        } catch (error) {
            console.error('\n❌ Error:', error.message);
        } finally {
            if (this.rl) {
                this.rl.close();
            }
            process.stdin.setRawMode(false);
            process.stdin.pause();
        }
    }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
    console.log('\n\n❌ Deletion cancelled by user');
    process.stdin.setRawMode(false);
    process.exit(0);
});

// Handle other termination signals
process.on('SIGTERM', () => {
    process.stdin.setRawMode(false);
    process.exit(0);
});

// Run the deleter
const deleter = new ModuleDeleter();
deleter.run();
