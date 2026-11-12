const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');
const lines = html.split(/\r?\n/);
let inUsers = false;
let usersLines = [];
lines.forEach((l, i) => {
  if (l.includes('id="users"')) inUsers = true;
  if (inUsers) {
    usersLines.push((i+1) + ': ' + l);
    if (l.includes('</section>')) inUsers = false;
  }
});
console.log(usersLines.slice(0, 35).join('\n'));

