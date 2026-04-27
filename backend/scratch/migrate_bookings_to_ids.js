const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('db/database.sqlite');

db.serialize(() => {
    console.log("Starting migration: linking existing bookings to room IDs...");
    
    db.all("SELECT id, name FROM rooms", [], (err, rooms) => {
        if (err) return console.error(err);
        
        rooms.forEach(room => {
            db.run(
                "UPDATE bookings SET roomTypeId = ? WHERE room = ? AND roomTypeId IS NULL",
                [room.id, room.name],
                function(err) {
                    if (err) console.error(`Error updating for room ${room.name}:`, err.message);
                    else if (this.changes > 0) {
                        console.log(`Linked ${this.changes} bookings to "${room.name}" (ID: ${room.id})`);
                    }
                }
            );
        });
        
        setTimeout(() => {
            console.log("Migration finished.");
            db.close();
        }, 2000);
    });
});
