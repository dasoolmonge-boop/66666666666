const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('db/database.sqlite');
db.all(`
    SELECT r.name as roomName, u.unitNumber 
    FROM rooms r 
    LEFT JOIN room_units u ON r.id = u.roomTypeId
    WHERE r.type = 'hotel'
`, [], (err, rows) => {
    if (err) console.error(err);
    else console.log(JSON.stringify(rows, null, 2));
    db.close();
});
