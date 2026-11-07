-- BP-22: test pgTAP dei vincoli dello schema (esegui con `npx supabase test db`, da database/).
-- Tutto gira in una transazione annullata a fine file: nessun dato resta nel database.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

-- Esistenza delle tabelle e RLS attiva (almeno un test per tabella)
select has_table('public', t, 'esiste la tabella ' || t)
from unnest(array['macro_aree','voci_budget','categorie','conti','saldi_iniziali',
                  'movimenti','righe_budget','ricorrenze','scadenze_ricorrenza','mesi_chiusi']) as t;
select ok(c.relrowsecurity, 'RLS attiva su ' || c.relname)
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r';

-- Fixture
insert into public.macro_aree (nome) values ('t_macro');
insert into public.voci_budget (macro_area_id, nome) select id, 't_voce'  from public.macro_aree where nome = 't_macro';
insert into public.voci_budget (macro_area_id, nome) select id, 't_voce2' from public.macro_aree where nome = 't_macro';
insert into public.categorie (voce_budget_id, nome) select id, 't_cat' from public.voci_budget where nome = 't_voce';
insert into public.conti (nome) values ('t_a'), ('t_b');
insert into public.saldi_iniziali (conto_id, anno, importo) select id, 2026, 10 from public.conti where nome = 't_a';

-- Classificazione (BP-13)
select throws_ok($$insert into public.categorie (voce_budget_id, nome) select id, 'T_CAT' from public.voci_budget where nome = 't_voce'$$,
  '23505', null, 'nome categoria duplicato (non archiviata) rifiutato');
select throws_ok($$insert into public.voci_budget (macro_area_id, nome) select id, 'T_VOCE' from public.macro_aree where nome = 't_macro'$$,
  '23505', null, 'nome voce duplicato rifiutato');
select throws_ok($$insert into public.macro_aree (nome) values ('T_MACRO')$$,
  '23505', null, 'nome macro-area duplicato rifiutato');
select throws_ok($$delete from public.voci_budget where nome = 't_voce'$$,
  '23503', null, 'voce con categorie non eliminabile');
select throws_ok($$delete from public.macro_aree where nome = 't_macro'$$,
  '23503', null, 'macro-area con voci non eliminabile');
update public.categorie set archiviata = true where nome = 't_cat';
select is((select count(*)::int from public.categorie where nome = 't_cat' and archiviata), 1, 'categoria archiviata resta leggibile');
select lives_ok($$insert into public.categorie (voce_budget_id, nome) select id, 't_cat' from public.voci_budget where nome = 't_voce'$$,
  'il nome di una categoria archiviata si può riusare');

-- Conti e saldi (BP-14)
select throws_ok($$insert into public.conti (nome) values ('T_A')$$, '23505', null, 'nome conto duplicato rifiutato');
select throws_ok($$insert into public.saldi_iniziali (conto_id, anno, importo) select id, 2026, 1 from public.conti where nome = 't_a'$$,
  '23505', null, 'secondo saldo per stesso conto e anno rifiutato');
select throws_ok($$insert into public.saldi_iniziali (conto_id, anno, importo, origine) select id, 2027, 1, 'altro' from public.conti where nome = 't_a'$$,
  '22P02', null, 'origine saldo non prevista rifiutata');
select throws_ok($$delete from public.conti where nome = 't_a'$$, '23503', null, 'conto con saldi non eliminabile');

-- Movimenti (BP-15)
select throws_ok($$insert into public.movimenti (tipo, data, importo, conto_id, conto_destinazione_id)
  select 'trasferimento', current_date, 5, id, id from public.conti where nome = 't_a'$$,
  '23514', null, 'trasferimento con destinazione = origine rifiutato');
select throws_ok($$insert into public.movimenti (tipo, data, importo, conto_id)
  select 'spesa', current_date, 5, id from public.conti where nome = 't_a'$$,
  '23514', null, 'spesa senza categoria rifiutata');
select throws_ok($$insert into public.movimenti (tipo, data, importo, conto_id, categoria_id, voce_budget_id)
  select 'spesa', current_date, 0, a.id, c.id, v.id from public.conti a, public.categorie c, public.voci_budget v
  where a.nome = 't_a' and c.nome = 't_cat' and v.nome = 't_voce'$$,
  '23514', null, 'importo 0 rifiutato');
select throws_ok($$insert into public.movimenti (tipo, data, importo, conto_id, categoria_id, voce_budget_id)
  select 'spesa', current_date, -1, a.id, c.id, v.id from public.conti a, public.categorie c, public.voci_budget v
  where a.nome = 't_a' and c.nome = 't_cat' and v.nome = 't_voce'$$,
  '23514', null, 'importo negativo rifiutato');
