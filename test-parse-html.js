const { parseFromHtml } = require('./backend/scraper');

const dummyHtml = `
<html>
<body>
  <h1>Test Product</h1>
  <span class="Price">₹250</span>
  <!-- Next script style JSON string -->
  <script id="__NEXT_DATA__" type="application/json">
    {"props":{"pageProps":{"productData":{"name":"Next Script Product","price":250,"original_price":300,"images":["https:\\/\\/images.meesho.com\\/images\\/products\\/111111\\/abc_512.jpg"]}}}}
  </script>
  <!-- Responsive image using srcset -->
  <img src="placeholder.jpg" srcset="https://images.meesho.com/images/products/222222/def_512.jpg 512w, https://images.meesho.com/images/products/222222/def.jpg 1024w" />
  <!-- Lazy loaded image using custom attributes -->
  <img data-src="https://images.meesho.com/images/products/333333/ghi_512.jpg" />
  <!-- Random embedded image URL in a comment or script -->
  <script>
    const imgUrl = "https://images.meesho.com/images/products/444444/jkl_512.jpg";
  </script>
</body>
</html>
`;

const result = parseFromHtml(dummyHtml);
console.log("Parsed result:");
console.log("Title:", result.title);
console.log("Price:", result.price);
console.log("Original Price:", result.originalPrice);
console.log("Images found:", result.images.length);
console.log("Images:", result.images);
