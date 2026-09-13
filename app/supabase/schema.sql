-- ¡A conjugar! — monitorowanie nauki (panel rodzica)
-- Dostęp wyłącznie przez funkcje RPC poniżej. Tabele mają RLS bez polityk = brak bezpośredniego dostępu z przeglądarki.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  parent_pin_hash text,
  pin_fail_count integer not null default 0,
  pin_locked_until timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.devices (
  id uuid primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  player_name text not null,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);

create table if not exists public.activity_minutes (
  device_id uuid not null references public.devices(id) on delete cascade,
  minute timestamptz not null,
  active_sec smallint not null default 0 check (active_sec between 0 and 60),
  answers smallint not null default 0,
  correct smallint not null default 0,
  primary key (device_id, minute)
);

create table if not exists public.activity_days (
  device_id uuid not null references public.devices(id) on delete cascade,
  day date not null,
  active_sec integer not null default 0,
  answers integer not null default 0,
  correct integer not null default 0,
  almost integer not null default 0,
  wrong integer not null default 0,
  rounds integer not null default 0,
  passed integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (device_id, day)
);

create table if not exists public.rounds (
  id uuid primary key,
  device_id uuid not null references public.devices(id) on delete cascade,
  finished_at timestamptz not null,
  level_key text not null,
  level_name text not null,
  level_kind text not null,
  score real not null,
  stars smallint not null,
  answers smallint not null,
  correct smallint not null,
  duration_sec integer not null default 0
);

alter table public.families enable row level security;
alter table public.devices enable row level security;
alter table public.activity_minutes enable row level security;
alter table public.activity_days enable row level security;
alter table public.rounds enable row level security;

create or replace function public.normalize_code(p text)
returns text language sql immutable set search_path = '' as $$
  select upper(regexp_replace(coalesce(p, ''), '[^A-Za-z0-9]', '', 'g'))
$$;

