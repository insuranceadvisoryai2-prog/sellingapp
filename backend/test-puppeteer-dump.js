const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const fs = require('fs');
const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
];
let executablePath = chromePaths.find(p => fs.existsSync(p));

async function testPuppeteer(url) {
  const browser = await puppeteer.launch({ executablePath, headless: "new" });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  const content = await page.content();
  fs.writeFileSync('meesho-response.html', content);
  console.log('Saved to meesho-response.html');
  await browser.close();
}

testPuppeteer('https://www.meesho.com/g-nxt-flip-flops-and-slippers-for-men/p/79jokm');
