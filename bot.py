import asyncio
import os
import logging
from maxapi import Bot, Dispatcher
from maxapi.types import MessageCreated
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

# Конфигурация
TOKEN = os.getenv("MAX_TOKEN", "f9LHodD0cOJ4UEc28YWOtykBGGCNW3w2HfwNzuoyVvfuvpb7YIXZSd4_AZFsaL7E8MCgtYl9J3w1KJSSp_IR")
WEBAPP_URL = "https://chalama-group.ru/mobile.html"

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Инициализация бота
bot = Bot(TOKEN)
dp = Dispatcher()

@dp.message_created()
async def handle_start(event: MessageCreated):
    """Обработчик всех входящих сообщений"""
    text = event.message.body.text.lower()
    
    # Отвечаем на любое сообщение
    welcome_text = (
        "🏨 Добро пожаловать в ООО «ЧАЛАМА»!\n\n"
        "Мы рады приветствовать вас в нашем боте.\n"
        "Для бронирования перейдите по ссылке:\n"
        f"{WEBAPP_URL}"
    )
    
    try:
        await bot.send_message(
            chat_id=event.chat_id,
            text=welcome_text
        )
        # Логируем ID чата — он нам ОЧЕНЬ нужен
        print(f"!!! ВАШ CHAT_ID: {event.chat_id} !!!")
        logger.info(f"Sent welcome to {event.chat_id}")
    except Exception as e:
        logger.error(f"Error sending message: {e}")

async def main():
    logger.info("Bot is starting on MAX platform (Minimal Mode)...")
    await dp.start_polling(bot)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Bot stopped.")
