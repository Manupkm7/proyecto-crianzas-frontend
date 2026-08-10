'use client'

import type { InputHTMLAttributes } from 'react'
import { IconSearch } from './icons'
import styles from './css/SearchInput.module.css'

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function SearchInput({ label = 'Buscar', className, ...props }: SearchInputProps) {
  return (
    <div className={styles.wrap}>
      <span className={styles.icon}>
        <IconSearch size={18} />
      </span>
      <input
        type="search"
        className={styles.input}
        aria-label={label}
        {...props}
      />
    </div>
  )
}
