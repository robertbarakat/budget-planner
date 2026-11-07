-- BP-19: row level security a utente unico (specifica sez. 2).
-- Il signup è disattivato (docs/auth.md): l'unico utente autenticato è il proprietario.
-- Il ruolo anon non ha alcun accesso (privilegi revocati + nessuna policy).
-- Ogni nuova tabella deve aggiungersi a questo schema (RLS + policy) nella propria migrazione.

do $$
declare t text;
begin
  foreach t in array array[
    'macro_aree', 'voci_budget', 'categorie',
    'conti', 'saldi_iniziali',
    'movimenti', 'righe_budget',
    'ricorrenze', 'scadenze_ricorrenza',
    'mesi_chiusi'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null)',
      t || '_proprietario', t
    );
  end loop;
end $$;
