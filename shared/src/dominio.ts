// Alias di dominio sui tipi generati dal database (database.types.ts, non scriverlo a mano).
// Si rigenerano con `npm run gen:types` (vedi README).
import type { Enums, Tables, TablesInsert, TablesUpdate } from './database.types.ts'

export type MacroArea = Tables<'macro_aree'>
export type VoceBudget = Tables<'voci_budget'>
export type Categoria = Tables<'categorie'>
export type Conto = Tables<'conti'>
export type SaldoIniziale = Tables<'saldi_iniziali'>
export type Movimento = Tables<'movimenti'>
export type RigaBudget = Tables<'righe_budget'>
export type Ricorrenza = Tables<'ricorrenze'>
export type ScadenzaRicorrenza = Tables<'scadenze_ricorrenza'>
export type MeseChiuso = Tables<'mesi_chiusi'>

export type NuovoMovimento = TablesInsert<'movimenti'>
export type ModificaMovimento = TablesUpdate<'movimenti'>
export type NuovaRigaBudget = TablesInsert<'righe_budget'>

export type TipoMovimento = Enums<'tipo_movimento'>
export type OrigineRigaBudget = Enums<'origine_riga_budget'>
export type OrigineSaldo = Enums<'origine_saldo'>
export type Periodicita = Enums<'periodicita'>
