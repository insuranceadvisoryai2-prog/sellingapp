// WholesaleMartIndia — Category taxonomy (mirrors Meesho structure)

export const CATEGORIES = [
  {
    name: "Women's Clothing",
    icon: '👗',
    color: '#e91e63',
    subcategories: [
      'Sarees','Kurtis & Kurtas','Lehengas & Skirts','Salwar Suits',
      'Tops & T-Shirts','Dresses & Jumpsuits','Jeans & Trousers',
      'Nightwear & Loungewear','Activewear','Jackets & Coats',
      'Sweaters & Hoodies','Ethnic Wear','Blouses','Dupattas & Stoles',
    ],
  },
  {
    name: "Men's Clothing",
    icon: '👔',
    color: '#1565c0',
    subcategories: [
      'T-Shirts & Polos','Shirts','Jeans & Trousers','Ethnic Wear',
      'Activewear & Sportswear','Jackets & Blazers','Sweaters & Hoodies',
      'Shorts','Innerwear & Vests','Nightwear','Track Pants',
    ],
  },
  {
    name: "Kids' Clothing",
    icon: '🧒',
    color: '#ff9800',
    subcategories: [
      "Boys' Clothing","Girls' Clothing","Baby Clothing (0-2 yrs)",
      'Kids Ethnic Wear','Kids Activewear','School Uniform',
      'Kids Nightwear','Kids Innerwear',
    ],
  },
  {
    name: 'Kurta & Ethnic Wear',
    icon: '🥻',
    color: '#7b1fa2',
    subcategories: [
      'Kurta Sets','Sherwanis','Dhoti & Kurta','Pathani Suits',
      'Nehru Jackets','Indo-Western','Festival Wear',
    ],
  },
  {
    name: 'Footwear',
    icon: '👟',
    color: '#795548',
    subcategories: [
      "Women's Heels","Women's Flats","Women's Sandals",
      "Women's Sports Shoes","Men's Formal Shoes","Men's Casual Shoes",
      "Men's Sports Shoes","Men's Sandals & Slippers",
      "Kids' Shoes","Ethnic Footwear","Boots",
    ],
  },
  {
    name: 'Jewellery',
    icon: '💍',
    color: '#f9a825',
    subcategories: [
      'Necklaces & Chains','Earrings','Rings','Bangles & Kadas',
      'Bracelets','Anklets','Maang Tikka & Hair Accessories',
      'Brooches & Pins','Nose Pins','Mangalsutra','Jewellery Sets',
    ],
  },
  {
    name: 'Beauty & Health',
    icon: '💄',
    color: '#e91e63',
    subcategories: [
      'Skincare','Face Care','Haircare','Hair Color',
      'Makeup','Lip Care','Nail Care','Fragrances & Deodorants',
      'Bath & Body','Mens Grooming','Health Supplements',
      'Ayurvedic & Herbal','Medical Devices',
    ],
  },
  {
    name: 'Bags & Wallets',
    icon: '👜',
    color: '#4e342e',
    subcategories: [
      'Handbags & Clutches','Backpacks','Trolley & Suitcases',
      'School Bags','Laptop Bags','Travel Bags','Wallets & Card Holders',
      'Waist Bags','Potli Bags','Tote Bags',
    ],
  },
  {
    name: 'Home & Decor',
    icon: '🏠',
    color: '#00897b',
    subcategories: [
      'Bedsheets & Pillow Covers','Curtains & Blinds',
      'Cushions & Cushion Covers','Quilts & Blankets',
      'Wall Décor & Frames','Lamps & Lighting','Candles & Diyas',
      'Pooja Essentials','Storage & Organisation',
      'Cleaning Supplies','Bathroom Accessories',
    ],
  },
  {
    name: 'Kitchen & Dining',
    icon: '🍳',
    color: '#e64a19',
    subcategories: [
      'Cookware','Tiffin & Lunch Boxes','Dinner Sets & Crockery',
      'Kitchen Storage & Containers','Water Bottles & Flasks',
      'Serving & Dining','Kitchen Tools & Gadgets',
      'Bakeware','Pressure Cookers','Non-stick Cookware',
    ],
  },
  {
    name: 'Electronics & Accessories',
    icon: '📱',
    color: '#283593',
    subcategories: [
      'Mobile Covers & Cases','Earphones & Headphones',
      'Chargers & Cables','Power Banks','Smartwatches & Bands',
      'Bluetooth Speakers','Camera Accessories',
      'Laptop Accessories','LED Lights','Fans & Coolers',
      'Smart Home Devices',
    ],
  },
  {
    name: 'Toys & Baby Products',
    icon: '🧸',
    color: '#f44336',
    subcategories: [
      'Soft Toys & Stuffed Animals','Action Figures & Dolls',
      'Building Blocks & LEGO','Board Games & Puzzles',
      'Educational Toys','Remote Control Toys',
      'Outdoor & Sports Toys','Art & Craft Kits',
      'Baby Care','Baby Feeding','Baby Clothing (0-2 yrs)',
      'Strollers & Prams','Baby Furniture',
    ],
  },
  {
    name: 'Sports & Fitness',
    icon: '🏋️',
    color: '#2e7d32',
    subcategories: [
      'Exercise & Gym Equipment','Yoga Mats & Accessories',
      'Cricket','Football & Futsal','Badminton',
      'Cycling','Swimming','Outdoor Sports',
      'Sports Nutrition','Sportswear & Shoes',
    ],
  },
  {
    name: 'Festive & Gifting',
    icon: '🎁',
    color: '#c62828',
    subcategories: [
      'Diwali Special','Holi','Rakhi & Gifts','Wedding Gifts',
      'Return Gifts','Gift Hampers','Birthday Gifts',
      'Decorative Items','Artificial Flowers',
    ],
  },
  {
    name: 'Stationery & Craft',
    icon: '✏️',
    color: '#0277bd',
    subcategories: [
      'Pens & Pencils','Notebooks & Diaries','Office Supplies',
      'Art & Craft Supplies','Gift Wrapping','School Stationery',
      'Rubber Stamps & Embossing',
    ],
  },
  {
    name: 'Automotive',
    icon: '🚗',
    color: '#37474f',
    subcategories: [
      'Car Accessories','Bike Accessories','Car Seat Covers',
      'Car Care Products','Navigation & Electronics',
    ],
  },
  {
    name: 'Pet Supplies',
    icon: '🐾',
    color: '#6d4c41',
    subcategories: [
      'Dog Food & Treats','Cat Food & Treats',
      'Pet Toys','Pet Accessories','Pet Grooming',
      'Aquarium & Fish','Bird Supplies',
    ],
  },
];

