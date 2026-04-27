const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('db/database.sqlite');
db.all("SELECT name FROM rooms WHERE type='yurt' OR type LIKE 'yurt%'", [], (err, rows) => {
    if (err) console.error(err);
    else console.log(JSON.stringify(rows, null, 2));
    db.close();
});
