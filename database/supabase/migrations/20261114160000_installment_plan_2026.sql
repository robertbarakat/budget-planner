-- Rateizzazione 2026: 7 rate (30/06 - 16/12) con saldo 2025 e primo acconto 2026 di imposta sostitutiva e INPS.
-- Importi e interessi dai 7 F24. Scadenze F24 create una per riga di rata (il 2° acconto del 30/11 esiste già).

with plan as (
  insert into installment_plans (description, total_amount, tax_type, reference_year)
  values ('Rateizzazione 2026 (saldo 2025 e 1° acconto 2026)', 30324.89, 'substitute_tax_balance', 2025)
  returning id
),
lines as (
  insert into installment_lines (plan_id, tax_type, reference_year, quota, last_number)
  select plan.id, v.t::tax_type, v.y, v.q, v.l
  from plan, (values
    ('substitute_tax_balance', 2025, 1196.71, null::int),
    ('substitute_tax_advance', 2026, 598.36, 5),
    ('inps_balance', 2025, 2080.00, null),
    ('inps_advance', 2026, 831.98, 5)
  ) v(t, y, q, l)
),
rows as (
  insert into installments (plan_id, number, due_date, tax_type, reference_year, principal, interest, amount)
  select plan.id, v.n, v.d::date, v.t::tax_type, v.y, v.p, v.i, v.p + v.i
  from plan, (values
    (1,'2026-06-30','substitute_tax_balance',2025,1196.71,0.00),
    (2,'2026-07-16','substitute_tax_balance',2025,1196.71,2.15),
    (3,'2026-08-20','substitute_tax_balance',2025,1196.71,6.10),
    (4,'2026-09-16','substitute_tax_balance',2025,1196.71,10.05),
    (5,'2026-10-16','substitute_tax_balance',2025,1196.71,14.00),
    (6,'2026-11-16','substitute_tax_balance',2025,1196.71,17.95),
    (7,'2026-12-16','substitute_tax_balance',2025,1196.74,21.90),
    (1,'2026-06-30','substitute_tax_advance',2026,598.36,0.00),
    (2,'2026-07-16','substitute_tax_advance',2026,598.36,1.08),
    (3,'2026-08-20','substitute_tax_advance',2026,598.36,3.05),
    (4,'2026-09-16','substitute_tax_advance',2026,598.36,5.03),
    (5,'2026-10-16','substitute_tax_advance',2026,598.36,7.00),
    (1,'2026-06-30','inps_balance',2025,2080.00,0.00),
    (2,'2026-07-16','inps_balance',2025,2080.00,3.74),
    (3,'2026-08-20','inps_balance',2025,2080.00,10.61),
    (4,'2026-09-16','inps_balance',2025,2080.00,17.47),
    (5,'2026-10-16','inps_balance',2025,2080.00,24.34),
    (6,'2026-11-16','inps_balance',2025,2080.00,31.20),
    (7,'2026-12-16','inps_balance',2025,2080.00,38.06),
    (1,'2026-06-30','inps_advance',2026,831.98,0.00),
    (2,'2026-07-16','inps_advance',2026,831.98,1.50),
    (3,'2026-08-20','inps_advance',2026,831.98,4.24),
    (4,'2026-09-16','inps_advance',2026,831.98,6.99),
    (5,'2026-10-16','inps_advance',2026,831.98,9.73)
  ) v(n, d, t, y, p, i)
  returning id, due_date, tax_type, reference_year, amount
)
insert into f24_deadlines (reference_year, tax_type, due_date, amount, installment_id)
select reference_year, tax_type, due_date, amount, id from rows;