export const ALL_CATEGORY_NAMES = CATEGORIES.map(c => c.name);

export function getSubcategories(categoryName) {
  const cat = CATEGORIES.find(c => c.name === categoryName);
  return cat ? cat.subcategories : [];
}

export function getCategoryIcon(categoryName) {
  const cat = CATEGORIES.find(c => c.name === categoryName);
  return cat ? cat.icon : '📦';
}

export function getCategoryColor(categoryName) {
  const cat = CATEGORIES.find(c => c.name === categoryName);
  return cat ? cat.color : '#757575';
}

// ── AUTO-DETECT CATEGORY FROM TEXT ────────────────────────────────────────────
export function detectCategory(text = '', existingCategory = '') {
  const t = (text + ' ' + existingCategory).toLowerCase();

  const rules = [
    // Women's Clothing
    { keys: ['saree','sari','kurti','lehenga','salwar','dupatta','anarkali','blouse','ghagra','choli','churidar','suit set','palazzo','sharara'], cat: "Women's Clothing" },
    // Men's Clothing
    { keys: ['mens shirt','mens t-shirt','polo','formal shirt','casual shirt','men trouser','men jeans','men shorts'], cat: "Men's Clothing" },
    // Kurta & Ethnic
    { keys: ['kurta set','sherwani','dhoti','pathani','nehru jacket','indo western','ethnic set','men kurta','bandhgala'], cat: 'Kurta & Ethnic Wear' },
    // Kids clothing
    { keys: ['kids wear','boys clothing','girls dress','baby clothes','school uniform','kids kurta','baby frock'], cat: "Kids' Clothing" },
    // Footwear
    { keys: ['shoe','sandal','slipper','heel','boot','footwear','chappal','loafer','sneaker','mojari','jutis','wedge'], cat: 'Footwear' },
    // Jewellery
    { keys: ['necklace','earring','ring','bangle','bracelet','anklet','jewellery','jewelry','pendant','mangalsutra','maang tikka','nose pin','jhumka','jhumki','kundan','oxidised'], cat: 'Jewellery' },
    // Beauty
    { keys: ['lipstick','lip gloss','foundation','concealer','mascara','eyeliner','serum','moisturiser','moisturizer','shampoo','conditioner','hair oil','face wash','sunscreen','perfume','deodorant','deo','kajal','eyeshadow','blush','highlighter','nail polish'], cat: 'Beauty & Health' },
    // Bags
    { keys: ['handbag','purse','clutch','backpack','suitcase','trolley bag','laptop bag','school bag','tote bag','potli','sling bag','wallet','card holder'], cat: 'Bags & Wallets' },
    // Home decor
    { keys: ['bedsheet','pillow cover','curtain','cushion','quilt','blanket','wall art','photo frame','lamp','diya','candle','pooja','god idol','artificial flower','table cloth','mat'], cat: 'Home & Decor' },
    // Kitchen
    { keys: ['cookware','kadai','tiffin','lunch box','dinner set','plate','bowl','glass','mug','pressure cooker','non stick','frying pan','kitchen','water bottle','flask','thermos','casserole'], cat: 'Kitchen & Dining' },
    // Electronics
    { keys: ['mobile cover','phone case','earphone','headphone','charger','cable','power bank','smartwatch','bluetooth speaker','led light','pendrive','memory card','laptop bag','mouse','keyboard'], cat: 'Electronics & Accessories' },
    // Toys
    { keys: ['toy','teddy','doll','action figure','puzzle','board game','lego','building block','remote control car','baby toy','soft toy','stuffed animal','craft kit','play set'], cat: 'Toys & Baby Products' },
    // Baby
    { keys: ['baby care','baby food','baby wipe','diaper','nappy','stroller','pram','cradle','baby monitor','feeding bottle','pacifier','rattle'], cat: 'Toys & Baby Products' },
    // Sports
    { keys: ['cricket','football','badminton','yoga mat','dumbbell','gym','fitness','cycle','bicycle','swimming','sports','exercise','workout','protein'], cat: 'Sports & Fitness' },
    // Festive
    { keys: ['diwali','holi','rakhi','rakshabandhan','wedding gift','return gift','gift hamper','decoration','festival','celebration','pooja thali'], cat: 'Festive & Gifting' },
    // Stationery
    { keys: ['pen','pencil','notebook','diary','office supply','art supply','sketch','canvas','rubber stamp','stationery'], cat: 'Stationery & Craft' },
    // Automotive
    { keys: ['car cover','car seat','steering cover','bike cover','car accessory','automobile'], cat: 'Automotive' },
    // Pet
    { keys: ['dog food','cat food','pet toy','pet collar','fish tank','aquarium','bird cage','pet grooming'], cat: 'Pet Supplies' },
    // Generic mens/womens fallback
    { keys: ['women','ladies','girl','female','her'], cat: "Women's Clothing" },
    { keys: ['men','gents','male','his','boy'], cat: "Men's Clothing" },
    { keys: ['kids','children','child','junior','infant'], cat: "Kids' Clothing" },
  ];

  for (const rule of rules) {
    if (rule.keys.some(k => t.includes(k))) return rule.cat;
  }

  // Check if existing category already matches one of ours
  if (existingCategory) {
    const match = CATEGORIES.find(c =>
      c.name.toLowerCase() === existingCategory.toLowerCase() ||
      c.subcategories.some(s => s.toLowerCase() === existingCategory.toLowerCase())
    );
    if (match) return match.name;
  }

  return ''; // unknown — let admin pick manually
}

// Detect subcategory too
export function detectSubcategory(text = '', categoryName = '') {
  const t = text.toLowerCase();
  const subs = getSubcategories(categoryName);
  for (const sub of subs) {
    if (t.includes(sub.toLowerCase())) return sub;
  }
  return '';
}
