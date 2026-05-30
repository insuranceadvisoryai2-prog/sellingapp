const fs = require('fs');
const path = './backend/data/products.json';
if (fs.existsSync(path)) {
  let data = fs.readFileSync(path, 'utf8');
  data = data.replace(/Meesho Product ID/g, 'Supplier Product ID');
  data = data.replace(/Meesho Catalog ID/g, 'Supplier Catalog ID');
  data = data.replace(/"Source": "Meesho"/g, '"Source": "Supplier"');
  fs.writeFileSync(path, data);
  console.log('Updated products.json');
} else {
  console.log('products.json not found');
}
