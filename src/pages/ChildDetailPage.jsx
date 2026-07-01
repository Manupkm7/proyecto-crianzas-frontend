import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../api/client'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import EducationRecordCard from '../components/EducationRecordCard'
import HealthRecordCard from '../components/HealthRecordCard'

export default function ChildDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [child, setChild] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const role = user?.roles?.[0]
  const isAdmin = role === 'admin'
  const institutionType = user?.institution?.type

  useEffect(() => {
    fetchChild()
  }, [id])

  async function fetchChild() {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get(`/children/${id}`)
      setChild(data.data ?? data)
    } catch (err) {
      if (err.response?.status === 404) setError('Niño no encontrado.')
      else if (err.response?.status === 403) setError('No tenés permiso para ver este niño.')
      else setError(err.response?.data?.message ?? 'Error al cargar el perfil.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`¿Dar de baja a ${child.first_name} ${child.last_name}? Esta acción es reversible.`)) return
    try {
      await api.delete(`/children/${id}`)
      navigate('/children')
    } catch (err) {
      alert(err.response?.data?.message ?? 'Error al dar de baja al niño.')
    }
  }

  if (loading) return <Layout><p className="text-muted p-4">Cargando…</p></Layout>
  if (error) return <Layout><div className="alert alert-error m-4">{error}</div></Layout>

  return (
    <Layout>
      <div className="page-header">
        <div>
          <Link to="/children" className="back-link">← Volver al listado</Link>
          <h1>{child.first_name} {child.last_name}</h1>
          <p className="text-muted">{child.age} años · Nacido/a el {child.birth_date}</p>
        </div>
        {isAdmin && (
          <div className="action-group">
            <Link to={`/children/${id}/edit`} className="btn btn-secondary">Editar</Link>
            <button className="btn btn-danger" onClick={handleDelete}>Dar de baja</button>
          </div>
        )}
      </div>

      {/* DNI — solo visible para admin/coordinador (el backend ya filtra esto) */}
      {child.dni && (
        <div className="info-box mb-4">
          <strong>DNI:</strong> {child.dni}
        </div>
      )}

      {child.notes && (
        <div className="card mb-4">
          <h3>Notas generales</h3>
          <p>{child.notes}</p>
        </div>
      )}

      <div className="record-grid">
        {/* Registro educativo */}
        {(isAdmin || role === 'coordinador' || institutionType === 'educacion') && (
          <EducationRecordCard
            childId={id}
            record={child.education_record}
            canEdit={isAdmin || institutionType === 'educacion'}
            onRefresh={fetchChild}
          />
        )}

        {/* Registro de salud */}
        {(isAdmin || role === 'coordinador' || institutionType === 'salud') && (
          <HealthRecordCard
            childId={id}
            record={child.health_record}
            canEdit={isAdmin || institutionType === 'salud'}
            onRefresh={fetchChild}
          />
        )}
      </div>
    </Layout>
  )
}
