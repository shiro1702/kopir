# 01 — PyInstaller + установка в копицентре

| | |
|---|---|
| **Статус** | ⬜ todo |
| **Feature** | AGT-12 |
| **Зависимости** | Sprint 0.1 E2E закрыт |
| **Оценка** | 4–6 часов |

## Цель

Собрать переносимый `kopir-agent.exe` и установить на ПК партнёра с автозапуском.

## Подзадачи

- [ ] **1.1** `desktop/pyinstaller.spec` — single-file exe, включить SumatraPDF (если bundled) или документировать рядом с exe
- [ ] **1.2** `desktop/build.bat` — venv, pip install, pyinstaller
- [ ] **1.3** `.env` рядом с exe (не внутри): `SERVER_URL`, `WS_URL`, `AGENT_API_KEY`, `POINT_ID`, `USE_SEPARATOR_PAGE`
- [ ] **1.4** Чеклист установки в `desktop/README.md`:
  - MS Word (для docx)
  - SumatraPDF в PATH или рядом с exe
  - Исключение в Windows Defender
  - Принтер по умолчанию
- [ ] **1.5** Autostart: ярлык в `shell:startup` или Task Scheduler «при входе»
- [ ] **1.6** Seed точки в Neon: `point_bgu_1` (или slug партнёра) + `isActive=true`
- [ ] **1.7** Smoke на ПК партнёра: PDF → admin pay → печать (до WS, через polling)

## Критерии приёмки

- [ ] exe запускается без установленного Python на целевом ПК
- [ ] После перезагрузки ПК агент поднимается сам
- [ ] Логи пишутся в `%LOCALAPPDATA%/Kopir/agent.log`
- [ ] Партнёр подписал устное согласие на бета-тест (запись в [notes.md](../notes.md))

## Заметки

- GUI PySide6 — Sprint 2; в Sprint 1 достаточно консоли + log file
- Mac/Linux не в scope бета-копицентра
