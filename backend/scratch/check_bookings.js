const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('db/database.sqlite');
db.all("SELECT id, type, room, unitNumber, checkIn, checkOut, status FROM bookings ORDER BY createdAt DESC LIMIT 10", [], (err, rows) => {
    if (err) console.error(err);
    else console.log(JSON.stringify(rows, null, 2));
    db.close();
});
