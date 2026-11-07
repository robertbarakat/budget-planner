-- BP-22: test pgTAP di RLS e ruoli (BP-19). Esegui con `npx supabase test db`, da database/.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

-- anon: nessun accesso in lettura a nessuna tabella
set local role anon;
select throws_ok(format('select * from public.%I', t), '42501', null, 'anon non legge ' || t)
from unnest(array['macro_aree','voci_budget','categorie','conti','saldi_iniziali',
                  'movimenti','righe_budget','ricorrenze','scadenze_ricorrenza','mesi_chiusi']) as t;
-- anon: nessuna scrittura
select throws_ok($$insert into public.conti (nome) values ('x')$$, '42501', null, 'anon non scrive in conti');
select throws_ok($$insert into public.mesi_chiusi (anno, mese) values (2026, 1)$$, '42501', null, 'anon non scrive in mesi_chiusi');
reset role;

-- authenticated: lettura e scrittura funzionano
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$insert into public.conti (nome) values ('rls_test')$$, 'authenticated inserisce');
select is((select count(*)::int from public.conti where nome = 'rls_test'), 1, 'authenticated legge');
select lives_ok($$update public.conti set ordine = 7 where nome = 'rls_test'$$, 'authenticated aggiorna');
select lives_ok($$delete from public.conti where nome = 'rls_test'$$, 'authenticated elimina');
reset role;

select * from finish();
rollback;
