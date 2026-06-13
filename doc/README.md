# Документация Kopir

## Быстрый старт для Cursor

1. **[project/PROJECT.md](./project/PROJECT.md)** — что строим, стек, архитектура
2. **[dev/ENV_SETUP.md](./dev/ENV_SETUP.md)** — где взять ключи и токены
3. **[sprints/SPRINTS.md](./sprints/SPRINTS.md)** — что делать сейчас (**Sprint 0 в работе**)
4. **[project/FEATURES.md](./project/FEATURES.md)** — статусы фич, не дублируй работу

---

## Новая структура `doc/`

```
doc/
├── README.md                 # ← этот файл (оглавление)
│
├── project/                  # контекст для разработки и AI
│   ├── PROJECT.md
│   ├── FEATURES.md
│   └── BOT_MESSENGERS.md
│
├── roadmap/                  # продукт (бизнес), не код
│   ├── README.md
│   └── ROADMAP.md
│
├── sprints/                  # план разработки по неделям
│   ├── SPRINTS.md
│   ├── sprint-0/             # Sprint 0 — в работе
│   │   └── tasks/            # 01–09
│   └── sprint-0-1/           # DOCX + Word page count
│       └── tasks/            # 01–07
│
├── dev/
│   ├── README.md
│   └── ENV_SETUP.md
│
├── business/                 # экономика и стратегия (не код)
│   ├── README.md
│   ├── models.md             # SaaS vs франшиза
│   ├── economics.md          # Улан-Удэ, 3 города
│   └── scaling.md            # триггеры этапов
│
├── product/                  # будущие фичи (после MVP)
│   ├── README.md
│   ├── docx-conversion.md
│   └── color-printing.md
│
├── hardware/                 # боксы, IoT, обслуживание
│   ├── README.md
│   ├── overview.md
│   ├── configurations.md     # LITE / MAX / PRO-DIPLOMA
│   ├── components.md
│   └── service-agents.md
│
└── brainstorm/               # сырые брейнштормы (не редактировать)
    ├── README.md
    ├── 11.06.2026.md
    └── 12.06.2026.md
```

Структурированные выводы из `brainstorm/12.06.2026.md` вынесены в `business/`, `hardware/`, `product/`. Полные диалоги остаются в `brainstorm/`.

---

## Разделение

| Папка | Что внутри | Когда читать |
|-------|------------|--------------|
| **project/** | Контекст для Cursor и кода: стек, архитектура, реестр фич, боты | Перед любой сессией разработки |
| **roadmap/** | Этапы продукта, календарь, приоритеты — **без привязки к коду** | Стратегия, «куда идём» |
| **sprints/** | Что делаем в разработке по спринтам; детальные задачи | Ежедневная работа (**Sprint 0 сейчас**) |
| **dev/** | Настройка окружения, ключи, токены | Первый деплой, новый разработчик |
| **business/** | Экономика, модели (SaaS / франшиза), критерии масштабирования | Бизнес-план, инвесторы, партнёры |
| **hardware/** | Боксы, комплектации, IoT, контроль заправщиков | После MVP, сборка первого бокса |
| **product/** | DOCX-конвертация, цветная печать — фичи **не в Sprint 0** | Планирование Sprint 1+ |
| **brainstorm/** | Архив сырых идей (11–12 июня 2026) | Справочно, не редактировать |

**Главное правило:** `roadmap/` — про продукт и бизнес; `sprints/` — про код и задачи. Не смешивать.

---

## Все файлы по разделам

### Разработка

| Файл | Назначение |
|------|------------|
| [project/PROJECT.md](./project/PROJECT.md) | Сводка проекта + технологии (контекст для AI) |
| [project/FEATURES.md](./project/FEATURES.md) | Реестр фич со статусами ⬜ 🔵 ✅ |
| [project/BOT_MESSENGERS.md](./project/BOT_MESSENGERS.md) | Мультиканальные боты: TG, MAX, VK |
| [dev/ENV_SETUP.md](./dev/ENV_SETUP.md) | Neon, Blob, Telegram, MAX, секреты |
| [sprints/SPRINTS.md](./sprints/SPRINTS.md) | Задачи по 2-недельным спринтам |
| [sprints/sprint-0/](./sprints/sprint-0/README.md) | **Sprint 0** — PDF, первая печать (в работе) |
| [sprints/sprint-0-1/](./sprints/sprint-0-1/README.md) | **Sprint 0.1** — DOCX, Word, quote в боте |

### Продукт и бизнес (не код)

| Файл | Назначение |
|------|------------|
| [roadmap/ROADMAP.md](./roadmap/ROADMAP.md) | Этапы 1–4: пилот → MVP → автоматизация → масштаб |
| [business/models.md](./business/models.md) | SaaS vs франшиза боксов, гибридный старт |
| [business/economics.md](./business/economics.md) | Экономика по городам, пессимист / реалист |
| [business/scaling.md](./business/scaling.md) | Критерии перехода на следующий уровень |
| [product/docx-conversion.md](./product/docx-conversion.md) | Word на ПК (0.1) → VPS LibreOffice (2+) |
| [product/color-printing.md](./product/color-printing.md) | Цветная печать (после MVP, на старте только ЧБ) |
| [hardware/overview.md](./hardware/overview.md) | Концепция бокса, Orange Pi, оплата в боте |
| [hardware/configurations.md](./hardware/configurations.md) | Комплектации LITE / MAX / PRO-DIPLOMA |
| [hardware/components.md](./hardware/components.md) | IoT-начинка, датчики, замки, LED |
| [hardware/service-agents.md](./hardware/service-agents.md) | Контроль заправщиков, PIN на экране |

### Архив идей

| Файл | Назначение | Куда вынесено |
|------|------------|---------------|
| [brainstorm/11.06.2026.md](./brainstorm/11.06.2026.md) | Первичная идея, архитектура, MVP | [project/PROJECT.md](./project/PROJECT.md) |
| [brainstorm/12.06.2026.md](./brainstorm/12.06.2026.md) | Боксы, IoT, экономика, заправщики, цвет | [business/](./business/models.md), [hardware/](./hardware/README.md), [product/](./product/README.md) |

---

## Как обновлять статусы

В `project/FEATURES.md` меняй `⬜ todo` → `🔵 in_progress` → `✅ done`.

В `sprints/SPRINTS.md` отмечай задачи спринта и заполняй ретро в конце.

## Корень репозитория

`.cursorrules` — автоматически подхватывается Cursor; ссылается на `doc/project/` и `doc/sprints/`.
