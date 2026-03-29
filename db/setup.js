const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const H = 'https://www.chalamahotel.ru/upload/';
const hotelRooms = [
    { name:'Джуниор Сюит', desc:'Двухспальная кровать · 26 м²', price:10450,
      amenities:['Кондиционер','ТВ','Холодильник','Фен','Утюг','Мини-бар'],
      imgs:[H+'resize_cache/iblock/8ca/900_600_2/867g21cm3hqw7a1b49alaa3f01og2er8.jpg', H+'resize_cache/iblock/ff2/900_600_2/qqmbe0dtqvmobenhv911cyiqu569jd65.jpg', H+'resize_cache/iblock/00a/900_600_2/tbad43a13djxr43x7wp0jx04ps7txjv4.jpg', H+'resize_cache/iblock/102/900_600_2/i2pjt3w3mkvzqcf1z7543qkwhprp3m19.jpg'] },
    { name:'Стандарт', desc:'Односпальная кровать · 15 м²', price:6950,
      amenities:['Кондиционер','ТВ','Холодильник','Фен','Шторы-блэкаут'],
      imgs:[H+'iblock/683/l0u9vavcl1a892fpkzcxhcd9d1fdhedp.jpg', H+'iblock/1ce/heqfgcnklsvdjwy1z19qfdurx2zbio09.jpeg', H+'iblock/24d/f61kr5agvzknjsvqmqlbsferbthwhzza.jpeg'] },
    { name:'Стандарт (Двухместный)', desc:'Двухспальная кровать · 15 м²', price:7950,
      amenities:['Кондиционер','ТВ','Холодильник','Фен','Шторы-блэкаут'],
      imgs:[H+'resize_cache/iblock/82a/900_600_2/60q6syg2td4jmv4gyhy3ahqxdq5wzr2j.jpg', H+'resize_cache/iblock/fc9/900_600_2/aqxu75sxgs4vsvgs7iq4pgqxezxhfawj.jpg', H+'resize_cache/iblock/dfa/900_600_2/xx8qbiqmyp52oo7i129yv71u8i9a9xws.jpg'] },
    { name:'Повышенной Комфортности', desc:'Двухспальная кровать · 20 м²', price:8300,
      amenities:['Кондиционер','ТВ','Холодильник','Фен','Утюг','Шторы-блэкаут'],
      imgs:[H+'resize_cache/iblock/590/900_600_2/pz70wvstb8dc92bae24r0uu6ygr5ryek.jpg', H+'resize_cache/iblock/4b2/900_600_2/jduop4pp8r6bvvbpzgvfed053jj10867.jpg', H+'resize_cache/iblock/632/900_600_2/n9bxu54c6n3whgzjzovfyjj1w91ho8bd.jpg'] },
    { name:'Повышенной Комфортности (Twin)', desc:'Две раздельные кровати · 20 м²', price:9700,
      amenities:['Кондиционер','ТВ','Холодильник','Фен','Утюг'],
      imgs:[H+'resize_cache/iblock/d2a/900_600_2/lwwhe661x0gp9r03mfs0z5vy0t435188.jpg', H+'resize_cache/iblock/b2d/900_600_2/rr7drs7l142wz7tnatqbw0u9xj6ech61.jpg', H+'resize_cache/iblock/af2/900_600_2/nk7s88qons9orth3nwxdhw3f1456k8g7.jpg'] },
    { name:'Стандарт (Twin)', desc:'Две раздельные кровати · 15 м²', price:8750,
      amenities:['Кондиционер','ТВ','Холодильник','Фен'],
      imgs:[H+'resize_cache/iblock/2bf/900_600_2/asxttx3vv2eyg2ztb951m3mc08gcn1ji.jpg', H+'resize_cache/iblock/711/900_600_2/p4osbb4jqpvywzm6uq1226hpb25w2ooe.jpg', H+'iblock/b10/z7ajxnh8x3jkvm4oonbwzcn0art8ry5b.jpg'] },
    { name:'Стандарт Студия', desc:'Двухспальная кровать, гостиная · 30 м²', price:13200,
      amenities:['Кондиционер','ТВ','Холодильник','Фен','Утюг','Мини-бар','Гостиная'],
      imgs:[H+'resize_cache/iblock/443/900_600_2/320j5zwy5v7qa6biymevfjf49sy1i2te.jpg', H+'resize_cache/iblock/62d/900_600_2/251q56kpwi47vz730luynbpbxkrh8fzq.jpg', H+'resize_cache/iblock/1a8/900_600_2/fjzh3782damfetm6f3n6c1khw2cpzgbs.jpg'] },
    { name:'Делюкс', desc:'Двухспальная кровать · 25 м²', price:8800,
      amenities:['Кондиционер','ТВ','Холодильник','Фен','Утюг','Шторы-блэкаут'],
      imgs:[H+'resize_cache/iblock/ef6/900_600_2/bpzx34k6u4trmbr3gdbqp8pvyeub879z.jpg', H+'resize_cache/iblock/fa5/900_600_2/917fd2x36vdg9hwz1ig3gwm4iphlo2m2.jpg', H+'resize_cache/iblock/228/900_600_2/15yfoq7hkcjbp7bn3keph8x1h7jmso02.jpg'] },
    { name:'Делюкс (Twin)', desc:'Две раздельные кровати · 25 м²', price:10200,
      amenities:['Кондиционер','ТВ','Холодильник','Фен','Утюг','Шторы-блэкаут'],
      imgs:[H+'resize_cache/iblock/703/900_600_2/vd2b1dbg4owkvu6u1za8gakd5tgrdj04.jpg', H+'resize_cache/iblock/93a/900_600_2/ffxjh0wh2rp3t52xcajwvvb8abeo2a0h.jpg', H+'resize_cache/iblock/2d6/900_600_2/fleusi9p4efjm1w86kle0c9g7johjpgz.jpg'] },
];

