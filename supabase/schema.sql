-- ============================================================
-- InstagramMoney — Supabase Schema
-- Run this in the Supabase SQL editor to bootstrap the project.
-- ============================================================

-- Enable pgcrypto for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ============================================================
-- Table: video_ideas
-- ============================================================
create table if not exists video_ideas (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  full_script      text not null,
  scene_breakdown  jsonb not null default '[]',
  scheduled_at     timestamptz not null,
  status           text not null default 'pending'
                     check (status in (
                       'pending', 'processing', 'clips_generated',
                       'merged', 'completed', 'scheduled', 'posted', 'failed'
                     )),
  final_video_url  text null,
  caption          text null,
  hashtags         text[] null,
  error_message    text null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger video_ideas_updated_at
  before update on video_ideas
  for each row execute procedure set_updated_at();

-- ============================================================
-- Table: pipeline_logs
-- ============================================================
create table if not exists pipeline_logs (
  id         uuid primary key default gen_random_uuid(),
  idea_id    uuid references video_ideas(id) on delete cascade,
  step       text not null,
  message    text not null,
  level      text not null default 'info'
               check (level in ('info', 'warn', 'error', 'success')),
  created_at timestamptz not null default now()
);

create index if not exists pipeline_logs_idea_id_idx on pipeline_logs(idea_id);

-- ============================================================
-- Table: model_profile
-- Only one row is expected (is_default = true)
-- ============================================================
create table if not exists model_profile (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  base_prompt         text not null,
  negative_prompt     text null,
  reference_image_url text null,
  style_notes         text null,
  is_default          boolean not null default true,
  created_at          timestamptz not null default now()
);

-- Seed a default model profile if none exists
insert into model_profile (name, base_prompt, negative_prompt, style_notes, is_default)
select
  'Default Model',
  'Cinematic portrait of a young woman, natural lighting, photorealistic, 4K quality, ',
  'blurry, low quality, distorted, watermark, text overlay, cartoon, anime',
  'Instagram Reels aesthetic, warm tones, shallow depth of field',
  true
where not exists (select 1 from model_profile);

-- ============================================================
-- Storage buckets (run these separately in Supabase dashboard
-- or via supabase CLI — SQL cannot create storage buckets)
-- ============================================================
-- bucket: model-assets     (private)
-- bucket: generated-clips  (private)
-- bucket: final-videos     (public)
