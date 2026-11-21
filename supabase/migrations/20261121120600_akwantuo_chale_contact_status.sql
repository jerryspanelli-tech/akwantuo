
drop function if exists public.akwantuo_chale_list_contacts();
create function public.akwantuo_chale_list_contacts()
returns table(contact_id uuid,display_name text,phone_number text,last_message text,last_message_at timestamptz,is_mutual boolean)
language sql security definer set search_path='' as $$
 select c.contact_id,coalesce(nullif(c.label,''),p.display_name,'AKWANTUO Player'),n.phone_number,
        case when exists(select 1 from public.chale_contacts reciprocal where reciprocal.owner_id=c.contact_id and reciprocal.contact_id=c.owner_id) then m.body else null end,
        case when exists(select 1 from public.chale_contacts reciprocal where reciprocal.owner_id=c.contact_id and reciprocal.contact_id=c.owner_id) then m.created_at else null end,
        exists(select 1 from public.chale_contacts reciprocal where reciprocal.owner_id=c.contact_id and reciprocal.contact_id=c.owner_id)
 from public.chale_contacts c join public.player_phone_numbers n on n.user_id=c.contact_id
 left join public.player_profiles p on p.id=c.contact_id
 left join lateral (select msg.body,msg.created_at from public.chale_messages msg
   where (msg.sender_id=c.owner_id and msg.recipient_id=c.contact_id) or (msg.sender_id=c.contact_id and msg.recipient_id=c.owner_id)
   order by msg.created_at desc limit 1) m on true
 where c.owner_id=auth.uid()
 and not exists(select 1 from public.chale_blocks b where (b.owner_id=c.owner_id and b.blocked_id=c.contact_id) or (b.owner_id=c.contact_id and b.blocked_id=c.owner_id))
 order by m.created_at desc nulls last,display_name;
$$;
revoke all on function public.akwantuo_chale_list_contacts() from public,anon;
grant execute on function public.akwantuo_chale_list_contacts() to authenticated;
