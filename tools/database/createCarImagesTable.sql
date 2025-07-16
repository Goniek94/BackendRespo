-- Tabela car_images dla przechowywania metadanych zdjęć samochodów
-- Używana z Supabase Storage do zarządzania obrazami

CREATE TABLE IF NOT EXISTS car_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    car_id VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    is_main BOOLEAN DEFAULT false,
    file_size INTEGER,
    width INTEGER,
    height INTEGER,
    original_name TEXT,
    file_type VARCHAR(50),
    storage_path TEXT,
    bucket_name VARCHAR(100) DEFAULT 'autosell',
    upload_date TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indeksy dla lepszej wydajności
CREATE INDEX IF NOT EXISTS idx_car_images_car_id ON car_images(car_id);
CREATE INDEX IF NOT EXISTS idx_car_images_is_main ON car_images(is_main);
CREATE INDEX IF NOT EXISTS idx_car_images_created_at ON car_images(created_at);

-- Trigger do automatycznej aktualizacji updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_car_images_updated_at 
    BEFORE UPDATE ON car_images 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Komentarze do tabeli i kolumn
COMMENT ON TABLE car_images IS 'Metadane zdjęć samochodów przechowywanych w Supabase Storage';
COMMENT ON COLUMN car_images.car_id IS 'ID ogłoszenia/samochodu (może być tymczasowe podczas tworzenia)';
COMMENT ON COLUMN car_images.url IS 'Publiczny URL do pełnego obrazu w Supabase Storage';
COMMENT ON COLUMN car_images.thumbnail_url IS 'Publiczny URL do miniatury obrazu';
COMMENT ON COLUMN car_images.is_main IS 'Czy to jest główne zdjęcie ogłoszenia';
COMMENT ON COLUMN car_images.file_size IS 'Rozmiar pliku w bajtach';
COMMENT ON COLUMN car_images.width IS 'Szerokość obrazu w pikselach';
COMMENT ON COLUMN car_images.height IS 'Wysokość obrazu w pikselach';
COMMENT ON COLUMN car_images.original_name IS 'Oryginalna nazwa pliku';
COMMENT ON COLUMN car_images.file_type IS 'Typ MIME pliku (np. image/jpeg)';
COMMENT ON COLUMN car_images.storage_path IS 'Ścieżka do pliku w Supabase Storage';
COMMENT ON COLUMN car_images.bucket_name IS 'Nazwa bucketu w Supabase Storage';
