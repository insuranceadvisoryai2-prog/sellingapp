const { scrapeMeeshoProduct } = require('./backend/scraper');

const url = 'https://www.meesho.com/cotton-blend-men-cotton-blend-regular-tshirts/p/8kp99w';

async function run() {
  try {
    const data = await scrapeMeeshoProduct(url);
    console.log("Scrape successful:");
    console.log("Title:", data.title);
    console.log("Price:", data.price);
    console.log("Original Price:", data.originalPrice);
    console.log("Images count:", data.images?.length);
    console.log("Images:", data.images);
    console.log("Description:", data.description);
  } catch (error) {
    console.error("Scrape failed:", error.message);
  }
}

run();
