# Деплой на VPS

Образ собирается GitHub Actions и публикуется в GHCR: `ghcr.io/hf35/find-job-pet-claude`.
Теги: `latest` (ветка `main`), `sha-<коммит>`, версия при теге `v*`.

## Первый запуск

1. Если пакет в GHCR приватный, выполните вход на VPS (токен с правом `read:packages`):

   ```bash
   echo "$GHCR_TOKEN" | docker login ghcr.io -u hf35 --password-stdin
   ```

   Либо сделайте пакет публичным: GitHub → Packages → find-job-pet-claude → Package settings.

2. Создайте каталог и положите туда `docker-compose.yml` из репозитория и файл `.env` (за основу возьмите `.env.example`):

   ```bash
   mkdir -p ~/find-job && cd ~/find-job
   curl -O https://raw.githubusercontent.com/hf35/find-job-pet-claude/main/docker-compose.yml
   cp .env.example .env   # или создайте вручную
   ```

3. Запустите:

   ```bash
   docker compose up -d
   curl http://127.0.0.1:8844/api/health
   ```

Данные (SQLite) лежат в `./data` рядом с compose-файлом. Каталог должен быть доступен на запись пользователю `node` (uid 1000): `chown -R 1000:1000 data`.

## Caddy

Порт опубликован только на `127.0.0.1:8844`. В Caddyfile:

```
jobs.example.com {
    reverse_proxy 127.0.0.1:8844
}
```

После правки: `caddy reload` (или `systemctl reload caddy`).

## Обновление

```bash
docker compose pull && docker compose up -d
```

## Бэкап

Скопируйте каталог `data/` (при остановленном контейнере или через `sqlite3 data/app.sqlite ".backup backup.sqlite"`).
