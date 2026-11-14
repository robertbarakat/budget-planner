-- Spacchetta la voce "Imposte" in imposta sostitutiva, INPS e relativi interessi.
-- Importi presi dai 7 F24 della rateizzazione 2026 e dal 2° acconto (30/11).
-- Le transazioni già registrate vengono divise (stessa data, conto e commento):
-- la somma per F24 resta identica.

update budget_items set name = 'Imposta sostitutiva' where id = 87;
update categories set name = 'Imposta sostitutiva' where id = 70;

with base as (select macro_area_id, sort_order from budget_items where id = 87),
new_items as (
  insert into budget_items (macro_area_id, name, sort_order, kind)
  select b.macro_area_id, v.name, b.sort_order + v.n, 'expense'
  from base b, (values ('INPS', 1), ('Interessi imposta sostitutiva', 2), ('Interessi INPS', 3)) v(name, n)
  returning id, name
)
insert into categories (budget_item_id, name, sort_order)
select id, name, 0 from new_items;

create temp table tax_split (tx_id bigint, tax numeric, inps numeric, int_tax numeric, int_inps numeric);
insert into tax_split values
  (542, 1795.07, 2911.98, 0, 0),
  (541, 1795.07, 2911.98, 3.23, 5.24),
  (433, 1795.07, 2911.98, 9.15, 14.85),
  (336, 1795.07, 2911.98, 15.08, 24.46),
  (215, 1795.07, 2911.98, 21.00, 34.07);

insert into transactions (type, transaction_date, amount, account_id, destination_account_id, category_id, budget_item_id, comment, tag)
select t.type, t.transaction_date, x.amount, t.account_id, t.destination_account_id, c.id, c.budget_item_id, t.comment, t.tag
from tax_split s
join transactions t on t.id = s.tx_id
cross join lateral (values ('INPS', s.inps), ('Interessi imposta sostitutiva', s.int_tax), ('Interessi INPS', s.int_inps)) x(name, amount)
join budget_items bi on bi.name = x.name and bi.macro_area_id = (select macro_area_id from budget_items where id = 87)
join categories c on c.budget_item_id = bi.id
where x.amount > 0;

update transactions t set amount = s.tax from tax_split s where t.id = s.tx_id;

-- Previsionale mese per mese (luglio = rate 1 e 2; novembre = rata 6 + 2° acconto)
create temp table tax_budget (entry_id bigint, month int, tax numeric, inps numeric, int_tax numeric, int_inps numeric);
insert into tax_budget values
  (171, 7, 3590.14, 5823.96, 3.23, 5.24),
  (172, 8, 1795.07, 2911.98, 9.15, 14.85),
  (173, 9, 1795.07, 2911.98, 15.08, 24.46),
  (174, 10, 1795.07, 2911.98, 21.00, 34.07),
  (408, 11, 1570.71, 10967.00, 17.95, 31.20),
  (413, 12, 1196.74, 2080.00, 21.90, 38.06);

update budget_entries e set amount = b.tax from tax_budget b where e.id = b.entry_id;

insert into budget_entries (budget_item_id, year, month, amount, source)
select bi.id, 2026, b.month, x.amount, 'manual'
from tax_budget b
cross join lateral (values ('INPS', b.inps), ('Interessi imposta sostitutiva', b.int_tax), ('Interessi INPS', b.int_inps)) x(name, amount)
join budget_items bi on bi.name = x.name and bi.macro_area_id = (select macro_area_id from budget_items where id = 87);

-- Calendario F24: 2° acconto con gli importi reali
update f24_deadlines set amount = 374.00 where id = 16;
update f24_deadlines set amount = 8887.00 where id = 15;

drop table tax_split;
drop table tax_budget;
