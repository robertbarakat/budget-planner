-- BP-85: applica una ricorrenza al budget (specifica sez. 3, "Ricorrenze").
-- Le date di scadenza le calcola l'app (shared/, generateRecurrenceDueDates): qui solo la scrittura.
--
-- Per ogni data passata che non ha ancora una scadenza crea:
--   - una riga di budget con source = 'recurrence' (voce della ricorrenza, anno e mese della data);
--   - una scadenza in recurrence_occurrences collegata a quella riga, con l'importo base.
-- L'importo si copia com'è da recurrences.base_amount (positivo: il segno lo deriva shared/ dal tipo della voce, BP-154).
--
-- Idempotente: le scadenze già presenti per quella data (anche con importo modificato a mano) non si toccano
-- e non generano nuove righe. Le date duplicate nell'elenco valgono una volta sola.
-- Atomicità: unica transazione; un errore a metà (es. anno fuori da 2000-2100) annulla tutto.
-- Le date devono rientrare nel periodo della ricorrenza (start_date .. end_date); una ricorrenza archiviata non genera.
-- security invoker: valgono le policy RLS dell'utente che chiama.
-- Restituisce il numero di scadenze create.

create or replace function public.apply_recurrence(
  p_recurrence_id bigint,
  p_due_dates     date[]
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_recurrence public.recurrences%rowtype;
  v_date       date;
  v_entry_id   bigint;
  v_created    integer := 0;
begin
  if p_due_dates is null then
    raise exception 'p_due_dates non può essere null' using errcode = '22023';
  end if;

  select * into v_recurrence from public.recurrences where id = p_recurrence_id;
  if not found then
    raise exception 'Ricorrenza % non trovata', p_recurrence_id using errcode = 'P0002';
  end if;
  if v_recurrence.archived then
    raise exception 'La ricorrenza % è archiviata', p_recurrence_id using errcode = '22023';
  end if;

  if exists (
    select 1 from unnest(p_due_dates) as d(due_date)
    where d.due_date is null
       or d.due_date < v_recurrence.start_date
       or (v_recurrence.end_date is not null and d.due_date > v_recurrence.end_date)
  ) then
    raise exception 'Una data è nulla o fuori dal periodo della ricorrenza' using errcode = '22023';
  end if;

  for v_date in
    select distinct d.due_date
    from unnest(p_due_dates) as d(due_date)
    where not exists (
      select 1 from public.recurrence_occurrences o
      where o.recurrence_id = p_recurrence_id and o.due_date = d.due_date
    )
    order by d.due_date
  loop
    insert into public.budget_entries (budget_item_id, year, month, amount, source)
    values (
      v_recurrence.budget_item_id,
      extract(year from v_date)::smallint,
      extract(month from v_date)::smallint,
      v_recurrence.base_amount,
      'recurrence'
    )
    returning id into v_entry_id;

    insert into public.recurrence_occurrences (recurrence_id, due_date, amount, budget_entry_id)
    values (p_recurrence_id, v_date, v_recurrence.base_amount, v_entry_id);

    v_created := v_created + 1;
  end loop;

  return v_created;
end;
$$;

-- Non chiamabile da anon (né da PUBLIC); solo utenti autenticati.
revoke all on function public.apply_recurrence(bigint, date[]) from public, anon;
grant execute on function public.apply_recurrence(bigint, date[]) to authenticated;
