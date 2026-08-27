import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  useBulkResolveNoMatchMutation,
  useImportQuery,
  useImportRowsQuery,
  useImportSiblingsQuery,
  useRematchBatchMutation,
  useResolveRowMutation,
} from "../hooks/useImports";
import type { ImportBatch, ImportRow } from "../types";
import styles from "./css/ImportReviewPage.module.css";
import { IconAlert, IconArrowLeft, IconCheck } from "../components/icons";
import { Button } from "../components/Button";

type StatusFilter =
  | "partial_match"
  | "no_match"
  | "manual_resolved"
  | "skipped";

const FILTER_TABS: { value: StatusFilter | ""; label: string }[] = [
  { value: "partial_match", label: "A revisar" },
  { value: "no_match", label: "Sin coincidencia" },
  { value: "manual_resolved", label: "Resueltos" },
  { value: "skipped", label: "Descartados" },
];

export default function ImportReviewPage() {
  const { id } = useParams<{ id: string }>();
  const [statusFilter, setStatusFilter] = useState<StatusFilter | "">(
    "partial_match",
  );
  const [page, setPage] = useState(1);

  const { data: batch, isLoading: batchLoading } = useImportQuery(id);
  const { data: rowsData, isLoading: rowsLoading } = useImportRowsQuery(
    id,
    statusFilter || undefined,
    page,
  );

  const rows = rowsData?.items ?? [];

  if (batchLoading) return <p className="text-muted">Cargando…</p>;
  if (!batch) return <p>Importación no encontrada.</p>;

  const isProcessing =
    batch.status === "processing" || batch.status === "pending";

  return (
    <>
      {/* Encabezado */}
      <div className={styles.pageTop}>
        <Link to="/importaciones" className={styles.back}>
          <IconArrowLeft size={16} /> Importaciones
        </Link>
        <span className={styles.kicker}>Revisión de archivo</span>
      </div>

      <div className={styles.titleRow}>
        <div>
          <h1>Revisión de importación</h1>
          <div className={styles.titleheader}>
            <p className="text-muted">
              {batch.source_label} · <strong>{batch.original_filename}</strong>
              <span>{batch.sheet_name && ` · Hoja: ${batch.sheet_name}`}</span>
              {batch.institution && ` · ${batch.institution.name}`}
            </p>
          </div>
        </div>
        {isProcessing && (
          <span className="badge badge-blue">⟳ Procesando…</span>
        )}
      </div>

      {!isProcessing && <RematchPanel batch={batch} />}

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: "0.75rem",
          marginBottom: "1.5rem",
        }}
      >
        <StatCard label="Procesados" value={batch.rows.total} />
        <StatCard
          label="Emparejados"
          value={batch.rows.matched}
          color="var(--color-success)"
        />
        <StatCard
          label="A revisar"
          value={batch.rows.pending_review}
          color={
            batch.rows.pending_review > 0 ? "var(--color-warning)" : undefined
          }
          bold={batch.rows.pending_review > 0}
        />
        <StatCard label="Resueltos" value={batch.rows.resolved} />
        <StatCard
          label="Errores"
          value={batch.rows.errors}
          color={batch.rows.errors > 0 ? "var(--color-danger)" : undefined}
        />
      </div>

      {isProcessing && (
        <div
          className="alert"
          style={{
            background: "#eff6ff",
            border: "1px solid #93c5fd",
            borderRadius: "var(--radius)",
            padding: "0.75rem 1rem",
            marginBottom: "1.25rem",
          }}
        >
          El archivo aún se está procesando. Los resultados aparecerán en unos
          segundos…
        </div>
      )}

      {/* Tabs de filtro */}
      <div
        style={{
          display: "flex",
          gap: "0.25rem",
          marginBottom: "1.25rem",
          borderBottom: "1px solid var(--color-border)",
          paddingBottom: 0,
        }}
      >
        {FILTER_TABS.map((tab) => {
          const count =
            tab.value === "partial_match"
              ? batch.rows.partial
              : tab.value === "no_match"
                ? batch.rows.no_match
                : undefined;
          return (
            <button
              key={tab.value}
              onClick={() => {
                setStatusFilter(tab.value);
                setPage(1);
              }}
              style={{
                background: "none",
                border: "none",
                borderBottom:
                  statusFilter === tab.value
                    ? "2px solid var(--color-primary)"
                    : "2px solid transparent",
                color:
                  statusFilter === tab.value
                    ? "var(--color-primary)"
                    : "var(--color-muted)",
                fontWeight: statusFilter === tab.value ? 600 : 400,
                cursor: "pointer",
                padding: "0.4rem 0.75rem",
                fontSize: "0.875rem",
                marginBottom: -1,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {tab.label}
              {count !== undefined && count > 0 && (
                <span
                  style={{
                    background:
                      tab.value === "partial_match"
                        ? "var(--color-warning)"
                        : "var(--color-muted)",
                    color: "#fff",
                    borderRadius: "999px",
                    padding: "0 5px",
                    fontSize: "0.7rem",
                    lineHeight: "1.4rem",
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Crear en lote las filas 'sin coincidencia' (útil cuando la hoja se sube sola, sin nada con que comparar) */}
      {statusFilter === "no_match" &&
        !isProcessing &&
        batch.rows.no_match > 0 && (
          <BulkResolveBar batchId={batch.id} count={batch.rows.no_match} />
        )}

      {/* Listado de filas */}
      {rowsLoading && <p className="text-muted">Cargando filas…</p>}

      {!rowsLoading && rows.length === 0 && (
        <div className="empty-state">
          <p>No hay filas en este estado.</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {rows.map((row) => (
          <ReviewCard key={row.id} row={row} batchId={id!} />
        ))}
      </div>

      {/* Paginación */}
      {(rowsData?.lastPage ?? 1) > 1 && (
        <div
          className="action-group mt-4"
          style={{ justifyContent: "flex-end" }}
        >
          <button
            className="btn btn-sm btn-secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </button>
          <span className="text-muted" style={{ alignSelf: "center" }}>
            Página {page} de {rowsData?.lastPage}
          </span>
          <button
            className="btn btn-sm btn-secondary"
            disabled={page >= (rowsData?.lastPage ?? 1)}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </button>
        </div>
      )}
    </>
  );
}

// ─── Comparar a mano contra otra hoja del mismo archivo ──────────────────────

function RematchPanel({ batch }: { batch: ImportBatch }) {
  const oppositeSource =
    batch.source === "civil_registry"
      ? "education"
      : batch.source === "education"
        ? "civil_registry"
        : null;

  const { data: siblings } = useImportSiblingsQuery(batch.id);
  const { mutate, isPending } = useRematchBatchMutation(batch.id);
  const [selected, setSelected] = useState("");
  const [feedback, setFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  if (!oppositeSource) return null; // 'health' no hace emparejamiento cruzado por hoja

  const candidates = (siblings ?? []).filter(
    (s) => s.source === oppositeSource,
  );
  if (candidates.length === 0) return null;

  return (
    <section className={styles.compareBar}>
      <div>
        <strong>Comparar contra otra hoja</strong>
        <p>
          La comparación automática usa la hoja de Educación. Podés cambiarla si
          necesitás contrastar otra fuente.
        </p>
      </div>
      <div className={styles.compareControls}>
        <select
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value);
            setFeedback(null);
          }}
          style={{
            padding: "0.3rem 0.5rem",
            borderRadius: "var(--radius)",
            border: "1px solid var(--color-border)",
          }}
        >
          <option value="">Elegir hoja…</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.sheet_name ?? c.original_filename}
              {c.institution ? ` — ${c.institution.name}` : ""}
            </option>
          ))}
        </select>
        <Button
          variant="secondary"
          size="sm"
          disabled={!selected || isPending}
          onClick={() =>
            mutate(selected, {
              onSuccess: (res) =>
                setFeedback({ ok: true, message: res.data.message }),
              onError: (err) => {
                const message = (
                  err as { response?: { data?: { message?: string } } }
                ).response?.data?.message;
                setFeedback({
                  ok: false,
                  message:
                    message ?? "No se pudo recomparar. Intentá de nuevo.",
                });
              },
            })
          }
        >
          Recomparar hoja
        </Button>
        {feedback &&
          (feedback.ok ? (
            <span className={styles.success}>
              <IconCheck size={15} /> 14 filas comparadas
            </span>
          ) : (
            <span className={styles.danger}>
              <IconAlert size={15} /> {feedback.message}
            </span>
          ))}
      </div>
    </section>
  );
}

// ─── Resolución masiva de filas "sin coincidencia" ───────────────────────────

function BulkResolveBar({
  batchId,
  count,
}: {
  batchId: string;
  count: number;
}) {
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const { mutate, isPending } = useBulkResolveNoMatchMutation(batchId);

  if (result) {
    return (
      <div
        style={{
          padding: "0.75rem 1rem",
          border: "1px solid #86efac",
          borderRadius: "var(--radius)",
          background: "#f0fdf4",
          color: "#166534",
          fontSize: "0.875rem",
          marginBottom: "1rem",
        }}
      >
        ✓ {result}
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "0.75rem 1rem",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius)",
        background: "var(--color-bg)",
        marginBottom: "1rem",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        flexWrap: "wrap",
      }}
    >
      <span style={{ fontSize: "0.875rem" }}>
        Estas {count} fila{count === 1 ? "" : "s"} no tienen ninguna hoja con la
        que compararse — se pueden crear como niños nuevos de una sola vez, sin
        revisar fila por fila.
      </span>
      {confirming ? (
        <>
          <span
            style={{
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "var(--color-warning)",
              marginLeft: "auto",
            }}
          >
            ¿Confirmás crear {count} niño{count === 1 ? "" : "s"} nuevo
            {count === 1 ? "" : "s"}?
          </span>
          <button
            className="btn btn-sm btn-primary"
            disabled={isPending}
            onClick={() =>
              mutate(undefined, {
                onSuccess: (res) => setResult(res.data.message),
              })
            }
          >
            {isPending ? "…" : "Sí, crear todos"}
          </button>
          <button
            className="btn btn-sm btn-secondary"
            disabled={isPending}
            onClick={() => setConfirming(false)}
          >
            Cancelar
          </button>
        </>
      ) : (
        <button
          className="btn btn-sm btn-primary"
          style={{ marginLeft: "auto" }}
          onClick={() => setConfirming(true)}
        >
          + Crear los {count} como niños nuevos
        </button>
      )}
    </div>
  );
}

// ─── Tarjeta de revisión de una fila ─────────────────────────────────────────

function ReviewCard({ row, batchId }: { row: ImportRow; batchId: string }) {
  const { mutate: resolve, isPending } = useResolveRowMutation(batchId);
  const [resolved, setResolved] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  // Con cuál de las dos filas quedarse (nombre + fecha de nacimiento) cuando hay
  // contraparte y hay que crear un niño nuevo. Por defecto, esta fila.
  const [dataSource, setDataSource] = useState<"row" | "matched_row">("row");

  if (resolved) {
    return (
      <div
        style={{
          padding: "0.75rem 1rem",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius)",
          background: "#f0fdf4",
          color: "var(--color-success)",
          fontSize: "0.875rem",
        }}
      >
        ✓ Resuelto — fila #{row.file_line_number}
      </div>
    );
  }

  function handleAction(action: "confirm" | "skip", childId?: string) {
    setActionError(null);
    resolve(
      {
        rowId: row.id,
        action,
        childId,
        dataSource: row.matched_row ? dataSource : undefined,
      },
      {
        onSuccess: () => setResolved(true),
        onError: (err) => {
          const message = (
            err as { response?: { data?: { message?: string } } }
          ).response?.data?.message;
          setActionError(
            message ?? "No se pudo resolver la fila. Intentá de nuevo.",
          );
        },
      },
    );
  }

  const isPartialMatch = row.status === "partial_match";
  const isResolved =
    row.status === "manual_resolved" || row.status === "skipped";
  const suggestedChild = row.suggested_child;

  const confidenceColor =
    (row.match_confidence ?? 0) >= 100
      ? "var(--color-success)"
      : (row.match_confidence ?? 0) >= 80
        ? "var(--color-warning)"
        : "var(--color-muted)";

  const banner = confidenceBanner(row.match_confidence);
  const headline = suggestedChild
    ? "Coincidencia parcial con un niño existente — DNI, nombre o apellido no coinciden los 3 a la vez. Revisar antes de vincular."
    : row.status === "partial_match"
      ? "Posible coincidencia — diferencia de tildes o variante. Revisar antes de confirmar."
      : "Sin coincidencia en la fuente opuesta — se creará un niño nuevo si confirmás.";

  return (
    <article className={styles.matchCard}>
      {/* Encabezado de la card — banner grande de confianza, imposible de pasar por alto */}
      <header className={styles.matchHeader}>
        <div
          style={{
            fontSize: "1.6rem",
            fontWeight: 800,
            color: banner.text,
            lineHeight: 1,
            minWidth: 70,
            textAlign: "center",
          }}
        >
          {row.match_confidence != null
            ? `${row.match_confidence}%`
            : banner.icon}
        </div>
        <span
          style={{ color: banner.text, fontWeight: 600, fontSize: "0.95rem" }}
        >
          {headline}
        </span>
        <span
          style={{
            marginLeft: "auto",
            color: banner.text,
            opacity: 0.75,
            fontSize: "0.8rem",
          }}
        >
          Línea #{row.file_line_number}
        </span>
      </header>

      {/* Comparación de datos */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            isPartialMatch && (row.matched_row || suggestedChild)
              ? "1fr auto 1fr"
              : "1fr",
          gap: "1rem",
          padding: "1rem",
          alignItems: "stretch",
        }}
      >
        {/* Lado izquierdo: la fila actual */}
        <DataPanel
          label={`${row.source_label ?? ""} (archivo)`}
          firstName={row.first_name}
          lastName={row.last_name}
          nameFallback={row.name_fallback}
          birthDate={row.birth_date}
          dni={row.dni}
          fields={rowFields(row)}
          framed
          selectable={isPartialMatch && Boolean(row.matched_row)}
          selected={dataSource === "row"}
          onSelect={() => setDataSource("row")}
        />

        {/* Separador */}
        {isPartialMatch && row.matched_row && (
          <>
            <div
              style={{
                textAlign: "center",
                color: confidenceColor,
                alignSelf: "center",
                fontSize: "1.75rem",
              }}
            >
              ⟷
            </div>

            {/* Lado derecho: la contraparte */}
            <DataPanel
              label={
                row.source === "civil_registry"
                  ? "Educación (contraparte)"
                  : "Registro Civil (contraparte)"
              }
              firstName={row.matched_row.first_name}
              lastName={row.matched_row.last_name}
              nameFallback={row.matched_row.name_fallback}
              birthDate={row.matched_row.birth_date}
              dni={row.matched_row.dni}
              fields={[
                row.matched_row.school_name
                  ? { label: "Escuela", value: row.matched_row.school_name }
                  : null,
                row.matched_row.mother_name
                  ? { label: "Madre", value: row.matched_row.mother_name }
                  : null,
                row.matched_row.father_name
                  ? { label: "Padre", value: row.matched_row.father_name }
                  : null,
              ].filter(
                (f): f is { label: string; value: string } => f !== null,
              )}
              highlight={
                row.matched_row.first_name !== row.first_name ||
                row.matched_row.last_name !== row.last_name
              }
              framed
              selectable
              selected={dataSource === "matched_row"}
              onSelect={() => setDataSource("matched_row")}
            />
          </>
        )}

        {/* Niño existente sugerido por DNI+nombre+apellido */}
        {isPartialMatch && !row.matched_row && suggestedChild && (
          <>
            <div
              style={{
                textAlign: "center",
                color: confidenceColor,
                alignSelf: "center",
                fontSize: "1.75rem",
              }}
            >
              ⟷
            </div>

            <DataPanel
              label="Niño ya existente en el sistema"
              firstName={suggestedChild.first_name}
              lastName={suggestedChild.last_name}
              birthDate={suggestedChild.birth_date}
              dni={suggestedChild.dni}
              highlight={
                suggestedChild.first_name !== row.first_name ||
                suggestedChild.last_name !== row.last_name
              }
              framed
            />
          </>
        )}
      </div>

      {/* Todas las columnas del archivo, tal cual vinieron */}
      <RawColumnsTable columns={row.raw_columns} />

      {/* Nota del matching */}
      {row.match_notes && (
        <div
          style={{
            padding: "0.5rem 1rem",
            background: "#fffbeb",
            borderTop: "1px solid #fde68a",
            fontSize: "0.8rem",
            color: "#92400e",
          }}
        >
          💬 {row.match_notes}
        </div>
      )}

      {actionError && (
        <div
          style={{
            padding: "0.5rem 1rem",
            background: "#fef2f2",
            borderTop: "1px solid #fecaca",
            fontSize: "0.8rem",
            color: "var(--color-danger)",
          }}
        >
          ⚠ {actionError}
        </div>
      )}

      {/* Acciones */}
      {!isResolved && (
        <div
          style={{
            padding: "0.75rem 1rem",
            borderTop: "1px solid var(--color-border)",
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
          }}
        >
          {suggestedChild ? (
            <>
              <Button
                disabled={isPending}
                variant="primary"
                onClick={() => handleAction("confirm", suggestedChild.id)}
              >
                {isPending ? "…" : "✓ Vincular a este niño"}
              </Button>
              <Button
                disabled={isPending}
                variant="secondary"
                onClick={() => handleAction("confirm")}
              >
                Es otro niño / crear nuevo
              </Button>
              <Button
                variant="ghost"
                disabled={isPending}
                onClick={() => handleAction("skip")}
              >
                Descartar
              </Button>
            </>
          ) : isPartialMatch ? (
            <>
              <Button
                disabled={isPending}
                variant="primary"
                onClick={() => handleAction("confirm")}
              >
                {isPending ? "…" : "✓ Confirmar como el mismo niño"}
              </Button>
              <Button disabled={isPending} variant="ghost" onClick={() => handleAction("skip")}>
                Descartar
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="primary"
                disabled={isPending}
                onClick={() => handleAction("confirm")}
              >
                {isPending ? "…" : "+ Crear registro de niño"}
              </Button>
              <Button disabled={isPending} variant="ghost" onClick={() => handleAction("skip")}>
                Descartar
              </Button>
            </>
          )}
          <span
            className="text-muted"
            style={{ fontSize: "0.75rem", marginLeft: 4 }}
          >
            {suggestedChild
              ? 'Vincular usa el niño existente; "Es otro niño" crea uno nuevo con estos datos'
              : isPartialMatch && row.matched_row
                ? `Confirmar crea un único niño usando el nombre y fecha de nacimiento de ${dataSource === "row" ? "este registro (marcado abajo)" : "la contraparte (marcada abajo)"} — elegí el panel con el dato correcto arriba`
                : isPartialMatch
                  ? "Confirmar crea un único niño con datos de ambas fuentes"
                  : "Crear genera un nuevo niño con estos datos"}
          </span>
        </div>
      )}

      {isResolved && (
        <div
          style={{
            padding: "0.6rem 1rem",
            borderTop: "1px solid var(--color-border)",
            fontSize: "0.8rem",
            color: "var(--color-success)",
          }}
        >
          ✓ Ya resuelto
        </div>
      )}
    </article>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function boolLabel(value: boolean | null | undefined): string {
  return value === true ? "Al día" : value === false ? "No al día" : "Sin dato";
}

/** Colores del banner de confianza que encabeza cada tarjeta — grande y a simple vista. */
function confidenceBanner(confidence?: number | null): {
  bg: string;
  border: string;
  text: string;
  icon: string;
} {
  if (confidence == null || confidence === 0) {
    return { bg: "#f8fafc", border: "#cbd5e1", text: "#475569", icon: "❔" };
  }
  if (confidence >= 100) {
    return { bg: "#f0fdf4", border: "#86efac", text: "#166534", icon: "✓" };
  }
  if (confidence >= 70) {
    return { bg: "#fffbeb", border: "#fde68a", text: "#92400e", icon: "⚠" };
  }
  return { bg: "#fff7ed", border: "#fdba74", text: "#c2410c", icon: "⚠" };
}

/** Arma la lista de campos extra a mostrar en el panel de la fila, según su fuente. */
function rowFields(row: ImportRow): { label: string; value: string }[] {
  const fields: { label: string; value: string }[] = [];

  if (row.source === "civil_registry") {
    if (row.mother_name || row.mother_dni) {
      fields.push({
        label: "Madre",
        value: [row.mother_name, row.mother_dni && `DNI ${row.mother_dni}`]
          .filter(Boolean)
          .join(" — "),
      });
    }
    if (row.father_name || row.father_dni) {
      fields.push({
        label: "Padre",
        value: [row.father_name, row.father_dni && `DNI ${row.father_dni}`]
          .filter(Boolean)
          .join(" — "),
      });
    }
    if (row.birth_establishment)
      fields.push({ label: "Establecimiento", value: row.birth_establishment });
    if (row.address) fields.push({ label: "Domicilio", value: row.address });
  } else if (row.source === "education") {
    if (row.school_name)
      fields.push({ label: "Escuela", value: row.school_name });
    if (row.grade_or_year)
      fields.push({ label: "Grado/Año", value: row.grade_or_year });
  } else if (row.source === "health") {
    if (row.health_center_name)
      fields.push({ label: "Centro de salud", value: row.health_center_name });
    if (row.healthy_checkup_current !== undefined)
      fields.push({
        label: "Control sano",
        value: boolLabel(row.healthy_checkup_current),
      });
    if (row.vaccines_current !== undefined)
      fields.push({ label: "Vacunas", value: boolLabel(row.vaccines_current) });
    if (row.last_checkup_date)
      fields.push({ label: "Último control", value: row.last_checkup_date });
    if (row.observations)
      fields.push({ label: "Observaciones", value: row.observations });
  }

  return fields;
}

function DataPanel({
  label,
  firstName,
  lastName,
  nameFallback,
  birthDate,
  dni,
  fields = [],
  highlight = false,
  framed = false,
  selectable = false,
  selected = false,
  onSelect,
}: {
  label: string;
  firstName?: string | null;
  lastName?: string | null;
  nameFallback?: string | null;
  birthDate?: string | null;
  dni?: string | null;
  fields?: { label: string; value: string }[];
  highlight?: boolean;
  framed?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const hasName = Boolean(firstName || lastName);
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  const formattedDate = birthDate
    ? new Date(birthDate + "T12:00:00").toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : null;

  return (
    <div
      style={
        framed
          ? {
              border:
                selectable && selected
                  ? "2px solid var(--color-primary)"
                  : "1px solid var(--color-border)",
              borderRadius: "var(--radius)",
              padding:
                selectable && selected ? "calc(0.75rem - 1px)" : "0.75rem",
              background:
                selectable && selected
                  ? "color-mix(in srgb, var(--color-primary) 6%, var(--color-bg))"
                  : "var(--color-bg)",
              height: "100%",
              cursor: selectable ? "pointer" : undefined,
            }
          : undefined
      }
      onClick={selectable ? onSelect : undefined}
      role={selectable ? "radio" : undefined}
      aria-checked={selectable ? selected : undefined}
    >
      {selectable && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 6,
            fontSize: "0.75rem",
            fontWeight: 700,
            color: selected ? "var(--color-primary)" : "var(--color-muted)",
          }}
        >
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              border: `2px solid ${selected ? "var(--color-primary)" : "var(--color-muted)"}`,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {selected && (
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--color-primary)",
                }}
              />
            )}
          </span>
          {selected ? "USAR ESTOS DATOS" : "Usar estos datos"}
        </div>
      )}
      <div
        style={{
          fontSize: "0.7rem",
          fontWeight: 700,
          color: "var(--color-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      {hasName ? (
        <div
          style={{
            fontSize: "1.15rem",
            fontWeight: 700,
            color: highlight ? "var(--color-warning)" : "var(--color-text)",
          }}
        >
          {fullName}
        </div>
      ) : nameFallback ? (
        <div>
          <div
            style={{
              fontSize: "1.15rem",
              fontWeight: 700,
              fontStyle: "italic",
              color: "var(--color-text)",
            }}
          >
            {nameFallback}
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--color-warning)" }}>
            ⚠ Nombre aproximado — este dato es de antes de una corrección, puede
            no tener mayúsculas/tildes exactas del archivo original
          </div>
        </div>
      ) : (
        <div
          style={{
            fontSize: "1.15rem",
            fontWeight: 700,
            color: "var(--color-danger)",
          }}
        >
          ⚠ Sin nombre en el archivo
        </div>
      )}
      <div
        style={{ fontSize: "0.9rem", color: "var(--color-text)", marginTop: 4 }}
      >
        <strong style={{ fontWeight: 600, color: "var(--color-muted)" }}>
          Nacimiento:
        </strong>{" "}
        {formattedDate ?? (
          <span style={{ color: "var(--color-danger)" }}>sin dato</span>
        )}
      </div>
      <div
        style={{ fontSize: "0.9rem", color: "var(--color-text)", marginTop: 2 }}
      >
        <strong style={{ fontWeight: 600, color: "var(--color-muted)" }}>
          DNI:
        </strong>{" "}
        {dni ?? <span style={{ color: "var(--color-danger)" }}>sin dato</span>}
      </div>
      {fields.map((f) => (
        <div
          key={f.label}
          style={{
            fontSize: "0.85rem",
            color: "var(--color-text)",
            marginTop: 2,
          }}
        >
          <strong style={{ fontWeight: 600, color: "var(--color-muted)" }}>
            {f.label}:
          </strong>{" "}
          {f.value}
        </div>
      ))}
    </div>
  );
}

