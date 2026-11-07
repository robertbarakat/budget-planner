-- BP-87: rigenerazione delle scadenze future quando si modifica o si archivia una ricorrenza (specifica sez. 3).
--
-- SCELTA (proposta dal ticket, da confermare): le scadenze con importo modificato a mano si conservano sempre;
-- le altre scadenze future si ricalcolano. Le scadenze passate non cambiano mai.
-- "Futura" = due_date >= p_today. La data di riferimento si passa come argomento (niente now() nel database).
--
-- "Modificata a mano": colonna recurrence_occurrences.is_manually_modified (default false). La imposta un trigger
-- BEFORE UPDATE quando cambia l'importo; le funzioni di questa migrazione lo disattivano durante i propri
-- aggiornamenti (impostazione locale alla transazione app.recurrence_regenerating) per non marcare
-- come "a mano" gli importi che aggiornano loro.
-- Gli aggiornamenti dell'importo si propagano alle righe di budget con i trigger di BP-86.

alter table public.recurrence_occurrences
  add column is_manually_modified boolean not null default false;

create or replace function public.flag_manually_modified_occurrence()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.amount is distinct from old.amount
     and coalesce(current_setting('app.recurrence_regenerating', true), '') <> 'on' then
    new.is_manually_modified := true;
  end if;
  return new;
end;
$$;

create trigger recurrence_occurrences_flag_modified
  before update of amount on public.recurrence_occurrences
  for each row
  execute function public.flag_manually_modified_occurrence();

-- Date nuove calcolate dall'app (shared/, generateRecurrenceDueDates) dopo aver aggiornato la ricorrenza
-- (data di fine, periodicità, importo base). In una sola transazione:
--   1. elimina le scadenze future non modificate che non sono più tra le date (e le righe di budget collegate);
--   2. aggiorna all'importo base attuale le scadenze future non modificate che restano;
--   3. crea le scadenze mancanti (apply_recurrence).
-- Le date precedenti a p_today nell'elenco vengono ignorate. Le scadenze modificate a mano si conservano
-- anche se la loro data non è più nell'elenco.
-- Restituisce (cancellate, aggiornate, create).
create or replace function public.regenerate_recurrence_occurrences(
  p_recurrence_id bigint,
  p_due_dates     date[],
  p_today         date
)
returns table (deleted_count integer, updated_count integer, created_count integer)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_recurrence public.recurrences%rowtype;
  v_future     date[];
  v_deleted    integer;
  v_updated    integer;
  v_created    integer;
begin
  if p_due_dates is null or p_today is null then
    raise exception 'p_due_dates e p_today non possono essere null' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(p_due_dates) as d(due_date) where d.due_date is null) then
    raise exception 'L''elenco delle date contiene un valore nullo' using errcode = '22023';
  end if;

  select * into v_recurrence from public.recurrences where id = p_recurrence_id;
  if not found then
    raise exception 'Ricorrenza % non trovata', p_recurrence_id using errcode = 'P0002';
  end if;
  if v_recurrence.archived then
    raise exception 'La ricorrenza % è archiviata', p_recurrence_id using errcode = '22023';
  end if;

  select coalesce(array_agg(d.due_date), array[]::date[]) into v_future
  from unnest(p_due_dates) as d(due_date)
  where d.due_date >= p_today;

  delete from public.recurrence_occurrences o
  where o.recurrence_id = p_recurrence_id
    and o.due_date >= p_today
    and not o.is_manually_modified
    and not (o.due_date = any (v_future));
  get diagnostics v_deleted = row_count;

  perform set_config('app.recurrence_regenerating', 'on', true);
  update public.recurrence_occurrences o
  set amount = v_recurrence.base_amount
  where o.recurrence_id = p_recurrence_id
    and o.due_date >= p_today
    and not o.is_manually_modified
    and o.due_date = any (v_future)
    and o.amount is distinct from v_recurrence.base_amount;
  get diagnostics v_updated = row_count;
  perform set_config('app.recurrence_regenerating', 'off', true);

  v_created := public.apply_recurrence(p_recurrence_id, v_future);

  return query select v_deleted, v_updated, v_created;
end;
$$;

-- Archivia la ricorrenza ed elimina le scadenze future non modificate (con le loro righe di budget).
-- Le scadenze passate e quelle modificate a mano restano, con le relative righe. Restituisce quante ne ha eliminate.
create or replace function public.archive_recurrence(
  p_recurrence_id bigint,
  p_today         date
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  if p_today is null then
    raise exception 'p_today non può essere null' using errcode = '22023';
  end if;

  update public.recurrences set archived = true where id = p_recurrence_id;
  if not found then
    raise exception 'Ricorrenza % non trovata', p_recurrence_id using errcode = 'P0002';
  end if;

  delete from public.recurrence_occurrences o
  where o.recurrence_id = p_recurrence_id
    and o.due_date >= p_today
    and not o.is_manually_modified;
  get diagnostics v_deleted = row_count;

  return v_deleted;
end;
$$;

revoke all on function public.regenerate_recurrence_occurrences(bigint, date[], date) from public, anon;
grant execute on function public.regenerate_recurrence_occurrences(bigint, date[], date) to authenticated;
revoke all on function public.archive_recurrence(bigint, date) from public, anon;
grant execute on function public.archive_recurrence(bigint, date) to authenticated;
