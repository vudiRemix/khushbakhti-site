-- Хушбахти: база для меню и фото.
-- Выполнить один раз: Supabase → SQL Editor → New query → вставить весь файл → Run.
-- Повторный запуск ничего не ломает. Меню сайт заполнит сам при первом открытии.

create table if not exists public.categories (
  id   text primary key,
  sort int  not null default 0,
  data jsonb not null
);

create table if not exists public.dishes (
  id         text primary key,
  sort       int  not null default 0,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.settings (
  id   int primary key check (id = 1),
  data jsonb not null
);

-- Читает и меняет таблицы только сервер сайта секретным ключом.
-- RLS включён без политик: публичный ключ из браузера не видит и не меняет ничего.
alter table public.categories enable row level security;
alter table public.dishes     enable row level security;
alter table public.settings   enable row level security;

grant select, insert, update, delete on public.categories, public.dishes, public.settings to service_role;
revoke all on public.categories, public.dishes, public.settings from anon, authenticated;

-- Публичная папка для фото блюд: смотреть может любой, загружать — только сервер сайта.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;
