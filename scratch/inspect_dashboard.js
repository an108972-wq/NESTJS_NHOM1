const fs = require('fs');
const content = fs.readFileSync('public/admin.html', 'utf8');
const lines = content.split(/\r?\n/);
lines.forEach((l, i) => {
  if (l.includes('id="dashboard"') || (l.includes('</section>') && i < 650 && i > 250)) {
    console.log((i + 1) + ': ' + l.trim());
  }
});

