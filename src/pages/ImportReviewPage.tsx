import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  useBulkResolveNoMatchMutation,
  useImportConfidenceSummaryQuery,
  useImportQuery,
  useImportRowsQuery,
  useImportSiblingsQuery,
  useRematchBatchMutation,
  useReopenRowMutation,
  useResolveRowMutation,
} from "../hooks/useImports";
import type {
  Child,
  ImportBatch,
  ImportRow,
  ImportRowOverrides,
} from "../types";
import styles from "./css/ImportReviewPage.module.css";
import {
  IconAlert,
  IconArrowLeft,
  IconCheck,
  IconEdit,
} from "../components/icons";
import { Button } from "../components/Button";
import { Spinner } from "../components/Spinner";

// Cuánto se mantiene visible el aviso de "recién resuelto" una vez que la fila
// desaparece de la lista filtrada actual (cambió de estado y ya no matchea el
// tab/filtro elegido). Antes desaparecía apenas React Query refrescaba la
// lista, dando la sensación de que el niño "se perdía" aunque en realidad
// estaba en la pestaña de Resueltos — ver RecentlyResolvedBanner más abajo.
const RECENTLY_RESOLVED_MS = 15_000;

interface RecentlyResolved {
  rowId: string;
  fileLineNumber: number | null | undefined;
  action: "confirm" | "skip";
  child?: Child | null;
  resolvedAt: number;
}

type StatusFilter =
  | "partial_match"
  | "no_match"
  | "matched"
  | "manual_resolved"
  | "skipped";

const FILTER_TABS: { value: StatusFilter | ""; label: string }[] = [
  { value: "partial_match", label: "A revisar" },
  { value: "no_match", label: "Sin coincidencia" },
  { value: "matched", label: "Emparejados" },
  { value: "manual_resolved", label: "Resueltos" },
  { value: "skipped", label: "Descartados" },
];

