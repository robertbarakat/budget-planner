-- BP-111: l'importo di una scadenza F24 può essere modificato a mano; il ricalcolo non lo sovrascrive.
alter table public.f24_deadlines add column is_amount_manual boolean not null default false;
