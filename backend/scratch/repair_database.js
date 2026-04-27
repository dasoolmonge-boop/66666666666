const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('db/database.sqlite');

db.serialize(() => {
    console.log("Checking and repairing database structure...");
    
    // 1. Check columns in bookings
    db.all("PRAGMA table_info(bookings)", [], (err, rows) => {
        if (err) return console.error(err);
        
        const cols = rows.map(r => r.name);
        
        // Add roomTypeId if missing
        if (!cols.includes('roomTypeId')) {
            console.log("Adding 'roomTypeId' column to bookings table...");
            db.run("ALTER TABLE bookings ADD COLUMN roomTypeId INTEGER");
        }
        
        // Add unitNumber if missing
        if (!cols.includes('unitNumber')) {
            console.log("Adding 'unitNumber' column to bookings table...");
            db.run("ALTER TABLE bookings ADD COLUMN unitNumber TEXT");
        }

        // 2. After fixing schema, run migration
        setTimeout(() => {
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
                    console.log("Repair and Migration finished successfully.");
                    db.close();
                }, 2000);
            });
        }, 1000);
    });
});
