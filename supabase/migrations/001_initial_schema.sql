-- AI Image Gallery - Initial schema
-- Run this in Supabase SQL Editor (or via Supabase CLI)

CREATE TABLE IF NOT EXISTS images (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  filename VARCHAR(255),
  original_path TEXT,
  thumbnail_path TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS image_metadata (
  id SERIAL PRIMARY KEY,
  image_id INTEGER REFERENCES images(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT,
  tags TEXT[],
  colors VARCHAR(7)[],
  ai_processing_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for search and RLS
CREATE INDEX IF NOT EXISTS idx_images_user_id ON images(user_id);
CREATE INDEX IF NOT EXISTS idx_image_metadata_user_id ON image_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_image_metadata_image_id ON image_metadata(image_id);
CREATE INDEX IF NOT EXISTS idx_image_metadata_tags ON image_metadata USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_image_metadata_colors ON image_metadata USING GIN(colors);

-- Enable RLS
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_metadata ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users see only their own data
CREATE POLICY "Users can only see own images"
  ON images FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert own images"
  ON images FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update own images"
  ON images FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete own images"
  ON images FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only see own metadata"
  ON image_metadata FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert own metadata"
  ON image_metadata FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update own metadata"
  ON image_metadata FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete own metadata"
  ON image_metadata FOR DELETE
  USING (auth.uid() = user_id);
