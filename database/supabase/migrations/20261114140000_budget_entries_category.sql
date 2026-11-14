-- Budget per categoria: una riga può riguardare una categoria della voce (luce, acqua…). Senza categoria = riga di voce, come prima.
alter table public.budget_entries
  add column category_id bigint references public.categories (id) on delete restrict;
create index budget_entries_category_idx on public.budget_entries (category_id);
