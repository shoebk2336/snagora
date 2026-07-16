const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace various indigo classes with emerald equivalents
  const modified = content
    .replace(/indigo-50/g, 'emerald-50')
    .replace(/indigo-100/g, 'emerald-100')
    .replace(/indigo-200/g, 'emerald-200')
    .replace(/indigo-300/g, 'emerald-300')
    .replace(/indigo-400/g, 'emerald-400')
    .replace(/indigo-500/g, 'emerald-500')
    .replace(/indigo-600/g, 'emerald-600')
    .replace(/indigo-700/g, 'emerald-700')
    .replace(/indigo-800/g, 'emerald-800')
    .replace(/indigo-900/g, 'emerald-900')
    .replace(/indigo-950/g, 'emerald-950')
    
    // Also cover raw Tailwind border and background hover tints
    .replace(/hover:bg-indigo-500/g, 'hover:bg-emerald-500')
    .replace(/hover:bg-indigo-600/g, 'hover:bg-emerald-600')
    .replace(/hover:bg-indigo-50/g, 'hover:bg-emerald-50')
    .replace(/focus:border-indigo-500/g, 'focus:border-emerald-500')
    .replace(/bg-indigo-600\/10/g, 'bg-emerald-600/10')
    .replace(/bg-indigo-600\/30/g, 'bg-emerald-600/30')
    .replace(/bg-indigo-400\/15/g, 'bg-emerald-400/15')
    .replace(/border-indigo-500\/35/g, 'border-emerald-500/35')
    .replace(/shadow-indigo-500\/20/g, 'shadow-emerald-500/20')
    .replace(/shadow-indigo-500\/10/g, 'shadow-emerald-500/10')
    .replace(/shadow-indigo-500\/25/g, 'shadow-emerald-500/25')
    .replace(/border-indigo-500\/20/g, 'border-emerald-500/20')
    .replace(/border-indigo-100/g, 'border-emerald-100')
    .replace(/border-indigo-200/g, 'border-emerald-200');

  if (content !== modified) {
    fs.writeFileSync(filePath, modified, 'utf8');
    console.log(`Updated colors in: ${filePath}`);
  }
}

function traverseDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      traverseDirectory(fullPath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      replaceInFile(fullPath);
    }
  }
}

// Run on app/ and components/
traverseDirectory(path.join(__dirname, '..', 'app'));
traverseDirectory(path.join(__dirname, '..', 'components'));
console.log('Color palette replacement completed.');
