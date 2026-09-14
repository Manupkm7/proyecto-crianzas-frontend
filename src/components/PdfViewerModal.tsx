import { IconDownload } from './icons'
import { Button } from './Button'
import styles from './css/PdfViewerModal.module.css'

interface PdfViewerModalProps {
  url: string
  filename: string
  onClose: () => void
}

/**
 * Visor interno de un PDF ya descargado (blob: URL, ver useAttachmentViewer).
 * El <iframe> usa el visor de PDF nativo del navegador — no hace falta ninguna
 * librería extra. El botón "Descargar" apunta a la misma blob: URL: al ser
 * same-origin (creada por el propio navegador) el atributo `download` sí
 * funciona, a diferencia de un <a href> directo a la API autenticada.
 */
export function PdfViewerModal({ url, filename, onClose }: PdfViewerModalProps) {
  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={filename}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.filename} title={filename}>
            {filename}
          </span>
          <div className={styles.headerActions}>
            <a className={styles.downloadLink} href={url} download={filename}>
              <IconDownload size={14} />
              Descargar
            </a>
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
        <iframe className={styles.frame} src={url} title={filename} />
      </div>
    </div>
  )
}
