-- Add dashboard composer image uploads

CREATE TABLE IF NOT EXISTS composer_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL,
  public_url TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  linkedin_image_urn TEXT,
  linkedin_asset_status TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS composer_images_storage_key_idx
  ON composer_images(storage_key);

CREATE INDEX IF NOT EXISTS composer_images_user_sort_order_idx
  ON composer_images(user_id, sort_order);
