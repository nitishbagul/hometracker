-- ─── RUN THIS IN YOUR NEON SQL EDITOR ───────────────────────────────────────
-- This adds sharing support on top of your existing tables.
-- Safe to run on existing data — does not modify existing tables.

create table if not exists house_members (
  id         uuid primary key default gen_random_uuid(),
  house_id   uuid references houses(id) on delete cascade not null,
  user_id    text not null,
  role       text default 'member' check (role in ('owner', 'member')),
  created_at timestamptz default now(),
  unique(house_id, user_id)
);

create table if not exists house_invites (
  id             uuid primary key default gen_random_uuid(),
  house_id       uuid references houses(id) on delete cascade not null,
  invited_email  text not null,
  invited_by     text not null,
  house_name     text not null,
  inviter_email  text not null,
  status         text default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at     timestamptz default now(),
  unique(house_id, invited_email)
);

create index if not exists house_members_user_id on house_members(user_id);
create index if not exists house_invites_email   on house_invites(invited_email, status);