/** Todas las columnas tal como vinieron en el archivo (cabecera original => valor). */
function RawColumnsTable({
  columns,
}: {
  columns?: Record<string, string | number | null>;
}) {
  const entries = Object.entries(columns ?? {}).filter(
    ([, value]) => value !== null && value !== "",
  );
  if (entries.length === 0) return null;

  return (
    <details style={{ borderTop: "1px solid var(--color-border)" }} open>
      <summary
        style={{
          padding: "0.5rem 1rem",
          cursor: "pointer",
          fontSize: "0.8rem",
          fontWeight: 600,
          color: "var(--color-muted)",
          background: "var(--color-bg)",
        }}
      >
        Ver todas las columnas del archivo ({entries.length})
      </summary>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: "0.4rem 1rem",
          padding: "0.5rem 1rem 0.75rem",
          fontSize: "0.8rem",
        }}
      >
        {entries.map(([header, value]) => (
          <div key={header}>
            <div
              style={{
                color: "var(--color-muted)",
                fontSize: "0.7rem",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
              }}
            >
              {header}
            </div>
            <div style={{ color: "var(--color-text)", fontWeight: 500 }}>
              {String(value)}
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

function StatCard({
  label,
  value,
  color,
  bold = false,
}: {
  label: string;
  value: number;
  color?: string;
  bold?: boolean;
}) {
  return (
    <div
      style={{
        padding: "0.75rem 1rem",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius)",
        background: "var(--color-surface)",
      }}
    >
      <div
        style={{
          fontSize: "0.75rem",
          color: "var(--color-muted)",
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "1.25rem",
          fontWeight: bold ? 700 : 600,
          color: color ?? "var(--color-text)",
        }}
      >
        {value}
      </div>
    </div>
  );
}
