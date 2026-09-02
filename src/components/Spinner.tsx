import type { CSSProperties } from 'react'

interface SpinnerProps {
  size?: number
  style?: CSSProperties
}

/** Indicador de carga circular reutilizable — usa el @keyframes spin de index.css. */
export function Spinner({ size = 20, style }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Cargando"
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        border: '2.5px solid var(--border)',
        borderTopColor: 'var(--primary)',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
        flexShrink: 0,
        ...style,
      }}
    />
  )
}
