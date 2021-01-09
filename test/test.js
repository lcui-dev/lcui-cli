const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');
const Compiler = require('../compilers/i18n');

describe('i18n', () => {
  describe('compiler', () => {
    const compiler = new Compiler({ cwd: __dirname, sourceDir: __dirname });
    const sourceFile = path.join(__dirname, 'i18n.c');
    const headerFile = path.join(__dirname, 'i18n.h');

    if (fs.existsSync(sourceFile)) {
      fs.unlinkSync(sourceFile);
    }
    if (fs.existsSync(headerFile)) {
      fs.unlinkSync(headerFile);
    }

    compiler.compile(path.join(__dirname, 'i18n.js'));

    it(`should output ${sourceFile}`, () => {
      assert.strictEqual(fs.existsSync(sourceFile), true);
    });
    it(`should output ${headerFile}`, () => {
      assert.strictEqual(fs.existsSync(headerFile), true);
    });
  });

  describe('app', () => {
    it('should be compiled successfully', () => {
      execSync('gcc -Werror -o test test.c `pkg-config --libs lcui2`', { cwd: __dirname });
      assert.ok(true, 'compiled');
    });
    it('should check arguments', () => {
      try {
        execSync('./test', { cwd: __dirname });
        assert.fail('no error output');
      } catch (err) {
        assert.ok(true, err.stdout.toString());
      }
    });
    it('should check locale exists', () => {
      try {
        execSync('./test test hello', { cwd: __dirname });
        assert.fail('no error output');
      } catch (err) {
        assert.ok(true, err.stdout.toString());
      }
    });
    it('should check text exists', () => {
      try {
        execSync('./test en hello', { cwd: __dirname });
        assert.fail('no error output');
      } catch (err) {
        assert.ok(true, err.stdout.toString());
      }
    });
    it('should print translation text', () => {
      let enText = '';
      let cnText = '';

      try {
        enText = execSync('./test en message.hello', { cwd: __dirname }).toString();
        cnText = execSync('./test cn message.hello', { cwd: __dirname }).toString();
      } catch (err) {
        assert.fail(err.stdout.toString());
      }
      assert.strictEqual(enText, 'hello world\n');
      assert.strictEqual(cnText, '你好，世界\n');
    });
  });
});
