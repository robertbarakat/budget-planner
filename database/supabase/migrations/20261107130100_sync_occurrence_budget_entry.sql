-- BP-86: la riga di budget collegata a una scadenza resta allineata alla scadenza (specifica sez. 3, "Ricorrenze").
--   - Modifica dell'importo di una scadenza: aggiorna solo la sua riga di budget (budget_entry_id).
--     Le altre scadenze e recurrences.base_amount non si toccano: il trigger scrive solo su budget_entries.
--   - Cancellazione di una scadenza: cancella solo la riga di budget collegata.
-- I trigger sono AFTER ... FOR EACH ROW e security invoker: valgono le policy RLS dell'utente che chiama;
-- un errore nel trigger annulla anche l'operazione sulla scadenza (stessa transazione).

create or replace function public.sync_occurrence_budget_entry_amount()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.budget_entry_id is not null then
    update public.budget_entries set amount = new.amount where id = new.budget_entry_id;
  end if;
  return null;
end;
$$;

create trigger recurrence_occurrences_sync_amount
  after update of amount on public.recurrence_occurrences
  for each row
  when (old.amount is distinct from new.amount)
  execute function public.sync_occurrence_budget_entry_amount();

create or replace function public.delete_occurrence_budget_entry()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.budget_entry_id is not null then
    delete from public.budget_entries where id = old.budget_entry_id;
  end if;
  return null;
end;
$$;

create trigger recurrence_occurrences_delete_entry
  after delete on public.recurrence_occurrences
  for each row
  execute function public.delete_occurrence_budget_entry();
