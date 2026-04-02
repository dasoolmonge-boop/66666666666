const https = require('https');

const TOKEN = 'f9LHodD0cOJ4UEc28YWOtykBGGCNW3w2HfwNzuoyVvfuvpb7YIXZSd4_AZFsaL7E8MCgtYl9J3w1KJSSp_IR';
const CHAT_ID = '37681180';
const TEXT = "🚀 Тестовое сообщение от ООО Чалама!";

async function test(name, options, data) {
    console.log(`\n--- Проверка метода: ${name} ---`);
    return new Promise((resolve) => {
        const body = JSON.stringify(data);
        const reqOptions = {
            hostname: options.host,
            port: 443,
            path: options.path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
                ...options.headers
            }
        };

        const req = https.request(reqOptions, (res) => {
            let resData = '';
            res.on('data', d => resData += d);
            res.on('end', () => {
                console.log(`Статус: ${res.statusCode}`);
                console.log(`Ответ: ${resData}`);
                resolve(res.statusCode === 200);
            });
        });
        req.on('error', e => {
            console.error(`Ошибка: ${e.message}`);
            resolve(false);
        });
        req.write(body);
        req.end();
    });
}

async function runAll() {
    // Вариант 1: Стандартный (Bearer + chat_id)
    await test("Вариант 1 (api.max.ru / v1/messages/send / chat_id)", 
        { host: 'api.max.ru', path: '/v1/messages/send', headers: { 'Authorization': `Bearer ${TOKEN}` } },
        { chat_id: CHAT_ID, text: TEXT });

    // Вариант 2: Через chatId (api.maxonline.ru)
    await test("Вариант 2 (api.maxonline.ru / chatId)", 
        { host: 'api.maxonline.ru', path: '/v1/messages/send', headers: { 'Authorization': `Bearer ${TOKEN}` } },
        { chatId: CHAT_ID, text: TEXT });

    // Вариант 3: Через токен в URL
    await test("Вариант 3 (Токен в URL / sendMessage)", 
        { host: 'app.api-messenger.com', path: `/max-v1/sendMessage?token=${TOKEN}`, headers: {} },
        [{ chatId: CHAT_ID, message: TEXT }]);
}

runAll();
