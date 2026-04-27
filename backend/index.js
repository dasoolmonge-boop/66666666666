const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const multer = require('multer');
const compression = require('compression');
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
const ADMIN_ID = process.env.ADMIN_ID || '207553732';

// 🔍 Проверка токена при запуске
async function checkToken() {
    if (!MAX_TOKEN || MAX_TOKEN === 'undefined') {
        console.warn("[MAX Auth] MAX_TOKEN is missing or undefined. Skipping validation.");
        return;
    }
    const options = {
        hostname: 'platform-api.max.ru',
        port: 443,
        path: '/me',
        method: 'GET',
        headers: { 'Authorization': MAX_TOKEN }
    };
    https.get(options, (res) => {
        let body = '';
        res.on('data', (d) => body += d);
        res.on('end', () => {
            if (res.statusCode === 200) {
                console.log(`[MAX Auth] Token is valid. Bot info: ${body}`);
            } else {
                console.error(`[MAX Auth Error] Status ${res.statusCode}: ${body}`);
            }
        });
    }).on('error', (e) => console.error(`[MAX Auth Connection Error] ${e.message}`));
}

checkToken();

async function notifyAdmins(text, type) {
    const adminIds = new Set();
    if (ADMIN_ID) adminIds.add(ADMIN_ID);

    // Map booking type to department
    let targetDept = 'all';
    if (type === 'hotel' || type === 'sauna') targetDept = 'hotel_chalama';
    if (type === 'yurt' || type === 'bath') targetDept = 'haan_dyt';

    db.all("SELECT chatId, department FROM admins", [], (err, rows) => {
        if (!err && rows) {
            rows.forEach(r => {
                // Send if it's superadmin ('all'), or matches the department
                if (r.department === 'all' || r.department === targetDept) {
                    adminIds.add(r.chatId);
                }
            });
        }
        console.log(`[Admin Notification] Sending type [${type}] to admins: ${Array.from(adminIds).join(', ')}`);
        adminIds.forEach(id => sendMaxMessage(id, text, `Admin-Dept-${type}`));
    });
}

async function sendMaxMessage(chatId, text, debugContext = "Notification") {
    if (!MAX_TOKEN) {
        console.warn(`[MAX ${debugContext} SKIP] No MAX_TOKEN configured.`);
        return;
    }
    if (!chatId) {
        console.warn(`[MAX ${debugContext} SKIP] No chatId provided.`);
        return;
    }
    
    const data = JSON.stringify({
        text: text,
        format: 'html'
    });

    const options = {
        hostname: 'platform-api.max.ru',
        port: 443,
        path: `/messages?chat_id=${chatId}`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data),
            'Authorization': MAX_TOKEN
        }
    };

    console.log(`[MAX ${debugContext} START] Sending to ${chatId}...`);

    const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (d) => body += d);
        res.on('end', () => {
            if (res.statusCode === 200 || res.statusCode === 201) {
                console.log(`[MAX ${debugContext} SUCCESS] Response from ${chatId}: ${body}`);
            } else {
                console.error(`[MAX ${debugContext} ERROR] Status ${res.statusCode} for ${chatId}: ${body}`);
            }
        });
    });

    req.on('error', (e) => console.error(`[MAX ${debugContext} CONN ERROR] ${e.message}`));
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
app.use(compression());
app.use(cors());
app.use(express.json());

// Serve static files with caching for performance (1 day)
const cacheOptions = {
    maxAge: '1d',
    etag: true,
    index: false
};
app.use(express.static(path.join(__dirname, 'public'), cacheOptions));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), cacheOptions));

