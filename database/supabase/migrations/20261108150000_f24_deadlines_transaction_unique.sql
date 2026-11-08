-- BP-113: un movimento (il versamento reale) non può essere collegato a due scadenze F24.
create unique index f24_deadlines_transaction_key on public.f24_deadlines (transaction_id) where transaction_id is not null;
drop index public.f24_deadlines_transaction_idx;
