-- BP-152: tutti gli identificatori del database in inglese (regola del progetto, CLAUDE.md).
-- Rename puro: nessun dato e nessun comportamento cambia. Tabelle, colonne, enum e valori, vincoli, indici,
-- policy RLS e sequenze. Le etichette per l'utente restano in italiano e vivono nei dati/nel frontend.

-- Tipi enumerati e relativi valori
alter type public.origine_riga_budget rename to budget_entry_source;
alter type public.origine_saldo rename to balance_source;
alter type public.periodicita rename to recurrence_frequency;
alter type public.tipo_movimento rename to transaction_type;
alter type public.transaction_type rename value 'spesa' to 'expense';
alter type public.transaction_type rename value 'entrata' to 'income';
alter type public.transaction_type rename value 'trasferimento' to 'transfer';
alter type public.budget_entry_source rename value 'manuale' to 'manual';
alter type public.budget_entry_source rename value 'driver_ricavi' to 'revenue_driver';
alter type public.budget_entry_source rename value 'ricorrenza' to 'recurrence';
alter type public.budget_entry_source rename value 'fiscale' to 'tax';
alter type public.balance_source rename value 'manuale' to 'manual';
alter type public.balance_source rename value 'riportato' to 'carried_over';
alter type public.recurrence_frequency rename value 'mensile' to 'monthly';
alter type public.recurrence_frequency rename value 'bimestrale' to 'bimonthly';
alter type public.recurrence_frequency rename value 'trimestrale' to 'quarterly';
alter type public.recurrence_frequency rename value 'semestrale' to 'semiannual';
alter type public.recurrence_frequency rename value 'annuale' to 'annual';

-- Tabelle
alter table public.categorie rename to categories;
alter table public.voci_budget rename to budget_items;
alter table public.macro_aree rename to macro_areas;
alter table public.conti rename to accounts;
alter table public.saldi_iniziali rename to opening_balances;
alter table public.movimenti rename to transactions;
alter table public.righe_budget rename to budget_entries;
alter table public.ricorrenze rename to recurrences;
alter table public.scadenze_ricorrenza rename to recurrence_occurrences;
alter table public.mesi_chiusi rename to closed_months;

-- Colonne
alter table public.macro_areas rename column nome to name;
alter table public.macro_areas rename column ordine to sort_order;
alter table public.macro_areas rename column archiviata to archived;
alter table public.budget_items rename column nome to name;
alter table public.budget_items rename column ordine to sort_order;
alter table public.budget_items rename column archiviata to archived;
alter table public.categories rename column voce_budget_id to budget_item_id;
alter table public.categories rename column nome to name;
alter table public.categories rename column ordine to sort_order;
alter table public.categories rename column archiviata to archived;
alter table public.accounts rename column nome to name;
alter table public.accounts rename column ordine to sort_order;
alter table public.accounts rename column archiviato to archived;
alter table public.opening_balances rename column conto_id to account_id;
alter table public.opening_balances rename column anno to year;
alter table public.opening_balances rename column importo to amount;
alter table public.opening_balances rename column origine to source;
alter table public.transactions rename column tipo to type;
alter table public.transactions rename column data to transaction_date;
alter table public.transactions rename column importo to amount;
alter table public.transactions rename column conto_id to account_id;
alter table public.transactions rename column conto_destinazione_id to destination_account_id;
alter table public.transactions rename column categoria_id to category_id;
alter table public.transactions rename column voce_budget_id to budget_item_id;
alter table public.transactions rename column commento to comment;
alter table public.budget_entries rename column voce_budget_id to budget_item_id;
alter table public.budget_entries rename column anno to year;
alter table public.budget_entries rename column mese to month;
alter table public.budget_entries rename column importo to amount;
alter table public.budget_entries rename column origine to source;
alter table public.recurrences rename column voce_budget_id to budget_item_id;
alter table public.recurrences rename column conto_id to account_id;
alter table public.recurrences rename column importo_base to base_amount;
alter table public.recurrences rename column periodicita to frequency;
alter table public.recurrences rename column data_inizio to start_date;
alter table public.recurrences rename column data_fine to end_date;
alter table public.recurrences rename column nome to name;
alter table public.recurrences rename column archiviata to archived;
alter table public.recurrence_occurrences rename column ricorrenza_id to recurrence_id;
alter table public.recurrence_occurrences rename column data to due_date;
alter table public.recurrence_occurrences rename column importo to amount;
alter table public.recurrence_occurrences rename column riga_budget_id to budget_entry_id;
alter table public.closed_months rename column anno to year;
alter table public.closed_months rename column mese to month;
alter table public.closed_months rename column chiuso_il to closed_at;

