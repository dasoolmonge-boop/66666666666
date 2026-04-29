const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, './backend/db/database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log("--- ADMINS ---");
db.all("SELECT * FROM admins", [], (err, rows) => {
    if (err) console.error(err);
    else console.table(rows);
    
    console.log("\n--- SUBSCRIBERS ---");
    db.all("SELECT * FROM subscribers", [], (err, subRows) => {
        if (err) console.error(err);
        else console.table(subRows);
        db.close();
    });
});
