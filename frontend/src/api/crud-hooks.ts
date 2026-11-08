import { useMutation, useQuery, useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query'
import type { ArchivableService, ArchivableTable, BaseService, InsertOf, ListOptions, RowOf, TableName, UpdateOf } from './base-service.ts'

export interface CrudHooksConfig<T extends TableName> {
  service: BaseService<T>
  /** Radice di cache della tabella, da `queryKeys`. */
  key: QueryKey
  /** Radici da invalidare dopo ogni scrittura: la propria e quelle delle aree che leggono gli stessi dati. */
  invalidate: readonly QueryKey[]
}

/** Invalida tutte le query che iniziano con una delle radici indicate. */
export function invalidateAll(queryClient: QueryClient, roots: readonly QueryKey[]): Promise<void[]> {
  return Promise.all(roots.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
}

/**
 * Hook React Query standard di una tabella: lettura (con stato di caricamento, errore e cache) e
 * scritture che invalidano la cache. Le aree li riesportano con nomi espliciti (`useMacroAreas`...).
 */
export function createCrudHooks<T extends TableName>({ service, key, invalidate }: CrudHooksConfig<T>) {
  return {
    useList(options?: ListOptions<T>) {
      return useQuery({
        queryKey: [...key, 'list', options ?? {}],
        queryFn: (): Promise<RowOf<T>[]> => service.list(options),
      })
    },

    useById(id: number | null) {
      return useQuery({
        queryKey: [...key, 'detail', id],
        queryFn: (): Promise<RowOf<T>> => service.getById(id as number),
        enabled: id !== null,
      })
    },

    useCreate() {
      const queryClient = useQueryClient()
      return useMutation({
        mutationFn: (values: InsertOf<T>): Promise<RowOf<T>> => service.create(values),
        onSuccess: () => invalidateAll(queryClient, invalidate),
      })
    },

    useUpdate() {
      const queryClient = useQueryClient()
      return useMutation({
        mutationFn: ({ id, values }: { id: number; values: UpdateOf<T> }): Promise<RowOf<T>> =>
          service.update(id, values),
        onSuccess: () => invalidateAll(queryClient, invalidate),
      })
    },

    useRemove() {
      const queryClient = useQueryClient()
      return useMutation({
        mutationFn: (id: number): Promise<void> => service.remove(id),
        onSuccess: () => invalidateAll(queryClient, invalidate),
      })
    },
  }
}

/** Come `createCrudHooks`, più archivia/ripristina e riordino per le anagrafiche (`archived` e `sort_order`). */
export function createArchivableHooks<T extends ArchivableTable>(
  config: CrudHooksConfig<T> & { service: ArchivableService<T> },
) {
  const { service, invalidate } = config
  return {
    ...createCrudHooks(config),

    useSetArchived() {
      const queryClient = useQueryClient()
      return useMutation({
        mutationFn: ({ id, archived }: { id: number; archived: boolean }) =>
          archived ? service.archive(id) : service.unarchive(id),
        onSuccess: () => invalidateAll(queryClient, invalidate),
      })
    },

    useReorder() {
      const queryClient = useQueryClient()
      return useMutation({
        mutationFn: (args: { orderedIds: number[]; currentOrder?: Record<number, number> }) =>
          service.reorderAll(args.orderedIds, args.currentOrder),
        // Riordino anche dopo un fallimento parziale: la lista deve riflettere il server.
        onSettled: () => invalidateAll(queryClient, invalidate),
      })
    },
  }
}
