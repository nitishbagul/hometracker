-- ─── TABLES ──────────────────────────────────────────────────────────────────

create table public.houses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  created_at  timestamptz default now() not null
);

create table public.sections (
  id          uuid primary key default gen_random_uuid(),
  house_id    uuid references public.houses(id) on delete cascade not null,
  name        text not null,
  created_at  timestamptz default now() not null
);

create table public.places (
  id          uuid primary key default gen_random_uuid(),
  section_id  uuid references public.sections(id) on delete cascade not null,
  name        text not null,
  created_at  timestamptz default now() not null
);

create table public.items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  place_id    uuid references public.places(id) on delete set null,
  created_at  timestamptz default now() not null
);

create table public.activity (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  type        text not null,
  description text not null,
  metadata    jsonb default '{}'::jsonb,
  created_at  timestamptz default now() not null
);

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────

alter table public.houses   enable row level security;
alter table public.sections enable row level security;
alter table public.places   enable row level security;
alter table public.items    enable row level security;
alter table public.activity enable row level security;

-- Houses: owned directly by user
create policy "houses_select" on public.houses for select using (auth.uid() = user_id);
create policy "houses_insert" on public.houses for insert with check (auth.uid() = user_id);
create policy "houses_update" on public.houses for update using (auth.uid() = user_id);
create policy "houses_delete" on public.houses for delete using (auth.uid() = user_id);

-- Sections: owned via house
create policy "sections_select" on public.sections for select
  using (house_id in (select id from public.houses where user_id = auth.uid()));
create policy "sections_insert" on public.sections for insert
  with check (house_id in (select id from public.houses where user_id = auth.uid()));
create policy "sections_update" on public.sections for update
  using (house_id in (select id from public.houses where user_id = auth.uid()));
create policy "sections_delete" on public.sections for delete
  using (house_id in (select id from public.houses where user_id = auth.uid()));

-- Places: owned via section → house
create policy "places_select" on public.places for select
  using (section_id in (
    select s.id from public.sections s
    join public.houses h on h.id = s.house_id
    where h.user_id = auth.uid()
  ));
create policy "places_insert" on public.places for insert
  with check (section_id in (
    select s.id from public.sections s
    join public.houses h on h.id = s.house_id
    where h.user_id = auth.uid()
  ));
create policy "places_update" on public.places for update
  using (section_id in (
    select s.id from public.sections s
    join public.houses h on h.id = s.house_id
    where h.user_id = auth.uid()
  ));
create policy "places_delete" on public.places for delete
  using (section_id in (
    select s.id from public.sections s
    join public.houses h on h.id = s.house_id
    where h.user_id = auth.uid()
  ));

-- Items: owned directly by user
create policy "items_select" on public.items for select using (auth.uid() = user_id);
create policy "items_insert" on public.items for insert with check (auth.uid() = user_id);
create policy "items_update" on public.items for update using (auth.uid() = user_id);
create policy "items_delete" on public.items for delete using (auth.uid() = user_id);

-- Activity: owned directly by user
create policy "activity_select" on public.activity for select using (auth.uid() = user_id);
create policy "activity_insert" on public.activity for insert with check (auth.uid() = user_id);
