-- Chale private messaging. All player-facing writes are performed by scoped SECURITY DEFINER RPCs.
create table if not exists public.player_phone_numbers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phone_number text not null unique,
  created_at timestamptz not null default now()
);
create table if not exists public.chale_contacts (
  owner_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid not null references auth.users(id) on delete cascade,
  label text,
  created_at timestamptz not null default now(),
  primary key (owner_id, contact_id),
  check (owner_id <> contact_id)
);
create table if not exists public.chale_blocks (
  owner_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, blocked_id),
  check (owner_id <> blocked_id)
);
create table if not exists public.chale_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender_id <> recipient_id)
);
create index if not exists chale_messages_pair_created_idx on public.chale_messages(sender_id,recipient_id,created_at desc);
create index if not exists chale_messages_recipient_created_idx on public.chale_messages(recipient_id,created_at desc);

alter table public.player_phone_numbers enable row level security;
alter table public.chale_contacts enable row level security;
alter table public.chale_blocks enable row level security;
alter table public.chale_messages enable row level security;

create policy "Players read their own game number" on public.player_phone_numbers for select to authenticated using (user_id=(select auth.uid()));
create policy "Players read their own Chale contacts" on public.chale_contacts for select to authenticated using (owner_id=(select auth.uid()));
create policy "Players read their own Chale blocks" on public.chale_blocks for select to authenticated using (owner_id=(select auth.uid()));
create policy "Players read messages addressed to them or sent by them" on public.chale_messages for select to authenticated using (sender_id=(select auth.uid()) or recipient_id=(select auth.uid()));
revoke all on public.player_phone_numbers,public.chale_contacts,public.chale_blocks,public.chale_messages from anon,authenticated;
grant select on public.player_phone_numbers,public.chale_contacts,public.chale_blocks,public.chale_messages to authenticated;

create or replace function public.akwantuo_chale_get_my_number() returns text language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_number text; v_candidate text;
begin
 if v_uid is null then raise exception 'Sign in to use Chale.'; end if;
 select phone_number into v_number from public.player_phone_numbers where user_id=v_uid;
 if v_number is not null then return v_number; end if;
 loop
  v_candidate:='AK-'||lpad((floor(random()*100000000))::bigint::text,8,'0');
  begin
   insert into public.player_phone_numbers(user_id,phone_number) values(v_uid,v_candidate) on conflict(user_id) do nothing;
   exit;
  exception when unique_violation then null;
  end;
 end loop;
 select phone_number into v_number from public.player_phone_numbers where user_id=v_uid;
 return v_number;
end; $$;

create or replace function public.akwantuo_chale_add_contact(p_phone_number text,p_label text default null)
returns table(contact_id uuid,display_name text,phone_number text) language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_target uuid;
begin
 if v_uid is null then raise exception 'Sign in to use Chale.'; end if;
 select n.user_id into v_target from public.player_phone_numbers n where upper(trim(n.phone_number))=upper(trim(p_phone_number));
 if v_target is null then raise exception 'No AKWANTUO player has that number.'; end if;
 if v_target=v_uid then raise exception 'You cannot add your own number.'; end if;
 if exists(select 1 from public.chale_blocks b where (b.owner_id=v_uid and b.blocked_id=v_target) or (b.owner_id=v_target and b.blocked_id=v_uid)) then raise exception 'This contact is unavailable.'; end if;
 insert into public.chale_contacts(owner_id,contact_id,label) values(v_uid,v_target,nullif(left(trim(coalesce(p_label,'')),40),'')) on conflict(owner_id,contact_id) do update set label=coalesce(excluded.label,public.chale_contacts.label);
 return query select v_target,coalesce(nullif(c.label,''),p.display_name,'AKWANTUO Player'),n.phone_number from public.player_phone_numbers n left join public.player_profiles p on p.id=v_target left join public.chale_contacts c on c.owner_id=v_uid and c.contact_id=v_target where n.user_id=v_target;
end; $$;

