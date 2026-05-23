-- ─────────────────────────────────────────────────────────────────────────────
-- Auto-create a profiles row whenever a new user signs up via Supabase Auth.
-- Handles email/password signups AND Google OAuth.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (
    "id",
    "fullName",
    "phone",
    "role",
    "avatarUrl",
    "createdAt",
    "updatedAt"
  )
  values (
    new.id,
    -- email signup sets full_name; Google OAuth sets full_name or name
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      split_part(new.email, '@', 1)   -- last resort: use email prefix
    ),
    nullif(trim(new.raw_user_meta_data->>'phone'), ''),
    'client',
    nullif(trim(new.raw_user_meta_data->>'avatar_url'), ''),
    now(),
    now()
  )
  on conflict ("id") do nothing;  -- idempotent: safe if row already exists

  return new;
end;
$$;

-- Drop and recreate so this file is safe to re-run
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
