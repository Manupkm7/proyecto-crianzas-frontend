import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'
import styles from './css/Card.module.css'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  pad?: boolean
  accent?: string
  children: ReactNode
}

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ')

export function Card({ pad = true, accent, className, children, style, ...props }: CardProps) {
  return (
    <div
      className={cx(styles.card, pad && styles.pad, accent && styles.accentTop, className)}
      style={{ ...(accent ? ({ ['--_accent']: accent } as CSSProperties) : {}), ...style }}
      {...props}
    >
      {children}
    </div>
  )
}
