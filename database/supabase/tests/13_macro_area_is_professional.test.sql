-- BP-155: test pgTAP di macro_areas.is_professional. Esegui con `npx supabase test db`, da database/.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

select has_column('public', 'macro_areas', 'is_professional', 'macro_areas ha la colonna is_professional');
select col_not_null('public', 'macro_areas', 'is_professional', 'is_professional è obbligatoria');
select col_type_is('public', 'macro_areas', 'is_professional', 'boolean', 'is_professional è boolean');
select col_default_is('public', 'macro_areas', 'is_professional', 'false', 'default false');

-- Una macro-area creata senza indicare il campo (come quelle esistenti) resta false
insert into public.macro_areas (name) values ('t_macro');
select is((select is_professional from public.macro_areas where name = 't_macro'), false, 'macro-area senza indicazione: false');

select lives_ok($$update public.macro_areas set is_professional = true where name = 't_macro'$$, 'il campo è modificabile');
select is((select is_professional from public.macro_areas where name = 't_macro'), true, 'valore true salvato');
select throws_ok($$update public.macro_areas set is_professional = null where name = 't_macro'$$, '23502', null, 'valore nullo rifiutato');
select lives_ok($$insert into public.macro_areas (name, is_professional) values ('t_macro_pro', true)$$, 'inserimento con is_professional true accettato');

select * from finish();
rollback;
