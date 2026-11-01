# Convenzioni Jira

Sito: barakarob.atlassian.net. Progetto: BP (company-managed). Sostituisci `[CHIAVE]` qui sotto con la chiave reale.

## Tipi
- **Epic**: uno dei blocchi di lavoro (vedi elenco).
- **Task**: lavoro operativo, il tipo di default.
- **Bug**: difetto di qualcosa già consegnato.
Ogni Task appartiene a un Epic.

## Epic, in ordine
1. Fondamenta (repo, ambienti, Supabase, Vercel)
2. Database e dati
3. Frontend base e design tokens
4. Conti e movimenti
5. Previsione e driver ricavi
6. Viste (cronologica, per categoria, matrice web)
7. Ricorrenze
8. Modulo fiscale
9. Import storico
10. Export su Google Sheets
11. PWA, offline, test, deploy

## Ticket da non dimenticare
- Epic 4: "Gestione conti, categorie, voci di budget e macro-aree" (aggiungere, rinominare, riordinare, archiviare; vedi docs/specifica.md, sezione 3, "Anagrafiche modificabili dall'app"). Probabilmente da spezzare in più ticket, uno per anagrafica.
- Un ticket di decisione per ciascun punto aperto della sezione 10 della specifica, nell'epic a cui appartiene (offline -> epic 11; saldi per conto -> epic 4; ritardi d'incasso -> epic 5; acconti e deducibilità -> epic 8).

## Come scrivere un ticket
**Titolo**: verbo all'infinito + oggetto, massimo 80 caratteri. Es. "Creare tabella movimenti con vincoli".

**Descrizione**, con queste sezioni:
```
Contesto
Perché serve, con rimando a docs/specifica.md (sezione).

Cosa fare
Elenco puntato delle attività.

Criteri di accettazione
- [ ] condizione verificabile 1
- [ ] condizione verificabile 2

Fuori ambito
Cosa NON si fa in questo ticket (se utile).
```

**Dimensione**: massimo una giornata di lavoro. Se è più grande, spezzalo.

**Etichetta** (una sola): `frontend`, `backend` o `database`. Il lavoro in shared/ usa `backend`.

**Priorità**: Highest solo per ciò che blocca il resto; High / Medium / Low per il resto. Segui l'ordine degli epic.

**Dipendenze**: collega con "is blocked by" i ticket che devono finire prima.

**Criteri di accettazione**: sempre verificabili (es. "il test X passa", "la migrazione crea la tabella Y", "la schermata a 390px mostra Z"). Niente criteri vaghi.

## Dal ticket al codice
- Branch: `[CHIAVE]-12-descrizione-breve`.
- Commit: iniziano con la chiave, es. `[CHIAVE]-12: aggiunge tabella movimenti`.
- Prima di spostare un ticket in "Fatto": lint, test e build passano, e i criteri di accettazione sono verificati uno per uno.
- Le decisioni importanti si scrivono in un commento del ticket e, se cambiano la specifica, in docs/specifica.md.

## Per chi crea il backlog (sessione Claude)
- Un epic alla volta: mostra l'elenco dei ticket, aspetta il via, poi crea su Jira.
- Non creare doppioni: cerca prima i ticket esistenti dello stesso epic.
- I punti incerti della specifica (sezione "Decisioni aperte") diventano ticket di decisione, non ipotesi nascoste dentro altri ticket.
