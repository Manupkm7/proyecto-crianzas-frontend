import type { CSSProperties } from 'react'
import styles from './css/Avatar.module.css'

interface AvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg'
}

// Paleta cálida determinística según el nombre.
const PALETTE = ['#d9694f', '#3f7cad', '#4c9d7c', '#d99a3f', '#9a6cb0', '#c96a8b']

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

function colorFor(name: string) {
  let sum = 0
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i)
  return PALETTE[sum % PALETTE.length]
}

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ')

export function Avatar({ name, size = 'md' }: AvatarProps) {
  const bg = colorFor(name)
  const style: CSSProperties = {
    background: `linear-gradient(135deg, ${bg}, ${bg}cc)`,
  }
  return (
    <span className={cx(styles.avatar, styles[size])} style={style} aria-hidden="true">
      {initials(name)}
    </span>
  )
}
