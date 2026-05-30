const { scrapeMeeshoProduct } = require('./scraper');
const { rewriteProductDetails } = require('./ai');

async function runTest() {
  console.log('🧪 Starting Meesho Scraper & AI copywriter validation...');

  try {
    console.log('\n1. Testing AI Rewriting & Classification Heuristics...');
    const originalTitle = 'Women Silk Blend Floral Print Saree with Blouse Piece';
    const originalDesc = 'This is a premium quality Banarasi silk saree for ladies. Perfect for weddings, parties, and festive celebrations. Includes a matching unstitched blouse piece.';
    
    const aiResult = await rewriteProductDetails(originalTitle, originalDesc);
    console.log('AI Result:', JSON.stringify(aiResult, null, 2));

    if (aiResult.rewritten_title && aiResult.subcategory === 'Fashion - Women') {
      console.log('✅ AI Heuristics/Model rewrite passed!');
    } else {
      console.log('❌ AI rewrite test failed parameters.');
    }

    console.log('\n2. Testing Scraper Validator logic...');
    try {
      await scrapeMeeshoProduct('https://google.com');
      console.log('❌ Scraper failed to reject invalid non-Meesho URL');
    } catch (e) {
      if (e.message.includes('Invalid URL')) {
        console.log('✅ Scraper correctly validated and rejected invalid URL!');
      } else {
        console.log('❌ Scraper threw unexpected validation error:', e.message);
      }
    }

  } catch (error) {
    console.error('❌ Test script encountered error:', error);
  }
}

runTest();
