-- BP-46: riclassificazione dello storico di una categoria (specifica sez. 3, "Anagrafiche modificabili dall'app").
-- Spostare una categoria vale solo per i movimenti futuri; se l'utente sceglie di riclassificare anche lo storico,
-- questa funzione aggiorna transactions.budget_item_id dei movimenti di quella categoria in un'unica transazione.
--
-- Non modifica categories.budget_item_id: lo spostamento della categoria resta una scrittura a parte (BP-47 le chiama in sequenza).
-- Non impone che la voce di destinazione sia quella della categoria: la coerenza la sceglie l'app.
-- Intervallo di date opzionale (estremi inclusi): p_from_date / p_to_date null = nessun limite da quel lato.
-- Restituisce il numero di movimenti aggiornati. Tocca solo spese ed entrate (i trasferimenti non hanno categoria),
-- quindi transactions_type_consistency resta soddisfatto.
-- security invoker: valgono le policy RLS dell'utente che la chiama (categoria o voce non visibili = inesistenti).

create or replace function public.reclassify_category_history(
  p_category_id    bigint,
  p_budget_item_id bigint,
  p_from_date      date default null,
  p_to_date        date default null
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_updated integer;
begin
  if p_category_id is null or p_budget_item_id is null then
    raise exception 'Categoria e voce di budget sono obbligatorie' using errcode = '22023';
  end if;
  if p_from_date is not null and p_to_date is not null and p_from_date > p_to_date then
    raise exception 'Intervallo non valido: la data iniziale è dopo quella finale' using errcode = '22023';
  end if;
  if not exists (select 1 from public.categories c where c.id = p_category_id) then
    raise exception 'Categoria inesistente: %', p_category_id using errcode = '23503';
  end if;
  if not exists (select 1 from public.budget_items b where b.id = p_budget_item_id) then
    raise exception 'Voce di budget inesistente: %', p_budget_item_id using errcode = '23503';
  end if;

  update public.transactions t
  set budget_item_id = p_budget_item_id
  where t.category_id = p_category_id
    and t.budget_item_id is distinct from p_budget_item_id
    and (p_from_date is null or t.transaction_date >= p_from_date)
    and (p_to_date   is null or t.transaction_date <= p_to_date);
  get diagnostics v_updated = row_count;

  return v_updated;
end;
$$;

-- Non chiamabile da anon (né da PUBLIC); solo utenti autenticati.
revoke all on function public.reclassify_category_history(bigint, bigint, date, date) from public, anon;
grant execute on function public.reclassify_category_history(bigint, bigint, date, date) to authenticated;
