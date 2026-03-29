const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'db', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.all("SELECT * FROM rooms", [], (err, rows) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(JSON.stringify(rows, null, 2));
    db.close();
});