export default function ImportReviewPage() {
  const { id } = useParams<{ id: string }>();
  const [statusFilter, setStatusFilter] = useState<StatusFilter | "">(
    "partial_match",
  );
  const [page, setPage] = useState(1);
  // Sub-filtro por nivel de confianza, solo tiene sentido dentro de "A revisar"
  // (partial_match) — ahí es donde el % varía fila por fila y agrupar evita
  // repetir el mismo banner de confianza en cada card (ver confidenceGroups).
  const [confidenceFilter, setConfidenceFilter] = useState<number | "all">(
    "all",
  );

  const { data: batch, isLoading: batchLoading } = useImportQuery(id);
  const { data: rowsData, isLoading: rowsLoading } = useImportRowsQuery(
    id,
    statusFilter || undefined,
    page,
    statusFilter === "partial_match" && confidenceFilter !== "all"
      ? confidenceFilter
      : undefined,
  );
  // Conteo por % de confianza del batch entero (no solo la página actual de
  // `rows`), para que las sub-tabs reflejen el total real aunque esté repartido
  // en varias páginas — ver confidenceSummary() en el backend.
  const { data: confidenceGroups = [] } = useImportConfidenceSummaryQuery(
    id,
    statusFilter === "partial_match",
  );

  const rows = rowsData?.items ?? [];

  // Filas resueltas hace poco: la fila desaparece de `rows` apenas React Query
  // refresca la lista (cambió de estado, ya no matchea el filtro actual), pero
  // seguimos mostrando un aviso fijo con acceso al niño durante un rato para
  // que no parezca que "se perdió" — ver RECENTLY_RESOLVED_MS.
  const [recentlyResolved, setRecentlyResolved] = useState<RecentlyResolved[]>(
    [],
  );

  useEffect(() => {
    if (recentlyResolved.length === 0) return;
    const interval = setInterval(() => {
      setRecentlyResolved((prev) =>
        prev.filter((r) => Date.now() - r.resolvedAt < RECENTLY_RESOLVED_MS),
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [recentlyResolved.length]);

  function handleRowResolved(entry: Omit<RecentlyResolved, "resolvedAt">) {
    setRecentlyResolved((prev) => [
      ...prev.filter((r) => r.rowId !== entry.rowId),
      { ...entry, resolvedAt: Date.now() },
    ]);
  }

  if (batchLoading)
    return (
      <div
        className="text-muted"
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "2rem 0" }}
      >
        <Spinner size={20} />
        Cargando…
      </div>
    );
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
                setConfidenceFilter("all");
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

      {/* Sub-filtro por nivel de confianza — agrupa las filas de "A revisar" por
          su % en vez de repetir el mismo banner grande en cada card. */}
      {statusFilter === "partial_match" && confidenceGroups.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.4rem",
            marginBottom: "0.5rem",
          }}
        >
          <ConfidenceTab
            label="Todos"
            count={batch.rows.partial}
            active={confidenceFilter === "all"}
            onClick={() => {
              setConfidenceFilter("all");
              setPage(1);
            }}
          />
          {confidenceGroups.map((g) => (
            <ConfidenceTab
              key={g.confidence}
              label={`${g.confidence}%`}
              count={g.count}
              active={confidenceFilter === g.confidence}
              onClick={() => {
                setConfidenceFilter(g.confidence);
                setPage(1);
              }}
            />
          ))}
        </div>
      )}

      {statusFilter === "partial_match" && confidenceFilter !== "all" && (
        <p
          className="text-muted"
          style={{ fontSize: "0.8rem", marginTop: 0, marginBottom: "0.75rem" }}
        >
          {partialMatchHeadline(confidenceFilter)}
        </p>
      )}

      {/* Avisos fijos de filas resueltas hace poco (ver RECENTLY_RESOLVED_MS) —
          se muestran acá aparte porque la fila ya puede haber desaparecido de
          `rows` de abajo (cambió de estado, no matchea más el filtro actual). */}
      {recentlyResolved.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            marginBottom: "0.75rem",
          }}
        >
          {recentlyResolved.map((entry) => (
            <RecentlyResolvedBanner key={entry.rowId} entry={entry} />
          ))}
        </div>
      )}

      {/* Listado de filas */}
      {rowsLoading && (
        <div
          className="text-muted"
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "1.5rem 0" }}
        >
          <Spinner size={20} />
          Cargando filas…
        </div>
      )}

      {!rowsLoading && rows.length === 0 && (
        <div className="empty-state">
          <p>
            {statusFilter === "partial_match" && confidenceFilter !== "all"
              ? "No hay filas con ese nivel de confianza."
              : "No hay filas en este estado."}
          </p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {rows.map((row) => (
          <ReviewCard
            key={row.id}
            row={row}
            batchId={id!}
            onResolved={handleRowResolved}
          />
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

function ReviewCard({
  row,
  batchId,
  onResolved,
}: {
  row: ImportRow;
  batchId: string;
  onResolved?: (entry: Omit<RecentlyResolved, "resolvedAt">) => void;
}) {
  const { mutate: resolve, isPending } = useResolveRowMutation(batchId);
  const { mutate: reopen, isPending: isReopening } =
    useReopenRowMutation(batchId);
  const [resolved, setResolved] = useState(false);
  const [resolvedChild, setResolvedChild] = useState<Child | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmingReopen, setConfirmingReopen] = useState(false);
  // Con cuál de las dos filas quedarse (nombre + fecha de nacimiento) cuando hay
  // contraparte y hay que crear un niño nuevo. Por defecto, esta fila.
  const [dataSource, setDataSource] = useState<"row" | "matched_row">("row");
  // Correcciones que el operador tipea a mano antes de confirmar (pedido del
  // cliente: poder editar el niño al aceptar el matcheo) — solo corrigen los
  // datos de ESTA fila, nunca los de la contraparte.
  const [editing, setEditing] = useState(false);
  const [overrides, setOverrides] = useState<ImportRowOverrides>({});

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
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <span>
          ✓ Resuelto — fila #{row.file_line_number}
          {resolvedChild &&
            ` · ${resolvedChild.last_name}, ${resolvedChild.first_name}`}
        </span>
        {resolvedChild && <OpenChildButton childId={resolvedChild.id} />}
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
        overrides:
          editing && action === "confirm" && Object.keys(overrides).length > 0
            ? overrides
            : undefined,
      },
      {
        onSuccess: (response) => {
          const child = response.data.row.child ?? null;
          setResolved(true);
          setResolvedChild(child);
          onResolved?.({
            rowId: row.id,
            fileLineNumber: row.file_line_number,
            action,
            child,
          });
        },
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
    row.status === "manual_resolved" ||
    row.status === "skipped" ||
    row.status === "matched";
  // 'matched'/'manual_resolved' se pueden reabrir para corregir; 'skipped' no
  // (descartar es una decisión distinta, no un vínculo a deshacer).
  const isReopenable =
    row.status === "matched" || row.status === "manual_resolved";
  const suggestedChild = row.suggested_child;

  const confidenceColor =
    (row.match_confidence ?? 0) >= 100
      ? "var(--color-success)"
      : (row.match_confidence ?? 0) >= 80
        ? "var(--color-warning)"
        : "var(--color-muted)";

  const banner = confidenceBanner(row.match_confidence);
  const headline =
    row.status === "manual_resolved"
      ? "Resuelto manualmente."
      : row.status === "matched"
        ? "Emparejado automáticamente (dato de antes de que el sistema pidiera aprobación siempre) — se puede reabrir para revisar."
        : (row.match_confidence ?? 0) >= 100
          ? "Coincidencia exacta — DNI, nombre, apellido y fecha de nacimiento coinciden. De todos modos necesita tu aprobación explícita para crear o vincular el registro: ningún niño se da de alta solo."
          : suggestedChild
            ? "Coincidencia parcial con un niño existente — DNI, nombre o apellido no coinciden los 3 a la vez. Revisar antes de vincular."
            : row.status === "partial_match"
              ? row.match_confidence === 70
                ? "El DNI coincide con la contraparte, pero el nombre es distinto — revisar si es la misma persona antes de confirmar."
                : row.match_confidence === 75
                  ? "Hay más de un candidato posible con el mismo nombre y fecha — revisar cuál corresponde."
                  : "Posible coincidencia — diferencia de tildes o variante. Revisar antes de confirmar."
              : "Sin coincidencia en la fuente opuesta — se creará un niño nuevo si confirmás.";

  return (
    <article className={styles.matchCard}>
      {/* Encabezado de la card. En "A revisar" (isPartialMatch) el % y el texto
          explicativo ya se muestran una sola vez arriba, por las sub-tabs de
          confianza (ver ConfidenceTab/partialMatchHeadline en ImportReviewPage)
          — repetirlos acá card por card era redundante cuando había muchas del
          mismo %. Para las demás pestañas se mantiene el banner completo. */}
      {isPartialMatch ? null : (
        <header className={styles.matchHeader}>
          <>
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
              style={{
                color: banner.text,
                fontWeight: 600,
                fontSize: "0.95rem",
              }}
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
          </>
        </header>
      )}
      {/* Comparación de datos */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            (isPartialMatch && (row.matched_row || suggestedChild)) ||
            (isResolved && row.child)
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
              birthDateIsPlaceholder={suggestedChild.birth_date_is_placeholder}
              dni={suggestedChild.dni}
              highlight={
                suggestedChild.first_name !== row.first_name ||
                suggestedChild.last_name !== row.last_name
              }
              framed
            />
          </>
        )}

        {/* Niño al que quedó vinculada la fila (ya resuelta, auto o manualmente) */}
        {isResolved && row.child && (
          <>
            <div
              style={{
                textAlign: "center",
                color: "var(--color-success)",
                alignSelf: "center",
                fontSize: "1.75rem",
              }}
            >
              ⟷
            </div>

            <DataPanel
              label={
                row.status === "matched"
                  ? "Niño vinculado (automático)"
                  : "Niño vinculado"
              }
              firstName={row.child.first_name}
              lastName={row.child.last_name}
              birthDate={row.child.birth_date}
              birthDateIsPlaceholder={row.child.birth_date_is_placeholder}
              dni={row.child.dni}
              framed
            />
          </>
        )}
      </div>

      {/* Editar antes de confirmar — corrige datos mal cargados en el archivo
          (nombre, DNI, fecha de nacimiento, etc.) sin tener que arreglar el
          Excel y volver a subirlo. Solo corrige los datos de ESTA fila. */}
      {!isResolved && (
        <div
          style={{
            padding: "0 1rem 0.75rem",
            borderTop: editing ? "1px solid var(--color-border)" : undefined,
          }}
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            style={{ marginTop: editing ? "0.75rem" : 0 }}
            onClick={() => setEditing((value) => !value)}
          >
            <IconEdit size={14} />{" "}
            {editing ? "Cancelar edición" : "Editar antes de confirmar"}
          </Button>

          {editing && (
            <EditRowForm
              row={row}
              overrides={overrides}
              onChange={setOverrides}
            />
          )}
        </div>
      )}

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
              <Button
                disabled={isPending}
                variant="ghost"
                onClick={() => handleAction("skip")}
              >
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
              <Button
                disabled={isPending}
                variant="ghost"
                onClick={() => handleAction("skip")}
              >
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
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: "0.8rem", color: "var(--color-success)" }}>
            {row.status === "matched"
              ? "✓ Emparejado automáticamente"
              : row.status === "skipped"
                ? "— Descartado"
                : "✓ Resuelto"}
          </span>

          {isReopenable && !confirmingReopen && (
            <Button
              variant="ghost"
              style={{ marginLeft: "auto" }}
              disabled={isReopening}
              onClick={() => setConfirmingReopen(true)}
            >
              Reabrir esta fila
            </Button>
          )}

          {isReopenable && confirmingReopen && (
            <span
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.8rem",
              }}
            >
              <span style={{ color: "var(--color-warning)" }}>
                {row.child
                  ? `¿Reabrir? El registro ya creado para ${row.child.first_name} ${row.child.last_name} no se borra solo — quedará para corregirlo a mano si el niño correcto es otro.`
                  : "¿Reabrir esta fila para corregirla?"}
              </span>
              <Button
                variant="primary"
                disabled={isReopening}
                onClick={() =>
                  reopen(row.id, {
                    onSuccess: () => setConfirmingReopen(false),
                    onError: (err) => {
                      const message = (
                        err as { response?: { data?: { message?: string } } }
                      ).response?.data?.message;
                      setActionError(
                        message ??
                          "No se pudo reabrir la fila. Intentá de nuevo.",
                      );
                      setConfirmingReopen(false);
                    },
                  })
                }
              >
                {isReopening ? "…" : "Sí, reabrir"}
              </Button>
              <Button
                variant="secondary"
                disabled={isReopening}
                onClick={() => setConfirmingReopen(false)}
              >
                Cancelar
              </Button>
            </span>
          )}
        </div>
      )}
    </article>
  );
}

