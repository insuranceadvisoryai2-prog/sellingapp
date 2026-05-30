const url = 'https://www.meesho.com/g-nxt-flip-flops-and-slippers-for-men/p/79jokm';

async function testFetch() {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': '*/*'
      }
    });
    console.log("Status:", res.status);
    const text = await res.text();
    if(text.includes('__NEXT_DATA__')) {
      console.log("SUCCESS! Found Next data.");
    } else {
      console.log("FAILED");
    }
  } catch (e) {
    console.error(e);
  }
}

testFetch();
