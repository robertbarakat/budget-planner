-- BP-110: regole di acconti e saldo per anno, dentro tax_parameters (decisione dell'autore, 2026-11-08).
-- Date: primo acconto, secondo acconto, saldo (uguali per imposta sostitutiva e INPS).
-- Percentuali: due acconti per ciascuna imposta, in punti percentuali (40 = 40%) sulla base dell'acconto.
-- Tutte facoltative (null = non ancora inserite): nessun valore nella migrazione, arrivano dall'app.

alter table public.tax_parameters
  add column first_advance_due_date date,
  add column second_advance_due_date date,
  add column balance_due_date date,
  add column substitute_tax_first_advance_percent numeric(5,2),
  add column substitute_tax_second_advance_percent numeric(5,2),
  add column inps_first_advance_percent numeric(5,2),
  add column inps_second_advance_percent numeric(5,2),
  add constraint tax_parameters_advance_percents_check check (
    coalesce(substitute_tax_first_advance_percent, 0) between 0 and 100
    and coalesce(substitute_tax_second_advance_percent, 0) between 0 and 100
    and coalesce(inps_first_advance_percent, 0) between 0 and 100
    and coalesce(inps_second_advance_percent, 0) between 0 and 100
  ),
  add constraint tax_parameters_advance_dates_check check (
    (first_advance_due_date is null or second_advance_due_date is null or first_advance_due_date < second_advance_due_date)
    and (second_advance_due_date is null or balance_due_date is null or second_advance_due_date < balance_due_date)
  );
