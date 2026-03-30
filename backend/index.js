const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const https = require('https');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config(); // Fallback to local

const app = express();
const port = process.env.PORT || 3000;

// Simple XSS Sanitizer helper (if xss lib is not yet loaded)
const sanitize = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>"']/g, (m) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[m]);
};

const safeJsonParse = (str, fallback = []) => {
    try {
        return JSON.parse(str || '[]');
    } catch (e) {
        return fallback;
    }
};

// HELPER: Send Telegram Message
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;

async function sendTelegramMessage(chatId, text) {
    if (!BOT_TOKEN || !chatId) {
        console.log(`[Telegram] Skipping - Token: ${BOT_TOKEN ? 'OK' : 'MISSING'}, ChatID: ${chatId || 'MISSING'}`);
        return;
    }
    const data = JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
    });

    const options = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${BOT_TOKEN}/sendMessage`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        }
    };

    const req = https.request(options, (res) => {
        if (res.statusCode !== 200) {
            console.error(`[Telegram] API Error: ${res.statusCode}`);
        } else {
            console.log(`[Telegram] Message sent to ${chatId}`);
        }
        res.on('data', () => {});
    });

    req.on('error', (error) => {
        console.error('[Telegram] Connection error:', error.message);
    });

    req.write(data);
    req.end();
}

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

// Database setup
const dbPath = path.resolve(__dirname, process.env.DATABASE_PATH || './db/database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("Error connecting to database:", err);
    else {
        console.log("Connected to SQLite database.");

        // Ensure Tables
        db.serialize(() => {
            // Migration: Add clientChatId if missing
            db.run("ALTER TABLE bookings ADD COLUMN clientChatId TEXT", (err) => {
                if (err && !err.message.includes("duplicate column name")) {
                    console.error("Migration error:", err.message);
                }
            });

            // Updated bookings with clientChatId
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

            // New Admins table
            db.run(`CREATE TABLE IF NOT EXISTS admins (
                chatId TEXT PRIMARY KEY,
                username TEXT,
                createdAt TEXT
            )`);

            // Ensure Sauna room exists
            db.run(`INSERT INTO rooms (type, name, desc, price, priceWeekend, amenities, imgs) 
                    SELECT 'sauna', 'Сауна Отеля', 'Почасовая аренда · Вместимость до 6 человек · 2000₽/час', 2000, 2000, '[]', '[]' 
                    WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE type='sauna')`);
        });
    }
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
            imgs: safeJsonParse(r.imgs)
        }));
        res.json(rooms);
    });
});

// Create a new room
app.post('/api/rooms', (req, res) => {
    const { type, name, desc, price, priceWeekend, amenities } = req.body;
    db.run(
        `INSERT INTO rooms (type, name, desc, price, priceWeekend, amenities, imgs) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [type, name, desc, price, priceWeekend || null, JSON.stringify(amenities || []), '[]'],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        }
    );
});

// Update an existing room
app.put('/api/rooms/:id', (req, res) => {
    const { type, name, desc, price, priceWeekend, amenities } = req.body;
    db.run(
        `UPDATE rooms SET type=?, name=?, desc=?, price=?, priceWeekend=?, amenities=? WHERE id=?`,
        [type, name, desc, price, priceWeekend || null, JSON.stringify(amenities || []), req.params.id],
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
                    
                    // Notify Admin
                    const typeLabel = b.type === 'hotel' ? '🏨 Отель' : (b.type === 'sauna' ? '🧖 Сауна' : '⛺ Юрты');
                    const adminText = `📌 <b>Новая заявка!</b>\n\n📍 ${typeLabel}\n🛏 <b>${b.room}</b>\n📅 <b>${b.checkIn} — ${b.checkOut}</b>\n👤 <b>${guestName}</b>\n📞 ${guestPhone}\n💰 Итого: <b>${b.total} ₽</b>`;
                    sendTelegramMessage(ADMIN_ID, adminText);

                    // Immediate Notify Client
                    if (b.clientChatId) {
                        const clientText = `✅ <b>Ваша заявка принята!</b>\n\n📍 ${typeLabel}: <b>${b.room}</b>\n📅 Даты: <b>${b.checkIn} — ${b.checkOut}</b>\n💰 Итого: <b>${b.total} ₽</b>\n\nМенеджер свяжется с вами в ближайшее время для подтверждения. 🙏`;
                        sendTelegramMessage(b.clientChatId, clientText);
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
                if (b && b.clientChatId) {
                    let clientText = "";
                    if (status === 'confirmed') {
                        clientText = `✅ <b>Ваше бронирование подтверждено!</b>\n\n📅 Даты: <b>${b.checkIn} — ${b.checkOut}</b>\n🏨 Объект: <b>${b.room}</b>\n\nЖдем вас в гости! 👋`;
                    } else if (status === 'cancelled') {
                        clientText = `❌ <b>К сожалению, ожидаемое бронирование (${b.checkIn}) было отменено.</b>\nЕсли у вас есть вопросы, пожалуйста, свяжитесь с нами по телефону.`;
                    }
                    
                    if (clientText) {
                        sendTelegramMessage(b.clientChatId, clientText);
                    }
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
    const createdAt = new Date().toISOString();
    db.run("INSERT OR REPLACE INTO admins (chatId, username, createdAt) VALUES (?, ?, ?)", [chatId, username, createdAt], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.get('/api/internal/admins', (req, res) => {
    db.all("SELECT chatId FROM admins", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(r => r.chatId));
    });
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
