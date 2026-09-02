import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import styles from './css/Badge.module.css'

type Tone = 'neutral' | 'primary' | 'edu' | 'health' | 'success' | 'amber' | 'danger'

interface BadgeProps extends ComponentPropsWithoutRef<'span'> {
  tone?: Tone
  dot?: boolean
  children: ReactNode
}

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ')

export function Badge({ tone = 'neutral', dot = false, children, className, ...rest }: BadgeProps) {
  return (
    <span className={cx(styles.badge, styles[tone], className)} {...rest}>
      {dot && <span className={styles.dot} />}
      {children}
    </span>
  )
}
