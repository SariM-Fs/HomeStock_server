-- Safe to run on every startup: only creates what is missing.

-- A household. Everything else (users, products) belongs to exactly one family.
CREATE TABLE IF NOT EXISTS families (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(40)  NOT NULL,
  code  VARCHAR(6)   NOT NULL UNIQUE  -- shared with members so they can join on registration
);

CREATE TABLE IF NOT EXISTS users (
  id                       SERIAL PRIMARY KEY,
  family_id                INTEGER      NOT NULL REFERENCES families (id) ON DELETE CASCADE,
  username                 VARCHAR(20)  NOT NULL UNIQUE,
  password_hash            TEXT         NOT NULL,
  display_name             VARCHAR(30)  NOT NULL,
  role                     VARCHAR(10)  NOT NULL CHECK (role IN ('Admin', 'User')),
  can_update_quantity      BOOLEAN      NOT NULL DEFAULT TRUE,
  can_add_to_shopping_list BOOLEAN      NOT NULL DEFAULT TRUE,
  can_mark_purchased       BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS products (
  id               SERIAL PRIMARY KEY,
  family_id        INTEGER           NOT NULL REFERENCES families (id) ON DELETE CASCADE,
  name             VARCHAR(50)       NOT NULL,
  category         TEXT              NOT NULL,
  quantity         DOUBLE PRECISION  NOT NULL CHECK (quantity >= 0),
  minimum_quantity DOUBLE PRECISION  NOT NULL CHECK (minimum_quantity >= 0),
  unit             TEXT              NOT NULL,
  -- Product names are unique within a family; two families may both have "חלב".
  UNIQUE (family_id, name)
);

-- Shopping items need no family_id: they belong to the family of their product.
CREATE TABLE IF NOT EXISTS shopping_items (
  id                  SERIAL PRIMARY KEY,
  product_id          INTEGER           NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  quantity            DOUBLE PRECISION  NOT NULL CHECK (quantity >= 1),
  purchased           BOOLEAN           NOT NULL DEFAULT FALSE,
  added_automatically BOOLEAN           NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  purchased_at        TIMESTAMPTZ
);

-- At most one open (not yet purchased) item per product.
CREATE UNIQUE INDEX IF NOT EXISTS shopping_items_one_open_per_product
  ON shopping_items (product_id)
  WHERE purchased = FALSE;
