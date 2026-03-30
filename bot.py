import os
import json
import logging
import asyncio
import subprocess
import sys
from aiogram import Bot, Dispatcher, types, F
from aiogram.types import (
    InlineKeyboardMarkup, InlineKeyboardButton,
    WebAppInfo, MenuButtonWebApp
)
from aiogram.filters import CommandStart
from aiogram.enums import ParseMode

# ===== CONFIG =====
BOT_TOKEN = os.getenv("BOT_TOKEN")
ADMIN_ID = int(os.getenv("ADMIN_ID", "0"))
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://chalama-group.ru/mobile.html")
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:3000")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "chalama2026")

# ===== LOGGING =====
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("chalama_bot")

# ===== SETUP =====
bot = Bot(token=BOT_TOKEN, parse_mode=ParseMode.HTML)
dp = Dispatcher()

# ===== HELPERS =====
async def get_all_admins():
    """Fetch all admin chat IDs from the backend"""
    try:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{API_BASE_URL}/api/internal/admins") as resp:
                if resp.status == 200:
                    return await resp.json()
    except Exception as e:
        logger.error(f"Error fetching admins: {e}")
    return [str(ADMIN_ID)] if ADMIN_ID else []

async def notify_admins(text):
    """Send message to all registered admins"""
    admins = await get_all_admins()
    for admin_id in set(admins):
        try:
            await bot.send_message(admin_id, text)
        except Exception as e:
            logger.error(f"Failed to notify admin {admin_id}: {e}")

# ===== HANDLERS =====

@dp.message(CommandStart())
async def cmd_start(message: types.Message):
    """Welcome message with WebApp button"""
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="🏨 Открыть сайт Чалама",
            web_app=WebAppInfo(url=WEBAPP_URL)
        )],
        [InlineKeyboardButton(
            text="📞 Позвонить нам",
            url="tel:+73942221082"
        )],
    ])

    await message.answer(
        "🏨 <b>Добро пожаловать в ООО «Чалама»!</b>\n\n"
        "Мы объединяем лучшие места для отдыха в Республике Тыва:\n\n"
        "🏨 <b>Отель «Чалама»</b> — комфортные номера в центре Кызыла\n"
        "⛺ <b>Юрточный отель «Хаан-Дыт»</b> — загородный отдых\n"
        "🍽 <b>Ресторан «Чалама»</b> — лучшая кухня Тувы\n"
        "🍸 <b>Бар «Скала»</b> — атмосферное место\n\n"
        "👇 Нажмите кнопку ниже, чтобы забронировать:",
        reply_markup=keyboard
    )

@dp.message(F.text.startswith("/admin_auth"))
async def cmd_admin_auth(message: types.Message):
    """Authorize a new administrator"""
    args = message.text.split()
    if len(args) < 2:
        return await message.answer("⚠️ Использование: <code>/admin_auth Пароль</code>")
    
    password = args[1]
    if password == ADMIN_PASSWORD:
        try:
            import aiohttp
            async with aiohttp.ClientSession() as session:
                payload = {"chatId": str(message.from_user.id), "username": message.from_user.username}
                async with session.post(f"{API_BASE_URL}/api/internal/admins", json=payload) as resp:
                    if resp.status == 200:
                        await message.answer("✅ Вы успешно зарегистрированы как администратор!")
                    else:
                        await message.answer("❌ Ошибка базы данных.")
        except Exception as e:
            await message.answer(f"❌ Ошибка подключения: {e}")
    else:
        await message.answer("❌ Неверный пароль.")

@dp.message(F.web_app_data)
async def handle_webapp_data(message: types.Message):
    """Process booking data from WebApp"""
    try:
        data = json.loads(message.web_app_data.data)
        logger.info(f"Booking received: {data}")

        type_label = "🏨 Отель «Чалама»" if data.get("type") == "hotel" else "⛺ Юрты «Хаан-Дыт»"

        admin_text = (
            f"📌 <b>Новая заявка на бронирование!</b>\n\n"
            f"📍 {type_label}\n"
            f"🛏 <b>{data.get('room', '—')}</b>\n"
            f"📅 {data.get('checkIn', '—')} — {data.get('checkOut', '—')} ({data.get('nights', '?')} ноч.)\n"
            f"👤 {data.get('guest', '—')}\n"
            f"📞 {data.get('phone', '—')}\n"
        )
        if data.get("addons"):
            admin_text += f"➕ {', '.join(data['addons'])}\n"
        admin_text += f"\n💰 <b>Итого: {data.get('total', '—')} ₽</b>"
        admin_text += f"\n🔖 ID: <code>{data.get('id', '—')}</code>"
        admin_text += f"\n👤 TG: @{message.from_user.username or '—'} ({message.from_user.id})"

        # Notify all admins
        await notify_admins(admin_text)

        await message.answer(
            "✅ <b>Ваша заявка принята!</b>\n\n"
            "Как только администратор подтвердит бронирование, вам придет сообщение здесь.\n\n"
            f"📍 {type_label}\n"
            f"🛏 {data.get('room', '—')}\n"
            f"📅 {data.get('checkIn', '—')} — {data.get('checkOut', '—')}\n"
            f"💰 <b>Итого: {data.get('total', '—')} ₽</b>\n\n"
            "Спасибо, что выбрали нас! 🙏"
        )

    except Exception as e:
        logger.error(f"Webapp data error: {e}")
        await message.answer("❌ Ошибка при оформлении заявки. Попробуйте еще раз.")

# ===== STATUS NOTIFIER BACKGROUND TASK =====
async def check_status_updates():
    """Poll backend for bookings that need notification (simplified version)"""
    # Note: In a production app, we would use Webhooks or a dedicated Queue
    # For this project, we'll implement a simple one-way notification from index.js if needed,
    # or just keep it extensible here.
    logger.info("Status notifier background task active")

async def on_startup():
    """Actions on bot startup"""
    # 1. Set menu button
    try:
        await bot.set_chat_menu_button(
            menu_button=MenuButtonWebApp(
                text="🏨 Бронирование",
                web_app=WebAppInfo(url=WEBAPP_URL)
            )
        )
        logger.info("Menu button configured")
    except Exception as e:
        logger.error(f"Menu button error: {e}")

    # 2. Start Node.js backend
    try:
        backend_path = os.path.join(os.getcwd(), "backend", "index.js")
        if os.path.exists(backend_path):
            logger.info("Starting Node.js backend...")
            subprocess.Popen(["node", backend_path], stdout=sys.stdout, stderr=sys.stderr)
        else:
            logger.warning(f"Backend file not found at {backend_path}. Skipping backend start.")
    except Exception as e:
        logger.error(f"Failed to start Node.js backend: {e}")

    me = await bot.get_me()
    logger.info(f"Bot started: @{me.username}")


async def main():
    dp.startup.register(on_startup)
    logger.info("Starting polling...")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
