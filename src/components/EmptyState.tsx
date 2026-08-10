import type { ReactNode } from 'react'
import styles from './css/EmptyState.module.css'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      {icon && <span className={styles.iconWrap}>{icon}</span>}
      <p className={styles.title}>{title}</p>
      {description && <p className={styles.desc}>{description}</p>}
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  )
}