/** Abre la ficha del niño en una pestaña nueva, sin perder el lugar en la revisión. */
function OpenChildButton({ childId }: { childId: string }) {
  return (
    <Button
      variant="secondary"
      size="sm"
      style={{ marginLeft: "auto", flexShrink: 0 }}
      onClick={() =>
        window.open(`/children/${childId}`, "_blank", "noopener,noreferrer")
      }
    >
      Ver niño ↗
    </Button>
  );
}

/**
 * Aviso fijo de una fila resuelta hace poco (ver RECENTLY_RESOLVED_MS en
 * ImportReviewPage). Vive aparte de ReviewCard porque tiene que seguir visible
 * incluso después de que la fila desaparezca de la lista filtrada actual.
 */
function RecentlyResolvedBanner({ entry }: { entry: RecentlyResolved }) {
  const label =
    entry.action === "skip"
      ? "— Descartada"
      : entry.child
        ? `✓ Vinculada a ${entry.child.last_name}, ${entry.child.first_name}`
        : "✓ Resuelta";

  return (
    <div
      style={{
        padding: "0.75rem 1rem",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius)",
        background:
          entry.action === "skip" ? "var(--color-surface)" : "#f0fdf4",
        color:
          entry.action === "skip"
            ? "var(--color-muted)"
            : "var(--color-success)",
        fontSize: "0.875rem",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
      }}
    >
      <span>
        {label} — fila #{entry.fileLineNumber}
      </span>
      {entry.child && <OpenChildButton childId={entry.child.id} />}
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

const editInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.4rem 0.5rem",
  fontSize: "0.85rem",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius)",
  background: "var(--color-surface)",
  color: "var(--color-text)",
};

