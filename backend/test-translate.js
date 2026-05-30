const axios = require('axios');
const cheerio = require('cheerio');

async function testTranslateProxy(url) {
  const translateUrl = `https://translate.google.com/translate?sl=en&tl=en&u=${encodeURIComponent(url)}`;
  try {
    const res = await axios.get(translateUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });
    const html = res.data;
    if (html.includes('__NEXT_DATA__')) {
      console.log('✅ Found NEXT_DATA via Google Translate!');
    } else if (html.includes('akamai')) {
      console.log('❌ Blocked by Akamai');
    } else {
      console.log('❓ Unknown response. Length:', html.length);
      const $ = cheerio.load(html);
      console.log('Title text:', $('title').text());
      const bodyText = $('body').text();
      if (bodyText.includes('Flip Flops')) {
        console.log('✅ Found product text!');
      }
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}

testTranslateProxy('https://www.meesho.com/g-nxt-flip-flops-and-slippers-for-men/p/79jokm');
