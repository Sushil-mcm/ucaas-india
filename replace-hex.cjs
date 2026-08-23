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

walkDir('./src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace class names first
    let newContent = content
      .replace(/bg-\[#(3b82f6|2563eb|1d4ed8|1473ff|1473FF|135de6|009fc9)\]/gi, 'bg-ucass-active')
      .replace(/text-\[#(3b82f6|2563eb|1d4ed8|1473ff|1473FF|135de6|009fc9)\]/gi, 'text-ucass-active')
      .replace(/border-\[#(3b82f6|2563eb|1d4ed8|1473ff|1473FF|135de6|009fc9)\]/gi, 'border-ucass-active')
      .replace(/ring-\[#(3b82f6|2563eb|1d4ed8|1473ff|1473FF|135de6|009fc9)\]/gi, 'ring-ucass-active')
      .replace(/accent-\[#(3b82f6|2563eb|1d4ed8|1473ff|1473FF|135de6|009fc9)\]/gi, 'accent-ucass-active')
      .replace(/bg-\[#(eef4ff|eff6ff|dbeafe)\]/gi, 'bg-ucass-active-bg')
      .replace(/text-\[#(eef4ff|eff6ff|dbeafe)\]/gi, 'text-ucass-active-bg');

    // Replace literal string colors in props or JS objects (e.g. color: '#3b82f6')
    newContent = newContent
      .replace(/['"]#(3b82f6|2563eb|1d4ed8|1473ff|1473FF|135de6|009fc9)['"]/gi, "'var(--color-ucass-active)'")
      .replace(/['"]#(eef4ff|eff6ff|dbeafe)['"]/gi, "'var(--color-ucass-active-bg)'");

    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent);
      modifiedFiles++;
    }
  }
});
console.log('Modified ' + modifiedFiles + ' files.');
