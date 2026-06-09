-- ============================================================
-- E-Commerce PostgreSQL Schema (Supabase)
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS "Users" (
    "Id"           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "Username"     VARCHAR(100) NOT NULL UNIQUE,
    "Email"        VARCHAR(255) NOT NULL UNIQUE,
    "PasswordHash" TEXT NOT NULL,
    "Role"         VARCHAR(20) NOT NULL DEFAULT 'Customer',  -- 'Admin' | 'Customer'
    "CreatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "UpdatedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON "Users"("Username");
CREATE INDEX IF NOT EXISTS idx_users_email    ON "Users"("Email");

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS "Products" (
    "Id"          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "Name"        VARCHAR(255) NOT NULL,
    "Description" TEXT,
    "Price"       NUMERIC(18,2) NOT NULL CHECK ("Price" >= 0),
    "Stock"       INT NOT NULL DEFAULT 0 CHECK ("Stock" >= 0),
    "ImageUrl"    TEXT,
    "Category"    VARCHAR(100),
    "IsActive"    BOOLEAN NOT NULL DEFAULT TRUE,
    "IsPublished" BOOLEAN NOT NULL DEFAULT FALSE,
    "CreatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "UpdatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_active_published ON "Products"("IsActive", "IsPublished");
CREATE INDEX IF NOT EXISTS idx_products_category         ON "Products"("Category");

-- ============================================================
-- CARTS
-- ============================================================
CREATE TABLE IF NOT EXISTS "Carts" (
    "Id"        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "UserId"    UUID NOT NULL REFERENCES "Users"("Id") ON DELETE CASCADE,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_cart_user UNIQUE ("UserId")   -- one active cart per user
);

CREATE INDEX IF NOT EXISTS idx_carts_userid ON "Carts"("UserId");

-- ============================================================
-- CART ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS "CartItems" (
    "Id"        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "CartId"    UUID NOT NULL REFERENCES "Carts"("Id") ON DELETE CASCADE,
    "ProductId" UUID NOT NULL REFERENCES "Products"("Id") ON DELETE CASCADE,
    "Quantity"  INT NOT NULL DEFAULT 1 CHECK ("Quantity" > 0),
    "UnitPrice" NUMERIC(18,2) NOT NULL,           -- price snapshot at add-time
    "AddedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_cartitem UNIQUE ("CartId", "ProductId")
);

CREATE INDEX IF NOT EXISTS idx_cartitems_cartid ON "CartItems"("CartId");

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS "Orders" (
    "Id"          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "UserId"      UUID NOT NULL REFERENCES "Users"("Id") ON DELETE RESTRICT,
    "Status"      VARCHAR(30) NOT NULL DEFAULT 'Pending',
                  -- Pending | Confirmed | Processing | Shipped | Delivered | Cancelled
    "TotalAmount" NUMERIC(18,2) NOT NULL,
    "Notes"       TEXT,
    "CreatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "UpdatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_userid    ON "Orders"("UserId");
CREATE INDEX IF NOT EXISTS idx_orders_status    ON "Orders"("Status");
CREATE INDEX IF NOT EXISTS idx_orders_createdat ON "Orders"("CreatedAt" DESC);

-- ============================================================
-- ORDER DETAILS
-- ============================================================
CREATE TABLE IF NOT EXISTS "OrderDetails" (
    "Id"          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "OrderId"     UUID NOT NULL REFERENCES "Orders"("Id") ON DELETE CASCADE,
    "ProductId"   UUID NOT NULL REFERENCES "Products"("Id") ON DELETE RESTRICT,
    "ProductName" VARCHAR(255) NOT NULL,  -- snapshot — product name at order time
    "Quantity"    INT NOT NULL CHECK ("Quantity" > 0),
    "UnitPrice"   NUMERIC(18,2) NOT NULL, -- snapshot — price at order time
    "LineTotal"   NUMERIC(18,2) GENERATED ALWAYS AS ("Quantity" * "UnitPrice") STORED
);

CREATE INDEX IF NOT EXISTS idx_orderdetails_orderid ON "OrderDetails"("OrderId");

-- ============================================================
-- AUTO-UPDATE UpdatedAt trigger (applies to all tables)
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."UpdatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON "Users"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON "Products"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_carts_updated_at
    BEFORE UPDATE ON "Carts"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON "Orders"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- SEED: admin user (password = Admin@123 — change immediately!)
-- BCrypt hash generated externally and stored here as an example
-- ============================================================
-- INSERT INTO "Users" ("Username","Email","PasswordHash","Role")
-- VALUES ('admin','admin@store.com','$2a$12$REPLACE_WITH_REAL_HASH','Admin');
