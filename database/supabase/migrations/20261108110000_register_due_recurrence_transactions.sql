-- BP-92: registrazione automatica del movimento reale alla scadenza di una ricorrenza.
--
-- Ogni scadenza (recurrence_occurrences) ricorda il movimento creato (transaction_id) e quando (registered_at).
-- registered_at serve anche a non ricreare il movimento se l'utente lo cancella (transaction_id torna null).
--
-- register_due_recurrence_transactions(p_today): per ogni scadenza con data <= p_today, non ancora registrata,
-- di una ricorrenza attiva, crea il movimento: importo della scadenza, conto e voce della ricorrenza, data della scadenza,
-- tipo entrata/spesa dalla voce, categoria = prima categoria non archiviata della voce, commento = nome della ricorrenza.
-- Le scadenze di voci senza categorie attive si saltano (il movimento richiede la categoria). Recupera i giorni saltati.
-- Idempotente. Restituisce quanti movimenti ha creato. Pianificata ogni giorno con pg_cron.

alter table public.recurrence_occurrences
  add column transaction_id bigint references public.transactions (id) on delete set null,
  add column registered_at timestamptz;

create index recurrence_occurrences_unregistered_idx
  on public.recurrence_occurrences (due_date)
  where registered_at is null;

create or replace function public.register_due_recurrence_transactions(p_today date)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_row         record;
  v_transaction bigint;
  v_count       integer := 0;
begin
  if p_today is null then
    raise exception 'p_today non può essere null' using errcode = '22023';
  end if;

  for v_row in
    select o.id as occurrence_id, o.amount, o.due_date, r.name, r.account_id, r.budget_item_id, b.kind,
           (select c.id from public.categories c
             where c.budget_item_id = r.budget_item_id and not c.archived
             order by c.sort_order, c.id limit 1) as category_id
      from public.recurrence_occurrences o
      join public.recurrences r on r.id = o.recurrence_id
      join public.budget_items b on b.id = r.budget_item_id
     where o.registered_at is null
       and o.due_date <= p_today
       and not r.archived
     order by o.due_date, o.id
       for update of o skip locked
  loop
    continue when v_row.category_id is null;
    insert into public.transactions (type, amount, transaction_date, account_id, category_id, budget_item_id, comment)
    values ((case v_row.kind when 'income' then 'income' else 'expense' end)::public.transaction_type,
            v_row.amount, v_row.due_date, v_row.account_id, v_row.category_id, v_row.budget_item_id, v_row.name)
    returning id into v_transaction;
    update public.recurrence_occurrences
       set transaction_id = v_transaction, registered_at = now()
     where id = v_row.occurrence_id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke execute on function public.register_due_recurrence_transactions(date) from public, anon;

create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'register-due-recurrence-transactions',
  '5 0 * * *',
  $cron$select public.register_due_recurrence_transactions(current_date)$cron$
);
