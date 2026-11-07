-- BP-60: sostituzione delle righe di budget del driver ricavi su un intervallo di mesi (specifica sez. 3 e 6).
-- Rigenerare il driver non deve toccare le righe con altra origine (manual, recurrence, tax).
-- L'incasso di un anno può derivare da lavoro dell'anno prima: si sostituisce per intervallo di mesi
-- (anno/mese di inizio e fine inclusi), non per anno.
--
-- Atomicità: la funzione è un'unica transazione. Se l'inserimento fallisce dopo la cancellazione
-- (es. voce inesistente), l'intero statement viene annullato e i dati restano com'erano.
-- Le righe passate devono cadere nell'intervallo: altrimenti si creerebbero righe che una
-- rigenerazione successiva dello stesso intervallo non sostituirebbe (doppioni).
-- La funzione è security invoker: valgono le policy RLS dell'utente che la chiama.
-- Il calcolo degli importi sta in shared/ (computeExpectedCollections): qui solo la scrittura.
--
-- p_entries: array JSON di oggetti {"budget_item_id": 1, "year": 2026, "month": 6, "amount": 1234.50}.

create or replace function public.replace_revenue_driver_entries(
  p_from_year  integer,
  p_from_month integer,
  p_to_year    integer,
  p_to_month   integer,
  p_entries    jsonb
)
returns table (deleted_count integer, inserted_count integer)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_from     integer;
  v_to       integer;
  v_deleted  integer;
  v_inserted integer;
begin
  if p_from_month not between 1 and 12 or p_to_month not between 1 and 12 then
    raise exception 'Mese fuori da 1-12' using errcode = '22023';
  end if;
  v_from := p_from_year * 12 + p_from_month;
  v_to   := p_to_year * 12 + p_to_month;
  if v_from > v_to then
    raise exception 'Intervallo non valido: l''inizio è dopo la fine' using errcode = '22023';
  end if;
  if p_entries is null or jsonb_typeof(p_entries) <> 'array' then
    raise exception 'p_entries deve essere un array JSON' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_entries) as e(budget_item_id bigint, year integer, month integer, amount numeric)
    where e.year * 12 + e.month not between v_from and v_to
       or e.year is null or e.month is null
  ) then
    raise exception 'Una riga cade fuori dall''intervallo da sostituire' using errcode = '22023';
  end if;

  delete from public.budget_entries b
  where b.source = 'revenue_driver'
    and b.year * 12 + b.month between v_from and v_to;
  get diagnostics v_deleted = row_count;

  insert into public.budget_entries (budget_item_id, year, month, amount, source)
  select e.budget_item_id, e.year, e.month, e.amount, 'revenue_driver'
  from jsonb_to_recordset(p_entries) as e(budget_item_id bigint, year integer, month integer, amount numeric);
  get diagnostics v_inserted = row_count;

  return query select v_deleted, v_inserted;
end;
$$;

-- Non chiamabile da anon (né da PUBLIC); solo utenti autenticati.
revoke all on function public.replace_revenue_driver_entries(integer, integer, integer, integer, jsonb) from public, anon;
grant execute on function public.replace_revenue_driver_entries(integer, integer, integer, integer, jsonb) to authenticated;
