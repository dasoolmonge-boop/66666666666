const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('db/database.sqlite');

const id = 'TEST_ID_123';
const createdAt = new Date().toISOString();
const b = {
    type: 'yurt',
    room: 'Малая юрта №1',
    checkIn: '2026-04-28T14:00:00',
    checkOut: '2026-04-29T12:00:00',
    nights: 1,
    total: 5000,
    clientChatId: null
};

db.run(
    `INSERT INTO bookings (id, type, room, unitNumber, checkIn, checkOut, nights, guest, phone, addons, total, status, clientChatId, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, b.type, b.room, 'Малая юрта №1', b.checkIn, b.checkOut, b.nights, 'Test Guest', '123456', '[]', b.total, 'confirmed', b.clientChatId, createdAt],
    function (err) {
        if (err) {
            console.error("INSERT FAILED:", err.message);
        } else {
            console.log("INSERT SUCCESSful, id:", id);
        }
        db.close();
    }
);