create or replace function public.akwantuo_chale_list_contacts()
returns table(contact_id uuid,display_name text,phone_number text,last_message text,last_message_at timestamptz) language sql security definer set search_path='' as $$
 select c.contact_id,coalesce(nullif(c.label,''),p.display_name,'AKWANTUO Player'),n.phone_number,m.body,m.created_at
 from public.chale_contacts c join public.player_phone_numbers n on n.user_id=c.contact_id
 left join public.player_profiles p on p.id=c.contact_id
 left join lateral (select msg.body,msg.created_at from public.chale_messages msg where (msg.sender_id=c.owner_id and msg.recipient_id=c.contact_id) or (msg.sender_id=c.contact_id and msg.recipient_id=c.owner_id) order by msg.created_at desc limit 1) m on true
 where c.owner_id=auth.uid() and not exists(select 1 from public.chale_blocks b where (b.owner_id=c.owner_id and b.blocked_id=c.contact_id) or (b.owner_id=c.contact_id and b.blocked_id=c.owner_id))
 order by m.created_at desc nulls last,display_name;
$$;

create or replace function public.akwantuo_chale_list_messages(p_other_player_id uuid)
returns table(id uuid,sender_id uuid,recipient_id uuid,body text,created_at timestamptz,read_at timestamptz) language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'Sign in to use Chale.'; end if;
 if not exists(select 1 from public.chale_contacts c where c.owner_id=v_uid and c.contact_id=p_other_player_id) then raise exception 'Save this player as a contact before chatting.'; end if;
 if exists(select 1 from public.chale_blocks b where (b.owner_id=v_uid and b.blocked_id=p_other_player_id) or (b.owner_id=p_other_player_id and b.blocked_id=v_uid)) then raise exception 'This conversation is unavailable.'; end if;
 update public.chale_messages set read_at=now() where sender_id=p_other_player_id and recipient_id=v_uid and read_at is null;
 return query select m.id,m.sender_id,m.recipient_id,m.body,m.created_at,m.read_at from public.chale_messages m where (m.sender_id=v_uid and m.recipient_id=p_other_player_id) or (m.sender_id=p_other_player_id and m.recipient_id=v_uid) order by m.created_at asc limit 150;
end; $$;

create or replace function public.akwantuo_chale_send_message(p_recipient_id uuid,p_body text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_id uuid;
begin
 if v_uid is null then raise exception 'Sign in to use Chale.'; end if;
 if p_body is null or char_length(trim(p_body)) not between 1 and 2000 then raise exception 'Message must be between 1 and 2,000 characters.'; end if;
 if not exists(select 1 from public.chale_contacts c where c.owner_id=v_uid and c.contact_id=p_recipient_id) then raise exception 'Save this player’s number before sending a message.'; end if;
 if exists(select 1 from public.chale_blocks b where (b.owner_id=v_uid and b.blocked_id=p_recipient_id) or (b.owner_id=p_recipient_id and b.blocked_id=v_uid)) then raise exception 'This player is unavailable.'; end if;
 insert into public.chale_messages(sender_id,recipient_id,body) values(v_uid,p_recipient_id,trim(p_body)) returning id into v_id;
 return v_id;
end; $$;

create or replace function public.akwantuo_chale_block_player(p_other_player_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'Sign in to use Chale.'; end if;
 if p_other_player_id=v_uid then raise exception 'You cannot block yourself.'; end if;
 insert into public.chale_blocks(owner_id,blocked_id) values(v_uid,p_other_player_id) on conflict do nothing;
 delete from public.chale_contacts where owner_id=v_uid and contact_id=p_other_player_id;
end; $$;

revoke all on function public.akwantuo_chale_get_my_number() from public,anon;
revoke all on function public.akwantuo_chale_add_contact(text,text) from public,anon;
revoke all on function public.akwantuo_chale_list_contacts() from public,anon;
revoke all on function public.akwantuo_chale_list_messages(uuid) from public,anon;
revoke all on function public.akwantuo_chale_send_message(uuid,text) from public,anon;
revoke all on function public.akwantuo_chale_block_player(uuid) from public,anon;
grant execute on function public.akwantuo_chale_get_my_number() to authenticated;
grant execute on function public.akwantuo_chale_add_contact(text,text) to authenticated;
grant execute on function public.akwantuo_chale_list_contacts() to authenticated;
grant execute on function public.akwantuo_chale_list_messages(uuid) to authenticated;
grant execute on function public.akwantuo_chale_send_message(uuid,text) to authenticated;
grant execute on function public.akwantuo_chale_block_player(uuid) to authenticated;
