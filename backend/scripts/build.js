const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

const filesToCopy = [
  'server.js',
  'src',
  '.env.example',
  'README.md',
];

function ensureDir(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function cleanDir(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true });
}

function copyItem(relativePath) {
  const sourcePath = path.join(rootDir, relativePath);
  const targetPath = path.join(distDir, relativePath);

  fs.cpSync(sourcePath, targetPath, {
    recursive: true,
    force: true,
  });
}

function buildPackageJson() {
  const packageJsonPath = path.join(rootDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  const distPackageJson = {
    name: packageJson.name,
    version: packageJson.version,
    private: packageJson.private,
    description: packageJson.description,
    main: 'server.js',
    scripts: {
      start: 'node server.js',
    },
    keywords: packageJson.keywords,
    author: packageJson.author,
    license: packageJson.license,
    dependencies: packageJson.dependencies,
  };

  fs.writeFileSync(
    path.join(distDir, 'package.json'),
    `${JSON.stringify(distPackageJson, null, 2)}\n`,
    'utf8'
  );
}

function build() {
  cleanDir(distDir);
  ensureDir(distDir);

  for (const file of filesToCopy) {
    copyItem(file);
  }

  buildPackageJson();

  console.log(`Backend build generated in: ${distDir}`);
}

build();
