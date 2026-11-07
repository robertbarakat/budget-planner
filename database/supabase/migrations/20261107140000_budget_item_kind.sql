-- BP-154: tipo entrata/spesa sulle voci di budget; importi di budget sempre positivi.
--
-- Prima il database non sapeva se una voce fosse di entrata o di spesa e le funzioni di shared/ avevano
-- assunto importi di budget già con segno. Ora la voce ha un tipo e gli importi si digitano e si salvano
-- sempre positivi, come i movimenti: il segno (entrata +, spesa -) lo applica shared/ in base al tipo.
--
-- `kind` è obbligatorio e senza default: lo sceglie l'utente quando crea la voce. La colonna NOT NULL
-- si aggiunge su una tabella vuota (nessun dato reale prima dell'import storico); su una tabella con
-- righe servirebbe prima un valore di partenza.
-- Gli importi di ricorrenze e scadenze (copiati nelle righe di budget) seguono la stessa regola.

create type public.budget_item_kind as enum ('income', 'expense');

alter table public.budget_items add column kind public.budget_item_kind not null;

alter table public.budget_entries
  add constraint budget_entries_amount_check check (amount >= 0);
alter table public.recurrences
  add constraint recurrences_base_amount_check check (base_amount >= 0);
alter table public.recurrence_occurrences
  add constraint recurrence_occurrences_amount_check check (amount >= 0);
