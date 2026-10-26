# Сайт на своём сервере + домен Cloudflare

Для сервера с панелью (Node.js, консоль, файлы, SSH), например тариф BOT-3: 1 vCPU, 2 ГБ RAM, 10 ГБ.
Меню и фото хранятся на диске сервера (`site/data/`), Supabase не нужен. В интернет сайт выводит
**Cloudflare Tunnel**: открывать порты не надо, HTTPS включается сам.

## 1. Домен (Cloudflare)

Купите домен в Cloudflare (Domain Registration → Register Domains), например `khushbakhti.com`.
DNS-записи вручную **не добавляйте** — их создаст туннель.

## 2. Туннель (Cloudflare, 5 минут)

1. dash.cloudflare.com → слева **Zero Trust** (Cloudflare One). При первом входе выберите бесплатный план **Free**.
2. **Networks** → **Tunnels** → **Create a tunnel** → **Cloudflared** → имя `khushbakhti` → **Save tunnel**.
3. Cloudflare покажет команду установки. Скопируйте из неё **только токен** — длинную строку после `--token`.
   Сохраните в заметках: он понадобится в шаге 3. Это пароль к туннелю, никому не пересылайте.
4. **Next** → **Public hostname**: Subdomain — пусто, Domain — ваш домен, Service: Type **HTTP**, URL **`localhost:3000`** → **Save**.
5. По желанию: в туннеле ещё один Public hostname — Subdomain `www`, остальное так же.

## 3. Сервер (15 минут, с телефона через приложение Termius)

1. В панели хостинга выберите версию **Node.js 22** (вкладка Startup / переменные запуска).
2. Подключитесь по SSH (данные — в панели) и выполните:

   ```bash
   git clone -b ccr-64abc038-gz82yr https://github.com/vudiRemix/khushbakhti-site.git site
   cd site
   bash scripts/server/setup.sh
   ```

   Скрипт спросит домен, пароль админки (не короче 12 символов, лучше 3–4 случайных слова), токен туннеля
   и ключ Google Translate (можно пропустить — Enter). Потом соберёт сайт (3–6 минут).
3. В панели укажите команду запуска **`bash site/scripts/server/start.sh`** и нажмите **Restart**.
   Если панель разрешает выбрать только JS-файл — укажите **`site/scripts/server/start.mjs`**.
4. Через минуту откройте `https://ваш-домен`. В консоли панели должно быть `Ready` от Next.js и `Registered tunnel connection` от cloudflared.

## 4. После запуска

- Админка: `https://ваш-домен/admin` → проверьте плов, цену, загрузку фото.
- **QR** → число столов → **Печать**. Адрес теперь постоянный, коды можно печатать.
- Временный сайт на GitHub Pages: репозиторий → Settings → Pages → **Unpublish site**.

## Обновление сайта

Когда разработчик внесёт правки в код:

```bash
cd site && bash scripts/server/update.sh
```

…и **Restart** в панели. Меню, фото и настройки (`site/data/`, `site/.env.production.local`) при этом не трогаются.

## Резервные копии

- Каждые сутки сервер сохраняет меню и фото в `site/data/backups/` (14 последних дней).
- Раз в месяц скачивайте копию себе: админка → **Настройки** → **Скачать копию меню**, или файлы из `site/data/backups/` через вкладку «Файлы» / SFTP.

## Если что-то не работает

| Что видно | Что делать |
|---|---|
| «Нужен Node.js 22» | Смените версию Node.js в панели, повторите `bash scripts/server/setup.sh` |
| `git: command not found` | Напишите разработчику: скачаем архив вместо git |
| Сборка прервалась, `Killed` | Не хватило памяти: остановите сервер (Stop) и повторите `bash scripts/server/build.sh` |
| По домену ошибка 1033 | Туннель не запущен: проверьте консоль и токен в `site/.env.production.local` (`CF_TUNNEL_TOKEN=`) |
| Ошибка 502 | Туннель работает, а сайт нет: смотрите ошибку в консоли панели; в туннеле должно быть `localhost:3000` |
| Забыли пароль админки | Исправьте `ADMIN_PASSWORD=` в `site/.env.production.local` (вкладка «Файлы») и **Restart** |
