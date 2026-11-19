-- Import storico per intervallo di date: la funzione (BP-124) non pretende più la tabella vuota ma l'intervallo
-- [prima data, ultima data] dei movimenti passati senza movimenti già presenti. Serve a importare un anno precedente
-- (es. 2025) quando il 2026 c'è già. Resto invariato: un'unica transazione, errore su una riga = nessun inserimento.
-- Errore 55000: nell'intervallo ci sono già movimenti.

create or replace function public.import_transactions(p_transactions jsonb)
returns table (inserted_count integer, expense_total numeric, income_total numeric, transfer_total numeric)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item        jsonb;
  v_pos         integer := 0;
  v_type        public.transaction_type;
  v_amount      numeric;
  v_date        date;
  v_account_id  bigint;
  v_dest_id     bigint;
  v_category_id bigint;
  v_item_id     bigint;
  v_inserted    integer := 0;
  v_expense     numeric := 0;
  v_income      numeric := 0;
  v_transfer    numeric := 0;
  v_min_date    date;
  v_max_date    date;
begin
  if p_transactions is null or jsonb_typeof(p_transactions) <> 'array' then
    raise exception 'p_transactions deve essere un array JSON' using errcode = '22023';
  end if;

  -- Impedisce due import in parallelo e rende il controllo "vuota" affidabile.
  lock table public.transactions in share row exclusive mode;
  select min((e ->> 'transaction_date')::date), max((e ->> 'transaction_date')::date)
    into v_min_date, v_max_date from jsonb_array_elements(p_transactions) e;
  if v_min_date is not null and exists (
    select 1 from public.transactions where transaction_date between v_min_date and v_max_date
  ) then
    raise exception 'La tabella transactions contiene già movimenti tra % e %: l''import richiede l''intervallo vuoto', v_min_date, v_max_date using errcode = '55000';
  end if;

  for v_item in select * from jsonb_array_elements(p_transactions) loop
    v_pos := v_pos + 1;
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'Movimento %: non è un oggetto', v_pos using errcode = '22023';
    end if;

    begin
      v_type   := (v_item ->> 'type')::public.transaction_type;
      v_amount := (v_item ->> 'amount')::numeric;
      v_date   := (v_item ->> 'transaction_date')::date;
    exception when others then
      raise exception 'Movimento %: tipo, importo o data non validi', v_pos using errcode = '22023';
    end;
    if v_type is null or v_amount is null or v_date is null or v_amount <= 0 then
      raise exception 'Movimento %: tipo, importo (> 0) e data sono obbligatori', v_pos using errcode = '22023';
    end if;

    select a.id into v_account_id from public.accounts a
      where not a.archived and lower(btrim(a.name)) = lower(btrim(v_item ->> 'account'));
    if v_account_id is null then
      raise exception 'Movimento %: conto inesistente', v_pos using errcode = '23503';
    end if;

    v_dest_id := null; v_category_id := null; v_item_id := null;
    if v_type = 'transfer' then
      select a.id into v_dest_id from public.accounts a
        where not a.archived and lower(btrim(a.name)) = lower(btrim(v_item ->> 'destination_account'));
      if v_dest_id is null then
        raise exception 'Movimento %: conto di destinazione inesistente', v_pos using errcode = '23503';
      end if;
    else
      select c.id, b.id into v_category_id, v_item_id
        from public.categories c
        join public.budget_items b on b.id = c.budget_item_id
        where not c.archived and not b.archived
          and lower(btrim(c.name)) = lower(btrim(v_item ->> 'category'))
          and lower(btrim(b.name)) = lower(btrim(v_item ->> 'budget_item'));
      if v_category_id is null then
        raise exception 'Movimento %: categoria o voce inesistenti, o categoria non appartenente alla voce', v_pos using errcode = '23503';
      end if;
    end if;

    -- I vincoli della tabella (importo > 0, coerenza del tipo, conti diversi) fanno il resto: un errore annulla tutto.
    insert into public.transactions
      (type, transaction_date, amount, account_id, destination_account_id, category_id, budget_item_id, comment, tag)
    values
      (v_type, v_date, v_amount, v_account_id, v_dest_id, v_category_id, v_item_id,
       nullif(btrim(v_item ->> 'comment'), ''), nullif(btrim(v_item ->> 'tag'), ''));

    v_inserted := v_inserted + 1;
    if v_type = 'expense' then v_expense := v_expense + v_amount;
    elsif v_type = 'income' then v_income := v_income + v_amount;
    else v_transfer := v_transfer + v_amount;
    end if;
  end loop;

  return query select v_inserted, v_expense, v_income, v_transfer;
end;
$$;


revoke all on function public.import_transactions(jsonb) from public, anon;
grant execute on function public.import_transactions(jsonb) to authenticated, service_role;
