# Quick Start Guide

Быстрое руководство по запуску backend API.

## Шаг 1: Установка зависимостей

```bash
npm install
```

## Шаг 2: Настройка переменных окружения

Создайте файл `.env` в корне проекта:

```bash
cp .env.example .env
```

Файл `.env` уже содержит все необходимые настройки по умолчанию.

## Шаг 3: Запуск PostgreSQL

Запустите PostgreSQL в Docker:

```bash
docker-compose up -d
```

Подождите несколько секунд, пока база данных запустится. Проверить статус:

```bash
docker-compose ps
```

## Шаг 4: Миграция базы данных

Выполните миграцию для создания таблиц:

```bash
npm run db:migrate
```

Вы должны увидеть сообщение: `✅ Database migration completed successfully!`

## Шаг 5: Запуск сервера

Запустите сервер в режиме разработки:

```bash
npm run dev
```

Сервер запустится на `http://localhost:3000`

## Проверка работы

Откройте в браузере или выполните:

```bash
curl http://localhost:3000/health
```

Вы должны получить ответ:
```json
{"status":"ok","timestamp":"2024-..."}
```

## Стоп сервера

Для остановки PostgreSQL:

```bash
docker-compose down
```

Для остановки сервера нажмите `Ctrl+C` в терминале.

## Устранение проблем

### База данных не запускается

```bash
# Проверьте, не занят ли порт 5432
docker-compose down
docker-compose up -d
```

### Ошибка при миграции

Убедитесь, что PostgreSQL запущен:

```bash
docker-compose ps
```

Если контейнер не запущен:

```bash
docker-compose up -d
```

### Ошибка подключения к базе данных

Проверьте настройки в `.env` файле. Убедитесь, что они совпадают с настройками в `docker-compose.yml`.

### Пересоздать базу данных

⚠️ **Внимание: это удалит все данные!**

```bash
docker-compose down -v
docker-compose up -d
npm run db:migrate
```
