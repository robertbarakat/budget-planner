-- BP-15: movimenti reali (specifica sez. 3).
-- Importo sempre positivo: il segno deriva dal tipo.
-- La voce di budget è salvata sul movimento: riclassificare una categoria non cambia lo storico.
-- Trasferimento: conto di destinazione diverso dall'origine, nessuna categoria né voce.
-- Spesa/entrata: categoria e voce obbligatorie, nessuna destinazione.

create type public.tipo_movimento as enum ('spesa', 'entrata', 'trasferimento');

create table public.movimenti (
  id                    bigint generated always as identity primary key,
  tipo                  public.tipo_movimento not null,
  data                  date          not null,
  importo               numeric(12,2) not null check (importo > 0),
  conto_id              bigint        not null references public.conti (id) on delete restrict,
  conto_destinazione_id bigint        references public.conti (id) on delete restrict,
  categoria_id          bigint        references public.categorie (id) on delete restrict,
  voce_budget_id        bigint        references public.voci_budget (id) on delete restrict,
  commento              text,
  tag                   text,
  created_at            timestamptz   not null default now(),
  constraint movimenti_coerenza_tipo check (
    case tipo
      when 'trasferimento' then
        conto_destinazione_id is not null
        and conto_destinazione_id <> conto_id
        and categoria_id is null
        and voce_budget_id is null
      else
        conto_destinazione_id is null
        and categoria_id is not null
        and voce_budget_id is not null
    end
  )
);
create index movimenti_data_idx on public.movimenti (data);
create index movimenti_conto_idx on public.movimenti (conto_id);
create index movimenti_conto_destinazione_idx on public.movimenti (conto_destinazione_id) where conto_destinazione_id is not null;
create index movimenti_categoria_idx on public.movimenti (categoria_id) where categoria_id is not null;
create index movimenti_voce_budget_idx on public.movimenti (voce_budget_id) where voce_budget_id is not null;