-- Vincoli (rinominare un vincolo primary key/unique rinomina anche il suo indice)
alter table public.categories rename constraint categorie_nome_check to categories_name_check;
alter table public.categories rename constraint categorie_pkey to categories_pkey;
alter table public.categories rename constraint categorie_voce_budget_id_fkey to categories_budget_item_id_fkey;
alter table public.accounts rename constraint conti_nome_check to accounts_name_check;
alter table public.accounts rename constraint conti_pkey to accounts_pkey;
alter table public.macro_areas rename constraint macro_aree_nome_check to macro_areas_name_check;
alter table public.macro_areas rename constraint macro_aree_pkey to macro_areas_pkey;
alter table public.closed_months rename constraint mesi_chiusi_anno_check to closed_months_year_check;
alter table public.closed_months rename constraint mesi_chiusi_anno_mese_key to closed_months_year_month_key;
alter table public.closed_months rename constraint mesi_chiusi_mese_check to closed_months_month_check;
alter table public.closed_months rename constraint mesi_chiusi_pkey to closed_months_pkey;
alter table public.transactions rename constraint movimenti_categoria_id_fkey to transactions_category_id_fkey;
alter table public.transactions rename constraint movimenti_coerenza_tipo to transactions_type_consistency;
alter table public.transactions rename constraint movimenti_conto_destinazione_id_fkey to transactions_destination_account_id_fkey;
alter table public.transactions rename constraint movimenti_conto_id_fkey to transactions_account_id_fkey;
alter table public.transactions rename constraint movimenti_importo_check to transactions_amount_check;
alter table public.transactions rename constraint movimenti_pkey to transactions_pkey;
alter table public.transactions rename constraint movimenti_voce_budget_id_fkey to transactions_budget_item_id_fkey;
alter table public.recurrences rename constraint ricorrenze_conto_id_fkey to recurrences_account_id_fkey;
alter table public.recurrences rename constraint ricorrenze_nome_check to recurrences_name_check;
alter table public.recurrences rename constraint ricorrenze_periodo_valido to recurrences_valid_period;
alter table public.recurrences rename constraint ricorrenze_pkey to recurrences_pkey;
alter table public.recurrences rename constraint ricorrenze_voce_budget_id_fkey to recurrences_budget_item_id_fkey;
alter table public.budget_entries rename constraint righe_budget_anno_check to budget_entries_year_check;
alter table public.budget_entries rename constraint righe_budget_mese_check to budget_entries_month_check;
alter table public.budget_entries rename constraint righe_budget_pkey to budget_entries_pkey;
alter table public.budget_entries rename constraint righe_budget_voce_budget_id_fkey to budget_entries_budget_item_id_fkey;
alter table public.opening_balances rename constraint saldi_iniziali_anno_check to opening_balances_year_check;
alter table public.opening_balances rename constraint saldi_iniziali_conto_anno_key to opening_balances_account_year_key;
alter table public.opening_balances rename constraint saldi_iniziali_conto_id_fkey to opening_balances_account_id_fkey;
alter table public.opening_balances rename constraint saldi_iniziali_pkey to opening_balances_pkey;
alter table public.recurrence_occurrences rename constraint scadenze_ricorrenza_data_key to recurrence_occurrences_due_date_key;
alter table public.recurrence_occurrences rename constraint scadenze_ricorrenza_pkey to recurrence_occurrences_pkey;
alter table public.recurrence_occurrences rename constraint scadenze_ricorrenza_ricorrenza_id_fkey to recurrence_occurrences_recurrence_id_fkey;
alter table public.recurrence_occurrences rename constraint scadenze_ricorrenza_riga_budget_id_fkey to recurrence_occurrences_budget_entry_id_fkey;
alter table public.budget_items rename constraint voci_budget_macro_area_id_fkey to budget_items_macro_area_id_fkey;
alter table public.budget_items rename constraint voci_budget_nome_check to budget_items_name_check;
alter table public.budget_items rename constraint voci_budget_pkey to budget_items_pkey;

