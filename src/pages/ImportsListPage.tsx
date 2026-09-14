import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  usePreviewImportMutation,
  useImportsQuery,
  useSubmitImportSheetsMutation,
} from "../hooks/useImports";
import { useInstitutionOptions } from "../hooks/useInstitutionOptions";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { downloadImportTemplate } from "../api/imports";
import { SearchInput } from "../components/SearchInput";
import { Spinner } from "../components/Spinner";
import { IconChevronRight, IconRefresh, IconUpload } from "../components/icons";
import type {
  ImportBatch,
  ImportBatchStatus,
  ImportSheetAssignment,
  ImportSource,
} from "../types";
import { Button } from "../components/Button";

type TemplateFormat = "xlsx" | "csv" | "txt";

const TEMPLATE_FORMAT_LABEL: Record<TemplateFormat, string> = {
  xlsx: "Excel",
  csv: "CSV",
  txt: "TXT",
};

const STATUS_LABEL: Record<ImportBatchStatus, string> = {
  pending: "Pendiente",
  processing: "Procesando…",
  completed: "Completado",
  failed: "Error",
};

const STATUS_CLASS: Record<ImportBatchStatus, string> = {
  pending: "badge badge-gray",
  processing: "badge badge-blue",
  completed: "badge badge-green",
  failed: "badge badge-red",
};

