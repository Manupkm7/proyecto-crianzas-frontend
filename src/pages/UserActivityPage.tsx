import { useParams, Link } from "react-router-dom";
import { useUserQuery, useUserActivityQuery } from "../hooks/useUsers";
import type { ActivityLog } from "../types";

/**
 * UserActivityPage — Historial de acciones realizadas por un usuario.
 *
 * Permite a los responsables de institución ver qué cargó o modificó
 * cada representante: qué niños registraron, qué datos de salud/educación
 * ingresaron, etc.
 *
 * También accesible para admin y coordinador sobre cualquier usuario.
 */
export default function UserActivityPage() {
  const { id } = useParams<{ id: string }>();
  const { data: targetUser, isLoading: loadingUser, error: userError } = useUserQuery(id);
  const {
    data: logs = [] as ActivityLog[],
    isLoading: loadingActivity,
    error: activityError,
  } = useUserActivityQuery(id);

  const loading = loadingUser || loadingActivity;
  const error = userError || activityError ? "No se pudo cargar la actividad del usuario." : null;

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (loading) {
    return <p className="text-muted">Cargando…</p>;
  }

  if (error) {
    return (
      <>
        <div className="alert alert-error">{error}</div>
        <Link to="/users" className="back-link">
          ← Volver a usuarios
        </Link>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <Link to={`/users/${id}`} className="back-link">
            ← Volver al perfil
          </Link>
          <h1>Actividad de {targetUser?.name}</h1>
          <p
            className="text-muted"
            style={{ marginTop: "0.25rem", fontSize: "0.875rem" }}
          >
            {targetUser?.institution?.name &&
              `${targetUser.institution.name} · `}
            {targetUser?.email}
          </p>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="empty-state">
          <p>Este usuario aún no registró ninguna actividad en el sistema.</p>
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Fecha y hora</th>
              <th>Acción</th>
              <th>Sobre</th>
              <th>Cambios registrados</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td style={{ whiteSpace: "nowrap", fontSize: "0.85rem" }}>
                  {formatDate(log.created_at)}
                </td>
                <td>
                  <span
                    className={
                      "badge " +
                      (log.action === "created"
                        ? "badge-green"
                        : log.action === "deleted"
                          ? "badge-red"
                          : "badge-blue")
                    }
                  >
                    {log.action_label ?? log.action}
                  </span>
                </td>
                <td>{log.model_label ?? log.model_type ?? "—"}</td>
                <td>
                  {log.changes ? (
                    <ChangeSummary changes={log.changes} />
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

/**
 * Muestra un resumen legible de los cambios registrados en el activity log.
 *
 * El formato de `changes` en spatie/activitylog v5 es:
 * - Creación: { "attributes": { campo: valor, ... } }
 * - Modificación: { "old": { campo: valor_anterior }, "attributes": { campo: valor_nuevo } }
 * - Eliminación: { "old": { campo: valor } }
 */
function ChangeSummary({
  changes,
}: {
  changes: NonNullable<ActivityLog["changes"]>;
}) {
  if (!changes || typeof changes !== "object") {
    return <span className="text-muted">—</span>;
  }

  const oldValues = changes.old ?? {};
  const newValues = changes.attributes ?? {};

  // Para creación: solo hay valores nuevos
  if (Object.keys(oldValues).length === 0) {
    const entries = Object.entries(newValues).slice(0, 4);
    if (entries.length === 0)
      return <span className="text-muted">Sin detalles</span>;
    return (
      <ul
        style={{
          listStyle: "none",
          fontSize: "0.8rem",
          margin: 0,
          lineHeight: 1.8,
        }}
      >
        {entries.map(([field, val]) => (
          <li key={field}>
            <span className="text-muted">{field}:</span>{" "}
            <strong>{String(val ?? "—")}</strong>
          </li>
        ))}
        {Object.keys(newValues).length > 4 && (
          <li className="text-muted">
            …y {Object.keys(newValues).length - 4} campo(s) más
          </li>
        )}
      </ul>
    );
  }

  // Para modificación: mostramos el cambio de viejo → nuevo
  const changedFields = Object.keys(oldValues);
  return (
    <ul
      style={{
        listStyle: "none",
        fontSize: "0.8rem",
        margin: 0,
        lineHeight: 1.8,
      }}
    >
      {changedFields.slice(0, 3).map((field) => (
        <li key={field}>
          <span className="text-muted">{field}:</span>{" "}
          <span
            style={{
              textDecoration: "line-through",
              color: "var(--color-muted)",
            }}
          >
            {String(oldValues[field] ?? "—")}
          </span>
          {" → "}
          <strong>{String(newValues[field] ?? "—")}</strong>
        </li>
      ))}
      {changedFields.length > 3 && (
        <li className="text-muted">
          …y {changedFields.length - 3} campo(s) más
        </li>
      )}
    </ul>
  );
}
