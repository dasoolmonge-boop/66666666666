#!/usr/bin/env python3
import os
import subprocess
import sys
from datetime import datetime

# Цвета для терминала
GREEN = '\033[92m'
YELLOW = '\033[93m'
RED = '\033[91m'
BLUE = '\033[94m'
BOLD = '\033[1m'
NC = '\033[0m' # No Color

def run(cmd, shell=True):
    """Выполняет системную команду и выводит результат"""
    try:
        result = subprocess.run(cmd, shell=shell, check=True, text=True, capture_output=False)
        return True
    except subprocess.CalledProcessError as e:
        print(f"{RED}Ошибка при выполнении: {cmd}{NC}")
        print(f"{RED}Код ошибки: {e.returncode}{NC}")
        return False

def header(text):
    print(f"\n{BLUE}{BOLD}=== {text} ==={NC}")

def update_site():
    header("ОБНОВЛЕНИЕ САЙТА")
    print(f"{YELLOW}1/3 Получение изменений из Git...{NC}")
    if run("git pull"):
        print(f"{YELLOW}2/3 Установка зависимостей (если нужно)...{NC}")
        run("npm install --prefix backend")
        print(f"{YELLOW}3/3 Перезапуск PM2...{NC}")
        run("pm2 restart chalama-backend")
        print(f"{GREEN}✅ Сайт успешно обновлен!{NC}")

def check_status():
    header("СТАТУС СИСТЕМЫ")
    print(f"{BOLD}Процессы PM2:{NC}")
    run("pm2 status")
    print(f"\n{BOLD}Статус Nginx:{NC}")
    run("systemctl status nginx --no-pager | grep Active")
    print(f"\n{BOLD}Место на диске:{NC}")
    run("df -h / | tail -n 1")

def view_logs():
    header("ПРОСМОТР ЛОГОВ")
    print("1. Бэкенд (Backend)")
    print("2. Бот (Bot)")
    print("3. Ошибки (Error logs)")
    choice = input(f"{YELLOW}Выберите лог (1-3): {NC}")
    if choice == '1': run("pm2 logs chalama-backend --lines 50 --no-append")
    elif choice == '2': run("pm2 logs chalama-bot --lines 50 --no-append")
    elif choice == '3': run("pm2 logs --err --lines 50")

def manage_bot():
    header("УПРАВЛЕНИЕ БОТОМ")
    print("1. Перезапустить бота")
    print("2. Остановить бота")
    print("3. Запустить бота")
    choice = input(f"{YELLOW}Действие (1-3): {NC}")
    if choice == '1': run("pm2 restart chalama-bot")
    elif choice == '2': run("pm2 stop chalama-bot")
    elif choice == '3': run("pm2 start bot.py --name chalama-bot")

def backup_db():
    header("РЕЗЕРВНОЕ КОПИРОВАНИЕ БД")
    now = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = f"database_backup_{now}.sqlite"
    # Путь к БД согласно техническому паспорту: backend/db/database.sqlite
    db_path = "backend/db/database.sqlite"
    if run(f"cp {db_path} {backup_file}"):
        print(f"{GREEN}✅ Копия создана: {backup_file}{NC}")
    else:
        print(f"{RED}❌ Файл БД не найден по пути {db_path}{NC}")

def nginx_control():
    header("УПРАВЛЕНИЕ NGINX")
    print(f"{YELLOW}Тестирование конфигурации...{NC}")
    if run("sudo nginx -t"):
        print(f"{YELLOW}Перезагрузка Nginx...{NC}")
        run("sudo systemctl reload nginx")
        print(f"{GREEN}✅ Nginx успешно перезагружен!{NC}")

def server_info():
    header("ИНФОРМАЦИЯ О СЕРВЕРЕ")
    print(f"{BOLD}Время работы (Uptime):{NC}")
    run("uptime -p")
    print(f"\n{BOLD}Память:{NC}")
    run("free -h")

def main_menu():
    while True:
        os.system('clear')
        print(f"{BLUE}{BOLD}========================================={NC}")
        print(f"{BLUE}{BOLD}   ПУЛЬТ УПРАВЛЕНИЯ ООО «ЧАЛАМА»        {NC}")
        print(f"{BLUE}{BOLD}========================================={NC}")
        print(f" {BOLD}1.{NC} 🚀 Обновить сайт (Git Pull + Restart)")
        print(f" {BOLD}2.{NC} 📊 Статус системы (PM2, Nginx, Диск)")
        print(f" {BOLD}3.{NC} 📝 Посмотреть логи (Сайт / Бот)")
        print(f" {BOLD}4.{NC} 🤖 Управление Телеграм-ботом")
        print(f" {BOLD}5.{NC} 💾 Создать бэкап базы данных")
        print(f" {BOLD}6.{NC} 🌐 Перезагрузить Nginx")
        print(f" {BOLD}7.{NC} 🖥 Инфо о сервере (RAM, Uptime)")
        print(f" {BOLD}0.{NC} 🚪 Выход")
        print(f"{BLUE}-----------------------------------------{NC}")
        
        choice = input(f"{YELLOW}Выберите действие (0-7): {NC}")
        
        if choice == '1': update_site()
        elif choice == '2': check_status()
        elif choice == '3': view_logs()
        elif choice == '4': manage_bot()
        elif choice == '5': backup_db()
        elif choice == '6': nginx_control()
        elif choice == '7': server_info()
        elif choice == '0':
            print(f"{GREEN}До свидания!{NC}")
            break
        else:
            print(f"{RED}Неверный ввод!{NC}")
        
        input(f"\n{YELLOW}Нажмите Enter, чтобы вернуться в меню...{NC}")

if __name__ == "__main__":
    try:
        main_menu()
    except KeyboardInterrupt:
        print(f"\n{GREEN}Завершение работы...{NC}")
        sys.exit(0)
