const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'db', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const sauna = {
    type: 'sauna',
    name: 'Сауна Отеля',
    desc: 'Почасовая аренда · Вместимость до 6 человек · 2000₽/час',
    price: 2000,
    priceWeekend: 2000,
    amenities: JSON.stringify(['Парная', 'Душ', 'Зона отдыха', 'Чайник']),
    imgs: JSON.stringify([])
};

db.get("SELECT id FROM rooms WHERE type='sauna'", [], (err, row) => {
    if (err) { console.error(err); process.exit(1); }
    if (row) {
        console.log("Sauna already exists with ID:", row.id);
        db.close();
    } else {
        db.run(
            `INSERT INTO rooms (type, name, desc, price, priceWeekend, amenities, imgs) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [sauna.type, sauna.name, sauna.desc, sauna.price, sauna.priceWeekend, sauna.amenities, sauna.imgs],
            function(err) {
                if (err) { console.error(err); process.exit(1); }
                console.log("Sauna created with ID:", this.lastID);
                db.close();
            }
        );
    }
});
