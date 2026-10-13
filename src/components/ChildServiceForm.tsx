import { useMemo } from 'react'
import { useProviderOptions, useServiceTypesQuery } from '../hooks/useServices'
import { Button } from './Button'
import type { ChildServicePayload } from '../api/services'
import type { ChildService, ServicePeriodType, ServiceSectorKey, ServiceType } from '../types'
import detail from '../pages/css/detail.module.css'

// Formulario de carga/edición de una prestación — compartido entre la ficha del
// niño (ChildServicesSection) y la grilla general del dashboard (ChildServicesGrid).

const MAX_PERIOD: Record<ServicePeriodType, number> = { trimestre: 4, bimestre: 6 }

function currentTrimester() {
  const now = new Date()
  return { year: now.getFullYear(), number: Math.floor(now.getMonth() / 3) + 1 }
}

export function serviceErrorMessage(err: unknown, fallback: string): string {
  const body = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })
    .response?.data
  const firstFieldError = body?.errors ? Object.values(body.errors)[0]?.[0] : undefined
  return firstFieldError ?? body?.message ?? fallback
}

export interface ServiceForm {
  service_type_id: string
  institution_id: string
  sector: ServiceSectorKey | ''
  period_type: ServicePeriodType
  period_number: string
  year: string
  service_number: string
  observations: string
  has_alert: boolean
}

export function emptyServiceForm(): ServiceForm {
  const { year, number } = currentTrimester()
  return {
    service_type_id: '',
    institution_id: '',
    sector: '',
    period_type: 'trimestre',
    period_number: String(number),
    year: String(year),
    service_number: '',
    observations: '',
    has_alert: false,
  }
}

export function serviceFormFrom(s: ChildService): ServiceForm {
  return {
    service_type_id: s.service_type?.id ?? '',
    institution_id: s.institution?.id ?? '',
    sector: s.sector,
    period_type: s.period_type,
    period_number: String(s.period_number),
    year: String(s.year),
    service_number: s.service_number != null ? String(s.service_number) : '',
    observations: s.observations ?? '',
    has_alert: s.has_alert,
  }
}

/** Mensaje de validación del lado del cliente, o null si se puede guardar. */
export function validateServiceForm(form: ServiceForm, isAdmin: boolean): string | null {
  if (!form.service_type_id) return 'Elegí la prestación.'
  if (isAdmin && !form.institution_id) return 'Elegí el efector.'
  return null
}

/** Payload para POST/PATCH. Solo el admin elige el efector (el resto carga como el propio). */
export function servicePayloadFrom(form: ServiceForm, isAdmin: boolean): ChildServicePayload {
  return {
    service_type_id: form.service_type_id,
    ...(isAdmin ? { institution_id: form.institution_id } : {}),
    sector: form.sector || null,
    year: Number(form.year),
    period_type: form.period_type,
    period_number: Number(form.period_number),
    service_number: form.service_number.trim() === '' ? null : Number(form.service_number),
    observations: form.observations.trim() || null,
    has_alert: form.has_alert,
  }
}

export function ChildServiceForm({
  form,
  onChange,
  isAdmin,
  error,
  saving,
  onSave,
  onCancel,
}: {
  form: ServiceForm
  onChange: (form: ServiceForm) => void
  /** Solo admin elige el efector. */
  isAdmin: boolean
  error: string | null
  saving: boolean
  onSave: () => void
  onCancel: () => void
}) {
  const { data: catalog } = useServiceTypesQuery(false)
  const providers = useProviderOptions(isAdmin)

  const serviceTypes = useMemo(() => catalog?.data ?? [], [catalog])
  const sectors = catalog?.sectors ?? []

  const typesBySector = useMemo(() => {
    const map = new Map<string, ServiceType[]>()
    for (const t of serviceTypes) {
      const list = map.get(t.sector_label) ?? []
      list.push(t)
      map.set(t.sector_label, list)
    }
    return [...map.entries()]
  }, [serviceTypes])

  const periodNumbers = Array.from({ length: MAX_PERIOD[form.period_type] }, (_, i) => i + 1)

  return (
    <div className={detail.obsForm}>
      <div className={detail.periodGrid}>
        <label className={`${detail.periodField} ${detail.wide}`}>
          <span className={detail.periodLabel}>Prestación</span>
          <select
            className={detail.periodInput}
            value={form.service_type_id}
            onChange={(e) => onChange({ ...form, service_type_id: e.target.value })}
          >
            <option value="">Elegir prestación…</option>
            {typesBySector.map(([sectorLabel, types]) => (
              <optgroup key={sectorLabel} label={sectorLabel}>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.is_mandatory ? ' (obligatoria)' : ''}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        {isAdmin && (
          <label className={`${detail.periodField} ${detail.wide}`}>
            <span className={detail.periodLabel}>Efector</span>
            <select
              className={detail.periodInput}
              value={form.institution_id}
              onChange={(e) => onChange({ ...form, institution_id: e.target.value })}
            >
              <option value="">Elegir institución…</option>
              {providers.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className={detail.periodField}>
          <span className={detail.periodLabel}>Tipo de período</span>
          <select
            className={detail.periodInput}
            value={form.period_type}
            onChange={(e) => {
              const type = e.target.value as ServicePeriodType
              const n = Math.min(Number(form.period_number), MAX_PERIOD[type])
              onChange({ ...form, period_type: type, period_number: String(n) })
            }}
          >
            <option value="trimestre">Trimestre</option>
            <option value="bimestre">Bimestre</option>
          </select>
        </label>

        <label className={detail.periodField}>
          <span className={detail.periodLabel}>
            {form.period_type === 'trimestre' ? 'Trimestre' : 'Bimestre'}
          </span>
          <select
            className={detail.periodInput}
            value={form.period_number}
            onChange={(e) => onChange({ ...form, period_number: e.target.value })}
          >
            {periodNumbers.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <label className={detail.periodField}>
          <span className={detail.periodLabel}>Año</span>
          <input
            className={detail.periodInput}
            type="number"
            min={2000}
            max={2100}
            value={form.year}
            onChange={(e) => onChange({ ...form, year: e.target.value })}
          />
        </label>

        <label className={detail.periodField}>
          <span className={detail.periodLabel}>Nro prestación</span>
          <input
            className={detail.periodInput}
            type="number"
            min={0}
            value={form.service_number}
            onChange={(e) => onChange({ ...form, service_number: e.target.value })}
          />
        </label>

        <label className={`${detail.periodField} ${detail.wide}`}>
          <span className={detail.periodLabel}>Sector</span>
          <select
            className={detail.periodInput}
            value={form.sector}
            onChange={(e) => onChange({ ...form, sector: e.target.value as ServiceSectorKey | '' })}
          >
            <option value="">El de la prestación en el catálogo</option>
            {sectors.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label className={`${detail.periodField} ${detail.wide}`}>
          <span className={detail.periodLabel}>Observaciones</span>
          <textarea
            className={detail.obsTextarea}
            rows={3}
            maxLength={3000}
            value={form.observations}
            onChange={(e) => onChange({ ...form, observations: e.target.value })}
          />
        </label>

        <label className={detail.periodCheck} style={{ gridColumn: '1 / -1' }}>
          <input
            type="checkbox"
            checked={form.has_alert}
            onChange={(e) => onChange({ ...form, has_alert: e.target.checked })}
          />
          Marcar con alerta (genera una alerta del SAT hasta que alguien la gestione)
        </label>
      </div>

      {error && <p className={detail.obsError}>{error}</p>}
      <div className={detail.obsFormActions}>
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button size="sm" disabled={saving} onClick={onSave}>
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </div>
  )
}
