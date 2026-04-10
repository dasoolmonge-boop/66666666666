const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/database.sqlite');

db.all("SELECT id, name, type, capacity FROM rooms", (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }
    console.table(rows);
    db.close();
});
