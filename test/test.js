const fs = require('fs')
const path = require('path')
const assert = require('assert')
const { execSync } = require('child_process')
const { compile } = require('../lib/i18n')

describe('i18n', function () {
  describe('compiler', function () {
    const sourceFile = path.join(__dirname, 'locales.c')
    const headerFile = path.join(__dirname, 'locales.h')
  
    if (fs.existsSync(sourceFile)) {
      fs.unlinkSync(sourceFile)
    }
    if (fs.existsSync(headerFile)) {
      fs.unlinkSync(headerFile)
    }
  
    compile(path.join(__dirname, 'locales.js'))
  
    it(`should output ${sourceFile}`, () => {
      assert.equal(fs.existsSync(sourceFile), true)
    })
    it(`should output ${headerFile}`, () => {
      assert.equal(fs.existsSync(headerFile), true)
    })
  })
  
  describe('app', function () {
    it('should be compiled successfully', () => {
      execSync('gcc -Werror -o test test.c `pkg-config --libs lcui`', { cwd: __dirname })
      assert.ok(true, 'compiled')
    })
    it('should check arguments', () => {
      let err = false
  
      try {
        execSync('./test', { cwd: __dirname })
      } catch {
        err = true
      }
      assert.equal(err, true)
    })
    it('should check locale exists', () => {
      let err = false
  
      try {
        execSync('./test test hello', { cwd: __dirname })
      } catch {
        err = true
      }
      assert.equal(err, true)
    })
    it('should check text exists', () => {
      let err = false
  
      try {
        execSync('./test en hello', { cwd: __dirname })
      } catch {
        err = true
      }
      assert.equal(err, true)
    })
    it('should print translation text', () => {
      let enText = ''
      let cnText = ''
  
      try {
        enText = execSync('./test en message.hello', { cwd: __dirname }).toString()
        cnText = execSync('./test cn message.hello', { cwd: __dirname }).toString()
      } catch (err) {
        assert.fail(err.message)
      }
      assert.equal(enText, 'hello world\n')
      assert.equal(cnText, '你好，世界\n')
    })
  })  
})
