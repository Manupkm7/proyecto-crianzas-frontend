import { useState } from 'react'
import type { AxiosResponse } from 'axios'

export interface AttachmentViewerState {
  url: string
  filename: string
}

/**
 * Pide un adjunto (PDF) al backend de forma autenticada (vía axios, con el
 * token en el header) y arma una blob: URL para mostrarlo en PdfViewerModal
 * o descargarlo. Antes los adjuntos se servían con un <a href> directo a la
 * URL del backend — como la API usa tokens Bearer (no cookies de sesión), el
 * navegador nunca mandaba el token en esa navegación y la descarga fallaba.
 *
 * `fetcher` es getEducationObservationAttachment o getHealthObservationAttachment
 * según la sección — ambas devuelven un blob con la misma forma.
 */
export function useAttachmentViewer() {
  const [viewer, setViewer] = useState<AttachmentViewerState | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function open(
    id: string,
    filename: string,
    fetcher: (id: string) => Promise<AxiosResponse<Blob>>,
  ) {
    setError(null)
    setLoadingId(id)
    try {
      const { data } = await fetcher(id)
      setViewer({ url: URL.createObjectURL(data), filename })
    } catch {
      setError('No se pudo abrir el adjunto. Intentá de nuevo.')
    } finally {
      setLoadingId(null)
    }
  }

  function close() {
    if (viewer) URL.revokeObjectURL(viewer.url)
    setViewer(null)
  }

  return { viewer, loadingId, error, open, close }
}
