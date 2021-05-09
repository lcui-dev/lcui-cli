const fs = require('fs-extra');
const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

describe('basic', () => {
  const cwd = path.resolve(__dirname, 'fixtures', 'basic');
  const projectName = 'project';
  const projectDir = path.join(cwd, projectName);
  const targetFileExt = process.platform === 'win32' ? '.exe' : '';
  const targetFileName = `app${targetFileExt}`;
  const targetDir = path.join(projectDir, 'app');
  const targetFile = path.join(targetDir, targetFileName);
  const cssFile = path.join(targetDir, 'assets', 'stylesheets', 'app.css');
  let projectCreated = false;

  before(() => {
    fs.emptyDirSync(cwd);
  });
  it('should create the project successfully', function () {
    this.timeout(10000);
    execSync(`lcui create ${projectName}`, { cwd });
    projectCreated = fs.existsSync(path.join(projectDir, 'lcpkg.json'));
    assert.strictEqual(projectCreated, true);
  });
  it('should initialize the project successfully', function () {
    this.timeout(240000);
    assert.strictEqual(projectCreated, true);
    execSync('lcui setup', { cwd: projectDir });
  });
  it('should build the project successfully', function () {
    this.timeout(60000);
    assert.strictEqual(projectCreated, true);
    execSync('lcui build', { cwd: projectDir });
    assert.strictEqual(fs.existsSync(targetFile), true);
    assert.strictEqual(fs.existsSync(cssFile), true);
  });
});
