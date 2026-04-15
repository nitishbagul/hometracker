-- ─── TABLES ──────────────────────────────────────────────────────────────────

create table houses (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null,
  name       text not null,
  created_at timestamptz default now()
);

create table sections (
  id         uuid primary key default gen_random_uuid(),
  house_id   uuid references houses(id) on delete cascade not null,
  name       text not null,
  created_at timestamptz default now()
);

create table places (
  id         uuid primary key default gen_random_uuid(),
  section_id uuid references sections(id) on delete cascade not null,
  name       text not null,
  created_at timestamptz default now()
);

create table items (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null,
  name       text not null,
  place_id   uuid references places(id) on delete set null,
  created_at timestamptz default now()
);

create table activity (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null,
  type        text not null,
  description text not null,
  metadata    jsonb default '{}',
  created_at  timestamptz default now()
);

-- ─── INDEXES ──────────────────────────────────────────────────────────────────

create index on houses(user_id);
create index on items(user_id);
create index on activity(user_id);
create index on sections(house_id);
create index on places(section_id);
create index on activity(created_at desc);