function EditField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        fontSize: "0.72rem",
        fontWeight: 600,
        color: "var(--color-muted)",
      }}
    >
      {label}
      {children}
    </label>
  );
}

function TriStateSelect({
  value,
  onChange,
}: {
  value: boolean | null | undefined;
  onChange: (value: boolean | null) => void;
}) {
  return (
    <select
      style={editInputStyle}
      value={value === true ? "true" : value === false ? "false" : ""}
      onChange={(e) =>
        onChange(e.target.value === "" ? null : e.target.value === "true")
      }
    >
      <option value="">Sin dato</option>
      <option value="true">Sí</option>
      <option value="false">No</option>
    </select>
  );
}

/**
 * Formulario de corrección manual — pedido explícito del cliente: poder
 * editar el niño al aceptar el matcheo (ej. arreglar un DNI o nombre mal
 * cargado en el archivo) sin tener que corregir el Excel y volver a subirlo.
 * Los campos arrancan pre-cargados con el valor del archivo; lo que el
 * operador toca se manda como `overrides` y pisa esos datos SOLO para esta
 * fila al confirmar (ver ImportController::confirmRow()).
 */
function EditRowForm({
  row,
  overrides,
  onChange,
}: {
  row: ImportRow;
  overrides: ImportRowOverrides;
  onChange: (next: ImportRowOverrides) => void;
}) {
  function set<K extends keyof ImportRowOverrides>(
    key: K,
    value: ImportRowOverrides[K],
  ) {
    onChange({ ...overrides, [key]: value });
  }

  function textValue(
    key: Extract<keyof ImportRowOverrides, string>,
    fallback?: string | null,
  ): string {
    const current = overrides[key];
    return (typeof current === "string" ? current : fallback) ?? "";
  }

  return (
    <div
      style={{
        marginTop: "0.75rem",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: "0.6rem",
      }}
    >
      <EditField label="Nombre">
        <input
          style={editInputStyle}
          value={textValue("first_name", row.first_name)}
          onChange={(e) => set("first_name", e.target.value)}
        />
      </EditField>
      <EditField label="Apellido">
        <input
          style={editInputStyle}
          value={textValue("last_name", row.last_name)}
          onChange={(e) => set("last_name", e.target.value)}
        />
      </EditField>
      <EditField label="DNI">
        <input
          style={editInputStyle}
          value={textValue("dni", row.dni)}
          onChange={(e) => set("dni", e.target.value)}
        />
      </EditField>
      <EditField label="Fecha de nacimiento">
        <input
          type="date"
          style={editInputStyle}
          value={textValue("birth_date", row.birth_date)}
          onChange={(e) => set("birth_date", e.target.value)}
        />
      </EditField>

      {row.source === "civil_registry" && (
        <>
          <EditField label="Nombre de la madre">
            <input
              style={editInputStyle}
              value={textValue("mother_name", row.mother_name)}
              onChange={(e) => set("mother_name", e.target.value)}
            />
          </EditField>
          <EditField label="DNI de la madre">
            <input
              style={editInputStyle}
              value={textValue("mother_dni", row.mother_dni)}
              onChange={(e) => set("mother_dni", e.target.value)}
            />
          </EditField>
          <EditField label="Nombre del padre">
            <input
              style={editInputStyle}
              value={textValue("father_name", row.father_name)}
              onChange={(e) => set("father_name", e.target.value)}
            />
          </EditField>
          <EditField label="DNI del padre">
            <input
              style={editInputStyle}
              value={textValue("father_dni", row.father_dni)}
              onChange={(e) => set("father_dni", e.target.value)}
            />
          </EditField>
          <EditField label="Establecimiento">
            <input
              style={editInputStyle}
              value={textValue("birth_establishment", row.birth_establishment)}
              onChange={(e) => set("birth_establishment", e.target.value)}
            />
          </EditField>
          <EditField label="Domicilio">
            <input
              style={editInputStyle}
              value={textValue("address", row.address)}
              onChange={(e) => set("address", e.target.value)}
            />
          </EditField>
        </>
      )}

      {row.source === "education" && (
        <>
          <EditField label="Escuela">
            <input
              style={editInputStyle}
              value={textValue("school_name", row.school_name)}
              onChange={(e) => set("school_name", e.target.value)}
            />
          </EditField>
          <EditField label="Grado/Año">
            <input
              style={editInputStyle}
              value={textValue("grade_or_year", row.grade_or_year)}
              onChange={(e) => set("grade_or_year", e.target.value)}
            />
          </EditField>
        </>
      )}

      {row.source === "health" && (
        <>
          <EditField label="Centro de salud">
            <input
              style={editInputStyle}
              value={textValue("health_center_name", row.health_center_name)}
              onChange={(e) => set("health_center_name", e.target.value)}
            />
          </EditField>
          <EditField label="Control sano">
            <TriStateSelect
              value={
                overrides.healthy_checkup_current !== undefined
                  ? overrides.healthy_checkup_current
                  : row.healthy_checkup_current
              }
              onChange={(v) => set("healthy_checkup_current", v)}
            />
          </EditField>
          <EditField label="Vacunas al día">
            <TriStateSelect
              value={
                overrides.vaccines_current !== undefined
                  ? overrides.vaccines_current
                  : row.vaccines_current
              }
              onChange={(v) => set("vaccines_current", v)}
            />
          </EditField>
          <EditField label="Último control">
            <input
              type="date"
              style={editInputStyle}
              value={textValue("last_checkup_date", row.last_checkup_date)}
              onChange={(e) => set("last_checkup_date", e.target.value)}
            />
          </EditField>
          <EditField label="Observaciones">
            <input
              style={editInputStyle}
              value={textValue("observations", row.observations)}
              onChange={(e) => set("observations", e.target.value)}
            />
          </EditField>
        </>
      )}

      {/* Prestación de la misma fila: período, efector, sector y prestación ya se
          validaron al procesar el archivo — acá solo se corrige la alerta (y la
          observación, si la fuente no la ofrece ya arriba). */}
      {rowHasService(row) && (
        <>
          {row.source !== "health" && (
            <EditField label="Observaciones de la prestación">
              <input
                style={editInputStyle}
                value={textValue("observations", row.observations)}
                onChange={(e) => set("observations", e.target.value)}
              />
            </EditField>
          )}
          <EditField label="Alerta de la prestación">
            <select
              style={editInputStyle}
              value={
                (overrides.alert !== undefined ? overrides.alert : row.alert)
                  ? "true"
                  : "false"
              }
              onChange={(e) => set("alert", e.target.value === "true")}
            >
              <option value="false">No</option>
              <option value="true">Sí</option>
            </select>
          </EditField>
        </>
      )}
    </div>
  );
}

