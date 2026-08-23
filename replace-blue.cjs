const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

let modifiedFiles = 0;
// We also include hover:, focus:, active:, dark:, group-hover:, etc.
// A simpler regex: look for ANY prefix before -blue-
// For example: \b([\w-]+:)?(text|bg|border|ring|fill|stroke|from|via|to|shadow)-blue-(50|100|200|300|400|500|600|700|800|900|950|fb)\b

const regex = /\b([\w-]+:)?(text|bg|border|ring|fill|stroke|from|via|to|shadow|outline)-blue-(50|100|200|300|400|500|600|700|800|900|950|fb)\b/g;

walkDir('./src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts') || filePath.endsWith('.css') || filePath.endsWith('.js')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    let newContent = content.replace(regex, (match, statePrefix, attrPrefix, shade) => {
      // statePrefix is like "hover:" or undefined
      // attrPrefix is like "text" or "bg"
      // shade is like "50" or "600"
      
      const sp = statePrefix || '';
      const shadeNum = parseInt(shade);
      let newSuffix = 'ucass-active';
      
      // Light shades -> ucass-active-bg
      // Dark shades -> ucass-active
      if (shade === 'fb' || shadeNum <= 400) {
        newSuffix = 'ucass-active-bg';
      }
      
      // However, if attr is 'text' and shade is light, should it be active-bg?
      // "light blue -> *-bg, dark/primary blue -> *-active"
      // "text-blue-fb" is light? Actually 'fb' in "text-blue-fb" might be from messenger.
      return sp + attrPrefix + '-' + newSuffix;
    });

    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent);
      modifiedFiles++;
      console.log('Updated: ' + filePath);
    }
  }
});
console.log('Modified ' + modifiedFiles + ' files.');
