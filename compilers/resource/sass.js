const sass = require('sass');

function compileSassFile(file) {
  return sass.compile(file);
}

module.exports = {
  compileSassFile
}
