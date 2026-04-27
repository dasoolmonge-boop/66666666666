const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('db/database.sqlite');

db.serialize(() => {
    db.all("SELECT id, name FROM rooms WHERE type = 'hotel'", [], (err, rooms) => {
        if (err) return console.error(err);
        
        rooms.forEach(room => {
            console.log(`Adding units for ${room.name}...`);
            for (let i = 2; i <= 10; i++) {
                db.run(
                    "INSERT OR IGNORE INTO room_units (roomTypeId, unitNumber, isActive) VALUES (?, ?, 1)",
                    [room.id, i.toString()]
                );
            }
        });
        console.log("Seeding completed.");
    });
});
