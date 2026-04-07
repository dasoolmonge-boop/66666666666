const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const https = require('https');
require('dotenv').config();

// Simple sanitizer to prevent basics
const sanitize = (str) => {
    if (typeof str !== 'string') return '';
    return str.replace(/[<>]/g, '');
};

// Database setup (Must be before any function that uses 'db' like notifyAllAdmins)
const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}
const dbPath = path.resolve(__dirname, process.env.DATABASE_PATH || './db/database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("Error connecting to database:", err);
    else {
        console.log("Connected to SQLite database.");
    }
});


const app = express();
const port = process.env.PORT || 5000;
const MAX_TOKEN = process.env.MAX_TOKEN || 'f9LHodD0cOJ4UEc28YWOtykBGGCNW3w2HfwNzuoyVvfuvpb7YIXZSd4_AZFsaL7E8MCgtYl9J3w1KJSSp_IR';
const ADMIN_ID = process.env.ADMIN_ID;

async function notifyAllAdmins(text) {
    // Collect all admin IDs (from .env and Database)
    const adminIds = new Set();
    if (ADMIN_ID) adminIds.add(ADMIN_ID);

    db.all("SELECT chatId FROM admins", [], (err, rows) => {
        if (!err && rows) {
            rows.forEach(r => adminIds.add(r.chatId));
        }

        // Send to everyone
        adminIds.forEach(id => {
            sendMaxMessage(id, text);
        });
    });
}

async function sendMaxMessage(chatId, text) {
    if (!MAX_TOKEN) {
        console.error("[MAX] ERROR: MAX_TOKEN is not defined. Notifications disabled.");
        return;
    }
    if (!chatId) {
        console.log("[MAX] Skipping notify - ChatID is missing");
        return;
    }
    
    const data = JSON.stringify({
        text: text,
        format: 'html'
    });

    const options = {
        hostname: 'platform-api.max.ru',
        port: 443,
        path: `/messages?user_id=${chatId}`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data),
            'Authorization': MAX_TOKEN
        }
    };

    const req = https.request(options, (res) => {
        let responseBody = '';
        res.on('data', (chunk) => { responseBody += chunk; });
        res.on('end', () => {
            if (res.statusCode !== 200 && res.statusCode !== 201) {
                console.error(`[MAX Notify] API Error ${res.statusCode}: ${responseBody}`);
            } else {
                console.log(`[MAX Notify] Success - Sent to ${chatId}`);
            }
        });
    });

    req.on('error', (err) => {
        console.error('[MAX] Connection error:', err.message);
    });

    req.write(data);
    req.end();
}

