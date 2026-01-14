const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execP = util.promisify(exec);
const COLORS = { info: '\x1b[36m', success: '\x1b[32m', warning: '\x1b[33m', error: '\x1b[31m', reset: '\x1b[0m' };

class BotTester {
  constructor() {
    this.rootDir = path.join(__dirname, '..');
    this.srcDir = path.join(this.rootDir, 'src');
    this.errors = [];
    this.warnings = [];
    this.stats = { filesChecked: 0, commandsFound: 0, listenersFound: 0, interactionHandlersFound: 0, modelsFound: 0, modulesFound: 0 };
  }

  log(msg, type = 'info') { console.log(`${COLORS[type]||COLORS.info}${msg}${COLORS.reset}`); }
  addError(file, msg) { this.errors.push({ file, msg }); }
  addWarning(file, msg) { this.warnings.push({ file, msg }); }

  async runTest(name, fn) {
    this.log(`\n${'='.repeat(60)}`, 'info'); this.log(`Running: ${name}`, 'info'); this.log('='.repeat(60), 'info');
    try { await fn(); this.log(`✓ ${name} passed`, 'success'); return true; } catch (e) { this.log(`✗ ${name} failed: ${e.message}`, 'error'); this.addError('Test Suite', `${name}: ${e.message}`); return false; }
  }

  async testTypeScriptCompilation() {
    this.log('Checking TypeScript compilation...', 'info');
    try {
      const { stderr } = await execP('npm run build', { cwd: this.rootDir, env: { ...process.env, NODE_ENV: 'test' } });
      if (stderr && !stderr.includes('npm WARN')) { this.addWarning('TypeScript', 'Build warnings detected'); console.log(stderr); }
      this.log('TypeScript compilation successful', 'success');
    } catch (e) { throw new Error(`TypeScript compilation failed: ${e.message}`); }
  }

  async testFileStructure() {
    this.log('Validating file structure...', 'info');
    const dirs = ['src/commands','src/listeners','src/models','src/modules','src/lib','src/interaction-handlers'];
    await Promise.all(dirs.map(async d => { try { await fs.access(path.join(this.rootDir,d)); this.log(`  ✓ Found: ${d}`, 'success'); } catch { this.addError('Structure', `Missing required directory: ${d}`); } }));
  }

  async scanDirectory(dir, validator) { const entries = await fs.readdir(dir, { withFileTypes: true }); for (const e of entries) { const full = path.join(dir, e.name); if (e.isDirectory()) await this.scanDirectory(full, validator); else if (e.isFile() && e.name.endsWith('.ts')) { this.stats.filesChecked++; await validator(full, e.name); } } }

  async testCommands() {
    this.log('Validating commands...', 'info');
    await this.scanDirectory(path.join(this.srcDir,'commands'), async (filePath) => {
      const content = await fs.readFile(filePath,'utf8');
      if (!content.includes('@ApplyOptions')) this.addWarning(filePath,'Missing @ApplyOptions decorator');
      if (!content.includes('name:') && !content.includes("name '")) this.addWarning(filePath,'Command name not clearly defined');
      if (!content.includes('description:')) this.addWarning(filePath,'Missing description');
      if (!content.includes('registerApplicationCommands') && !content.includes('chatInputRun')) this.addWarning(filePath,'May be missing slash command registration');
      if (!content.includes('export class') && !content.includes('module.exports')) this.addError(filePath,'No exported class found');
      this.stats.commandsFound++;
    });
    this.log(`Found and validated ${this.stats.commandsFound} commands`,'success');
  }

  async testListeners() {
    this.log('Validating listeners...', 'info');
    await this.scanDirectory(path.join(this.srcDir,'listeners'), async (filePath) => {
      const content = await fs.readFile(filePath,'utf8');
      if (!content.includes('extends Listener')) this.addError(filePath,'Does not extend Listener class');
      if (!content.includes('async run(') && !content.includes('run(')) this.addError(filePath,'Missing run() method');
      if (!content.includes('event:') && !content.includes('Events.')) this.addWarning(filePath,'Event not clearly specified');
      this.stats.listenersFound++;
    });
    this.log(`Found and validated ${this.stats.listenersFound} listeners`,'success');
  }

