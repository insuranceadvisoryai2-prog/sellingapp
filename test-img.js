const https = require('https');

https.get('https://images.meesho.com/images/products/461881412/zlelt.jpg', (res) => {
  console.log('Status code for original:', res.statusCode);
}).on('error', (e) => console.error(e));

https.get('https://images.meesho.com/images/products/461881412/zlelt_512.jpg', (res) => {
  console.log('Status code for _512:', res.statusCode);
}).on('error', (e) => console.error(e));
