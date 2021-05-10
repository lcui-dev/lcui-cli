const fs = require('fs-extra');
const path = require('path');
const assert = require('assert');
const { execSync, execFileSync } = require('child_process');

describe('i18n', () => {
  const cwd = path.resolve(__dirname, 'fixtures', 'i18n');
  const projectName = 'project';
  const projectDir = path.join(cwd, projectName);
  const targetFileExt = process.platform === 'win32' ? '.exe' : '';
  const targetFileName = `app${targetFileExt}`;
  const targetDir = path.join(projectDir, 'app');
  const targetFile = path.join(targetDir, targetFileName);
  let projectCreated = false;
  let projectBuilt = false;

  before(() => {
    if (fs.existsSync(projectDir)) {
      fs.removeSync(projectDir);
    }
  });
  describe('project', () => {
    it('should be created successfully', function () {
      this.timeout(10000);
      execSync(`lcui create ${projectName}`, { cwd });
      projectCreated = fs.existsSync(path.join(projectDir, 'lcpkg.json'));
      assert.strictEqual(projectCreated, true);
      fs.mkdirSync(path.join(projectDir, 'config'));
      fs.emptyDirSync(path.join(projectDir, 'src'));
      fs.mkdirSync(path.join(projectDir, 'src', 'lib'));
      fs.copyFileSync(path.join(cwd, 'app.c'), path.join(projectDir, 'src', 'app.c'));
    });
    it('the configuration file should be compiled successfully', function () {
      this.timeout(10000);
      assert.strictEqual(projectCreated, true);
      execSync('lcui generate i18n', { cwd: projectDir });
      execSync('lcui compile i18n', { cwd: projectDir });
      assert.strictEqual(fs.existsSync(path.join(projectDir, 'config', 'i18n.js')), true);
      assert.strictEqual(fs.existsSync(path.join(projectDir, 'src', 'lib', 'i18n.c')), true);
      assert.strictEqual(fs.existsSync(path.join(projectDir, 'src', 'lib', 'i18n.h')), true);
    });
    it('should be initialized successfully', function () {
      this.timeout(240000);
      assert.strictEqual(projectCreated, true);
      execSync('lcui setup', { cwd: projectDir });
    });
    it('should be built successfully', function () {
      this.timeout(60000);
      assert.strictEqual(projectCreated, true);
      execSync('lcui build', { cwd: projectDir });
      projectBuilt = fs.existsSync(targetFile);
      assert.strictEqual(projectBuilt, true);
    });
  });
  describe('app', () => {
    it('should check arguments', function () {
      this.timeout(5000);
      assert.strictEqual(projectBuilt, true);
      try {
        execFileSync(targetFile, [], { cwd: targetDir });
        assert.fail('no error output');
      } catch (err) {
        assert.ok(true, err.stdout.toString());
      }
    });
    it('should check locale exists', function () {
      this.timeout(5000);
      assert.strictEqual(projectBuilt, true);
      try {
        execFileSync(targetFile, ['test', 'hello'], { cwd: targetDir });
        assert.fail('no error output');
      } catch (err) {
        assert.ok(true, err.stdout.toString());
      }
    });
    it('should check text exists', function () {
      this.timeout(5000);
      assert.strictEqual(projectBuilt, true);
      try {
        execFileSync(targetFile, ['en', 'hello'], { cwd: targetDir });
        assert.fail('no error output');
      } catch (err) {
        assert.ok(true, err.stdout.toString());
      }
    });
    it('should print translation text', function () {
      this.timeout(5000);
      assert.strictEqual(projectBuilt, true);
      const enText = execFileSync(targetFile, ['en', 'message.hello'], { cwd: targetDir }).toString();
      assert.strictEqual(enText.trim(), 'hello world');
    });
  });
});
