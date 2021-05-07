const fs = require('fs');
const path = require('path');
const sass = require('sass');
const logger = require('../logger');

function compile(inputFile, inputDir, outDir) {
  const file = inputFile ? path.join(inputDir, inputFile) : inputDir;
  const filePath = path.parse(inputFile);
  const outFile = path.join(outDir, filePath.dir, `${filePath.name}.css`);
  const outFileInfo = path.parse(outFile);

  if (!fs.existsSync(file)) {
    return 0;
  }
  if (fs.statSync(file).isDirectory()) {
    return fs
      .readdirSync(file)
      .reduce((total, name) => total + compile(path.join(inputFile, name), inputDir, outDir), 0);
  }
  if (['_', '.'].includes(filePath.name.charAt(0))
    || !['.sass', '.scss'].includes(filePath.ext)) {
    return 0;
  }
  if (!fs.existsSync(outFileInfo.dir)) {
    fs.mkdirSync(outFileInfo.dir, { recursive: true });
  }
  logger.log(`writing ${outFile}`);
  const result = sass.renderSync({
    file,
    outputStyle: 'expanded'
  });
  fs.writeFileSync(outFile, result.css);
  return 1;
}

module.exports = {
  compile
};