// Simple XSS Sanitizer helper (if xss lib is not yet loaded)
const safeJsonParse = (str, fallback = []) => {
    try {
        return JSON.parse(str || '[]');
    } catch (e) {
        return fallback;
    }
};

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files (disable automatic index.html serving)
app.use(express.static(path.join(__dirname, 'public'), { index: false }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Root route: Always serve index.html (it's adaptive)
// Telegram identification is handled client-side in index.html to redirect to mobile.html if needed.
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
// Ensure Database Schema & Initial Data
db.serialize(() => {
    // Rooms table
    db.run(`CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT,
        name TEXT,
        desc TEXT,
        price INTEGER,
        priceWeekend INTEGER,
        amenities TEXT,
        imgs TEXT,
        area TEXT,
        capacity INTEGER,
        tariff TEXT,
        prepayment INTEGER
    )`);

            // Migrations for rooms: add new fields if missing
            db.run("ALTER TABLE rooms ADD COLUMN area TEXT", (err) => {
                if (err && !err.message.includes("duplicate column name")) console.error("[DB Migration]", err.message);
            });
            db.run("ALTER TABLE rooms ADD COLUMN capacity INTEGER", (err) => {
                if (err && !err.message.includes("duplicate column name")) console.error("[DB Migration]", err.message);
            });
            db.run("ALTER TABLE rooms ADD COLUMN tariff TEXT", (err) => {
                if (err && !err.message.includes("duplicate column name")) console.error("[DB Migration]", err.message);
            });
            db.run("ALTER TABLE rooms ADD COLUMN prepayment INTEGER", (err) => {
                if (err && !err.message.includes("duplicate column name")) console.error("[DB Migration]", err.message);
            });

            // Updated bookings table
            db.run(`CREATE TABLE IF NOT EXISTS bookings (
                id TEXT PRIMARY KEY,
                type TEXT,
                room TEXT,
                checkIn TEXT,
                checkOut TEXT,
                nights INTEGER,
                guest TEXT,
                phone TEXT,
                addons TEXT,
                total INTEGER,
                status TEXT,
                clientChatId TEXT,
                createdAt TEXT
            )`);

            // Migration: Add clientChatId if missing (for older databases)
            db.run("ALTER TABLE bookings ADD COLUMN clientChatId TEXT", (err) => {
                if (err && !err.message.includes("duplicate column name")) {
                    console.error("[DB Migration] Error adding clientChatId:", err.message);
                }
            });

            // Admins table
            db.run(`CREATE TABLE IF NOT EXISTS admins (
                chatId TEXT PRIMARY KEY,
                username TEXT,
                createdAt TEXT
            )`);

            // Migration: Add username to admins if missing
            db.run("ALTER TABLE admins ADD COLUMN username TEXT", (err) => {
                if (err && !err.message.includes("duplicate column name")) {
                    console.error("[DB Migration] Error adding username to admins:", err.message);
                }
            });

            // Migration: Add createdAt to admins if missing
            db.run("ALTER TABLE admins ADD COLUMN createdAt TEXT", (err) => {
                if (err && !err.message.includes("duplicate column name")) {
                    console.error("[DB Migration] Error adding createdAt to admins:", err.message);
                }
            });

            // Initial Room Seeding (Sauna & Bath)
            const seedRooms = [
                ['sauna', 'Сауна Отеля', 'Почасовая аренда · Вместимость до 6 человек · 2000₽/час', 2000, 2000],
                ['bath', 'Баня Хаан-Дыт', 'Настоящая баня на дровах · Вместимость до 10 человек · 3500₽/час', 3500, 3500]
            ];

            seedRooms.forEach(([type, name, desc, price, priceWeekend]) => {
                db.run(`INSERT INTO rooms (type, name, desc, price, priceWeekend, amenities, imgs) 
                        SELECT ?, ?, ?, ?, ?, '[]', '[]' 
                        WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE type=?)`,
                        [type, name, desc, price, priceWeekend, type]);
            });

            // Update Amenities for Yurts and Bath (One-time sync)
            const listY123 = JSON.stringify([
                'Двуспальная кровать', 'Раскладной диван', 'Комплект полотенец, халатов и тапочек на 4 человек',
                'Посуда на 4 человек, сковорода и кастрюля', 'Кухня с индукционной плитой и раковиной',
                'Чайник, микроволновая печь, холодильник', 'Кондиционер', 'Дровяная печь-камин',
                'Санузел с душевой', 'Одноразовые гигиенические принадлежности'
            ]);
            const listY4 = JSON.stringify([
                'Два раскладных дивана', 'Комплекты постельного белья', 'Большой стол на 10 персон',
                'Комплект посуды и столовых приборов на 6 человек', 'Холодильник', 'Микроволновая печь',
                'Индукционная плита', 'Кухонная зона с раковиной', 'Санузел', 'Дровяная печь'
            ]);
            const listBath = JSON.stringify([
                'Традиционная дровяная печь', 'Просторная парилка', 'Душевая зона и санузел',
                'Большой стол на 12 персон', 'Кухонная зона: плита, раковина, посуда',
                'Телевизор с Триколор ТВ', 'Wi-Fi', 'Караоке для весёлого отдыха'
            ]);

            // Apply updates
            db.run("UPDATE rooms SET amenities = ?, capacity = 3 WHERE type = 'yurt' AND (name LIKE '%Земля%' OR name LIKE '%Вода%' OR name LIKE '%Воздух%' OR name LIKE '%Малая%')", [listY123]);
            db.run("UPDATE rooms SET amenities = ?, capacity = 4 WHERE type = 'yurt' AND (name LIKE '%Огонь%' OR name LIKE '%Большая%')", [listY4]);
            db.run("UPDATE rooms SET amenities = ? WHERE type = 'bath'", [listBath]);
        });

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'photo-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// =======================
// API: ROOMS
// =======================

// Get all rooms
app.get('/api/rooms', (req, res) => {
    db.all("SELECT * FROM rooms", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const rooms = rows.map(r => ({
            id: r.id,
            type: r.type,
            name: r.name,
            desc: r.desc,
            price: r.price,
            priceWeekend: r.priceWeekend,
            amenities: safeJsonParse(r.amenities),
            imgs: safeJsonParse(r.imgs),
            area: r.area || null,
            capacity: r.capacity || null,
            tariff: r.tariff || null,
            prepayment: r.prepayment || null
        }));
        res.json(rooms);
    });
});

// Get available rooms for a date range (hotel only)
app.get('/api/rooms/available', (req, res) => {
    const { checkIn, checkOut } = req.query;
    if (!checkIn || !checkOut) return res.status(400).json({ error: 'checkIn and checkOut required' });

    // Find room names that have overlapping confirmed/new bookings
    db.all(
        `SELECT DISTINCT room FROM bookings 
         WHERE status != 'cancelled' AND status != 'completed'
         AND checkIn < ? AND checkOut > ?`,
        [checkOut, checkIn],
        (err, busyRows) => {
            if (err) return res.status(500).json({ error: err.message });
            const busyNames = busyRows.map(r => r.room);

            db.all("SELECT * FROM rooms WHERE type = 'hotel'", [], (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                const rooms = rows.map(r => ({
                    id: r.id,
                    type: r.type,
                    name: r.name,
                    desc: r.desc,
                    price: r.price,
                    priceWeekend: r.priceWeekend,
                    amenities: safeJsonParse(r.amenities),
                    imgs: safeJsonParse(r.imgs),
                    area: r.area || null,
                    capacity: r.capacity || null,
                    tariff: r.tariff || null,
                    prepayment: r.prepayment || null,
                    available: !busyNames.includes(r.name)
                }));
                res.json(rooms);
            });
        }
    );
});

// Create a new room
app.post('/api/rooms', (req, res) => {
    const { type, name, desc, price, priceWeekend, amenities, area, capacity, tariff, prepayment } = req.body;
    db.run(
        `INSERT INTO rooms (type, name, desc, price, priceWeekend, amenities, imgs, area, capacity, tariff, prepayment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [type, name, desc, price, priceWeekend || null, JSON.stringify(amenities || []), '[]', area || null, capacity || null, tariff || null, prepayment || null],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        }
    );
});

// Update an existing room
app.put('/api/rooms/:id', (req, res) => {
    const { type, name, desc, price, priceWeekend, amenities, area, capacity, tariff, prepayment } = req.body;
    db.run(
        `UPDATE rooms SET type=?, name=?, desc=?, price=?, priceWeekend=?, amenities=?, area=?, capacity=?, tariff=?, prepayment=? WHERE id=?`,
        [type, name, desc, price, priceWeekend || null, JSON.stringify(amenities || []), area || null, capacity || null, tariff || null, prepayment || null, req.params.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

// Delete a room
app.delete('/api/rooms/:id', (req, res) => {
    db.run(`DELETE FROM rooms WHERE id=?`, [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Upload a photo for a room
app.post('/api/rooms/:id/photo', upload.single('photo'), (req, res) => {
    const roomId = req.params.id;
    if (!req.file) return res.status(400).json({ error: "No file provided" });

    // The URL path for the image
    const imgUrl = '/uploads/' + req.file.filename;

    db.get("SELECT imgs FROM rooms WHERE id = ?", [roomId], (err, row) => {
        if (err || !row) return res.status(500).json({ error: "Room not found" });

        let imgs = JSON.parse(row.imgs || '[]');
        imgs.push(imgUrl);

        db.run("UPDATE rooms SET imgs = ? WHERE id = ?", [JSON.stringify(imgs), roomId], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, imgUrl: imgUrl });
        });
    });
});

// Delete a photo from a room (by index or exact URL)
app.post('/api/rooms/:id/photo/delete', (req, res) => {
    const roomId = req.params.id;
    const { imgUrl } = req.body;

    db.get("SELECT imgs FROM rooms WHERE id = ?", [roomId], (err, row) => {
        if (err || !row) return res.status(500).json({ error: "Room not found" });

        let imgs = JSON.parse(row.imgs || '[]');
        const updatedImgs = imgs.filter(url => url !== imgUrl);

        db.run("UPDATE rooms SET imgs = ? WHERE id = ?", [JSON.stringify(updatedImgs), roomId], function (err) {
            if (err) return res.status(500).json({ error: err.message });

            // Optionally, delete the physical file if it starts with /uploads/
            if (imgUrl.startsWith('/uploads/')) {
                const filePath = path.join(__dirname, imgUrl);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
            res.json({ success: true });
        });
    });
});

// =======================
// API: BOOKINGS
// =======================

// Create booking
app.post('/api/bookings', (req, res) => {
    const b = req.body;

    // Basic date validation
    if (!b.checkIn || !b.checkOut || new Date(b.checkIn) >= new Date(b.checkOut)) {
        return res.status(400).json({ success: false, error: 'Некорректные даты проживания' });
    }

    // Validate overlapping bookings
    db.get(
        `SELECT id FROM bookings WHERE room = ? AND status != 'cancelled' AND (checkIn < ? AND checkOut > ?)`,
        [b.room, b.checkOut, b.checkIn],
        (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (row) return res.status(400).json({ success: false, error: 'Даты уже заняты' });

            const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
            const createdAt = new Date().toISOString();

            const guestName = sanitize(b.guest || '').trim();
            const guestPhone = sanitize(b.phone || '').trim();

            if (!guestName || !guestPhone) {
                return res.status(400).json({ success: false, error: 'Имя и телефон обязательны' });
            }

            db.run(
                `INSERT INTO bookings (id, type, room, checkIn, checkOut, nights, guest, phone, addons, total, status, clientChatId, createdAt)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, b.type, b.room, b.checkIn, b.checkOut, b.nights, guestName, guestPhone, JSON.stringify(b.addons || []), b.total, 'new', b.clientChatId || null, createdAt],
                function (err) {
                    if (err) return res.status(500).json({ error: err.message });
                    
                    // Notify Admin (wrapped in try/catch to ensure booking is saved even if notify fails)
                    try {
                        const typeLabel = b.type === 'hotel' ? 'Отель "Чалама"' : (b.type === 'sauna' ? 'Сауна "Чалама"' : (b.type === 'bath' ? 'Баня ХААН-ДЫТ' : 'Юрт-комплекс'));
                        
                        const adminText = `✨ <b>НОВЫЙ ЗАКАЗ: #${id.toUpperCase()}</b>\n\n` +
                                        `🏨 <b>${typeLabel}</b>\n` +
                                        `🛋 Объект: <b>${b.room}</b>\n` +
                                        `📅 Даты: <b>${b.checkIn} — ${b.checkOut}</b>\n\n` +
                                        `👤 Клиент: <b>${guestName}</b>\n` +
                                        `📞 Тел: <code>${guestPhone}</code>\n` +
                                        `💰 Сумма: <b>${b.total} ₽</b>\n\n` +
                                        `⚡️ <i>Система "Чалама"</i>`;
                        
                        notifyAllAdmins(adminText);

                        // NEW: Notify client if chatId is provided
                        if (b.clientChatId) {
                            const clientText = `🏨 <b>ООО «ЧАЛАМА»</b>\n\n` +
                                             `Здравствуйте, <b>${guestName}</b>!\n` +
                                             `Ваша заявка <b>#${id.toUpperCase()}</b> успешно принята.\n\n` +
                                             `📍 Объект: <b>${b.room}</b>\n` +
                                             `📅 Период: <b>${b.checkIn} — ${b.checkOut}</b>\n\n` +
                                             `📞 Наш администратор свяжется с вами в ближайшее время для подтверждения.\n\n` +
                                             `✨ <i>Спасибо, что выбрали нас!</i>`;
                            sendMaxMessage(b.clientChatId, clientText);
                        }
                    } catch (notifyErr) {
                        console.error("[Notify Error] Failed to send message to MAX:", notifyErr.message);
                    }

                    res.json({ success: true, id: id });
                }
            );
        }
    );
});

