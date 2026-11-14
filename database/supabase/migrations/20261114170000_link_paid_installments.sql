-- Rate 1-5 della rateizzazione 2026: un movimento di capitale per ogni riga F24 (imposta saldo 2025, imposta
-- 1° acconto 2026, INPS saldo 2025, INPS 1° acconto 2026), collegato alla sua scadenza.
-- Gli interessi restano nei movimenti delle voci "Interessi". I totali per F24 non cambiano.
-- Rate 6, 7 e 2° acconto restano previsioni (nessun movimento collegato).

do $$
declare
  area bigint := (select macro_area_id from budget_items where id = 87);
  inps_item bigint := (select id from budget_items where name = 'INPS' and macro_area_id = (select macro_area_id from budget_items where id = 87));
  linked int;
begin
  create temp table rate_tx (n int, tax_tx bigint, inps_tx bigint) on commit drop;
  insert into rate_tx (n, tax_tx) values (1, 542), (2, 541), (3, 433), (4, 336), (5, 215);
  update rate_tx r set inps_tx = (
    select i.id from transactions i join transactions b on b.id = r.tax_tx
    where i.budget_item_id = inps_item and i.transaction_date = b.transaction_date and i.comment is not distinct from b.comment);
  if (select count(*) from rate_tx where inps_tx is not null) <> 5 then raise exception 'movimenti INPS non trovati'; end if;

  -- movimento dell'acconto (clone) accanto a quello del saldo
  insert into transactions (type, transaction_date, amount, account_id, destination_account_id, category_id, budget_item_id, comment, tag)
  select t.type, t.transaction_date, 598.36, t.account_id, t.destination_account_id, t.category_id, t.budget_item_id, t.comment, t.tag
  from transactions t join rate_tx r on r.tax_tx = t.id;
  insert into transactions (type, transaction_date, amount, account_id, destination_account_id, category_id, budget_item_id, comment, tag)
  select t.type, t.transaction_date, 831.98, t.account_id, t.destination_account_id, t.category_id, t.budget_item_id, t.comment, t.tag
  from transactions t join rate_tx r on r.inps_tx = t.id;

  update transactions set amount = 1196.71 where id in (select tax_tx from rate_tx);
  update transactions set amount = 2080.00 where id in (select inps_tx from rate_tx);

  with link as (
    select r.n, 'substitute_tax_balance'::tax_type tt, 2025 y, r.tax_tx tx from rate_tx r
    union all select r.n, 'inps_balance', 2025, r.inps_tx from rate_tx r
    union all select r.n, 'substitute_tax_advance', 2026, (select c.id from transactions c join transactions b on b.id = r.tax_tx
      where c.budget_item_id = b.budget_item_id and c.transaction_date = b.transaction_date and c.comment is not distinct from b.comment and c.amount = 598.36)
    from rate_tx r
    union all select r.n, 'inps_advance', 2026, (select c.id from transactions c join transactions b on b.id = r.inps_tx
      where c.budget_item_id = b.budget_item_id and c.transaction_date = b.transaction_date and c.comment is not distinct from b.comment and c.amount = 831.98)
    from rate_tx r
  )
  update f24_deadlines d set transaction_id = l.tx
  from installments i join link l on l.n = i.number and l.tt = i.tax_type and l.y = i.reference_year
  where d.installment_id = i.id and i.number <= 5;
  get diagnostics linked = row_count;
  if linked <> 20 then raise exception 'scadenze collegate: % invece di 20', linked; end if;
end $$;
