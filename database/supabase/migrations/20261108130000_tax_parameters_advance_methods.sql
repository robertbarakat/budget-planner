-- BP-110 (correzione di 20261108120000): gli acconti non hanno percentuali, si calcolano con il metodo scelto per anno.
-- Date: primo acconto (vale anche per il saldo dell'anno prima) e secondo acconto. Metodo per acconto: storico o previsionale.
alter table public.tax_parameters
  drop constraint tax_parameters_advance_percents_check,
  drop constraint tax_parameters_advance_dates_check,
  drop column balance_due_date,
  drop column substitute_tax_first_advance_percent,
  drop column substitute_tax_second_advance_percent,
  drop column inps_first_advance_percent,
  drop column inps_second_advance_percent;

create type public.advance_method as enum ('historic', 'forecast');

alter table public.tax_parameters
  add column first_advance_method public.advance_method not null default 'historic',
  add column second_advance_method public.advance_method not null default 'forecast',
  add constraint tax_parameters_advance_dates_check check (
    first_advance_due_date is null or second_advance_due_date is null or first_advance_due_date < second_advance_due_date
  );
