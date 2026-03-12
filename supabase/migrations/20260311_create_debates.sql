create extension if not exists pgcrypto;

create table if not exists public.debates (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  messages jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.debates enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'debates'
      and policyname = 'Allow public insert on debates'
  ) then
    create policy "Allow public insert on debates"
      on public.debates
      for insert
      to anon, authenticated
      with check (true);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'debates'
      and policyname = 'Allow public select on debates'
  ) then
    create policy "Allow public select on debates"
      on public.debates
      for select
      to anon, authenticated
      using (true);
  end if;
end
$$;
