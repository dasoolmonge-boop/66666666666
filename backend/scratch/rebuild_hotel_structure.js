const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('db/database.sqlite');

const mapping = [
    { name: 'Джуниор Сюит', units: ['204', '303'] },
    { name: 'Стандарт одноместный', units: ['207', '208', '210', '310', '311', '312'] },
    { name: 'Стандарт одноместный (другой тип)', units: ['202'] },
    { name: 'Повышенной комфортности (1/2 местный)', units: ['203', '309'] },
    { name: 'Повышенной комфортности (2 местный)', units: ['206', '305'] },
    { name: 'Стандарт двуместный', units: ['205', '209', '211', '304', '307', '308'] },
    { name: 'Студия (1/2 местный)', units: ['302', '301'] },
    { name: 'Делюкс (1/2 местный)', units: ['401', '404', '405', '406', '409'] },
    { name: 'Делюкс двуместный', units: ['402', '403', '407', '408'] }
];

db.serialize(() => {
    // 1. Get current hotel rooms
    db.all("SELECT id, name FROM rooms WHERE type = 'hotel'", [], (err, rooms) => {
        if (err) return console.error(err);
        
        // 2. Map and update
        mapping.forEach((m, index) => {
            const targetRoom = rooms[index]; // Use index to map existing IDs to new names
            if (targetRoom) {
                console.log(`Updating room ${targetRoom.id} to "${m.name}"...`);
                db.run("UPDATE rooms SET name = ? WHERE id = ?", [m.name, targetRoom.id]);
                
                // Clear old units for this type
                db.run("DELETE FROM room_units WHERE roomTypeId = ?", [targetRoom.id]);
                
                // Add new specific units
                m.units.forEach(uNum => {
                    db.run("INSERT INTO room_units (roomTypeId, unitNumber, isActive) VALUES (?, ?, 1)", [targetRoom.id, uNum]);
                });
            }
        });
        console.log("Database update completed.");
    });
});
