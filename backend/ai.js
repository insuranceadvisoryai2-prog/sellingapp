const { Anthropic } = require('@anthropic-ai/sdk');
require('dotenv').config();

const SUBCATEGORIES = [
  'Electronics',
  'Mobile Phones',
  'Laptops',
  'Fashion - Men',
  'Fashion - Women',
  'Kids',
  'Home & Kitchen',
  'Beauty',
  'Sports',
  'Toys',
  'Books',
  'Automotive'
];

// Heuristic keyword auto-categorizer for fallback mode
function getHeuristicCategory(title = '', description = '') {
  const text = `${title} ${description}`.toLowerCase();
  
  if (text.match(/phone|mobile|smartphone|iphone|android|realme|redmi|oneplus/)) {
    return { subcategory: 'Mobile Phones', parentCategory: 'Electronics' };
  }
  if (text.match(/laptop|macbook|computer|desktop|keyboard|mouse|monitor/)) {
    return { subcategory: 'Laptops', parentCategory: 'Electronics' };
  }
  if (text.match(/earphone|headphone|smartwatch|watch|charger|cable|powerbank|speaker|bluetooth/)) {
    return { subcategory: 'Electronics', parentCategory: 'Electronics' };
  }
  if (text.match(/saree|kurta|kurti|dress|lehenga|women|girl|female|makeup|lipstick|eyeliner|nail/)) {
    if (text.match(/makeup|lipstick|eyeliner|cream|shampoo|serum|skincare|perfume/)) {
      return { subcategory: 'Beauty', parentCategory: 'Beauty & Personal Care' };
    }
    return { subcategory: 'Fashion - Women', parentCategory: 'Fashion' };
  }
  if (text.match(/shirt|tshirt|t-shirt|jeans|men|boy|male|wallet|belt/)) {
    return { subcategory: 'Fashion - Men', parentCategory: 'Fashion' };
  }
  if (text.match(/toy|doll|game|puzzle|blocks|board game/)) {
    return { subcategory: 'Toys', parentCategory: 'Kids & Toys' };
  }
  if (text.match(/baby|kids|infant|toddler|child/)) {
    return { subcategory: 'Kids', parentCategory: 'Kids & Toys' };
  }
  if (text.match(/kitchen|cooker|bottle|plate|pan|knife|home|bedsheet|curtain|cushion|pillow|decor|furniture/)) {
    return { subcategory: 'Home & Kitchen', parentCategory: 'Home' };
  }
  if (text.match(/cream|shampoo|makeup|perfume|serum|lotion|lip/)) {
    return { subcategory: 'Beauty', parentCategory: 'Beauty & Personal Care' };
  }
  if (text.match(/sport|gym|cricket|football|yoga|dumbbells|fitness/)) {
    return { subcategory: 'Sports', parentCategory: 'Sports & Outdoors' };
  }
  if (text.match(/book|novel|dictionary|notebook|pen|pencil|stationery/)) {
    return { subcategory: 'Books', parentCategory: 'Books & Stationery' };
  }
  if (text.match(/car|bike|motorcycle|automotive|helmet|tyre|wiper/)) {
    return { subcategory: 'Automotive', parentCategory: 'Automotive' };
  }

  // Fallback defaults
  return { subcategory: 'Home & Kitchen', parentCategory: 'Home' };
}

// Generate creative SEO-optimized metadata offline
function generateMockRewrite(title, description) {
  const { subcategory, parentCategory } = getHeuristicCategory(title, description);
  
  // Clean original title (remove brackets, extra spacings)
  let cleanTitle = title.replace(/[\[\]\(\)\-\|]/g, ' ').replace(/\s+/g, ' ').trim();
  if (cleanTitle.length > 50) cleanTitle = cleanTitle.substring(0, 47) + '...';

  // Array of premium marketing prefixes
  const prefixes = ['Premium', 'Stylish', 'Designer', 'Exclusive', 'Smart', 'Luxury', 'Ergonomic'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  
  const rewrittenTitle = `${prefix} ${cleanTitle}`;
  const sellingDescription = `Experience ultimate style and comfort with this premium product, designed to meet your daily lifestyle needs. With its high-quality materials and durable construction, it makes a perfect addition to your collection.`;

  return {
    rewritten_title: rewrittenTitle.substring(0, 70),
    selling_description: sellingDescription,
    subcategory,
    parent_category: parentCategory
  };
}

async function rewriteProductDetails(title, description) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey === 'YOUR_ANTHROPIC_API_KEY' || apiKey.trim() === '') {
    console.warn('⚠️ ANTHROPIC_API_KEY is not set. Running in Mock AI response mode.');
    // Delay 1 second to simulate AI loading experience
    await new Promise(resolve => setTimeout(resolve, 1200));
    return generateMockRewrite(title, description);
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    const prompt = `You are a product copywriter. Given a product title and description scraped from Meesho, rewrite the title to be catchy, clear, and SEO-optimized (max 70 chars). Also write a 2-sentence selling description. Detect the most appropriate subcategory from this list: [Electronics, Mobile Phones, Laptops, Fashion - Men, Fashion - Women, Kids, Home & Kitchen, Beauty, Sports, Toys, Books, Automotive].

Product Title: "${title}"
Product Description: "${description}"

Return JSON ONLY:
{
  "rewritten_title": "string",
  "selling_description": "string",
  "subcategory": "string",
  "parent_category": "string"
}`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      temperature: 0.2,
      system: "You are a product copywriter. Your job is to return ONLY a raw JSON block matching the requested format. Do not write any conversational intro or wrap the response in markdown code blocks.",
      messages: [{ role: 'user', content: prompt }]
    });

    const responseText = response.content[0].text;
    
    // Attempt parsing JSON
    let cleanJsonStr = responseText.trim();
    // Strip markdown code block wrappers if any
    if (cleanJsonStr.startsWith('```')) {
      cleanJsonStr = cleanJsonStr.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    }

    const aiData = JSON.parse(cleanJsonStr);
    
    // Set fallback if subcategory isn't in original list
    if (!SUBCATEGORIES.includes(aiData.subcategory)) {
      const fallbackCat = getHeuristicCategory(title, description);
      aiData.subcategory = fallbackCat.subcategory;
      aiData.parent_category = fallbackCat.parentCategory;
    }

    return aiData;

  } catch (error) {
    console.error('Claude API Error:', error.message);
    console.warn('Falling back to local heuristic rewrite due to API error.');
    return generateMockRewrite(title, description);
  }
}

module.exports = {
  rewriteProductDetails,
  SUBCATEGORIES
};