-- Gra: połączenie urządzenia (profilu gracza) z rodziną
create or replace function public.register_device(p_family_code text, p_device_id uuid, p_player_name text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  fid uuid;
begin
  select id into fid from public.families where code = public.normalize_code(p_family_code);
  if fid is null then
    return false;
  end if;
  insert into public.devices (id, family_id, player_name)
  values (p_device_id, fid, left(trim(coalesce(p_player_name, 'gracz')), 40))
  on conflict (id) do update
    set family_id = excluded.family_id, player_name = excluded.player_name, last_seen = now();
  return true;
end
$$;

-- Gra: wysyłka aktywności (idempotentna — te same dane można wysłać ponownie)
create or replace function public.push_activity(p_device_id uuid, p_minutes jsonb, p_days jsonb, p_rounds jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.devices where id = p_device_id) then
    return false;
  end if;
  update public.devices set last_seen = now() where id = p_device_id;

  insert into public.activity_minutes (device_id, minute, active_sec, answers, correct)
  select p_device_id, (m->>'minute')::timestamptz,
         least(60, greatest(0, coalesce((m->>'activeSec')::int, 0))),
         least(1000, greatest(0, coalesce((m->>'answers')::int, 0))),
         least(1000, greatest(0, coalesce((m->>'correct')::int, 0)))
  from jsonb_array_elements(coalesce(p_minutes, '[]'::jsonb)) m
  on conflict (device_id, minute) do update
    set active_sec = excluded.active_sec, answers = excluded.answers, correct = excluded.correct;

  insert into public.activity_days (device_id, day, active_sec, answers, correct, almost, wrong, rounds, passed, updated_at)
  select p_device_id, (d->>'day')::date,
         greatest(0, coalesce((d->>'activeSec')::int, 0)), greatest(0, coalesce((d->>'answers')::int, 0)),
         greatest(0, coalesce((d->>'correct')::int, 0)), greatest(0, coalesce((d->>'almost')::int, 0)),
         greatest(0, coalesce((d->>'wrong')::int, 0)), greatest(0, coalesce((d->>'rounds')::int, 0)),
         greatest(0, coalesce((d->>'passed')::int, 0)), now()
  from jsonb_array_elements(coalesce(p_days, '[]'::jsonb)) d
  on conflict (device_id, day) do update
    set active_sec = excluded.active_sec, answers = excluded.answers, correct = excluded.correct,
        almost = excluded.almost, wrong = excluded.wrong, rounds = excluded.rounds, passed = excluded.passed,
        updated_at = now();

  insert into public.rounds (id, device_id, finished_at, level_key, level_name, level_kind, score, stars, answers, correct, duration_sec)
  select (r->>'id')::uuid, p_device_id, (r->>'finishedAt')::timestamptz,
         left(r->>'levelKey', 40), left(r->>'levelName', 60), left(r->>'levelKind', 20),
         (r->>'score')::real, (r->>'stars')::smallint, (r->>'answers')::smallint, (r->>'correct')::smallint,
         coalesce((r->>'durationSec')::int, 0)
  from jsonb_array_elements(coalesce(p_rounds, '[]'::jsonb)) r
  on conflict (id) do nothing;

  return true;
end
$$;

-- Panel: stan rodziny (czy kod istnieje i czy PIN jest ustawiony)
create or replace function public.family_status(p_family_code text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  fam public.families;
begin
  select * into fam from public.families where code = public.normalize_code(p_family_code);
  if fam.id is null then
    return 'missing';
  end if;
  return case when fam.parent_pin_hash is null then 'needs_pin' else 'ready' end;
end
$$;

-- Panel: pierwsze ustawienie PIN-u rodzica (tylko gdy jeszcze nie ma)
create or replace function public.set_parent_pin(p_family_code text, p_pin text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if length(coalesce(p_pin, '')) < 4 then
    return false;
  end if;
  update public.families
    set parent_pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf'))
    where code = public.normalize_code(p_family_code) and parent_pin_hash is null;
  return found;
end
$$;

-- Panel: raport (kod + PIN; po 8 błędnych PIN-ach blokada na 15 minut)
create or replace function public.family_report(p_family_code text, p_pin text, p_since timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  fam public.families;
begin
  select * into fam from public.families where code = public.normalize_code(p_family_code);
  if fam.id is null or fam.parent_pin_hash is null then
    return null;
  end if;
  if fam.pin_locked_until is not null and fam.pin_locked_until > now() then
    return jsonb_build_object('locked', true);
  end if;
  if fam.parent_pin_hash <> extensions.crypt(coalesce(p_pin, ''), fam.parent_pin_hash) then
    update public.families
      set pin_fail_count = pin_fail_count + 1,
          pin_locked_until = case when pin_fail_count + 1 >= 8 then now() + interval '15 minutes' else null end
      where id = fam.id;
    return null;
  end if;
  update public.families set pin_fail_count = 0, pin_locked_until = null where id = fam.id;

  return jsonb_build_object(
    'devices', coalesce((
      select jsonb_agg(jsonb_build_object('id', d.id, 'name', d.player_name, 'lastSeen', d.last_seen) order by d.created_at)
      from public.devices d where d.family_id = fam.id), '[]'::jsonb),
    'days', coalesce((
      select jsonb_agg(jsonb_build_object('deviceId', a.device_id, 'day', a.day, 'activeSec', a.active_sec, 'answers', a.answers,
                                          'correct', a.correct, 'almost', a.almost, 'wrong', a.wrong, 'rounds', a.rounds, 'passed', a.passed))
      from public.activity_days a join public.devices d on d.id = a.device_id
      where d.family_id = fam.id and a.day >= (p_since at time zone 'Europe/Warsaw')::date), '[]'::jsonb),
    'minutes', coalesce((
      select jsonb_agg(jsonb_build_object('deviceId', m.device_id, 'minute', m.minute, 'activeSec', m.active_sec,
                                          'answers', m.answers, 'correct', m.correct))
      from public.activity_minutes m join public.devices d on d.id = m.device_id
      where d.family_id = fam.id and m.minute >= p_since), '[]'::jsonb),
    'rounds', coalesce((
      select jsonb_agg(jsonb_build_object('deviceId', r.device_id, 'finishedAt', r.finished_at, 'levelKey', r.level_key,
                                          'levelName', r.level_name, 'levelKind', r.level_kind, 'score', r.score, 'stars', r.stars,
                                          'answers', r.answers, 'correct', r.correct, 'durationSec', r.duration_sec)
                       order by r.finished_at desc)
      from public.rounds r join public.devices d on d.id = r.device_id
      where d.family_id = fam.id and r.finished_at >= p_since), '[]'::jsonb)
  );
end
$$;

revoke all on function public.normalize_code(text) from public;
revoke all on function public.register_device(text, uuid, text) from public;
revoke all on function public.push_activity(uuid, jsonb, jsonb, jsonb) from public;
revoke all on function public.family_status(text) from public;
revoke all on function public.set_parent_pin(text, text) from public;
revoke all on function public.family_report(text, text, timestamptz) from public;

grant execute on function public.register_device(text, uuid, text) to anon, authenticated;
grant execute on function public.push_activity(uuid, jsonb, jsonb, jsonb) to anon, authenticated;
grant execute on function public.family_status(text) to anon, authenticated;
grant execute on function public.set_parent_pin(text, text) to anon, authenticated;
grant execute on function public.family_report(text, text, timestamptz) to anon, authenticated;

-- Kod rodziny (10 znaków, bez mylących liter) — tworzony raz
insert into public.families (code)
select x.c
from (
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + (get_byte(b.bytes, i) % 32), 1), '') as c
  from (select extensions.gen_random_bytes(10) as bytes) b, generate_series(0, 9) as i
) x
where not exists (select 1 from public.families);

select code as kod_rodziny from public.families order by created_at limit 1;
