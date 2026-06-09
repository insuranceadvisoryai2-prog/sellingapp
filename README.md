# E-Commerce Backend — .NET 8 + PostgreSQL (Supabase) + Render

## Architecture

```
┌─────────────────────┐     HTTPS / REST     ┌────────────────────────┐
│   Vercel Frontend   │ ──────────────────►  │  Render (.NET 8 API)   │
│  (React / Next.js)  │ ◄──────────────────  │  Port 10000 (auto)     │
└─────────────────────┘     JSON + JWT        └──────────┬─────────────┘
                                                         │ EF Core + Npgsql
                                                         ▼
                                              ┌────────────────────────┐
                                              │  Supabase PostgreSQL   │
                                              │  (db.<ref>.supabase.co)│
                                              └────────────────────────┘
```

## Why Your Products Were Disappearing

Render (and most PaaS platforms) restart your process periodically:
- Free tier sleeps after inactivity → cold start loses all memory
- Deployments restart the process → in-memory lists reset
- Any `static List<Product>` or file-based store is wiped on every restart

**Fix:** All data now lives in Supabase PostgreSQL. Nothing is stored in memory.

---

## Quick Setup (15 min)

### Step 1 — Supabase (Database)

1. Go to [supabase.com](https://supabase.com) → New Project
2. **SQL Editor** → paste the contents of `schema.sql` → Run
3. Go to **Project Settings → Database → Connection string → URI**
4. Copy the connection string (looks like `postgresql://postgres:PASSWORD@db.REF.supabase.co:5432/postgres`)

### Step 2 — Local Development

```bash
# Clone your project, then:
cd ecommerce-backend

# Update appsettings.json with your Supabase connection string

dotnet restore
dotnet ef migrations add InitialCreate   # creates Migrations folder
dotnet ef database update                # applies schema to Supabase
dotnet run
# → API running at https://localhost:5001
# → Swagger at  https://localhost:5001/swagger
```

### Step 3 — Deploy to Render

1. Push your code to GitHub
2. Go to [render.com](https://render.com) → New → Web Service → connect repo
3. Set **Environment Variables** in Render dashboard:

| Key               | Value                                      |
|-------------------|--------------------------------------------|
| `DATABASE_URL`    | Your Supabase connection string (from step 1) |
| `JWT_SECRET_KEY`  | Any 64+ char random string                 |
| `AllowedOrigins__0` | `https://your-app.vercel.app`            |

4. Build command: `dotnet publish -c Release -o ./publish`
5. Start command: `dotnet ./publish/ECommerce.dll`

Render will auto-run migrations on every deploy (see `Program.cs`).

### Step 4 — Vercel Frontend

Add to your Vercel project environment variables:
```
NEXT_PUBLIC_API_URL=https://your-api.onrender.com
```

Copy `frontend-api-client.js` into your frontend and import what you need:
```js
import { auth, products, cart, orders } from './api';

// Login
await auth.login('john', 'secret123');

// Get products
const { data } = await products.getAll({ category: 'Electronics' });

// Add to cart
await cart.addItem(productId, 2);

// Checkout
await orders.create('Please ship fast!');
```

---

## API Endpoints

### Auth
| Method | Path                  | Auth | Description        |
|--------|-----------------------|------|--------------------|
| POST   | `/api/auth/register`  | ✗    | Register user      |
| POST   | `/api/auth/login`     | ✗    | Login, get JWT     |

### Products
| Method | Path                       | Auth    | Description              |
|--------|----------------------------|---------|--------------------------|
| GET    | `/api/products`            | ✗       | List active products     |
| GET    | `/api/products/{id}`       | ✗       | Product detail           |
| GET    | `/api/products/categories` | ✗       | List all categories      |
| GET    | `/api/products/admin/all`  | Admin   | All products (incl. hidden)|
| POST   | `/api/products`            | Admin   | Create product           |
| PUT    | `/api/products/{id}`       | Admin   | Update product           |
| DELETE | `/api/products/{id}`       | Admin   | Soft delete product      |

### Cart
| Method | Path                        | Auth     | Description          |
|--------|-----------------------------|----------|----------------------|
| GET    | `/api/cart`                 | User     | Get my cart          |
| POST   | `/api/cart/items`           | User     | Add item             |
| PUT    | `/api/cart/items/{pid}`     | User     | Update quantity      |
| DELETE | `/api/cart/items/{pid}`     | User     | Remove item          |
| DELETE | `/api/cart`                 | User     | Clear cart           |

### Orders
| Method | Path                        | Auth     | Description          |
|--------|-----------------------------|----------|----------------------|
| POST   | `/api/orders`               | User     | Checkout (cart→order)|
| GET    | `/api/orders`               | User     | My order history     |
| GET    | `/api/orders/{id}`          | User     | Order detail         |
| PATCH  | `/api/orders/{id}/status`   | Admin    | Update status        |
| GET    | `/api/orders/admin/all`     | Admin    | All orders           |

---

## NuGet Packages

```xml
<PackageReference Include="Microsoft.EntityFrameworkCore"                    Version="8.0.4" />
<PackageReference Include="Microsoft.EntityFrameworkCore.Tools"              Version="8.0.4" />
<PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL"            Version="8.0.4" />
<PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer"    Version="8.0.4" />
<PackageReference Include="System.IdentityModel.Tokens.Jwt"                  Version="7.5.1" />
<PackageReference Include="BCrypt.Net-Next"                                   Version="4.0.3" />
<PackageReference Include="Swashbuckle.AspNetCore"                           Version="6.5.0" />
```

Install with:
```bash
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL
dotnet add package Microsoft.EntityFrameworkCore.Tools
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
dotnet add package BCrypt.Net-Next
dotnet add package Swashbuckle.AspNetCore
```

---

## EF Core Migrations (after schema changes)

```bash
dotnet ef migrations add YourMigrationName
dotnet ef database update
```

On Render, migrations auto-apply at startup via `db.Database.Migrate()` in `Program.cs`.

---

## Security Checklist

- [x] Passwords hashed with BCrypt (cost factor 12)
- [x] JWT signed with HMAC-SHA256
- [x] JWT secret stored in environment variable (never in code)
- [x] Database connection string in environment variable
- [x] Soft deletes (products never hard-deleted)
- [x] Price snapshots in order details (order history never changes)
- [x] Stock deducted atomically within a DB transaction
- [x] Role-based auth (Admin vs Customer)
- [x] CORS restricted to your Vercel domain
- [ ] Add rate limiting (Microsoft.AspNetCore.RateLimiting) — recommended next step
- [ ] Add HTTPS-only in production (already enforced by Render)