-- Indici
alter index public.categorie_nome_attiva_key rename to categories_name_active_key;
alter index public.categorie_voce_budget_idx rename to categories_budget_item_idx;
alter index public.conti_nome_attivo_key rename to accounts_name_active_key;
alter index public.macro_aree_nome_attivo_key rename to macro_areas_name_active_key;
alter index public.movimenti_categoria_idx rename to transactions_category_idx;
alter index public.movimenti_conto_destinazione_idx rename to transactions_destination_account_idx;
alter index public.movimenti_conto_idx rename to transactions_account_idx;
alter index public.movimenti_data_idx rename to transactions_transaction_date_idx;
alter index public.movimenti_voce_budget_idx rename to transactions_budget_item_idx;
alter index public.ricorrenze_conto_idx rename to recurrences_account_idx;
alter index public.ricorrenze_voce_budget_idx rename to recurrences_budget_item_idx;
alter index public.righe_budget_periodo_voce_idx rename to budget_entries_period_item_idx;
alter index public.righe_budget_voce_idx rename to budget_entries_item_idx;
alter index public.scadenze_ricorrenza_riga_budget_idx rename to recurrence_occurrences_budget_entry_idx;
alter index public.voci_budget_macro_area_idx rename to budget_items_macro_area_idx;
alter index public.voci_budget_nome_attiva_key rename to budget_items_name_active_key;

-- Policy RLS
alter policy categorie_proprietario on public.categories rename to categories_owner;
alter policy voci_budget_proprietario on public.budget_items rename to budget_items_owner;
alter policy macro_aree_proprietario on public.macro_areas rename to macro_areas_owner;
alter policy conti_proprietario on public.accounts rename to accounts_owner;
alter policy saldi_iniziali_proprietario on public.opening_balances rename to opening_balances_owner;
alter policy movimenti_proprietario on public.transactions rename to transactions_owner;
alter policy righe_budget_proprietario on public.budget_entries rename to budget_entries_owner;
alter policy ricorrenze_proprietario on public.recurrences rename to recurrences_owner;
alter policy scadenze_ricorrenza_proprietario on public.recurrence_occurrences rename to recurrence_occurrences_owner;
alter policy mesi_chiusi_proprietario on public.closed_months rename to closed_months_owner;

-- Sequenze delle colonne identity
alter sequence public.categorie_id_seq rename to categories_id_seq;
alter sequence public.voci_budget_id_seq rename to budget_items_id_seq;
alter sequence public.macro_aree_id_seq rename to macro_areas_id_seq;
alter sequence public.conti_id_seq rename to accounts_id_seq;
alter sequence public.saldi_iniziali_id_seq rename to opening_balances_id_seq;
alter sequence public.movimenti_id_seq rename to transactions_id_seq;
alter sequence public.righe_budget_id_seq rename to budget_entries_id_seq;
alter sequence public.ricorrenze_id_seq rename to recurrences_id_seq;
alter sequence public.scadenze_ricorrenza_id_seq rename to recurrence_occurrences_id_seq;
alter sequence public.mesi_chiusi_id_seq rename to closed_months_id_seq;
