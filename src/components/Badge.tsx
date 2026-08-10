import type { ReactNode } from 'react'
import styles from './css/Badge.module.css'

type Tone = 'neutral' | 'primary' | 'edu' | 'health' | 'success' | 'amber' | 'danger'

interface BadgeProps {
  tone?: Tone
  dot?: boolean
  children: ReactNode
}

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ')

export function Badge({ tone = 'neutral', dot = false, children }: BadgeProps) {
  return (
    <span className={cx(styles.badge, styles[tone])}>
      {dot && <span className={styles.dot} />}
      {children}
    </span>
  )
}