select throws_ok($$insert into public.movimenti (tipo, data, importo, conto_id, conto_destinazione_id, categoria_id, voce_budget_id)
  select 'entrata', current_date, 5, a.id, b.id, c.id, v.id from public.conti a, public.conti b, public.categorie c, public.voci_budget v
  where a.nome = 't_a' and b.nome = 't_b' and c.nome = 't_cat' and v.nome = 't_voce'$$,
  '23514', null, 'entrata con conto di destinazione rifiutata');
select lives_ok($$insert into public.movimenti (tipo, data, importo, conto_id, conto_destinazione_id)
  select 'trasferimento', current_date, 5, a.id, b.id from public.conti a, public.conti b where a.nome = 't_a' and b.nome = 't_b'$$,
  'trasferimento valido accettato');
select lives_ok($$insert into public.movimenti (tipo, data, importo, conto_id, categoria_id, voce_budget_id)
  select 'spesa', current_date, 5, b.id, c.id, v.id from public.conti b, public.categorie c, public.voci_budget v
  where b.nome = 't_b' and c.nome = 't_cat' and v.nome = 't_voce'$$,
  'spesa valida accettata');
select throws_ok($$delete from public.conti where nome = 't_b'$$, '23503', null, 'conto con movimenti non eliminabile');
select throws_ok($$delete from public.categorie where nome = 't_cat'$$, '23503', null, 'categoria con movimenti non eliminabile');

-- Righe di budget (BP-16)
select throws_ok($$insert into public.righe_budget (voce_budget_id, anno, mese, importo) select id, 2026, 13, 1 from public.voci_budget where nome = 't_voce2'$$,
  '23514', null, 'mese 13 rifiutato');
select throws_ok($$insert into public.righe_budget (voce_budget_id, anno, mese, importo, origine) select id, 2026, 1, 1, 'altro' from public.voci_budget where nome = 't_voce2'$$,
  '22P02', null, 'origine riga budget non prevista rifiutata');
select lives_ok($$insert into public.righe_budget (voce_budget_id, anno, mese, importo) select id, 2031, 6, 100 from public.voci_budget where nome = 't_voce2'$$,
  'riga per un anno futuro senza righe precedenti accettata');
select throws_ok($$delete from public.voci_budget where nome = 't_voce2'$$, '23503', null, 'voce con righe di budget non eliminabile');

-- Ricorrenze (BP-17)
insert into public.ricorrenze (nome, voce_budget_id, conto_id, importo_base, periodicita, data_inizio)
  select 't_ric', v.id, a.id, 100, 'mensile', date '2026-01-01' from public.voci_budget v, public.conti a where v.nome = 't_voce2' and a.nome = 't_a';
insert into public.scadenze_ricorrenza (ricorrenza_id, data, importo)
  select id, d, 100 from public.ricorrenze, (values (date '2026-01-01'), (date '2026-02-01')) as s(d) where nome = 't_ric';
update public.scadenze_ricorrenza set importo = 150 where data = '2026-01-01';
select is((select importo from public.scadenze_ricorrenza where data = '2026-02-01'), 100.00::numeric, 'modificare una scadenza non cambia le altre');
select is((select importo_base from public.ricorrenze where nome = 't_ric'), 100.00::numeric, 'modificare una scadenza non cambia l''importo base');
select throws_ok($$insert into public.ricorrenze (nome, voce_budget_id, conto_id, importo_base, periodicita, data_inizio)
  select 't_x', v.id, a.id, 1, 'settimanale', date '2026-01-01' from public.voci_budget v, public.conti a where v.nome = 't_voce2' and a.nome = 't_a'$$,
  '22P02', null, 'periodicità non prevista rifiutata');
select throws_ok($$insert into public.ricorrenze (nome, voce_budget_id, conto_id, importo_base, periodicita, data_inizio, data_fine)
  select 't_y', v.id, a.id, 1, 'mensile', date '2026-02-01', date '2026-01-01' from public.voci_budget v, public.conti a where v.nome = 't_voce2' and a.nome = 't_a'$$,
  '23514', null, 'data fine precedente alla data inizio rifiutata');
select throws_ok($$insert into public.scadenze_ricorrenza (ricorrenza_id, data, importo) select id, date '2026-01-01', 1 from public.ricorrenze where nome = 't_ric'$$,
  '23505', null, 'scadenza duplicata per la stessa data rifiutata');
select throws_ok($$delete from public.ricorrenze where nome = 't_ric'$$, '23503', null, 'ricorrenza con scadenze non eliminabile');

-- Mesi chiusi (BP-18)
insert into public.mesi_chiusi (anno, mese) values (2026, 1);
select throws_ok($$insert into public.mesi_chiusi (anno, mese) values (2026, 1)$$, '23505', null, 'chiudere due volte lo stesso mese rifiutato');
select throws_ok($$insert into public.mesi_chiusi (anno, mese) values (2026, 13)$$, '23514', null, 'mese 13 rifiutato');
select throws_ok($$insert into public.mesi_chiusi (anno, mese) values (2026, 0)$$, '23514', null, 'mese 0 rifiutato');

select * from finish();
rollback;
