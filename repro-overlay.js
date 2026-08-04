const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const root = path.join(__dirname, 'docs');
const port = 8003;
const server = http.createServer((req, res) => {
  let filePath = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (req.url === '/' || req.url === '/index.html') filePath = path.join(root, 'index.html');
  if (!filePath.startsWith(root)) { res.writeHead(403); res.end('Forbidden'); return; }
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(filePath).slice(1);
    const map = { html:'text/html', js:'application/javascript', css:'text/css', json:'application/json', svg:'image/svg+xml', png:'image/png', ico:'image/x-icon', map:'application/octet-stream' };
    res.writeHead(200, {'Content-Type': map[ext] || 'application/octet-stream'});
    fs.createReadStream(filePath).pipe(res);
  });
});
(async () => {
  server.listen(port);
  const browser = await puppeteer.launch({ args:['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  await page.goto(`http://localhost:${port}/pages/tasks.html`, { waitUntil: 'networkidle0' });
  const data = await page.evaluate(() => {
    const elems = [...document.querySelectorAll('*')];
    const blocks = elems.filter(el => {
      const style = getComputedStyle(el);
      return style.pointerEvents !== 'none' && parseInt(style.zIndex) >= 0 && !(style.display === 'none') && !(style.visibility === 'hidden');
    }).map(el => ({
      desc: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className ? '.' + String(el.className).replace(/\s+/g, '.') : ''),
      z: getComputedStyle(el).zIndex,
      pe: getComputedStyle(el).pointerEvents,
      op: getComputedStyle(el).opacity,
      vis: getComputedStyle(el).visibility,
      pos: getComputedStyle(el).position,
      rect: el.getBoundingClientRect()
    })).slice(0, 60);
    const btn = document.querySelector('#newTaskBtn');
    const rect = btn ? btn.getBoundingClientRect() : null;
    const center = rect ? { x: rect.left + rect.width/2, y: rect.top + rect.height/2 } : null;
    const top = center ? document.elementFromPoint(center.x, center.y) : null;
    return { btnRect: rect, center, top: top ? top.tagName.toLowerCase() + (top.id ? '#'+top.id : '') + (top.className ? '.'+top.className.replace(/\s+/g,'.'): '') : null, blocks };
  });
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
  server.close();
})();