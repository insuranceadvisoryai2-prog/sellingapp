const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { scrapeMeeshoProduct } = require('./scraper');
const { rewriteProductDetails, SUBCATEGORIES } = require('./ai');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Initialize database
db.init();

// GET / - Root health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Meesho Scraper Backend is running.' });
});

// POST /api/login - Secure admin authentication (credentials stored server-side only)
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const validUser = process.env.ADMIN_USERNAME || 'adminRushi';
  const validPass = process.env.ADMIN_PASSWORD || 'RushiSneha';
  if (username === validUser && password === validPass) {
    return res.json({ success: true });
  }
  return res.status(401).json({ success: false, error: 'Invalid credentials' });
});

// POST /api/scrape - Scrape product details from Meesho URL
app.post('/api/scrape', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const scrapedData = await scrapeMeeshoProduct(url);
    res.json(scrapedData);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to scrape the product link.' });
  }
});

// POST /api/rewrite - Send scraped data to AI copywriter
app.post('/api/rewrite', async (req, res) => {
  const { title, description } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Product title is required' });
  }

  try {
    const aiData = await rewriteProductDetails(title, description || '');
    res.json(aiData);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to generate AI rewrite details.' });
  }
});

// POST /api/publish - Add product to the local database Catalog
app.post('/api/publish', async (req, res) => {
  const productData = req.body;

  if (!productData.originalUrl || !productData.rewrittenTitle || productData.price === undefined) {
    return res.status(400).json({ error: 'Missing required product properties to publish.' });
  }

  try {
    const savedProduct = db.saveProduct(productData);
    res.json({ message: 'Product published successfully!', product: savedProduct });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to save product to catalog.' });
  }
});

// POST /api/parse-html - Parse product data from pasted HTML (returns data for admin to review/edit)
app.post('/api/parse-html', (req, res) => {
  try {
    const { html } = req.body;
    if (!html) {
      return res.status(400).json({ error: 'HTML content is required' });
    }

    const { parseFromHtml } = require('./scraper');
    const productData = parseFromHtml(html);

    if (!productData || !productData.title) {
      return res.status(400).json({ error: 'Could not extract product data from the provided HTML.' });
    }

    console.log(`\nðŸ“¥ Parsed product from pasted HTML: "${productData.title}" â€” â‚¹${productData.price} â€” ${productData.images.length} images`);
    res.json(productData);
  } catch (error) {
    console.error('Error parsing HTML:', error);
    res.status(500).json({ error: 'Failed to parse the HTML content.' });
  }
});

// GET /api/products - Get all published products, filterable by subcategory
app.get('/api/products', (req, res) => {
  const { subcategory } = req.query;
  try {
    const products = db.getProducts(subcategory);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to retrieve published products.' });
  }
});


// PUT /api/products/:id - Update a published catalog product
app.put('/api/products/:id', (req, res) => {
  try {
    const updatedProduct = db.updateProduct(req.params.id, req.body || {});
    if (!updatedProduct) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    res.json({ message: 'Product updated successfully!', product: updatedProduct });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to update product.' });
  }
});

// DELETE /api/products/:id - Remove a published catalog product
app.delete('/api/products/:id', (req, res) => {
  try {
    const deleted = db.deleteProduct(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    res.json({ message: 'Product deleted successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to delete product.' });
  }
});
// GET /api/subcategories - List of supported subcategories for UI sidebar filters
app.get('/api/subcategories', (req, res) => {
  res.json(SUBCATEGORIES);
});

// GET /api/orders - View all received orders, optionally filtered by status
app.get('/api/orders', (req, res) => {
  try {
    const orders = db.getOrders(req.query.status || null);
    const products = db.getProducts();
    // Patch originalUrl into older orders that lack it in their snapshot
    const patchedOrders = orders.map(order => {
      if (order.productSnapshot && !order.productSnapshot.originalUrl) {
        const liveProduct = products.find(p => p.id === order.productId);
        if (liveProduct && liveProduct.originalUrl) {
          order.productSnapshot.originalUrl = liveProduct.originalUrl;
        }
      }
      return order;
    });
    res.json(patchedOrders);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to retrieve orders.' });
  }
});

// PUT /api/orders/:id - Update order status, payment status, or notes
app.put('/api/orders/:id', (req, res) => {
  try {
    const updatedOrder = db.updateOrder(req.params.id, req.body || {});
    if (!updatedOrder) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    res.json({ message: 'Order updated successfully!', order: updatedOrder });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to update order.' });
  }
});

// POST /api/checkout - Place an order with customer details
app.post('/api/checkout', (req, res) => {
  const { productId, customerDetails } = req.body;

  if (!customerDetails || !customerDetails.name || !customerDetails.email) {
    return res.status(400).json({ error: 'Customer name and email are required.' });
  }

  try {
    const product = db.getProducts().find(item => item.id === productId);
    const order = db.saveOrder({
      productId: productId || null,
      productSnapshot: product ? {
        id: product.id,
        title: product.rewrittenTitle || product.originalTitle,
        price: product.price,
        originalPrice: product.originalPrice,
        specialOfferPrice: product.specialOfferPrice || 0,
        image: product.images && product.images[0] ? product.images[0] : '',
        subcategory: product.subcategory,
        originalUrl: product.originalUrl,
      } : null,
      customer: customerDetails,
      status: 'Pending',
      paymentStatus: 'Unpaid',
    });

    res.json({ message: 'Order placed successfully!', orderId: order.id, order });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to place order.' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`ðŸš€ Scraper Backend listening on http://localhost:${PORT}`);
});

