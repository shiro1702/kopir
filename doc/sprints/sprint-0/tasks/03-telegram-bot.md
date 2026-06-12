# 03 — Telegram Bot: /start + приём PDF

| | |
|---|---|
| **Статус** | ⬜ todo |
| **Feature** | WEB-08 |
| **Зависимости** | 01, 02, 04 |
| **Оценка** | 3–4 часа |

## Цель

Бот принимает PDF от пользователя, сохраняет заказ со статусом `AWAITING_PAYMENT`, отвечает инструкцией по оплате.

## Подготовка

- [ ] Создать бота через [@BotFather](https://t.me/BotFather), получить `TELEGRAM_BOT_TOKEN`
- [ ] Webhook URL:
  - Локально: ngrok/cloudflared → `https://<tunnel>/api/telegram/webhook`
  - Staging: `https://<app>.vercel.app/api/telegram/webhook`

## Подзадачи

- [ ] **3.1** Выбрать библиотеку: **grammY** (рекомендуется) или telegraf
  ```bash
  npm i grammy
  ```
- [ ] **3.2** `server/api/telegram/webhook.post.ts` — точка входа webhook
- [ ] **3.3** `server/utils/telegram/bot.ts` — инициализация бота, обработчики
- [ ] **3.4** Команда `/start`:
  - Текст: «Привет! Отправь PDF-документ для печати»
  - Если есть `?start=point_slug` — привязать заказ к точке
  - Иначе — дефолтная точка `point_dev_1`
- [ ] **3.5** Обработчик `message:document`:
  - Принимать только `application/pdf` (mime или расширение `.pdf`)
  - Скачать файл через `getFile` + `file_path` Telegram API
  - Загрузить в **Vercel Blob** (`@vercel/blob`: `put()`), путь `orders/<orderId>.pdf`
  - В Order.`filePath` сохранить blob `url` или `pathname` (для `del()` после печати)
  - Создать/найти User по `telegramId`
  - Создать Order со статусом `AWAITING_PAYMENT`
- [ ] **3.5b** `server/utils/blob.ts` — обёртка: `uploadOrderPdf`, `downloadOrderPdf`, `deleteOrderPdf`
- [ ] **3.6** Ответ пользователю:
  ```
  📄 Файл получен: report.pdf
  Заказ #abc123
  Статус: ожидает оплаты

  Переведите X ₽ на [номер карты] и напишите админу.
  Или дождитесь подтверждения в тестовом режиме.
  ```
- [ ] **3.7** `server/api/telegram/set-webhook.post.ts` — утилита установки webhook (защитить `ADMIN_SECRET`)
- [ ] **3.8** Отклонять не-PDF с понятным сообщением

## Deep link (заготовка под Sprint 1)

```
https://t.me/YourBot?start=point_bgu_smolina
```

Парсинг: `ctx.match` в grammY при `/start point_bgu_smolina`.

## Критерии приёмки

- [ ] `/start` отвечает за < 2 сек
- [ ] PDF в Vercel Blob, Order в Neon со статусом `AWAITING_PAYMENT`
- [ ] Повторная отправка того же файла — новый Order (не ломается)
- [ ] Не-PDF — вежливый отказ

## Тест вручную

1. Отправить `/start` боту
2. Прикрепить тестовый PDF (1–3 стр.)
3. Проверить в Prisma Studio: User + Order; в Vercel Dashboard → Blob — файл `orders/<id>.pdf`

## Заметки

- Mini App не делаем — только чат-бот
- Фото/DOCX — Sprint 2
- Webhook secret: проверять `X-Telegram-Bot-Api-Secret-Token` если настроен
