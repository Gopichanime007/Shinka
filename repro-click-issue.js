const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const root = path.join(__dirname, 'docs');
const port = 8001;

const server = http.createServer((req, res) => {
  let filePath = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (req.url === '/' || req.url === '/index.html') filePath = path.join(root, 'index.html');
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).slice(1);
    const map = { html: 'text/html', js: 'application/javascript', css: 'text/css', json: 'application/json', svg: 'image/svg+xml', png: 'image/png' };
    res.writeHead(200, { 'Content-Type': map[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
});

(async () => {
  server.listen(port);
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  page.on('requestfailed', req => console.log('REQUEST FAILED:', req.url(), req.failure().errorText));

  await page.goto(`http://localhost:${port}/pages/tasks.html`, { waitUntil: 'networkidle0' });
  const newTaskBtn = await page.$('#newTaskBtn');
  const overlay = await page.$('.modal-overlay');
  const overlayVisible = await page.evaluate(el => {
    if (!el) return null;
    const style = getComputedStyle(el);
    return { display: style.display, opacity: style.opacity, pointerEvents: style.pointerEvents, zIndex: style.zIndex, visibility: style.visibility };
  }, overlay);
  console.log('overlay:', overlayVisible);

  const body = await page.$('body');
  const bodyRect = await page.evaluate(el => ({ width: el.clientWidth, height: el.clientHeight }), body);
  console.log('body rect:', bodyRect);

  const clicked = await page.evaluate(() => {
    const btn = document.querySelector('#newTaskBtn');
    if (!btn) return 'no-button';
    btn.click();
    const overlay = document.querySelector('.modal-overlay');
    return overlay.classList.contains('open');
  });
  console.log('click result open?', clicked);

  await browser.close();
  server.close();
})();