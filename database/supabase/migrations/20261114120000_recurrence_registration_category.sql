-- BP: la registrazione automatica delle scadenze sceglie la categoria con lo stesso nome della ricorrenza
-- (es. "Netflix" -> categoria Netflix); se non c'è, resta la prima categoria non archiviata della voce.
-- Prima usava sempre la prima categoria della voce: Netflix e Spotify finivano sotto "Now TV".
create or replace function public.register_due_recurrence_transactions(p_today date)
returns integer
language plpgsql
set search_path = ''
as $function$
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
             order by (lower(c.name) = lower(r.name)) desc, c.sort_order, c.id limit 1) as category_id
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
$function$;
