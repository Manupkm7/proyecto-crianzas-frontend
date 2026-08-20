import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  useDepartmentsQuery,
  useInstitutionDirectoryQuery,
  useLocalitiesQuery,
  useProvincesQuery,
  useSectorsQuery,
} from '../hooks/useGeo'
import type { InstitutionType } from '../types'

type LoginMode = 'institucion' | 'representante'

/**
 * InstitutionalLoginPage — Segundo camino de acceso, en paralelo a /login.
 *
 * Flujo: provincia → departamento → localidad → sector → institución.
 * Una vez elegida la institución, el usuario decide cómo entrar:
 * - "Institución": contraseña propia de la institución (POST /institution-login).
 * - "Representante": su cuenta personal, con DNI + contraseña (mismo POST
 *   /login que usa el login normal, pero mandando 'dni' en vez de 'email' —
 *   ver AuthController::login). La institución elegida arriba es solo una
 *   guía visual — el login no depende de esa selección, el backend ya
 *   identifica al usuario por su DNI.
 */
export default function InstitutionalLoginPage() {
  const { user, loading, error, loginInstitution, loginByDni } = useAuth()
  const navigate = useNavigate()

  const [provinceId, setProvinceId] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [localityId, setLocalityId] = useState('')
  const [sector, setSector] = useState<InstitutionType | ''>('')
  const [institutionId, setInstitutionId] = useState('')
  const [mode, setMode] = useState<LoginMode>('institucion')

  const [institutionPassword, setInstitutionPassword] = useState('')
  const [repDni, setRepDni] = useState('')
  const [repPassword, setRepPassword] = useState('')

  const { data: provinces = [] } = useProvincesQuery()
  const { data: departments = [] } = useDepartmentsQuery(provinceId || undefined)
  const { data: localities = [] } = useLocalitiesQuery(departmentId || undefined)
  const { data: sectors = [] } = useSectorsQuery()
  const { data: institutions = [] } = useInstitutionDirectoryQuery(
    localityId || undefined,
    sector || undefined,
  )

  const selectedInstitution = institutions.find((i) => i.id === institutionId)

  // Si ya está logueado, lo mandamos directo al inicio.
  if (user) return <Navigate to="/" replace />

  function handleProvinceChange(e: ChangeEvent<HTMLSelectElement>) {
    setProvinceId(e.target.value)
    setDepartmentId('')
    setLocalityId('')
    setInstitutionId('')
  }

  function handleDepartmentChange(e: ChangeEvent<HTMLSelectElement>) {
    setDepartmentId(e.target.value)
    setLocalityId('')
    setInstitutionId('')
  }

  function handleLocalityChange(e: ChangeEvent<HTMLSelectElement>) {
    setLocalityId(e.target.value)
    setInstitutionId('')
  }

  function handleSectorChange(e: ChangeEvent<HTMLSelectElement>) {
    setSector(e.target.value as InstitutionType)
    setInstitutionId('')
  }

  async function handleInstitutionSubmit(e: FormEvent) {
    e.preventDefault()
    try {
      await loginInstitution(institutionId, institutionPassword)
      navigate('/')
    } catch {
      // El error ya está en el estado del contexto (AuthContext.error)
    }
  }

  async function handleRepresentanteSubmit(e: FormEvent) {
    e.preventDefault()
    try {
      await loginByDni(repDni, repPassword)
      navigate('/')
    } catch {
      // El error ya está en el estado del contexto (AuthContext.error)
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-card login-card--wide">
        <h1 className="login-title">Sistema de Apoyo a la Crianza</h1>
        <p className="login-subtitle">Ingreso institucional</p>

        <div className="login-form">
          <div className="field">
            <label htmlFor="province">Provincia</label>
            <select id="province" value={provinceId} onChange={handleProvinceChange} required>
              <option value="">Seleccioná una provincia…</option>
              {provinces.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="department">Departamento</label>
            <select
              id="department"
              value={departmentId}
              onChange={handleDepartmentChange}
              disabled={!provinceId}
              required
            >
              <option value="">Seleccioná un departamento…</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="locality">Localidad</label>
            <select
              id="locality"
              value={localityId}
              onChange={handleLocalityChange}
              disabled={!departmentId}
              required
            >
              <option value="">Seleccioná una localidad…</option>
              {localities.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="sector">Sector</label>
            <select
              id="sector"
              value={sector}
              onChange={handleSectorChange}
              disabled={!localityId}
              required
            >
              <option value="">Seleccioná un sector…</option>
              {sectors.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="institution">Institución</label>
            <select
              id="institution"
              value={institutionId}
              onChange={(e) => setInstitutionId(e.target.value)}
              disabled={!sector}
              required
            >
              <option value="">Seleccioná una institución…</option>
              {institutions.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
            {sector && institutions.length === 0 && (
              <span className="login-hint" style={{ marginTop: '0.25rem' }}>
                No hay instituciones de este sector en la localidad elegida.
              </span>
            )}
          </div>

          {institutionId && (
            <>
              <div className="login-mode-toggle">
                <button
                  type="button"
                  className={mode === 'institucion' ? 'btn btn-secondary is-active' : 'btn btn-secondary'}
                  onClick={() => setMode('institucion')}
                >
                  Ingresar como institución
                </button>
                <button
                  type="button"
                  className={mode === 'representante' ? 'btn btn-secondary is-active' : 'btn btn-secondary'}
                  onClick={() => setMode('representante')}
                >
                  Soy representante
                </button>
              </div>

              {error && <div className="alert alert-error">{error}</div>}

              {mode === 'institucion' ? (
                <form onSubmit={handleInstitutionSubmit} className="login-form">
                  <div className="field">
                    <label htmlFor="institution-password">
                      Contraseña de {selectedInstitution?.name ?? 'la institución'}
                    </label>
                    <input
                      id="institution-password"
                      type="password"
                      value={institutionPassword}
                      onChange={(e) => setInstitutionPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Iniciando sesión…' : 'Ingresar'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRepresentanteSubmit} className="login-form">
                  <div className="field">
                    <label htmlFor="rep-dni">DNI</label>
                    <input
                      id="rep-dni"
                      type="text"
                      inputMode="numeric"
                      value={repDni}
                      onChange={(e) => setRepDni(e.target.value)}
                      required
                      autoComplete="username"
                      placeholder="Sin puntos ni espacios"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="rep-password">Contraseña</label>
                    <input
                      id="rep-password"
                      type="password"
                      value={repPassword}
                      onChange={(e) => setRepPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Iniciando sesión…' : 'Ingresar'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>

        <p className="login-hint">
          <Link to="/login">¿Sos administrador o coordinador? Iniciá sesión acá</Link>
        </p>
      </div>
    </div>
  )
}
