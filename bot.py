import asyncio
import os
import logging
import json
import aiohttp
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

# Конфигурация
TOKEN = os.getenv("MAX_TOKEN", "f9LHodD0cOJ4UEc28YWOtykBGGCNW3w2HfwNzuoyVvfuvpb7YIXZSd4_AZFsaL7E8MCgtYl9J3w1KJSSp_IR")
WEBAPP_URL = "https://chalama-group.ru/mobile.html"
BASE_URL = "https://platform-api.max.ru"

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class MaxBot:
    def __init__(self, token):
        self.token = token
        self.headers = {
            "Authorization": token,
            "Content-Type": "application/json"
        }

    async def send_welcome(self, chat_id):
        """Отправка приветствия с кнопкой-ссылкой"""
        payload = {
            "text": (
                "🏨 <b>Добро пожаловать в ООО «ЧАЛАМА»!</b>\n\n"
                "Мы рады приветствовать вас в нашем официальном боте.\n"
                "Здесь вы можете быстро забронировать номер в нашем отеле, сауну или юрту."
            ),
            "format": "html",
            "attachments": [
                {
                    "type": "inline_keyboard",
                    "payload": {
                        "buttons": [
                            [
                                {
                                    "type": "link",
                                    "text": "🏨 Забронировать номер",
                                    "url": WEBAPP_URL
                                }
                            ]
                        ]
                    }
                }
            ]
        }
        
        async with aiohttp.ClientSession() as session:
            url = f"{BASE_URL}/messages?chat_id={chat_id}"
            async with session.post(url, headers=self.headers, json=payload) as resp:
                result = await resp.text()
                if resp.status in [200, 201]:
                    logger.info(f"Successfully sent welcome to {chat_id}")
                else:
                    logger.error(f"Error sending message ({resp.status}): {result}")

    async def poll_updates(self):
        """Лонг-поллинг обновлений"""
        logger.info("Bot started polling...")
        async with aiohttp.ClientSession() as session:
            while True:
                try:
                    # По умолчанию получаем новые события
                    async with session.get(f"{BASE_URL}/updates", headers=self.headers, timeout=30) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            updates_list = data.get("updates", [])
                            if isinstance(updates_list, list):
                                for update in updates_list:
                                    if isinstance(update, dict):
                                        # Use chat_id from the top level of the update
                                        chat_id = update.get("chat_id")
                                        # Or if it's missing there, try nested message sender
                                        if not chat_id and "message" in update:
                                            chat_id = update["message"].get("sender", {}).get("user_id")
                                        
                                        if chat_id and (update.get("update_type") in ["message_created", "bot_started"]):
                                            await self.send_welcome(chat_id)
                        elif resp.status == 401:
                            logger.error("Invalid Token!")
                            await asyncio.sleep(10)
                        else:
                            logger.warning(f"Unexpected status {resp.status}")
                except Exception as e:
                    logger.error(f"Polling error: {e}")
                
                await asyncio.sleep(1)

async def main():
    bot = MaxBot(TOKEN)
    await bot.poll_updates()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Bot manual stop.")
