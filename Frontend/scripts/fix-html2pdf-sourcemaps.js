const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'node_modules', 'html2pdf.js', 'dist');

if (!fs.existsSync(distDir)) {
  console.log('html2pdf.js dist folder not found; skipping sourcemap cleanup.');
  process.exit(0);
}

let fixed = 0;
for (const fileName of fs.readdirSync(distDir)) {
  if (!fileName.endsWith('.js')) continue;

  const filePath = path.join(distDir, fileName);
  const source = fs.readFileSync(filePath, 'utf8');
  const updated = source.replace(/^\s*\/\/\#\s*sourceMappingURL=.*$/gm, '');

  if (updated !== source) {
    fs.writeFileSync(filePath, updated, 'utf8');
    fixed += 1;
    console.log(`Removed source map reference from ${fileName}`);
  }
}

if (fixed === 0) {
  console.log('No html2pdf.js source map references found to remove.');
}
