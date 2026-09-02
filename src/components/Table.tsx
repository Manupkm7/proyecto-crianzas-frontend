import type { ReactNode } from 'react'
import { Spinner } from './Spinner'
import styles from './css/Table.module.css'

type Align = 'left' | 'right' | 'center'

export interface Column<T> {
  key: string
  header: ReactNode
  align?: Align
  render: (row: T) => ReactNode
  width?: string
}

export interface TablePagination {
  page: number
  lastPage: number
  onPageChange: (page: number) => void
  loading?: boolean
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  rowKey: (row: T) => string
  empty?: ReactNode
  pagination?: TablePagination
  /** Mientras carga y todavía no hay datos, muestra un spinner en vez del estado vacío. */
  loading?: boolean
}

const alignClass: Record<Align, string> = {
  left: '',
  right: styles.alignRight,
  center: styles.alignCenter,
}

export function Table<T>({ columns, data, rowKey, empty, pagination, loading }: TableProps<T>) {
  return (
    <div className={styles.wrap}>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={alignClass[col.align ?? 'left']}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className={styles.empty}>
                  <div className={styles.loadingRow}>
                    <Spinner size={22} />
                    <span>Cargando…</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className={styles.empty}>
                  {empty}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={rowKey(row)}>
                  {columns.map((col) => (
                    <td key={col.key} className={alignClass[col.align ?? 'left']}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className={styles.paginationBar}>
          <button
            className={styles.pageBtn}
            onClick={() => pagination.onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1 || pagination.loading}
          >
            ← Anterior
          </button>
          <span className={styles.pageInfo}>
            Página {pagination.page} de {pagination.lastPage}
          </span>
          <button
            className={styles.pageBtn}
            onClick={() => pagination.onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.lastPage || pagination.loading}
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  )
}
