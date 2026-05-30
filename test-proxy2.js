const url = 'https://corsproxy.io/?' + encodeURIComponent('https://www.meesho.com/g-nxt-flip-flops-and-slippers-for-men/p/79jokm');

async function testFetch() {
  try {
    const res = await fetch(url);
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