  async testInteractionHandlers() {
    this.log('Validating interaction handlers...', 'info');
    try {
      await this.scanDirectory(path.join(this.srcDir,'interaction-handlers'), async (filePath) => {
        const content = await fs.readFile(filePath,'utf8');
        if (!content.includes('extends InteractionHandler')) this.addError(filePath,'Does not extend InteractionHandler');
        if (!content.includes('parse(')) this.addError(filePath,'Missing parse() method');
        if (!content.includes('async run(') && !content.includes('run(')) this.addError(filePath,'Missing run() method');
        if (!content.includes('interactionHandlerType')) this.addWarning(filePath,'Interaction handler type not specified');
        this.stats.interactionHandlersFound++;
      });
      this.log(`Found and validated ${this.stats.interactionHandlersFound} interaction handlers`,'success');
    } catch (e) { this.addWarning('InteractionHandlers', `Could not scan handlers: ${e.message}`); }
  }

  async testModels() {
    this.log('Validating Mongoose models...', 'info');
    await this.scanDirectory(path.join(this.srcDir,'models'), async (filePath) => {
      const content = await fs.readFile(filePath,'utf8');
      if (!content.includes("from 'mongoose'") && !content.includes("require('mongoose')")) this.addWarning(filePath,'Does not import mongoose');
      if (!content.includes('Schema') && !content.includes('schema')) this.addError(filePath,'No schema definition found');
      if (!content.includes('model<') && !content.includes('= model(') && !content.includes('.model')) this.addError(filePath,'No model export found');
      if (!content.includes('interface') && !content.includes('type')) this.addWarning(filePath,'No TypeScript interface/type defined');
      this.stats.modelsFound++;
    });
    this.log(`Found and validated ${this.stats.modelsFound} models`,'success');
  }

  async testModules() {
    this.log('Validating modules...', 'info');
    try {
      await this.scanDirectory(path.join(this.srcDir,'modules'), async (filePath) => {
        const content = await fs.readFile(filePath,'utf8');
        if (!content.includes('extends Module')) this.addError(filePath,'Does not extend Module class');
        if (!content.includes('IsEnabled')) this.addWarning(filePath,'Missing IsEnabled method');
        if (!content.includes('declare module')) this.addWarning(filePath,'Missing module declaration augmentation');
        this.stats.modulesFound++;
      });
      this.log(`Found and validated ${this.stats.modulesFound} modules`,'success');
    } catch (e) { this.addWarning('Modules', `Could not scan modules: ${e.message}`); }
  }

