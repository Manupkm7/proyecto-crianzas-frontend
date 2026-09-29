import { Badge } from './Badge'
import type { Child } from '../types'
import styles from './css/ChildServicesSummaryCells.module.css'

const MAX_ITEMS = 4

// Celdas de prestaciones para las tablas de niños (ver ChildResource::servicesSummary).
// services_summary ausente = el usuario no ve prestaciones de ese niño.

export function ServicesSummaryCell({ child }: { child: Child }) {
  const summary = child.services_summary
  if (!summary) return <span className={styles.muted}>—</span>
  if (summary.total === 0) return <span className={styles.muted}>Sin prestaciones</span>

  // Sin agrupar: la misma prestación de dos efectores se lista dos veces.
  const items = summary.latest_period_services
  const shown = items.slice(0, MAX_ITEMS)
  const rest = items.length - shown.length
  const describe = (s: (typeof items)[number]) =>
    `${s.has_alert ? '⚠ ' : ''}${s.name ?? 'Prestación'}${s.provider_name ? ` (${s.provider_name})` : ''}`

  return (
    <div className={styles.cell}>
      <div className={styles.row}>
        {summary.latest_period_code && (
          <Badge tone="primary" title={`Último período informado: ${summary.latest_period_label}`}>
            {summary.latest_period_code}
          </Badge>
        )}
        <span className={styles.count}>
          {summary.total} {summary.total === 1 ? 'prestación' : 'prestaciones'}
        </span>
        {summary.alerts_count > 0 && (
          <Badge tone="danger">
            ⚠ {summary.alerts_count} con alerta
          </Badge>
        )}
      </div>
      {shown.length > 0 && (
        <ul className={styles.list} title={items.map(describe).join('\n')}>
          {shown.map((s) => (
            <li key={s.id} className={s.has_alert ? styles.alertItem : undefined}>
              {describe(s)}
            </li>
          ))}
          {rest > 0 && <li>+{rest} más</li>}
        </ul>
      )}
    </div>
  )
}

export function ServiceProvidersCell({ child }: { child: Child }) {
  const summary = child.services_summary
  if (!summary || summary.providers.length === 0) {
    return <span className={styles.muted}>—</span>
  }

  return (
    <div className={styles.cell}>
      <div className={styles.row}>
        {summary.providers.map((p) => (
          <Badge key={p.id} tone={p.type === 'salud' ? 'health' : p.type === 'educacion' ? 'edu' : 'neutral'}>
            {p.name}
          </Badge>
        ))}
      </div>
      {summary.sectors.length > 0 && (
        <div className={styles.sub}>{summary.sectors.map((s) => s.label).join(' · ')}</div>
      )}
    </div>
  )
}