// Root route: Detect mobile app/bot and serve mobile.html directly to avoid double-loading latency
app.get('/', (req, res) => {
    const isBotEnv = req.query.bot || req.query.tgWebAppStartParam;
    if (isBotEnv) {
        return res.sendFile(path.join(__dirname, 'public', 'mobile.html'));
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Legal pages routes
app.get('/privacy-policy', (req, res) => res.sendFile(path.join(__dirname, 'public', 'privacy-policy.html')));
app.get('/terms', (req, res) => res.sendFile(path.join(__dirname, 'public', 'terms.html')));
app.get('/offer', (req, res) => res.sendFile(path.join(__dirname, 'public', 'offer.html')));
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

    // Broadcasts table — always ensure it exists (fix for servers with older DB versions)
    db.run(`CREATE TABLE IF NOT EXISTS broadcasts (
        id TEXT PRIMARY KEY,
        message TEXT,
        type TEXT,
        recipientCount INTEGER,
        createdAt TEXT
    )`);

    // Subscribers table — users who started the bot (for broadcast mailing)
    db.run(`CREATE TABLE IF NOT EXISTS subscribers (
        chatId TEXT PRIMARY KEY,
        name TEXT,
        createdAt TEXT
    )`);

    // Menus table — menu images for restaurant, bar, cafe
    db.run(`CREATE TABLE IF NOT EXISTS menus (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT,
        imgUrl TEXT,
        sortOrder INTEGER DEFAULT 0,
        createdAt TEXT
    )`);

    // Check if initialization is already done using PRAGMA user_version as a marker
    db.get("PRAGMA user_version", (err, row) => {
        const currentVersion = row ? row.user_version : 0;
        const TARGET_VERSION = 13; // Room units system

        if (currentVersion < TARGET_VERSION) {
            console.log(`[DB Migration] Current version ${currentVersion} < ${TARGET_VERSION}. Running migrations...`);
            
            db.serialize(() => {
                // Migrations for rooms: add new fields if missing
                db.run("ALTER TABLE rooms ADD COLUMN area TEXT", (err) => {});
                db.run("ALTER TABLE rooms ADD COLUMN capacity INTEGER", (err) => {});
                db.run("ALTER TABLE rooms ADD COLUMN tariff TEXT", (err) => {});
                db.run("ALTER TABLE rooms ADD COLUMN prepayment INTEGER", (err) => {});

                // Indexes for rooms
                db.run("CREATE INDEX IF NOT EXISTS idx_rooms_type ON rooms(type)");

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

                db.run("ALTER TABLE bookings ADD COLUMN clientChatId TEXT", (err) => {});
                
                // Indexes for bookings
                db.run("CREATE INDEX IF NOT EXISTS idx_bookings_overlap ON bookings(status, checkIn, checkOut)");
                db.run("CREATE INDEX IF NOT EXISTS idx_bookings_room ON bookings(room)");

                // Admins table
                db.run(`CREATE TABLE IF NOT EXISTS admins (
                    chatId TEXT PRIMARY KEY,
                    username TEXT,
                    createdAt TEXT,
                    department TEXT
                )`);

                db.run("ALTER TABLE admins ADD COLUMN username TEXT", (err) => {});
                db.run("ALTER TABLE admins ADD COLUMN createdAt TEXT", (err) => {});
                db.run("ALTER TABLE admins ADD COLUMN department TEXT", (err) => {
                    if (!err) db.run("UPDATE admins SET department = 'all' WHERE department IS NULL");
                });

                // Broadcasts table
                db.run(`CREATE TABLE IF NOT EXISTS broadcasts (
                    id TEXT PRIMARY KEY,
                    message TEXT,
                    type TEXT,
                    recipientCount INTEGER,
                    createdAt TEXT
                )`);

                // Room units table (physical rooms mapped to room types)
                db.run(`CREATE TABLE IF NOT EXISTS room_units (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    roomTypeId INTEGER NOT NULL,
                    unitNumber TEXT NOT NULL,
                    isActive INTEGER DEFAULT 1,
                    FOREIGN KEY (roomTypeId) REFERENCES rooms(id)
                )`);
                db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_unit_number ON room_units(unitNumber)");
                db.run("ALTER TABLE bookings ADD COLUMN unitNumber TEXT", (err) => {});
                db.run("CREATE INDEX IF NOT EXISTS idx_bookings_unit ON bookings(unitNumber)");

                // Initial Room Seeding
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

                // Update Amenities
                const listY123 = JSON.stringify(['Двуспальная кровать', 'Раскладной диван', 'Комплект полотенец, халатов и тапочек на 4 человек', 'Посуда на 4 человек, сковорода и кастрюля', 'Кухня с индукционной плитой и раковиной', 'Чайник, микроволновая печь, холодильник', 'Кондиционер', 'Дровяная печь-камин', 'Санузел с душевой', 'Одноразовые гигиенические принадлежности']);
                const listY4 = JSON.stringify(['Два раскладных дивана', 'Комплекты постельного белья', 'Большой стол на 10 персон', 'Комплект посуды и столовых приборов на 6 человек', 'Холодильник', 'Микроволновая печь', 'Индукционная плита', 'Кухонная зона с раковиной', 'Санузел', 'Дровяная печь']);
                const listBath = JSON.stringify(['Традиционная дровяная печь', 'Просторная парилка', 'Душевая зона и санузел', 'Большой стол на 12 персон', 'Кухонная зона: плита, раковина, посуда', 'Телевизор с Триколор ТВ', 'Wi-Fi', 'Караоке для весёлого отдыха']);

                db.run("UPDATE rooms SET amenities = ?, capacity = 3 WHERE type = 'yurt' AND (name LIKE '%Земля%' OR name LIKE '%Вода%' OR name LIKE '%Воздух%' OR name LIKE '%Малая%')", [listY123]);
                db.run("UPDATE rooms SET amenities = ?, capacity = 4 WHERE type = 'yurt' AND (name LIKE '%Огонь%' OR name LIKE '%Большая%')", [listY4]);
                db.run("UPDATE rooms SET amenities = ? WHERE type = 'bath'", [listBath]);

                // Seed room_units for hotel rooms
                const UNIT_SEED = [
                    { pattern: 'Стандарт одноместный', notPattern: '%/%', units: ['207','208','210','310','311','312'] },
                    { pattern: 'Стандарт одноместный/двухместный', units: ['202'] },
                    { pattern: '%омфорт%одно%', units: ['203','309'] },
                    { pattern: '%омфорт%дву%', units: ['206','305'] },
                    { pattern: '%Стандарт%двуместный%', units: ['303', '304', '306', '307', '308'] },
                    { pattern: 'Студия%', units: ['301','302'] },
                    { pattern: 'Делюкс одно%', units: ['401','404','405','406','409'] },
                    { pattern: 'Делюкс дву%', units: ['402','403','407','408'] },
                    { pattern: '%юниор%юит%', units: ['201', '202', '204', '205', '209'] },
                ];

                UNIT_SEED.forEach(mapping => {
                    const q = mapping.notPattern
                        ? `SELECT id FROM rooms WHERE type='hotel' AND name LIKE ? AND name NOT LIKE ?`
                        : `SELECT id FROM rooms WHERE type='hotel' AND name LIKE ?`;
                    const params = mapping.notPattern ? [mapping.pattern, mapping.notPattern] : [mapping.pattern];
                    db.get(q, params, (err, room) => {
                        if (!err && room) {
                            mapping.units.forEach(u => {
                                db.run("INSERT OR IGNORE INTO room_units (roomTypeId, unitNumber, isActive) VALUES (?, ?, 1)", [room.id, u]);
                            });
                            console.log(`[Seed] Room "${mapping.pattern}" (id=${room.id}) → units: ${mapping.units.join(',')}`);
                        } else {
                            console.log(`[Seed] Room "${mapping.pattern}" not found in DB, skipping units`);
                        }
                    });
                });

                // Finalize version
                db.run(`PRAGMA user_version = ${TARGET_VERSION}`);
                console.log(`[DB Migration] Database initialized to version ${TARGET_VERSION}`);
            });
        }
    });
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

// Get available rooms for a date range
app.get('/api/rooms/available', (req, res) => {
    const { checkIn, checkOut } = req.query;
    if (!checkIn || !checkOut) return res.status(400).json({ error: 'checkIn and checkOut required' });

    db.all("SELECT * FROM rooms", [], (err, rooms) => {
        if (err) return res.status(500).json({ error: err.message });

        db.all("SELECT * FROM room_units WHERE isActive = 1", [], (err, units) => {
            if (err) return res.status(500).json({ error: err.message });
            units = units || [];

            db.all(
                `SELECT DISTINCT room, unitNumber FROM bookings
                 WHERE status != 'cancelled' AND status != 'completed'
                 AND checkIn < ? AND checkOut > ?`,
                [checkOut, checkIn],
                (err, busyRows) => {
                    if (err) return res.status(500).json({ error: err.message });

                    const busyUnits = new Set((busyRows || []).filter(r => r.unitNumber).map(r => r.unitNumber));
                    const busyNames = new Set((busyRows || []).filter(r => !r.unitNumber).map(r => r.room));

                    const result = rooms.map(r => {
                        const data = {
                            id: r.id, type: r.type, name: r.name, desc: r.desc,
                            price: r.price, priceWeekend: r.priceWeekend,
                            amenities: safeJsonParse(r.amenities), imgs: safeJsonParse(r.imgs),
                            area: r.area || null, capacity: r.capacity || null,
                            tariff: r.tariff || null, prepayment: r.prepayment || null,
                        };

                        if (r.type === 'hotel') {
                            const roomUnits = units.filter(u => u.roomTypeId === r.id);
                            if (roomUnits.length > 0) {
                                const freeUnits = roomUnits.filter(u => !busyUnits.has(u.unitNumber));
                                data.available = freeUnits.length > 0;
                                data.freeCount = freeUnits.length;
                                data.totalCount = roomUnits.length;
                            } else {
                                data.available = !busyNames.has(r.name);
                                data.freeCount = data.available ? 1 : 0;
                                data.totalCount = 1;
                            }
                        } else {
                            data.available = !busyNames.has(r.name);
                        }
                        return data;
                    });
                    res.json(result);
                }
            );
        });
    });
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

// Helper: Format ISO date to human readable
function formatDate(isoString) {
    if (!isoString) return '';
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return isoString;
        const d = date.getDate().toString().padStart(2, '0');
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const y = date.getFullYear();
        return `${d}.${m}.${y}`;
    } catch (e) {
        return isoString;
    }
}

// Create booking
app.post('/api/bookings', (req, res) => {
    const b = req.body;

    if (!b.checkIn || !b.checkOut || new Date(b.checkIn) >= new Date(b.checkOut)) {
        return res.status(400).json({ success: false, error: 'Некорректные даты проживания' });
    }

    const guestName = sanitize(b.guest || '').trim();
    const guestPhone = sanitize(b.phone || '').trim();
    if (!guestName || !guestPhone) {
        return res.status(400).json({ success: false, error: 'Имя и телефон обязательны' });
    }

    const id = (Date.now().toString(36).slice(-5) + Math.random().toString(36).substr(2, 5)).toUpperCase();
    const createdAt = new Date().toISOString();
    const status = b.status || 'new';

    function insertBooking(unitNumber) {
        db.run(
            `INSERT INTO bookings (id, type, room, unitNumber, checkIn, checkOut, nights, guest, phone, addons, total, status, clientChatId, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, b.type, b.room, unitNumber, b.checkIn, b.checkOut, b.nights, guestName, guestPhone, JSON.stringify(b.addons || []), b.total, status, b.clientChatId || null, createdAt],
            function (err) {
                if (err) return res.status(500).json({ error: err.message });

                try {
                    const typeLabel = b.type === 'hotel' ? 'Отель "Чалама"' : (b.type === 'sauna' ? 'Сауна "Чалама"' : (b.type === 'bath' ? 'Баня ХААН-ДЫТ' : 'Юрт-комплекс'));
                    const datesRange = `${formatDate(b.checkIn)} — ${formatDate(b.checkOut)}`;
                    const unitLabel = unitNumber ? ` (№${unitNumber})` : '';

                    const adminText = `✨ <b>НОВЫЙ ЗАКАЗ: #${id}</b>\n\n` +
                                    `🏨 <b>${typeLabel}</b>\n` +
                                    `🛋 Объект: <b>${b.room}${unitLabel}</b>\n` +
                                    `📅 Даты: <b>${datesRange}</b>\n\n` +
                                    `👤 Клиент: <b>${guestName}</b>\n` +
                                    `📞 Тел: <code>${guestPhone}</code>\n` +
                                    `💰 Сумма: <b>${b.total} ₽</b>\n\n` +
                                    `⚡️ <i>Система "Чалама"</i>`;

                    notifyAdmins(adminText, b.type);

                    if (b.clientChatId) {
                        const clientText = `✅ <b>Заявка принята!</b>\n\n` +
                                         `📋 Номер заказа: <b>#${id}</b>\n` +
                                         `🏨 ${typeLabel}\n` +
                                         `🛋 ${b.room}\n` +
                                         `📅 ${datesRange}\n` +
                                         `💰 Сумма: <b>${b.total} ₽</b>\n\n` +
                                         `📞 Наш менеджер свяжется с вами в течение 15 минут для подтверждения бронирования.\n\n` +
                                         `Если у вас есть вопросы, позвоните нам:\n` +
                                         `☎️ <b>+7 394 222-10-82</b>`;
                        sendMaxMessage(b.clientChatId, clientText, "Client-NewBooking");
                    }
                } catch (notifyErr) {
                    console.error("[Notify Error]", notifyErr.message);
                }

                res.json({ success: true, id, unitNumber: unitNumber || null });
            }
        );
    }

    if (b.type === 'hotel' || b.type === 'yurt' || b.type === 'sauna' || b.type === 'bath') {
        // Hotel: auto-assign a free unit using exclusive transaction
        db.run("BEGIN EXCLUSIVE", (err) => {
            if (err) return res.status(500).json({ error: 'Transaction error' });

            // Find room type by name or ID
            const findQ = b.roomTypeId
                ? "SELECT id, name FROM rooms WHERE id = ?"
                : "SELECT id, name FROM rooms WHERE name = ?";
            const findP = b.roomTypeId ? [b.roomTypeId] : [b.room];

            db.get(findQ, findP, (err, roomType) => {
                if (err || !roomType) {
                    db.run("ROLLBACK");
                    return res.status(400).json({ success: false, error: 'Тип номера не найден' });
                }

                db.all("SELECT unitNumber FROM room_units WHERE roomTypeId = ? AND isActive = 1", [roomType.id], (err, units) => {
                    if (err || !units || !units.length) {
                        // Fallback: no units defined, use old behavior
                        db.get(
                            `SELECT id FROM bookings WHERE room = ? AND status != 'cancelled' AND status != 'completed' AND checkIn < ? AND checkOut > ?`,
                            [roomType.name, b.checkOut, b.checkIn],
                            (err, conflict) => {
                                if (conflict) {
                                    db.run("ROLLBACK");
                                    return res.status(400).json({ success: false, error: 'Даты уже заняты' });
                                }
                                b.room = roomType.name;
                                db.run("COMMIT", () => insertBooking(null));
                            }
                        );
                        return;
                    }

                    const unitNums = units.map(u => u.unitNumber);
                    const placeholders = unitNums.map(() => '?').join(',');

                    db.all(
                        `SELECT DISTINCT unitNumber FROM bookings
                         WHERE unitNumber IN (${placeholders})
                         AND status != 'cancelled' AND status != 'completed'
                         AND checkIn < ? AND checkOut > ?`,
                        [...unitNums, b.checkOut, b.checkIn],
                        (err, busyRows) => {
                            if (err) { db.run("ROLLBACK"); return res.status(500).json({ error: err.message }); }

                            const busySet = new Set((busyRows || []).map(r => r.unitNumber));
                            const freeUnit = unitNums.find(u => !busySet.has(u));

                            if (!freeUnit) {
                                db.run("ROLLBACK");
                                return res.status(400).json({ success: false, error: 'Все номера этого типа заняты на выбранные даты' });
                            }

                            b.room = roomType.name;
                            db.run("COMMIT", () => insertBooking(freeUnit));
                        }
                    );
                });
            });
        });
    } else {
        // Yurt/Sauna/Bath: old 1:1 logic
        db.get(
            `SELECT id FROM bookings WHERE room = ? AND status != 'cancelled' AND status != 'completed' AND (checkIn < ? AND checkOut > ?)`,
            [b.room, b.checkOut, b.checkIn],
            (err, row) => {
                if (err) return res.status(500).json({ error: err.message });
                if (row) return res.status(400).json({ success: false, error: 'Даты уже заняты' });
                insertBooking(null);
            }
        );
    }
});

// Get Availability for calendar (public)
app.get('/api/availability', (req, res) => {
    db.all("SELECT room, checkIn, checkOut FROM bookings WHERE status != 'cancelled' AND status != 'completed'", [], (err, rows) => {
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
                    
                    sendMaxMessage(b.clientChatId, clientMsg, `Client-Status-${status}`);
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
    const { chatId, username, department } = req.body;
    if (!chatId) return res.status(400).json({ error: "Missing chatId" });

    console.log(`[Admin Add] Attempting to add: ${chatId} (${username || 'Администратор'}) to [${department || 'all'}]`);
    const createdAt = new Date().toISOString();

    db.run("INSERT OR REPLACE INTO admins (chatId, username, createdAt, department) VALUES (?, ?, ?, ?)", 
        [chatId, username || 'Администратор', createdAt, department || 'all'], (err) => {
        if (err) {
            console.error(`[Admin Add ERROR] DB Error: ${err.message}`);
            return res.status(500).json({ error: "Ошибка базы данных: " + err.message });
        }
        console.log(`[Admin Add SUCCESS] Done for ${chatId}`);
        res.json({ success: true });
    });
});

app.get('/api/internal/admins', (req, res) => {
    db.all("SELECT chatId, username, department FROM admins", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.delete('/api/internal/admins/:chatId', (req, res) => {
    const { chatId } = req.params;
    db.run("DELETE FROM admins WHERE chatId = ?", [chatId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, changes: this.changes });
    });
});

// ===== SUBSCRIBERS (Bot Users) =====

// Register a subscriber (called by bot when user starts it)
app.post('/api/internal/subscribers', (req, res) => {
    const { chatId, name } = req.body;
    if (!chatId) return res.status(400).json({ error: 'chatId required' });

    db.run(
        `INSERT INTO subscribers (chatId, name, createdAt) VALUES (?, ?, ?)
         ON CONFLICT(chatId) DO UPDATE SET name = excluded.name`,
        [String(chatId), name || 'Пользователь', new Date().toISOString()],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            console.log(`[Subscriber] Registered: ${chatId} (${name})`);
            res.json({ success: true });
        }
    );
});

// List all subscribers
app.get('/api/internal/subscribers', (req, res) => {
    db.all("SELECT * FROM subscribers ORDER BY createdAt DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// ===== BROADCAST / MAILING =====

// Get recipients count (from subscribers table)
app.get('/api/admin/broadcast/recipients', (req, res) => {
    db.all("SELECT chatId, name, createdAt FROM subscribers", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ count: (rows || []).length, recipients: rows || [] });
    });
});

// Send broadcast (to all subscribers)
app.post('/api/admin/broadcast', (req, res) => {
    const { message } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: 'Пустое сообщение' });

    db.all("SELECT chatId FROM subscribers", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const chatIds = (rows || []).map(r => r.chatId);
        if (chatIds.length === 0) return res.json({ success: true, sent: 0, message: 'Нет подписчиков' });

        const formattedMsg = `📢 <b>ООО «ЧАЛАМА»</b>\n\n${message}`;

        let sent = 0;
        let failed = 0;

        chatIds.forEach(chatId => {
            try {
                sendMaxMessage(chatId, formattedMsg, 'Broadcast');
                sent++;
            } catch (e) {
                failed++;
                console.error(`[Broadcast Error] chatId=${chatId}: ${e.message}`);
            }
        });

        // Save to history
        const broadcastId = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
        db.run(
            "INSERT INTO broadcasts (id, message, type, recipientCount, createdAt) VALUES (?, ?, ?, ?, ?)",
            [broadcastId, message, 'all', chatIds.length, new Date().toISOString()]
        );

        console.log(`[Broadcast] Sent to ${sent} subscribers (${failed} failed)`);
        res.json({ success: true, sent, failed, total: chatIds.length });
    });
});

// Broadcast history
app.get('/api/admin/broadcast/history', (req, res) => {
    db.all("SELECT * FROM broadcasts ORDER BY createdAt DESC LIMIT 50", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// ===== MENUS (Restaurant / Bar / Cafe) =====

// Get menu images by category
app.get('/api/menus', (req, res) => {
    const category = req.query.category;
    if (!category) {
        return db.all("SELECT * FROM menus ORDER BY category, sortOrder, id", [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows || []);
        });
    }
    db.all("SELECT * FROM menus WHERE category = ? ORDER BY sortOrder, id", [category], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// Upload menu image
app.post('/api/menus', upload.single('photo'), (req, res) => {
    const category = req.body.category;
    if (!req.file) return res.status(400).json({ error: 'Нет файла' });
    if (!category) return res.status(400).json({ error: 'Не указана категория' });

    const imgUrl = '/uploads/' + req.file.filename;
    db.run(
        "INSERT INTO menus (category, imgUrl, sortOrder, createdAt) VALUES (?, ?, (SELECT COALESCE(MAX(sortOrder),0)+1 FROM menus WHERE category=?), ?)",
        [category, imgUrl, category, new Date().toISOString()],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            console.log(`[Menu] Uploaded ${category}: ${imgUrl}`);
            res.json({ success: true, id: this.lastID, imgUrl });
        }
    );
});

// Delete menu image
app.delete('/api/menus/:id', (req, res) => {
    const { id } = req.params;
    db.get("SELECT imgUrl FROM menus WHERE id = ?", [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Не найдено' });

        // Delete physical file
        if (row.imgUrl && row.imgUrl.startsWith('/uploads/')) {
            const filePath = path.join(__dirname, row.imgUrl);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        db.run("DELETE FROM menus WHERE id = ?", [id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            console.log(`[Menu] Deleted id=${id}`);
            res.json({ success: true });
        });
    });
});
// ===== ROOM UNITS MANAGEMENT =====

// Get units for a room type
app.get('/api/rooms/:id/units', (req, res) => {
    db.all("SELECT * FROM room_units WHERE roomTypeId = ? ORDER BY unitNumber", [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// Add a unit to a room type
app.post('/api/rooms/:id/units', (req, res) => {
    const { unitNumber } = req.body;
    if (!unitNumber) return res.status(400).json({ error: 'unitNumber required' });
    db.run("INSERT OR IGNORE INTO room_units (roomTypeId, unitNumber, isActive) VALUES (?, ?, 1)",
        [req.params.id, String(unitNumber).trim()], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: this.lastID });
    });
});

// Delete a unit
app.delete('/api/room-units/:id', (req, res) => {
    db.run("DELETE FROM room_units WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ===== CHESS GRID (Шахматка) =====
app.get('/api/admin/chess', (req, res) => {
    const startDate = req.query.startDate || new Date().toISOString().split('T')[0];
    const numDays = parseInt(req.query.days) || 14;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + numDays);
    const endStr = endDate.toISOString().split('T')[0];

    const requestedType = req.query.type || 'hotel';
    const typeFilter = requestedType === 'yurt' ? " (type = 'yurt' OR type = 'bath') " : " type = 'hotel' ";

    db.all(`SELECT * FROM rooms WHERE ${typeFilter} ORDER BY name`, [], (err, roomTypes) => {
        if (err) return res.status(500).json({ error: err.message });

        db.all("SELECT * FROM room_units WHERE isActive = 1 ORDER BY roomTypeId, unitNumber", [], (err, units) => {
            if (err) return res.status(500).json({ error: err.message });

            db.all(
                `SELECT id, type, room, unitNumber, checkIn, checkOut, guest, phone, status
                 FROM bookings WHERE ${typeFilter}
                 AND status != 'cancelled'
                 AND date(checkIn) < date(?) AND date(checkOut) > date(?)
                 ORDER BY checkIn`,
                [endStr, startDate],
                (err, bookings) => {
                    if (err) return res.status(500).json({ error: err.message });

                    const result = (roomTypes || []).map(rt => {
                        const rtUnits = (units || []).filter(u => u.roomTypeId === rt.id);
                        const unitNums = rtUnits.map(u => u.unitNumber);

                        const rtBookings = (bookings || []).filter(b =>
                            unitNums.includes(b.unitNumber) || (b.room === rt.name && !b.unitNumber)
                        );

                        return {
                            id: rt.id, name: rt.name,
                            units: unitNums,
                            bookings: rtBookings.map(b => ({
                                id: b.id, unitNumber: b.unitNumber, checkIn: b.checkIn,
                                checkOut: b.checkOut, guest: b.guest, status: b.status
                            }))
                        };
                    });

                    res.json({ roomTypes: result, startDate, days: numDays });
                }
            );
        });
    });
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
