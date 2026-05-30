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
  if (!executablePath) {
    console.error('Chrome not found!');
    return;
  }
  console.log('Launching puppeteer using:', executablePath);
  
  const browser = await puppeteer.launch({
    executablePath,
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  console.log('Opening page...');
  const page = await browser.newPage();
  
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
  });
  
  console.log(`Navigating to ${url}...`);
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  
  console.log('Response Status:', response.status());
  
  const content = await page.content();
  
  if (content.includes('__NEXT_DATA__')) {
    console.log('✅ Found __NEXT_DATA__ - Successfully bypassed bot detection!');
  } else if (content.includes('Just a moment...')) {
    console.log('❌ Cloudflare Challenge / Captcha detected.');
  } else if (response.status() === 403) {
    console.log('❌ 403 Forbidden - Still blocked.');
  } else {
    console.log('❓ Unknown response format. Length:', content.length);
  }
  
  await browser.close();
}

const testUrl = 'https://www.meesho.com/g-nxt-flip-flops-and-slippers-for-men/p/79jokm';
testPuppeteer(testUrl).catch(console.error);
