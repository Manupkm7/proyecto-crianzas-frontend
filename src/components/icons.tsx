/**
 * Íconos SVG hechos a mano (sin librerías).
 * Todos comparten la firma `IconProps` y usan `currentColor`,
 * por lo que heredan el color del contenedor y son reutilizables.
 */
import type { SVGProps } from 'react'

export type IconProps = SVGProps<SVGSVGElement> & {
  size?: number
}

function Base({ size = 20, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export function IconHome(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1V9.5" />
    </Base>
  )
}

export function IconChildren(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="9" cy="7" r="3" />
      <path d="M3.5 21v-1.5A4.5 4.5 0 0 1 8 15h2a4.5 4.5 0 0 1 4.5 4.5V21" />
      <circle cx="17.5" cy="9" r="2.2" />
      <path d="M15 21v-1a3.5 3.5 0 0 1 3.5-3.5h.2A3.3 3.3 0 0 1 22 19.8V21" />
    </Base>
  )
}

export function IconUsers(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1" />
    </Base>
  )
}

export function IconBuilding(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16" />
      <path d="M15 9h4a1 1 0 0 1 1 1v11" />
      <path d="M3 21h18" />
      <path d="M8 8h3M8 12h3M8 16h3" />
    </Base>
  )
}

export function IconBook(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H12v16H5.5A1.5 1.5 0 0 0 4 20.5Z" />
      <path d="M20 4.5A1.5 1.5 0 0 0 18.5 3H12v16h6.5a1.5 1.5 0 0 1 1.5 1.5Z" />
    </Base>
  )
}

export function IconHeart(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 20s-7-4.35-7-9.5A3.9 3.9 0 0 1 12 7a3.9 3.9 0 0 1 7 3.5C19 15.65 12 20 12 20Z" />
    </Base>
  )
}

export function IconSearch(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-3.2-3.2" />
    </Base>
  )
}

export function IconPlus(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 5v14M5 12h14" />
    </Base>
  )
}

export function IconArrowLeft(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M19 12H5" />
      <path d="m11 6-6 6 6 6" />
    </Base>
  )
}

export function IconChevronRight(props: IconProps) {
  return (
    <Base {...props}>
      <path d="m9 6 6 6-6 6" />
    </Base>
  )
}

export function IconEdit(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 20h4l10.5-10.5a2 2 0 0 0-2.83-2.83L5 17.5V20Z" />
      <path d="M13.5 6.5 17 10" />
    </Base>
  )
}

export function IconLogout(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3" />
      <path d="M10 12h9" />
      <path d="m13 8-4 4 4 4" />
    </Base>
  )
}

export function IconUpload(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 15V4" />
      <path d="m8 8 4-4 4 4" />
      <path d="M5 15v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3" />
    </Base>
  )
}

export function IconDownload(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 4v11" />
      <path d="m8 11 4 4 4-4" />
      <path d="M5 16v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3" />
    </Base>
  )
}

export function IconPhone(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6.5 4h3l1.2 4-2 1.5a11 11 0 0 0 5.3 5.3l1.5-2 4 1.2v3a1.5 1.5 0 0 1-1.6 1.5A15.5 15.5 0 0 1 5 5.6 1.5 1.5 0 0 1 6.5 4Z" />
    </Base>
  )
}

export function IconPin(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" />
      <circle cx="12" cy="11" r="2.2" />
    </Base>
  )
}

export function IconActivity(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3 12h4l2 6 4-14 2 8h6" />
    </Base>
  )
}

export function IconCalendar(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </Base>
  )
}

export function IconId(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="12" r="2" />
      <path d="M13 10h5M13 14h3" />
    </Base>
  )
}

export function IconCheck(props: IconProps) {
  return (
    <Base {...props}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </Base>
  )
}

export function IconMenu(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Base>
  )
}

export function IconAlert(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 3.5 21.5 20h-19Z" />
      <path d="M12 10v4" />
      <circle cx="12" cy="17.2" r="1" fill="currentColor" stroke="none" />
    </Base>
  )
}

export function IconDot(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
    </Base>
  )
}

export function IconShield(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 3 4 6v5c0 4.4 3.4 8.5 8 9.5 4.6-1 8-5.1 8-9.5V6z" />
    </Base>
  )
}

export function IconRefresh(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" />
      <path d="M3 21v-5h5" />
    </Base>
  )
}