// Get Availability for calendar (public)
app.get('/api/availability', (req, res) => {
    db.all("SELECT room, checkIn, checkOut FROM bookings WHERE status = 'new' OR status = 'confirmed'", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Get all bookings
app.get('/api/admin/bookings', (req, res) => {
    db.all("SELECT * FROM bookings ORDER BY createdAt DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const bookings = rows.map(b => ({
            ...b,
            addons: JSON.parse(b.addons || '[]')
        }));
        res.json(bookings);
    });
});

// Update booking status
app.patch('/api/admin/bookings/:id/status', (req, res) => {
    const { status } = req.body;
    const bookingId = req.params.id;

    db.run("UPDATE bookings SET status = ? WHERE id = ?", [status, bookingId], function (err) {
        if (err) return res.status(500).json({ error: err.message });

        // Notify client if status is confirmed or cancelled
        if (status === 'confirmed' || status === 'cancelled') {
            db.get("SELECT * FROM bookings WHERE id = ?", [bookingId], (err, b) => {
                if (!err && b && b.clientChatId) {
                    const statusText = status === 'confirmed' ? '✅ <b>Ваше бронирование подтверждено!</b>' : '❌ <b>Бронирование отменено.</b>';
                    const icon = status === 'confirmed' ? '🏨' : 'ℹ️';
                    const detail = status === 'confirmed' ? '\n\nМы подготовим всё к вашему приезду. До встречи!' : '\n\nЕсли у вас есть вопросы, свяжитесь с нами по телефону: +7 (394) 222-10-82.';
                    
                    const clientMsg = `${icon} <b>ООО «ЧАЛАМА»</b>\n\n${statusText}\n\n📦 Номер заказа: <b>#${b.id.toUpperCase()}</b>\n📍 Объект: <b>${b.room}</b>\n📅 Дата: <b>${b.checkIn}</b>${detail}`;
                    
                    sendMaxMessage(b.clientChatId, clientMsg);
                }
            });
        }
        res.json({ success: true });
    });
});