function boolLabel(value: boolean | null | undefined): string {
  return value === true ? "Al día" : value === false ? "No al día" : "Sin dato";
}

/**
 * Texto explicativo de un nivel de confianza — reemplaza al headline que antes
 * se repetía en cada card (ver ReviewCard). No distingue si la fila además
 * tiene un `suggestedChild`: ese dato ya se ve aparte, en el panel "Niño ya
 * existente en el sistema" dentro de la card.
 */
function partialMatchHeadline(confidence: number): string {
  if (confidence >= 100) {
    return "Coincidencia exacta — DNI, nombre, apellido y fecha de nacimiento coinciden. De todos modos necesita tu aprobación explícita para crear o vincular el registro: ningún niño se da de alta solo.";
  }
  if (confidence === 70) {
    return "El DNI coincide con la contraparte, pero el nombre es distinto — revisar si es la misma persona antes de confirmar.";
  }
  if (confidence === 75) {
    return "Hay más de un candidato posible con el mismo nombre y fecha — revisar cuál corresponde.";
  }
  return "Posible coincidencia — diferencia de tildes o variante. Revisar antes de confirmar.";
}

function ConfidenceTab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: `1px solid ${active ? "var(--color-primary)" : "var(--color-border)"}`,
        background: active
          ? "color-mix(in srgb, var(--color-primary) 10%, var(--color-bg))"
          : "var(--color-bg)",
        color: active ? "var(--color-primary)" : "var(--color-muted)",
        borderRadius: "999px",
        padding: "0.2rem 0.7rem",
        fontSize: "1.1rem",
        fontWeight: active ? 600 : 500,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
      }}
    >
      {label}
      <span
        style={{
          fontSize: "0.7rem",
          opacity: 0.8,
        }}
      >
        ({count})
      </span>
    </button>
  );
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

  // Prestación que viene en la misma fila (cualquier fuente) — mismo flujo de
  // matcheo: al confirmar el niño se carga también la prestación.
  if (rowHasService(row)) {
    if (row.period_label)
      fields.push({ label: "Período", value: row.period_label });
    if (row.service_name)
      fields.push({
        label: "Prestación",
        value:
          row.service_number != null
            ? `${row.service_name} (Nro ${row.service_number})`
            : row.service_name,
      });
    if (row.sector_label) fields.push({ label: "Sector", value: row.sector_label });
    if (row.provider_name) fields.push({ label: "Efector", value: row.provider_name });
    if (row.observations && row.source !== "health")
      fields.push({ label: "Observaciones", value: row.observations });
    fields.push({ label: "Alerta", value: row.alert ? "SÍ" : "No" });
  }

  return fields;
}

/** ¿La fila trae además una prestación? (columnas de prestación en la misma hoja) */
function rowHasService(row: ImportRow): boolean {
  return Boolean(row.service_name || row.period_label);
}

function DataPanel({
  label,
  firstName,
  lastName,
  nameFallback,
  birthDate,
  birthDateIsPlaceholder = false,
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
  birthDateIsPlaceholder?: boolean;
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
      {birthDateIsPlaceholder && (
        <div
          style={{
            fontSize: "0.7rem",
            color: "var(--color-warning)",
            marginTop: 2,
          }}
        >
          ⚠ Fecha genérica — el archivo no traía este dato, se completó con
          1/1/2000. Corregila editando el niño.
        </div>
      )}
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
