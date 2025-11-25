# Online Survey Backend API

Backend API для веб-приложения онлайн-опросов, построенный на Node.js, Express.js и PostgreSQL.

## Технологии

- **Node.js** - Runtime окружение
- **Express.js** - Web фреймворк
- **TypeScript** - Типизированный JavaScript
- **PostgreSQL** - Реляционная база данных
- **Docker** - Контейнеризация базы данных
- **Zod** - Валидация схем

## Установка и запуск

### Предварительные требования

- Node.js 18+ 
- Docker и Docker Compose (для базы данных)
- npm или yarn

### Шаги установки

1. **Установите зависимости:**

```bash
npm install
```

2. **Создайте файл `.env` на основе `.env.example`:**

```bash
cp .env.example .env
```

Отредактируйте `.env` файл при необходимости.

3. **Запустите PostgreSQL в Docker:**

```bash
docker-compose up -d
```

Это запустит PostgreSQL контейнер на порту 5432.

4. **Выполните миграцию базы данных:**

```bash
npm run db:migrate
```

Это создаст все необходимые таблицы в базе данных.

5. **Запустите сервер разработки:**

```bash
npm run dev
```

Сервер будет доступен по адресу `http://localhost:3000`

## Структура проекта

```
src/
├── db/              # База данных
│   ├── connection.ts    # Подключение к PostgreSQL
│   ├── schema.sql       # SQL схема базы данных
│   └── migrate.ts       # Скрипт миграции
├── models/          # Модели данных
│   ├── survey.ts        # Модель опросов
│   ├── response.ts      # Модель ответов
│   └── stats.ts         # Модель статистики
├── routes/          # API маршруты
│   └── surveys.ts       # Маршруты для опросов
├── middleware/      # Middleware
│   ├── errorHandler.ts  # Обработка ошибок
│   └── validation.ts    # Валидация запросов
├── utils/           # Утилиты
│   └── transform.ts     # Преобразование данных
├── types/           # TypeScript типы
│   └── index.ts         # Типы и интерфейсы
├── app.ts           # Конфигурация Express приложения
└── index.ts         # Точка входа
```

## API Endpoints

### Опросы

- `GET /api/surveys` - Получить список всех опубликованных опросов
- `GET /api/surveys/:id` - Получить опрос по ID
- `POST /api/surveys` - Создать новый опрос
- `PUT /api/surveys/:id` - Обновить опрос
- `DELETE /api/surveys/:id` - Удалить опрос

### Ответы

- `POST /api/surveys/responses` - Отправить ответы на опрос
- `GET /api/surveys/:id/responses` - Получить все ответы на опрос

### Статистика

- `GET /api/surveys/:id/stats` - Получить статистику по опросу

### Проверка здоровья

- `GET /health` - Проверка работы сервера

## Формат данных

### Создание опроса (POST /api/surveys)

```json
{
  "title": "Название опроса",
  "description": "Описание опроса",
  "questions": [
    {
      "type": "text",
      "question": "Ваш вопрос?",
      "required": true
    },
    {
      "type": "single-choice",
      "question": "Выберите один вариант",
      "required": true,
      "options": ["Вариант 1", "Вариант 2"]
    }
  ],
  "isPublished": true
}
```

### Отправка ответов (POST /api/surveys/responses)

```json
{
  "surveyId": "uuid",
  "answers": [
    {
      "questionId": "uuid",
      "answer": "Текст ответа"
    },
    {
      "questionId": "uuid",
      "answer": ["Вариант 1", "Вариант 2"]
    }
  ],
  "respondentName": "Имя",
  "respondentEmail": "email@example.com"
}
```

## Скрипты

- `npm run dev` - Запуск в режиме разработки с hot reload
- `npm run build` - Сборка TypeScript в JavaScript
- `npm start` - Запуск production сервера
- `npm run db:migrate` - Выполнить миграцию базы данных

## База данных

### Схема базы данных

База данных состоит из следующих таблиц:

- **surveys** - Опросы
- **questions** - Вопросы опросов
- **survey_responses** - Ответы на опросы
- **answers** - Детальные ответы на вопросы

### Управление базой данных

**Запуск PostgreSQL:**
```bash
docker-compose up -d
```

**Остановка PostgreSQL:**
```bash
docker-compose down
```

**Просмотр логов:**
```bash
docker-compose logs -f postgres
```

**Подключение к базе данных:**
```bash
docker-compose exec postgres psql -U postgres -d online_survey_db
```

**Удаление всех данных (⚠️ ОСТОРОЖНО):**
```bash
docker-compose down -v
```

## Разработка

### Переменные окружения

Создайте файл `.env` с следующими переменными:

```env
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=online_survey_db
DB_USER=postgres
DB_PASSWORD=postgres
CORS_ORIGIN=http://localhost:5173
```

### Добавление новых endpoints

1. Создайте контроллер в `src/models/`
2. Добавьте маршрут в `src/routes/`
3. Зарегистрируйте маршрут в `src/app.ts`

### Обработка ошибок

Все ошибки обрабатываются централизованно через middleware `errorHandler`. Используйте стандартные HTTP статус коды:

- `200` - Успешно
- `201` - Создано
- `204` - Нет содержимого
- `400` - Неверный запрос
- `404` - Не найдено
- `500` - Внутренняя ошибка сервера

## Лицензия

MIT