  async testAntiPatterns() {
    this.log('Checking for common anti-patterns...', 'info');
    await this.scanDirectory(this.srcDir, async (filePath) => {
      const content = await fs.readFile(filePath,'utf8'); const rel = path.relative(this.rootDir,filePath);
      const consoleMatches = content.match(/console\.log/g); if (consoleMatches && consoleMatches.length > 2) this.addWarning(rel,`Contains ${consoleMatches.length} console.log statements - consider using logger`);
      if (content.includes('password') && content.match(/password\s*[:=]\s*['"][^'\"]+['"]/)) this.addError(rel,'Potential hardcoded password detected!');
      if (content.includes('TODO') || content.includes('FIXME')) { const t=(content.match(/TODO/g)||[]).length; const f=(content.match(/FIXME/g)||[]).length; if (t+f>0) this.addWarning(rel,`Contains ${t} TODOs and ${f} FIXMEs`); }
      if (content.match(/catch\s*\([^)]*\)\s*\{\s*\}/)) this.addWarning(rel,'Contains empty catch block');
      if (content.includes('await ') && !content.includes('try') && !content.includes('catch')) this.addWarning(rel,'Contains await without visible error handling');
    });
  }

  async testDependencies() {
    this.log('Checking package.json...', 'info'); const pkg = JSON.parse(await fs.readFile(path.join(this.rootDir,'package.json'),'utf8'));
    for (const dep of ['discord.js','@sapphire/framework','mongoose','mongodb']) { if (!pkg.dependencies[dep]) this.addError('package.json',`Missing required dependency: ${dep}`); else this.log(`  ✓ Found: ${dep}@${pkg.dependencies[dep]}`,'success'); }
    for (const s of ['build','start']) if (!pkg.scripts[s]) this.addWarning('package.json',`Missing recommended script: ${s}`);
  }

  async testConfiguration() {
    this.log('Checking configuration files...', 'info');
    try { await fs.access(path.join(this.srcDir,'config.example.ts')); this.log('  ✓ config.example.ts exists','success'); } catch { this.addWarning('Config','No config.example.ts found'); }
    try { await fs.access(path.join(this.srcDir,'example.env')); this.log('  ✓ example.env exists','success'); } catch { this.addWarning('Config','No example.env found'); }
    try { const raw = await fs.readFile(path.join(this.rootDir,'tsconfig.json'),'utf8'); const clean = raw.replace(/\/\/.*$/gm,'').replace(/\/\*[\s\S]*?\*\//g,''); const ts = JSON.parse(clean); if (!ts.compilerOptions) this.addError('tsconfig.json','Missing compilerOptions'); if (!ts.compilerOptions.outDir) this.addWarning('tsconfig.json','No outDir specified'); this.log('  ✓ tsconfig.json is valid','success'); } catch (e) { this.addWarning('tsconfig.json',`Could not parse tsconfig.json: ${e.message}`); }
  }

  async testDuplicateCommands() { this.log('Checking for duplicate command names...', 'info'); const names = new Map(); await this.scanDirectory(path.join(this.srcDir,'commands'), async (filePath) => { const content = await fs.readFile(filePath,'utf8'); const nameMatch = content.match(/name:\s*['"]([^'"]+)['"]/); if (nameMatch) { const n = nameMatch[1]; if (names.has(n)) this.addError(filePath,`Duplicate command name: ${n} (also in ${names.get(n)})`); else names.set(n, path.relative(this.rootDir,filePath)); } }); this.log(`Checked ${names.size} unique command names`,'success'); }

  generateReport() {
    this.log('\n' + '='.repeat(60),'info'); this.log('TEST SUMMARY','info'); this.log('='.repeat(60),'info'); this.log(`\nFiles checked: ${this.stats.filesChecked}`,'info'); this.log(`Commands found: ${this.stats.commandsFound}`,'info'); this.log(`Listeners found: ${this.stats.listenersFound}`,'info'); this.log(`Interaction handlers found: ${this.stats.interactionHandlersFound}`,'info'); this.log(`Models found: ${this.stats.modelsFound}`,'info'); this.log(`Modules found: ${this.stats.modulesFound}`,'info');
    if (this.warnings.length) { this.log(`\n⚠ WARNINGS (${this.warnings.length}):`,'warning'); this.warnings.forEach(({file,msg})=>this.log(`  • ${path.relative(this.rootDir,file)}: ${msg}`,'warning')); }
    if (this.errors.length) { this.log(`\n✗ ERRORS (${this.errors.length}):`,'error'); this.errors.forEach(({file,msg})=>this.log(`  • ${path.relative(this.rootDir,file)}: ${msg}`,'error')); }
    if (!this.errors.length && !this.warnings.length) this.log('\n✓ ALL TESTS PASSED! No errors or warnings found.','success'); else if (!this.errors.length) this.log(`\n✓ Tests passed with ${this.warnings.length} warnings`,'success'); else this.log(`\n✗ Tests failed with ${this.errors.length} errors and ${this.warnings.length} warnings`,'error');
    this.log('\n' + '='.repeat(60) + '\n','info'); return this.errors.length === 0;
  }

  async runAllTests() {
    console.log('\n🔍 Starting comprehensive bot tests...\n');
    const tests = [ { name: 'TypeScript Compilation', fn: () => this.testTypeScriptCompilation() }, { name: 'File Structure Validation', fn: () => this.testFileStructure() }, { name: 'Commands Validation', fn: () => this.testCommands() }, { name: 'Listeners Validation', fn: () => this.testListeners() }, { name: 'Interaction Handlers Validation', fn: () => this.testInteractionHandlers() }, { name: 'Models Validation', fn: () => this.testModels() }, { name: 'Modules Validation', fn: () => this.testModules() }, { name: 'Anti-patterns Check', fn: () => this.testAntiPatterns() }, { name: 'Dependencies Check', fn: () => this.testDependencies() }, { name: 'Configuration Check', fn: () => this.testConfiguration() }, { name: 'Duplicate Commands Check', fn: () => this.testDuplicateCommands() } ];
    let passed = 0; for (const t of tests) { const p = await this.runTest(t.name, t.fn); if (p) passed++; }
    const ok = this.generateReport(); this.log(`\nTests completed: ${passed}/${tests.length} passed\n`, passed === tests.length ? 'success' : 'warning'); process.exit(ok ? 0 : 1);
  }
}

(new BotTester()).runAllTests().catch(e=>{ console.error('Fatal error running tests:', e); process.exit(1); });