// Archive management
app.delete('/api/admin/bookings/archive', (req, res) => {
    db.run("DELETE FROM bookings WHERE status = 'completed' OR status = 'cancelled'", [], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, count: this.changes });
    });
});

// Admin management
app.post('/api/internal/admins', (req, res) => {
    const { chatId, username } = req.body;
    if (!chatId) return res.status(400).json({ error: "Missing chatId" });

    console.log(`[Admin Add] Attempting to add: ${chatId} (${username || 'Администратор'})`);
    const createdAt = new Date().toISOString();

    db.run("INSERT OR REPLACE INTO admins (chatId, username, createdAt) VALUES (?, ?, ?)", 
        [chatId, username || 'Администратор', createdAt], (err) => {
        if (err) {
            console.error(`[Admin Add ERROR] DB Error: ${err.message}`);
            return res.status(500).json({ error: "Ошибка базы данных: " + err.message });
        }
        console.log(`[Admin Add SUCCESS] Done for ${chatId}`);
        res.json({ success: true });
    });
});

app.get('/api/internal/admins', (req, res) => {
    db.all("SELECT chatId FROM admins", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(r => r.chatId));
    });
});

app.delete('/api/internal/admins/:chatId', (req, res) => {
    const { chatId } = req.params;
    db.run("DELETE FROM admins WHERE chatId = ?", [chatId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, changes: this.changes });
    });
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