const SOURCE_BADGE_CLASS: Record<ImportSource, string> = {
  civil_registry: "badge-blue",
  education: "badge-green",
  health: "badge-gray",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ImportsListPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const { data, isLoading, isFetching, refetch } = useImportsQuery(
    page,
    search,
  );
  const batches = data?.items ?? [];
  // Varias hojas del mismo archivo comparten storage_path — se agrupan para no
  // repetir el nombre del archivo fila tras fila cuando trae muchas hojas.
  const groups = groupBatchesByFile(batches);

  return (
    <>
      <div className="page-header">
        <h1>Importaciones masivas</h1>
      </div>

      <UploadPanel />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          marginTop: "1.5rem",
          marginBottom: "0.75rem",
        }}
      >
        <SearchInput
          placeholder="Buscar por archivo o por hoja…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <Button
          type="button"
          variant="primary"
          onClick={() => refetch()}
          disabled={isFetching}
          title="Actualizar la lista sin recargar toda la página"
        >
          <IconRefresh
            size={15}
            style={
              isFetching
                ? { animation: "spin 0.8s linear infinite" }
                : undefined
            }
          />
          {isFetching ? "Actualizando…" : "Actualizar"}
        </Button>
      </div>

      {isLoading && (
        <div
          className="text-muted"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "2rem 0",
          }}
        >
          <Spinner size={20} />
          Cargando…
        </div>
      )}

      {!isLoading && batches.length === 0 && (
        <div className="empty-state">
          <p>
            {search
              ? "No se encontraron importaciones para esa búsqueda."
              : "Todavía no se importó ningún archivo."}
          </p>
        </div>
      )}

      {batches.length > 0 && (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>Fuente</th>
                <th>Archivo</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th style={{ textAlign: "center" }}>✓ Match</th>
                <th style={{ textAlign: "center" }}>⚠ Revisar</th>
                <th style={{ textAlign: "center" }}>✕ Sin match</th>
                <th style={{ textAlign: "center" }}>⊘ Errores</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <FileGroup key={group.key} group={group} />
              ))}
            </tbody>
          </table>

          {(data?.lastPage ?? 1) > 1 && (
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
                Página {page} de {data?.lastPage}
              </span>
              <button
                className="btn btn-sm btn-secondary"
                disabled={page >= (data?.lastPage ?? 1)}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}

interface FileGroupData {
  key: string;
  original_filename: string;
  batches: ImportBatch[];
}

/** Agrupa los batches que vienen del mismo archivo subido (comparten storage_path). */
function groupBatchesByFile(batches: ImportBatch[]): FileGroupData[] {
  const order: string[] = [];
  const map = new Map<string, ImportBatch[]>();
  for (const b of batches) {
    if (!map.has(b.storage_path)) {
      map.set(b.storage_path, []);
      order.push(b.storage_path);
    }
    map.get(b.storage_path)!.push(b);
  }
  return order.map((key) => ({
    key,
    original_filename: map.get(key)![0].original_filename,
    batches: map.get(key)!,
  }));
}

/**
 * Una fila de tabla si el archivo trajo una sola hoja (caso común), o un
 * encabezado plegable + una fila por hoja si trajo varias — para no repetir
 * el nombre del archivo y poder colapsar los archivos con muchas hojas y así
 * reducir el alto de la tabla.
 */
function FileGroup({ group }: { group: FileGroupData }) {
  const [expanded, setExpanded] = useState(true);

  if (group.batches.length === 1) {
    return <BatchRow batch={group.batches[0]} />;
  }

  return (
    <>
      <tr>
        <td colSpan={9} style={{ padding: 0 }}>
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              width: "100%",
              background: "var(--color-bg)",
              border: "none",
              fontSize: "1.1rem",
              fontWeight: 600,
              padding: "0.5rem 0.75rem",
              color: "var(--color-muted)",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <IconChevronRight
              size={13}
              style={{
                transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.15s ease",
                flexShrink: 0,
              }}
            />
            📄 {group.original_filename} — {group.batches.length} hojas
          </button>
        </td>
      </tr>
      {expanded &&
        group.batches.map((b) => (
          <BatchRow key={b.id} batch={b} hideFilename />
        ))}
    </>
  );
}

function BatchRow({
  batch,
  hideFilename = false,
}: {
  batch: ImportBatch;
  hideFilename?: boolean;
}) {
  const hasPendingReview = batch.rows.pending_review > 0;
  const isActive = batch.status === "processing" || batch.status === "pending";

  return (
    <tr>
      <td>
        <span className={`badge ${SOURCE_BADGE_CLASS[batch.source]}`}>
          {batch.source_label}
        </span>
      </td>
      <td style={{ fontSize: "0.875rem" }}>
        {hideFilename ? (
          batch.sheet_name && <span>Hoja: {batch.sheet_name}</span>
        ) : (
          <>
            {batch.original_filename}
            {batch.sheet_name && (
              <span
                className="text-muted"
                style={{ display: "block", fontSize: "0.8rem" }}
              >
                Hoja: {batch.sheet_name}
              </span>
            )}
          </>
        )}
        {batch.institution && (
          <span
            className="text-muted"
            style={{ display: "block", fontSize: "0.8rem" }}
          >
            {batch.institution.name}
          </span>
        )}
      </td>
      <td style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>
        {formatDate(batch.created_at)}
      </td>
      <td>
        <span className={STATUS_CLASS[batch.status]}>
          {isActive && "⟳ "}
          {STATUS_LABEL[batch.status]}
        </span>
        {batch.status === "failed" && batch.error_message && (
          <span
            className="text-muted"
            style={{ display: "block", fontSize: "0.75rem", marginTop: 2 }}
          >
            {batch.error_message.slice(0, 80)}
          </span>
        )}
      </td>
      <td
        style={{
          textAlign: "center",
          color: "var(--color-success)",
          fontWeight: 600,
        }}
      >
        {batch.rows.matched > 0 ? batch.rows.matched : "—"}
      </td>
      <td
        style={{
          textAlign: "center",
          color: hasPendingReview
            ? "var(--color-warning)"
            : "var(--color-muted)",
          fontWeight: hasPendingReview ? 700 : 400,
        }}
      >
        {batch.rows.pending_review > 0 ? batch.rows.pending_review : "—"}
      </td>
      <td style={{ textAlign: "center", color: "var(--color-muted)" }}>
        {batch.rows.no_match > 0 ? batch.rows.no_match : "—"}
      </td>
      <td
        style={{
          textAlign: "center",
          color:
            batch.rows.errors > 0
              ? "var(--color-danger)"
              : "var(--color-muted)",
        }}
      >
        {batch.rows.errors > 0 ? batch.rows.errors : "—"}
      </td>
      <td>
        {hasPendingReview && (
          <Link
            to={`/imports/${batch.id}/review`}
            className="btn btn-sm btn-primary"
          >
            Revisar ({batch.rows.pending_review})
          </Link>
        )}
        {!hasPendingReview && batch.status === "completed" && (
          <Link
            to={`/imports/${batch.id}/review`}
            className="btn btn-sm btn-secondary"
          >
            Ver detalle
          </Link>
        )}
      </td>
    </tr>
  );
}

function UploadPanel() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const [originalFilename, setOriginalFilename] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<ImportSheetAssignment[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    mutateAsync: preview,
    isPending: isPreviewing,
    error: previewError,
    reset: resetPreview,
  } = usePreviewImportMutation();
  const {
    mutateAsync: submitSheets,
    isPending: isSubmitting,
    isSuccess,
    error: submitError,
    reset: resetSubmit,
  } = useSubmitImportSheetsMutation();

  const previewErrorMsg = previewError
    ? ((previewError as { response?: { data?: { message?: string } } }).response
        ?.data?.message ?? "No se pudo leer el archivo.")
    : null;
  const submitErrorMsg = submitError
    ? ((submitError as { response?: { data?: { message?: string } } }).response
        ?.data?.message ?? "Error al procesar el archivo.")
    : null;

  async function handleFile(selected: File) {
    resetSubmit();
    setFile(selected);
    setStoragePath(null);
    setAssignments([]);

    const fd = new FormData();
    fd.append("file", selected);
    const { data } = await preview(fd);
    setStoragePath(data.storage_path);
    setOriginalFilename(data.original_filename);
    setAssignments(
      data.sheets.map((s) => ({
        sheet_name: s.sheet_name,
        source: "civil_registry",
        institution_id: undefined,
        included: true,
      })),
    );
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  }

  function updateAssignment(
    index: number,
    patch: Partial<ImportSheetAssignment>,
  ) {
    setAssignments((prev) =>
      prev.map((a, i) => (i === index ? { ...a, ...patch } : a)),
    );
  }

  function resetAll() {
    setFile(null);
    setStoragePath(null);
    setOriginalFilename(null);
    setAssignments([]);
    resetPreview();
    if (fileRef.current) fileRef.current.value = "";
  }

  const includedAssignments = assignments.filter((a) => a.included);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!storagePath || !originalFilename) return;

    await submitSheets({
      storage_path: storagePath,
      original_filename: originalFilename,
      // Solo se envían las hojas que el operador dejó marcadas — las
      // descartadas ni siquiera generan un ImportBatch.
      sheets: includedAssignments.map(
        ({ sheet_name, source, institution_id }) => ({
          sheet_name,
          source,
          institution_id,
        }),
      ),
    });
    resetAll();
  }

  const canSubmit =
    storagePath !== null &&
    includedAssignments.length > 0 &&
    includedAssignments.every(
      (a) => !INSTITUTION_TYPE_BY_SOURCE[a.source] || !!a.institution_id,
    );

  if (!open) {
    return (
      <button
        className="btn btn-primary"
        style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        onClick={() => setOpen(true)}
      >
        <IconUpload size={16} />
        Subir archivo
      </button>
    );
  }

  return (
    <div
      className="card"
      style={{
        marginBottom: "1.5rem",
        padding: "1.25rem",
        border: "1px solid var(--color-border)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "1rem",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>
          Subir archivo de importación
        </h3>
        <button
          className="btn-link"
          style={{ fontSize: "0.875rem" }}
          onClick={() => setOpen(false)}
        >
          Cancelar
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Zona de drop */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? "var(--color-primary)" : "var(--color-border)"}`,
            borderRadius: "var(--radius)",
            padding: "1.5rem",
            textAlign: "center",
            cursor: "pointer",
            background: dragOver ? "#eff6ff" : "var(--color-bg)",
            marginBottom: "1rem",
            transition: "all 0.15s",
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt,.xlsx,.xls"
            style={{ display: "none" }}
            onChange={(e) => {
              const selected = e.target.files?.[0];
              if (selected) handleFile(selected);
            }}
          />
          {file ? (
            <p
              style={{
                margin: 0,
                fontWeight: 500,
                color: "var(--color-primary)",
              }}
            >
              📄 {file.name} ({(file.size / 1024).toFixed(0)} KB)
            </p>
          ) : (
            <>
              <IconUpload
                size={28}
                style={{ color: "var(--color-muted)", marginBottom: 8 }}
              />
              <p
                style={{
                  margin: 0,
                  color: "var(--color-muted)",
                  fontSize: "0.875rem",
                }}
              >
                Arrastrá el archivo aquí o hacé clic para seleccionar
              </p>
              <p
                style={{
                  margin: "4px 0 0",
                  color: "var(--color-muted)",
                  fontSize: "0.8rem",
                }}
              >
                CSV, TXT o Excel (.xlsx, .xls) — máximo 10 MB. Si el Excel tiene
                varias hojas, se detectan todas.
              </p>
            </>
          )}
        </div>

        {isPreviewing && (
          <p className="text-muted" style={{ marginBottom: "0.75rem" }}>
            Leyendo archivo…
          </p>
        )}
        {previewErrorMsg && (
          <div
            className="alert alert-error"
            style={{ marginBottom: "0.75rem" }}
          >
            {previewErrorMsg}
          </div>
        )}

        {/* Asignación de fuente/institución por hoja */}
        {assignments.length > 0 && (
          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                display: "block",
                fontWeight: 500,
                marginBottom: 6,
                fontSize: "0.875rem",
              }}
            >
              {assignments.length > 1
                ? `Se detectaron ${assignments.length} hojas — desmarcá las que no necesitás e indicá la fuente e institución del resto`
                : "Fuente del archivo"}
            </label>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {assignments.map((assignment, index) => (
                <SheetAssignmentRow
                  key={index}
                  assignment={assignment}
                  showLabel={assignments.length > 1}
                  allowDiscard={assignments.length > 1}
                  onChange={(patch) => updateAssignment(index, patch)}
                />
              ))}
            </div>
            {assignments.length > 1 && includedAssignments.length === 0 && (
              <p
                style={{
                  margin: "0.5rem 0 0",
                  color: "var(--color-danger)",
                  fontSize: "0.8rem",
                }}
              >
                Marcá al menos una hoja para poder procesar el archivo.
              </p>
            )}
          </div>
        )}

        {submitErrorMsg && (
          <div
            className="alert alert-error"
            style={{ marginBottom: "0.75rem" }}
          >
            {submitErrorMsg}
          </div>
        )}
        {isSuccess && (
          <div
            className="alert alert-success"
            style={{ marginBottom: "0.75rem" }}
          >
            Archivo enviado. El procesamiento comenzará en instantes.
          </div>
        )}

        <div className="action-group">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? "Enviando…" : "Procesar archivo"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Fila de asignación de fuente/institución por hoja ───────────────────────

const SOURCE_LABEL: Record<ImportSource, string> = {
  civil_registry: "Registro Civil",
  education: "Educación",
  health: "Salud",
};

const INSTITUTION_TYPE_BY_SOURCE: Partial<
  Record<ImportSource, "educacion" | "salud">
> = {
  education: "educacion",
  health: "salud",
};

function SheetAssignmentRow({
  assignment,
  showLabel,
  allowDiscard,
  onChange,
}: {
  assignment: ImportSheetAssignment;
  showLabel: boolean;
  allowDiscard: boolean;
  onChange: (patch: Partial<ImportSheetAssignment>) => void;
}) {
  const institutionType = INSTITUTION_TYPE_BY_SOURCE[assignment.source];
  const institutions = useInstitutionOptions(
    institutionType ?? "educacion",
    institutionType !== undefined,
  );

  const [downloadingTemplate, setDownloadingTemplate] =
    useState<TemplateFormat | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);

  // Descarga autenticada: el token va en el header Authorization, no en
  // cookies, así que no se puede navegar directo con un <a href>.
  async function handleDownloadTemplate(format: TemplateFormat) {
    setTemplateError(null);
    setDownloadingTemplate(format);
    try {
      const response = await downloadImportTemplate(assignment.source, format);
      const disposition = response.headers["content-disposition"] as
        | string
        | undefined;
      const match = disposition?.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] ?? `plantilla_${assignment.source}.${format}`;

      const url = URL.createObjectURL(response.data as Blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setTemplateError("No se pudo descargar la plantilla. Intentá de nuevo.");
    } finally {
      setDownloadingTemplate(null);
    }
  }

  return (
    <div
      style={{
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius)",
        padding: "0.75rem",
        opacity: assignment.included ? 1 : 0.6,
        background: assignment.included ? undefined : "var(--color-bg)",
      }}
    >
      {(showLabel || allowDiscard) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 8,
          }}
        >
          {showLabel && (
            <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>
              Hoja: {assignment.sheet_name ?? "Archivo completo"}
            </div>
          )}
          {allowDiscard && (
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
                fontSize: "0.8rem",
                color: "var(--color-muted)",
                whiteSpace: "nowrap",
              }}
            >
              <input
                type="checkbox"
                checked={assignment.included}
                onChange={(e) => onChange({ included: e.target.checked })}
              />
              Usar esta hoja
            </label>
          )}
        </div>
      )}

      {!assignment.included && (
        <p
          style={{
            margin: 0,
            fontSize: "0.8rem",
            color: "var(--color-muted)",
          }}
        >
          Esta hoja no se va a procesar.
        </p>
      )}

      {assignment.included && (
        <>
          <div
            style={{
              display: "flex",
              gap: "1.5rem",
              marginBottom: institutionType ? 10 : 0,
            }}
          >
            {(["civil_registry", "education", "health"] as const).map((s) => (
              <label
                key={s}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                  fontSize: "0.875rem",
                }}
              >
                <input
                  type="radio"
                  name={`source-${assignment.sheet_name ?? "unica"}`}
                  value={s}
                  checked={assignment.source === s}
                  onChange={() =>
                    onChange({ source: s, institution_id: undefined })
                  }
                />
                {SOURCE_LABEL[s]}
              </label>
            ))}
          </div>

          {institutionType && (
            <div style={{ marginBottom: 10 }}>
              <select
                className="search-input"
                value={assignment.institution_id ?? ""}
                onChange={(e) =>
                  onChange({ institution_id: e.target.value || undefined })
                }
                required
                style={{ width: "100%", maxWidth: 360 }}
              >
                <option value="">
                  {institutionType === "salud"
                    ? "Seleccionar institución de salud…"
                    : "Seleccionar institución educativa…"}
                </option>
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {(["xlsx", "csv", "txt"] as const).map((format) => (
              <button
                key={format}
                type="button"
                className="btn btn-sm btn-secondary"
                disabled={downloadingTemplate !== null}
                onClick={() => handleDownloadTemplate(format)}
              >
                {downloadingTemplate === format
                  ? "Descargando…"
                  : `Plantilla ${TEMPLATE_FORMAT_LABEL[format]}`}
              </button>
            ))}
          </div>
          {templateError && (
            <p
              style={{
                margin: "6px 0 0",
                color: "var(--color-danger)",
                fontSize: "0.8rem",
              }}
            >
              {templateError}
            </p>
          )}
        </>
      )}
    </div>
  );
}
