import fs from 'fs';
import path from 'path';

const dirs = ['app', 'components', 'lib', 'hooks'];

const headerTemplate = (filename) => `/**
 * @file ${filename}
 * @description_he קובץ מערכת
 * @description_en System file
 * @inputs    None
 * @outputs   None
 * @depends_on None
 * @used_by   System
 * @fix_guide
 *   - General: Review dependencies
 */

`;

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function (file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
      
      // Auto README.md for folders
      const readmePath = path.join(file, 'README.md');
      if (!fs.existsSync(readmePath)) {
        fs.writeFileSync(readmePath, `# ${path.basename(file)} Directory\n\n- Contains dependencies for this module.\n`);
        console.log('Created README.md in ' + file);
      }

    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

dirs.forEach(dir => {
  const readmePath = path.join(dir, 'README.md');
  if (fs.existsSync(dir) && !fs.existsSync(readmePath)) {
     fs.writeFileSync(readmePath, `# ${path.basename(dir)} Directory\n\n- This maps internal project logic.\n`);
  }

  if (fs.existsSync(dir)) {
    const files = walk(dir);
    files.forEach(file => {
      let content = fs.readFileSync(file, 'utf8');
      if (!content.includes('/**') && !content.includes('@file')) {
        // Find if file has 'use client' or 'use server'
        if (content.startsWith("'use client';") || content.startsWith('"use client";') || content.startsWith("'use server';") || content.startsWith('"use server";')) {
          const lines = content.split('\n');
          const directive = lines[0];
          const rest = lines.slice(1).join('\n');
          fs.writeFileSync(file, `${directive}\n\n${headerTemplate(path.basename(file))}${rest}`);
        } else {
          fs.writeFileSync(file, `${headerTemplate(path.basename(file))}${content}`);
        }
        console.log('Added header to ' + file);
      }
    });
  }
});
console.log('Documentation Audit Complete.');
