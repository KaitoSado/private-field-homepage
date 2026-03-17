-- Replace the UUID below with the user id of the account you want to make admin.
update public.profiles
set role = 'admin'
where id = 'REPLACE_WITH_USER_UUID';
