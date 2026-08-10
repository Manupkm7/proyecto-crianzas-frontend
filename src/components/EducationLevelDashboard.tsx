import { Card } from './Card'
import { useEducationDashboardQuery } from '../hooks/useEducationDashboard'
import styles from './css/EducationLevelDashboard.module.css'

// Resumen del dashboard de una institución educativa: cuántos niños hay
// en cada grado de cada nivel (jardín/primario/secundario) y cuántos de
// ellos tienen alguna alerta.
export function EducationLevelDashboard() {
  const { data, isLoading, error } = useEducationDashboardQuery()

  if (isLoading) return <p className="text-muted">Cargando…</p>
  if (error) return <div className="alert alert-error">Error al cargar el resumen por grado.</div>
  if (!data) return null

  if (data.levels.length === 0) {
    return (
      <p className={styles.empty}>
        Tu institución todavía no tiene niveles educativos configurados. Pedile a un
        administrador que los complete en la ficha de la institución.
      </p>
    )
  }

  return (
    <div>
      {data.levels.map((level) => (
        <div key={level.level} className={styles.level}>
          <h3 className={styles.levelTitle}>{level.label}</h3>
          <div className={styles.grid}>
            {level.grades.map((grade) => (
              <Card key={grade.grade} className={styles.gradeCard}>
                <span className={styles.gradeLabel}>{grade.label}</span>
                <span className={styles.gradeCount}>{grade.count}</span>
                <span className={grade.alerts_count > 0 ? styles.gradeAlert : styles.gradeAlertNone}>
                  {grade.alerts_count > 0
                    ? `${grade.alerts_count} con alerta`
                    : '0 con alerta'}
                </span>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {data.unassigned_count > 0 && (
        <p className={styles.unassigned}>
          {data.unassigned_count} niño{data.unassigned_count === 1 ? '' : 's'} sin nivel/grado asignado todavía.
        </p>
      )}
    </div>
  )
}
