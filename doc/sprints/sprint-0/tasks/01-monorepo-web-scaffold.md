# 01 — Monorepo + Nuxt 3 scaffold

| | |
|---|---|
| **Статус** | ⬜ todo |
| **Feature** | INF-01, WEB-01 |
| **Зависимости** | — |
| **Оценка** | 2–3 часа |

## Цель

Создать корневую структуру monorepo и рабочий скелет Nuxt 3 с Nitro.

## Подзадачи

- [ ] **1.1** Создать папки `web/` и `desktop/` в корне `kopir/`
- [ ] **1.2** Инициализировать Nuxt 3 в `web/`:
  ```bash
  cd web && npx nuxi@latest init . --packageManager npm
  ```
- [ ] **1.3** Включить TypeScript strict, настроить `nuxt.config.ts`:
  - `devtools: { enabled: true }`
  - alias `@/` → корень app
- [ ] **1.4** Добавить Tailwind (`@nuxtjs/tailwindcss`)
- [ ] **1.5** Создать заглушку главной страницы `app/pages/index.vue` — «Kopir dev»
- [ ] **1.6** Создать health-check: `server/api/health.get.ts` → `{ ok: true, version: "0.0.1" }`
- [ ] **1.7** Добавить `web/.env.example` со списком переменных из README спринта (`DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, …)
- [ ] **1.8** Добавить `web/.gitignore` (`.env`, `.nuxt`, `node_modules`)
- [ ] **1.9** Корневой `.gitignore` если ещё нет
- [ ] **1.10** `desktop/` — пустая структура:
  ```
  desktop/
    README.md
    requirements.txt
    .env.example
    .gitignore
  ```

## Файлы после задачи

```
kopir/
├── web/
│   ├── app/
│   │   └── pages/index.vue
│   ├── server/api/health.get.ts
│   ├── nuxt.config.ts
│   ├── package.json
│   └── .env.example
├── desktop/
│   ├── README.md
│   └── requirements.txt
└── .cursorrules
```

## Критерии приёмки

- [ ] `npm run dev` в `web/` поднимает сервер на `:3000`
- [ ] `GET /api/health` возвращает 200 JSON
- [ ] Главная страница открывается в браузере

## Команды проверки

```bash
cd web && npm run dev
curl http://localhost:3000/api/health
```

## Заметки

- **Хранилище:** Neon (Postgres) + Vercel Blob — см. [PROJECT.md](../../../project/PROJECT.md#инфра)
- Локально: `npm run dev` + те же `DATABASE_URL` / `BLOB_READ_WRITE_TOKEN` из Neon/Vercel Dashboard
- Для webhook без деплоя: ngrok на `:3000` (задача 03); staging на Vercel — опционально
- В `nuxt.config.ts` для Vercel: `nitro: { preset: 'vercel' }`
- Не добавлять Prisma пока — это задача 02
