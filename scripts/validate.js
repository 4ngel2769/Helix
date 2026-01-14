#!/usr/bin/env node

/**
 * Runs essential tests before committing code
 */

const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m'
};

async function runCommand(name, command) {
    process.stdout.write(`${colors.cyan}⏳ ${name}...${colors.reset}`);
    
    try {
        const { stdout, stderr } = await execPromise(command);
        
        if (stderr && !stderr.includes('npm WARN')) {
            console.log(`${colors.yellow} ⚠ Warnings${colors.reset}`);
            if (stderr) console.log(stderr);
            return { success: true, warnings: true };
        }
        
        console.log(`${colors.green} ✓${colors.reset}`);
        return { success: true, warnings: false };
    } catch (error) {
        console.log(`${colors.red} ✗${colors.reset}`);
        console.error(error.message);
        return { success: false, warnings: false };
    }
}

async function main() {
    console.log(`\n${colors.cyan}${'='.repeat(50)}`);
    console.log('Validating...');
    console.log(`${'='.repeat(50)}${colors.reset}\n`);
    
    const results = [];
    
    results.push(await runCommand('TypeScript Build', 'npm run build'));
    
    console.log(`\n${colors.cyan}${'='.repeat(50)}${colors.reset}`);
    
    const allPassed = results.every(r => r.success);
    const hasWarnings = results.some(r => r.warnings);
    
    if (allPassed && !hasWarnings) {
        console.log(`${colors.green}✓ All checks passed! Ready to commit.${colors.reset}\n`);
        process.exit(0);
    } else if (allPassed && hasWarnings) {
        console.log(`${colors.yellow}⚠ Checks passed with warnings. Review before committing.${colors.reset}\n`);
        process.exit(0);
    } else {
        console.log(`${colors.red}✗ Some checks failed. Fix errors before committing.${colors.reset}\n`);
        process.exit(1);
    }
}

main().catch(error => {
    console.error(`${colors.red}Fatal error:${colors.reset}`, error);
    process.exit(1);
});
