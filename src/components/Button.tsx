import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './css/Button.module.css'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerSoft'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  iconOnly?: boolean
  children?: ReactNode
}

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ')

export function Button({
  variant = 'primary',
  size = 'md',
  iconOnly = false,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cx(
        styles.btn,
        styles[variant],
        size !== 'md' && styles[size],
        iconOnly && styles.iconOnly,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
