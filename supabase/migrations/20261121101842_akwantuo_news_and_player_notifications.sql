create table if not exists public.game_news (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('Official announcement','Accra stories','Market news','Events','World news')),
  headline text not null check (char_length(headline) between 3 and 120),
  announcement text not null check (char_length(announcement) between 1 and 3000),
  audience text not null default 'all' check (audience in ('all','player')),
  target_player_id uuid references auth.users(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  published_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint game_news_target_check check (
    (audience = 'all' and target_player_id is null) or
    (audience = 'player' and target_player_id is not null)
  )
);

create table if not exists public.game_notifications (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references auth.users(id) on delete cascade,
  news_id uuid not null references public.game_news(id) on delete cascade,
  title text not null,
  message text not null,
  category text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (player_id, news_id)
);

create index if not exists game_news_published_idx
  on public.game_news (published_at desc) where status = 'published';
create index if not exists game_notifications_player_unread_idx
  on public.game_notifications (player_id, created_at desc) where read_at is null;

alter table public.game_news enable row level security;
alter table public.game_notifications enable row level security;

create policy "Players read published targeted news"
on public.game_news for select to authenticated
using (
  (status = 'published' and (audience = 'all' or target_player_id = (select auth.uid())))
  or (select coalesce(auth.jwt()->'app_metadata'->>'role', '')) = 'admin'
);

create policy "Admins create news"
on public.game_news for insert to authenticated
with check ((select coalesce(auth.jwt()->'app_metadata'->>'role', '')) = 'admin'
  and published_by = (select auth.uid()));

create policy "Admins update news"
on public.game_news for update to authenticated
using ((select coalesce(auth.jwt()->'app_metadata'->>'role', '')) = 'admin')
with check ((select coalesce(auth.jwt()->'app_metadata'->>'role', '')) = 'admin');

create policy "Admins delete news"
on public.game_news for delete to authenticated
using ((select coalesce(auth.jwt()->'app_metadata'->>'role', '')) = 'admin');

create policy "Players read own notifications"
on public.game_notifications for select to authenticated
using (player_id = (select auth.uid()));

create policy "Players mark own notifications read"
on public.game_notifications for update to authenticated
using (player_id = (select auth.uid()))
with check (player_id = (select auth.uid()));

grant select, insert, update, delete on public.game_news to authenticated;
grant select on public.game_notifications to authenticated;
grant update (read_at) on public.game_notifications to authenticated;

create or replace function public.notify_players_of_published_news()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.status = 'published'
     and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    insert into public.game_notifications (player_id, news_id, title, message, category)
    select p.id, new.id, new.headline, new.announcement, new.category
    from public.player_profiles p
    where new.audience = 'all' or p.id = new.target_player_id
    on conflict (player_id, news_id) do nothing;
    if new.published_at is null then
      update public.game_news set published_at = now(), updated_at = now() where id = new.id;
    end if;
  end if;
  return new;
end;
$function$;

revoke all on function public.notify_players_of_published_news() from public, anon, authenticated;
create trigger game_news_publish_notifications
after insert or update of status on public.game_news
for each row execute function public.notify_players_of_published_news();
