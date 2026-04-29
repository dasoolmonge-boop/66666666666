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
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://chalama-group.ru/mobile.html")
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
                                    "url": f"{WEBAPP_URL}?chat_id={chat_id}"
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

    async def register_admin(self, chat_id, name, department="all"):
        """Регистрация нового администратора в бэкенде"""
        payload = {
            "chatId": str(chat_id),
            "username": name,
            "department": department
        }
        async with aiohttp.ClientSession() as session:
            url = "http://localhost:5000/api/internal/admins"
            try:
                async with session.post(url, json=payload, timeout=5) as resp:
                    if resp.status == 200:
                        return True
            except Exception as e:
                logger.error(f"Error registering admin: {e}")
        return False

    async def unregister_admin(self, chat_id):
        """Удаление администратора из бэкенда"""
        async with aiohttp.ClientSession() as session:
            url = f"http://localhost:5000/api/internal/admins/{chat_id}"
            try:
                async with session.delete(url, timeout=5) as resp:
                    if resp.status == 200:
                        return True
            except Exception as e:
                logger.error(f"Error unregistering admin: {e}")
        return False

    async def register_subscriber(self, chat_id, name):
        """Регистрация подписчика для рассылки"""
        payload = {
            "chatId": str(chat_id),
            "name": name or "Пользователь"
        }
        async with aiohttp.ClientSession() as session:
            url = "http://localhost:5000/api/internal/subscribers"
            try:
                async with session.post(url, json=payload, timeout=5) as resp:
                    if resp.status == 200:
                        logger.info(f"Subscriber registered: {chat_id} ({name})")
                        return True
            except Exception as e:
                logger.error(f"Error registering subscriber: {e}")
        return False

    async def send_text(self, chat_id, text):
        """Отправка простого текста"""
        payload = {"text": text, "format": "html"}
        async with aiohttp.ClientSession() as session:
            url = f"{BASE_URL}/messages?chat_id={chat_id}"
            await session.post(url, headers=self.headers, json=payload)

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
                                        # Пытаемся достать настоящий Chat ID из разных мест события
                                        message_data = update.get("message", {})
                                        chat_id = update.get("chat_id") # Верхний уровень
                                        
                                        # Если есть сообщение, берем ID чата оттуда (самый надежный способ в MAX)
                                        if message_data:
                                            recipient = message_data.get("recipient", {})
                                            if recipient.get("chat_type") == "dialog":
                                                chat_id = recipient.get("chat_id")
                                            
                                            # Если все еще нет, берем ID отправителя
                                            if not chat_id:
                                                chat_id = message_data.get("sender", {}).get("user_id")
                                            
                                            user_name = message_data.get("sender", {}).get("name", "Unknown")
                                        
                                        if chat_id:
                                            # Case 1: Admin Registration
                                            text = message_data.get("body", {}).get("text", "")
                                            if text == "Добавить в админ отель Ч":
                                                success = await self.register_admin(chat_id, user_name, "hotel_chalama")
                                                if success:
                                                    await self.send_text(chat_id, f"✅ <b>{user_name}</b>, вы назначены администратором: 🏨 <b>Отель Чалама + Сауна</b>")
                                                else:
                                                    await self.send_text(chat_id, "❌ Ошибка при регистрации.")
                                            
                                            elif text == "Добавить в админ Х":
                                                success = await self.register_admin(chat_id, user_name, "haan_dyt")
                                                if success:
                                                    await self.send_text(chat_id, f"✅ <b>{user_name}</b>, вы назначены администратором: ⛺ <b>Хаан-Дыт + Баня</b>")
                                                else:
                                                    await self.send_text(chat_id, "❌ Ошибка при регистрации.")
                                            
                                            elif text == "Админ:Стоп":
                                                success = await self.unregister_admin(chat_id)
                                                if success:
                                                    await self.send_text(chat_id, "❌ Доступ администратора аннулирован. Вы больше не будете получать уведомления.")
                                                else:
                                                    await self.send_text(chat_id, "❌ Ошибка при удалении администратора.")

                                            # Case 2: Welcome message and Subscriber registration
                                            elif update.get("update_type") in ["message_created", "bot_started"]:
                                                # CRITICAL FIX: Always use the top-level chat_id for registration
                                                # to ensure we can send messages back to this specific dialog.
                                                await self.register_subscriber(chat_id, user_name)
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
