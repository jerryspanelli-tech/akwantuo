
create or replace function public.akwantuo_chale_list_contacts()
returns table(contact_id uuid,display_name text,phone_number text,last_message text,last_message_at timestamptz)
language sql security definer set search_path='' as $$
 select c.contact_id,coalesce(nullif(c.label,''),p.display_name,'AKWANTUO Player'),n.phone_number,m.body,m.created_at
 from public.chale_contacts c join public.player_phone_numbers n on n.user_id=c.contact_id
 left join public.player_profiles p on p.id=c.contact_id
 left join lateral (select msg.body,msg.created_at from public.chale_messages msg
   where (msg.sender_id=c.owner_id and msg.recipient_id=c.contact_id) or (msg.sender_id=c.contact_id and msg.recipient_id=c.owner_id)
   order by msg.created_at desc limit 1) m on true
 where c.owner_id=auth.uid()
 and exists(select 1 from public.chale_contacts reciprocal where reciprocal.owner_id=c.contact_id and reciprocal.contact_id=c.owner_id)
 and not exists(select 1 from public.chale_blocks b where (b.owner_id=c.owner_id and b.blocked_id=c.contact_id) or (b.owner_id=c.contact_id and b.blocked_id=c.owner_id))
 order by m.created_at desc nulls last,display_name;
$$;
create or replace function public.akwantuo_chale_list_messages(p_other_player_id uuid)
returns table(id uuid,sender_id uuid,recipient_id uuid,body text,created_at timestamptz,read_at timestamptz)
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'Sign in to use Chale.'; end if;
 if not exists(select 1 from public.chale_contacts c where c.owner_id=v_uid and c.contact_id=p_other_player_id)
 or not exists(select 1 from public.chale_contacts c where c.owner_id=p_other_player_id and c.contact_id=v_uid) then
 raise exception 'Both players must save each other’s number before chatting.'; end if;
 if exists(select 1 from public.chale_blocks b where (b.owner_id=v_uid and b.blocked_id=p_other_player_id) or (b.owner_id=p_other_player_id and b.blocked_id=v_uid)) then
 raise exception 'This conversation is unavailable.'; end if;
 update public.chale_messages set read_at=now() where sender_id=p_other_player_id and recipient_id=v_uid and read_at is null;
 return query select m.id,m.sender_id,m.recipient_id,m.body,m.created_at,m.read_at from public.chale_messages m
 where (m.sender_id=v_uid and m.recipient_id=p_other_player_id) or (m.sender_id=p_other_player_id and m.recipient_id=v_uid)
 order by m.created_at asc limit 150;
end; $$;
create or replace function public.akwantuo_chale_send_message(p_recipient_id uuid,p_body text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_id uuid;
begin
 if v_uid is null then raise exception 'Sign in to use Chale.'; end if;
 if p_body is null or char_length(trim(p_body)) not between 1 and 2000 then raise exception 'Message must be between 1 and 2,000 characters.'; end if;
 if not exists(select 1 from public.chale_contacts c where c.owner_id=v_uid and c.contact_id=p_recipient_id)
 or not exists(select 1 from public.chale_contacts c where c.owner_id=p_recipient_id and c.contact_id=v_uid) then
 raise exception 'Both players must save each other’s number before chatting.'; end if;
 if exists(select 1 from public.chale_blocks b where (b.owner_id=v_uid and b.blocked_id=p_recipient_id) or (b.owner_id=p_recipient_id and b.blocked_id=v_uid)) then
 raise exception 'This player is unavailable.'; end if;
 insert into public.chale_messages(sender_id,recipient_id,body) values(v_uid,p_recipient_id,trim(p_body)) returning id into v_id;
 return v_id;
end; $$;
