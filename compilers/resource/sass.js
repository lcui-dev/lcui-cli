import sass from 'sass';

export function compileSassFile(file) {
  return sass.compile(file);
}
