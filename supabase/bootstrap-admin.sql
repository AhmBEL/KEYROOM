-- À faire une seule fois, pour le compte d'Ahmed.
-- 1. Supabase > Authentication > Users > Add user > Create new user :
--    saisir l'email d'Ahmed, cocher « Auto Confirm User ».
-- 2. Remplacer l'adresse ci-dessous par la même, puis lancer dans le SQL Editor.
insert into public.profiles (id, prenom, nom, role)
select id, 'Ahmed', 'Belhadj', 'admin'
from auth.users
where email = 'REMPLACER@exemple.com';
