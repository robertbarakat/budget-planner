-- Sezione fiscale: ruolo fiscale delle voci di budget, percentuali degli acconti per anno, parametri 2025.
create type public.tax_role as enum ('substitute_tax', 'inps', 'substitute_tax_interest', 'inps_interest');

alter table public.budget_items add column tax_role public.tax_role;
create unique index budget_items_tax_role_key on public.budget_items (tax_role) where tax_role is not null;

update public.budget_items set tax_role = case name
  when 'Imposta sostitutiva' then 'substitute_tax'::public.tax_role
  when 'INPS' then 'inps'::public.tax_role
  when 'Interessi imposta sostitutiva' then 'substitute_tax_interest'::public.tax_role
  when 'Interessi INPS' then 'inps_interest'::public.tax_role
end
where macro_area_id = (select macro_area_id from public.budget_items where id = 87)
  and name in ('Imposta sostitutiva', 'INPS', 'Interessi imposta sostitutiva', 'Interessi INPS');

alter table public.tax_parameters
  add column first_advance_percent numeric(5,2) not null default 50 check (first_advance_percent between 0 and 100),
  add column second_advance_percent numeric(5,2) not null default 50 check (second_advance_percent between 0 and 100);

-- 2025: primo anno di attività (nessun acconto); serve al metodo storico del 2026.
insert into public.tax_parameters (year, profitability_coefficient, inps_rate, substitute_tax_rate, activity_start_year, first_advance_due_date, second_advance_due_date, first_advance_method, second_advance_method)
values (2025, 67, 26.07, 15, 2025, '2025-06-30', '2025-11-30', 'historic', 'forecast')
on conflict do nothing;

-- Secondo acconto 2026 reale: non lo sovrascrive "Genera dal calcolo".
update public.f24_deadlines set is_amount_manual = true where id in (15, 16);

-- Righe del budget imposte 2026: diventano "tax", così "Applica al budget" le gestisce senza doppioni.
update public.budget_entries set source = 'tax'
where year = 2026 and budget_item_id in (select id from public.budget_items where tax_role is not null);
