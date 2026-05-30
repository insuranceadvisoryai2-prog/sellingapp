const url = 'https://www.meesho.com/g-nxt-flip-flops-and-slippers-for-men/p/79jokm';

async function testFetch() {
  console.log("Trying native fetch...");
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Length:", text.length);
    if(text.includes('__NEXT_DATA__')) {
      console.log("SUCCESS! Found Next data.");
    } else if (text.includes('403')) {
      console.log("FAILED: 403 Forbidden");
    } else {
      console.log("FAILED: other");
    }
  } catch (e) {
    console.error(e);
  }
}

testFetch();
