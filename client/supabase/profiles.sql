create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'name', '')
  )
  on conflict (id) do update
    set email = excluded.email,
        name = coalesce(nullif(public.profiles.name, ''), excluded.name),
        updated_at = now();

  return new;
end;
$$;

-- Populate profiles for any users who registered before this trigger existed.
insert into public.profiles (id, email, name)
select
  id,
  coalesce(email, ''),
  coalesce(raw_user_meta_data ->> 'name', '')
from auth.users
on conflict (id) do update
  set email = excluded.email,
      name = coalesce(nullif(public.profiles.name, ''), excluded.name),
      updated_at = now();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- User-owned movie data. Run this with the rest of this file.
create table if not exists public.identification_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  tmdb_id integer,
  title text not null,
  media_type text not null default 'movie',
  year text,
  confidence integer,
  poster text,
  created_at timestamptz not null default now()
);
create table if not exists public.saved_movies (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null default 'movie',
  title text not null,
  year text,
  rating text,
  poster text,
  created_at timestamptz not null default now(),
  unique (user_id, tmdb_id, media_type)
);
alter table public.identification_history enable row level security;
alter table public.saved_movies enable row level security;
create policy "Users manage their own identification history" on public.identification_history for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their own saved movies" on public.saved_movies for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
