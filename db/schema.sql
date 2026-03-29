-- Database schema for Chalama Hotel

CREATE TABLE IF NOT EXISTS rooms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    description TEXT,
    price INTEGER NOT NULL,
    area INTEGER,
    capacity INTEGER,
    images TEXT[], -- Array of image URLs
    amenities TEXT[] -- Array of amenities
);

CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES rooms(id),
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    total_price INTEGER,
    status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, cancelled
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS site_content (
    id SERIAL PRIMARY KEY,
    section VARCHAR(100),
    content JSONB
);

-- Initial Room Data
INSERT INTO rooms (name, type, description, price, area, capacity, images, amenities) VALUES
('Стандарт с односпальной кроватью', 'Standard', 'Одноместное размещение. Номер данной категории имеет площадь 15 м2', 6950, 15, 1, ARRAY['https://www.chalamahotel.ru/upload/iblock/c38/z9p9f5b2b2b2b2b2b2b2b2b2b2b2b2b2.jpg'], ARRAY['Гель для душа', 'Кондиционер', 'Телевизор', 'Wi-Fi']),
('Стандарт с двухспальной кроватью', 'Standard', 'Двухместное размещение. Номер данной категории имеет площадь 15 м2', 7950, 15, 2, ARRAY['https://www.chalamahotel.ru/upload/iblock/c38/z9p9f5b2b2b2b2b2b2b2b2b2b2b2b2b2.jpg'], ARRAY['Гель для душа', 'Кондиционер', 'Телевизор', 'Wi-Fi']),
('Делюкс', 'Deluxe', 'Одноместное размещение. Номер данной категории имеет площадь 25 м2', 8800, 25, 2, ARRAY['https://www.chalamahotel.ru/upload/iblock/c38/z9p9f5b2b2b2b2b2b2b2b2b2b2b2b2b2.jpg'], ARRAY['Гель для душа', 'Кондиционер', 'Телевизор', 'Wi-Fi', 'Мини-бар']);