const yurtRooms = [
    { name:'Малая юрта №1', desc:'До 4 чел. · Вс-Чт 10 000₽ · Пт-Сб 15 000₽', price:10000, priceWeekend:15000,
      amenities:['Кровати','Постельное','Электричество','Мангал'],
      imgs:[H+'iblock/82a/m6f9m7idqo7lzpnxoutwojulvgyi5yym.jpeg', H+'iblock/58a/4t22dl53xr8ry0mc5yr03j8enwmt2vx7.jpeg'] },
    { name:'Малая юрта №2', desc:'До 4 чел. · Вс-Чт 10 000₽ · Пт-Сб 15 000₽', price:10000, priceWeekend:15000,
      amenities:['Кровати','Постельное','Электричество','Мангал'],
      imgs:[H+'iblock/82a/m6f9m7idqo7lzpnxoutwojulvgyi5yym.jpeg', H+'iblock/58a/4t22dl53xr8ry0mc5yr03j8enwmt2vx7.jpeg'] },
    { name:'Малая юрта №3', desc:'До 4 чел. · Вс-Чт 10 000₽ · Пт-Сб 15 000₽', price:10000, priceWeekend:15000,
      amenities:['Кровати','Постельное','Электричество','Мангал'],
      imgs:[H+'iblock/82a/m6f9m7idqo7lzpnxoutwojulvgyi5yym.jpeg', H+'iblock/58a/4t22dl53xr8ry0mc5yr03j8enwmt2vx7.jpeg'] },
    { name:'Большая юрта №4', desc:'До 6 чел. · Вс-Чт 15 000₽ · Пт-Сб 20 000₽ · Доп. место 1500₽', price:15000, priceWeekend:20000,
      amenities:['Кровати','Постельное','Электричество','Мангал','Доп. места'],
      imgs:[H+'iblock/82a/m6f9m7idqo7lzpnxoutwojulvgyi5yym.jpeg', H+'iblock/c3b/hw1r78kb39nc4wglu7rkv8n37h7o2d3h.jpeg'] },
];

db.serialize(() => {
    db.run("DROP TABLE IF EXISTS rooms");
    db.run(`CREATE TABLE rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT,
        name TEXT,
        desc TEXT,
        price INTEGER,
        priceWeekend INTEGER,
        amenities TEXT,
        imgs TEXT
    )`);

    const stmt = db.prepare(`INSERT INTO rooms (type, name, desc, price, priceWeekend, amenities, imgs) VALUES (?, ?, ?, ?, ?, ?, ?)`);

    hotelRooms.forEach(r => {
        stmt.run('hotel', r.name, r.desc, r.price, r.priceWeekend || null, JSON.stringify(r.amenities), JSON.stringify(r.imgs));
    });

    yurtRooms.forEach(r => {
        stmt.run('yurt', r.name, r.desc, r.price, r.priceWeekend || null, JSON.stringify(r.amenities), JSON.stringify(r.imgs));
    });

    stmt.finalize();

    // Create bookings table
    db.run("DROP TABLE IF EXISTS bookings");
    db.run(`CREATE TABLE bookings (
        id TEXT PRIMARY KEY,
        type TEXT,
        room TEXT,
        checkIn TEXT,
        checkOut TEXT,
        nights INTEGER,
        guest TEXT,
        phone TEXT,
        addons TEXT,
        total INTEGER,
        status TEXT,
        createdAt TEXT
    )`);

    // Create admins table
    db.run("DROP TABLE IF EXISTS admins");
    db.run(`CREATE TABLE admins (
        chatId TEXT PRIMARY KEY,
        name TEXT
    )`);

    console.log("Database initialized successfully!");
});

db.close();
