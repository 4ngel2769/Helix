const fs = require('fs').promises;
const path = require('path');

async function scanCommands() {
    const commandsDir = path.join(__dirname, '..', 'src', 'commands');
    const commands = new Map();
    
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
                        const filePath = path.join(dirPath, file);
                        
                        if (commands.has(commandName)) {
                            console.log(`🚨 DUPLICATE: "${commandName}"`);
                            console.log(`   Existing: ${commands.get(commandName)}`);
                            console.log(`   New: ${filePath}`);
                        } else {
                            commands.set(commandName, filePath);
                        }
                    }
                }
            }
        }
        
        console.log(`\n📊 Summary:`);
        console.log(`Total commands: ${commands.size}`);
        console.log(`Commands by module:`);
        
        const byModule = new Map();
        for (const [name, filePath] of commands) {
            // Fix Windows path handling
            const pathParts = filePath.split(path.sep);
            const moduleIndex = pathParts.findIndex(part => part === 'commands');
            const module = moduleIndex !== -1 && moduleIndex + 1 < pathParts.length 
                ? pathParts[moduleIndex + 1] 
                : 'Unknown';
            
            if (!byModule.has(module)) byModule.set(module, []);
            byModule.get(module).push(name);
        }
        
        for (const [module, cmds] of byModule) {
            console.log(`  ${module}: ${cmds.join(', ')}`);
        }
        
        // Also check for naming conflicts in the actual command files
        console.log(`\n🔍 Checking for @ApplyOptions name conflicts...`);
        await checkNameConflicts(commands);
        
    } catch (error) {
        console.error('Error scanning commands:', error);
    }
}

async function checkNameConflicts(commands) {
    const nameMap = new Map();
    
    for (const [fileName, filePath] of commands) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            
            // Look for @ApplyOptions name property
            const nameMatch = content.match(/@ApplyOptions[^{]*{\s*name:\s*['"`]([^'"`]+)['"`]/);
            if (nameMatch) {
                const commandName = nameMatch[1];
                
                if (nameMap.has(commandName)) {
                    console.log(`🚨 NAME CONFLICT: "${commandName}"`);
                    console.log(`   File 1: ${nameMap.get(commandName)}`);
                    console.log(`   File 2: ${filePath}`);
                } else {
                    nameMap.set(commandName, filePath);
                }
            } else {
                // Check class name as fallback
                const classMatch = content.match(/export class (\w+)Command/);
                if (classMatch) {
                    const className = classMatch[1].toLowerCase();
                    console.log(`⚠️ No @ApplyOptions name found in ${filePath}, class: ${className}`);
                }
            }
        } catch (error) {
            console.warn(`Error reading ${filePath}:`, error.message);
        }
    }
    
    console.log(`\nFound ${nameMap.size} commands with explicit names`);
}

scanCommands();
