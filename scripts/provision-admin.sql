-- The account is explicitly approved by the owner. No password is stored here.
insert into public.admin_users(user_id,role,is_active)
select id,'ADMIN',true from auth.users where lower(email)='hetmehta@gmail.com'
on conflict(user_id) do update set role='ADMIN',is_active=true,updated_at=now();
