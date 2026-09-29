import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { isAxiosError } from "axios";
import {
  useInstitutionQuery,
  useCreateInstitutionMutation,
  useUpdateInstitutionMutation,
  useResetInstitutionPasswordMutation,
  useCreateProgramAreaMutation,
  useProgramAreasQuery,
} from "../hooks/useInstitutions";
import { PasswordRevealModal } from "../components/PasswordRevealModal";
import { InstitutionChangePasswordCard } from "../components/InstitutionChangePasswordCard";
import {
  useDepartmentsQuery,
  useLocalitiesQuery,
  useProvincesQuery,
} from "../hooks/useGeo";
import { useAuth } from "../context/AuthContext";
import { useProviderOptions } from "../hooks/useServices";
import {
  ADMINISTRATIVE_DEPENDENCY_OPTIONS,
  SECTOR_OPTIONS,
  type AdministrativeDependency,
  type ApiErrorBody,
  type InstitutionArticulation,
  type InstitutionType,
} from "../types";
import styles from "./css/forms.module.css";
import {
  Checkbox,
  Field,
  FormRow,
  Input,
  Select,
  SectionTitle,
  Textarea,
} from "../components/FormControls";
import { Button } from "../components/Button";
import { Badge } from "../components/Badge";

/** Sectores ofrecidos + el heredado de la institución si lo tiene ('justicia'). */
function sectorOptions(
  current: InstitutionType,
): { value: InstitutionType; label: string }[] {
  return SECTOR_OPTIONS.some((o) => o.value === current)
    ? SECTOR_OPTIONS
    : [...SECTOR_OPTIONS, { value: current, label: "Justicia (heredado)" }];
}

/**
 * InstitutionFormPage — Formulario para crear o editar una institución.
 *
 * Modo creación:  /institutions/new        — solo admin
 * Modo edición:   /institutions/:id        — admin (todos los campos)
 *                                          — responsable de institución (dirección y teléfono)
 *
 * El backend ya rechaza modificaciones no autorizadas (403), pero el formulario
 * también oculta o deshabilita los campos según el rol para una mejor experiencia.
 */
export default function InstitutionFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const isEdit = Boolean(id);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Record<string, string[] | null>
  >({});
  // Contraseña institucional revelada de un solo uso. `context` decide qué pasa
  // al cerrar el modal: en 'create' navegamos a la lista; en 'reset' nos quedamos.
  const [revealedPassword, setRevealedPassword] = useState<{
    password: string;
    context: "create" | "reset";
  } | null>(null);

  const [form, setForm] = useState({
    name: "",
    type: "salud" as InstitutionType,
    address: "",
    phone: "",
    locality_id: "",
    is_active: true,
    offers_jardin: false,
    offers_primario: false,
    primario_years: 6 as 6 | 7,
    offers_secundario: false,
    secundario_years: 6 as 6 | 7,
    // Ficha del efector
    administrative_dependency: "" as AdministrativeDependency | "",
    program_area_id: "",
    beneficiaries: "",
    observations: "",
  });

  // Articulaciones: efectores (instituciones existentes) con los que trabaja.
  // Se guardan como lista completa: lo que no esté acá se quita al guardar.
  const [articulations, setArticulations] = useState<
    Pick<InstitutionArticulation, "id" | "name" | "type_label" | "is_active">[]
  >([]);
  const [articulationToAdd, setArticulationToAdd] = useState("");
  const [newProgramArea, setNewProgramArea] = useState<string | null>(null);
  const [programAreaError, setProgramAreaError] = useState<string | null>(null);

  // Provincia y departamento son solo para encadenar los desplegables: lo único
  // que se envía al backend es locality_id (form.locality_id).
  const [provinceId, setProvinceId] = useState("");
  const [departmentId, setDepartmentId] = useState("");

  const { data: provinces = [] } = useProvincesQuery();
  const { data: departments = [] } = useDepartmentsQuery(
    provinceId || undefined,
  );
  const { data: localities = [] } = useLocalitiesQuery(
    departmentId || undefined,
  );

  const authRole = authUser?.roles?.[0];
  const isAdmin = authRole === "admin";
  const isInstitucion = authRole === "institucion";

  // El responsable solo puede editar datos de contacto; nombre y tipo son de solo lectura
  const canEditSensitiveFields = isAdmin;

  const { data: programAreas = [] } = useProgramAreasQuery();
  const createProgramAreaMutation = useCreateProgramAreaMutation();
  const allInstitutions = useProviderOptions(isAdmin);
  const articulationCandidates = allInstitutions.filter(
    (i) => i.id !== id && !articulations.some((a) => a.id === i.id),
  );

  const {
    data: fetchedInstitution,
    isLoading: loadingInstitution,
    error: institutionQueryError,
  } = useInstitutionQuery(isEdit ? id : undefined);
  const createInstitutionMutation = useCreateInstitutionMutation();
  const updateInstitutionMutation = useUpdateInstitutionMutation(id ?? "");
  const resetPasswordMutation = useResetInstitutionPasswordMutation();
  const loading = isEdit && loadingInstitution;
  const saving =
    createInstitutionMutation.isPending || updateInstitutionMutation.isPending;

  useEffect(() => {
    if (!fetchedInstitution) return;
    setForm({
      name: fetchedInstitution.name ?? "",
      type: fetchedInstitution.type ?? "salud",
      address: fetchedInstitution.address ?? "",
      phone: fetchedInstitution.phone ?? "",
      locality_id: fetchedInstitution.locality_id ?? "",
      is_active: fetchedInstitution.is_active ?? true,
      offers_jardin: fetchedInstitution.offers_jardin ?? false,
      offers_primario: fetchedInstitution.offers_primario ?? false,
      primario_years: (fetchedInstitution.primario_years as 6 | 7) ?? 6,
      offers_secundario: fetchedInstitution.offers_secundario ?? false,
      secundario_years: (fetchedInstitution.secundario_years as 6 | 7) ?? 6,
      administrative_dependency:
        fetchedInstitution.administrative_dependency ?? "",
      program_area_id: fetchedInstitution.program_area?.id ?? "",
      beneficiaries: fetchedInstitution.beneficiaries ?? "",
      observations: fetchedInstitution.observations ?? "",
    });
    setArticulations(fetchedInstitution.articulations ?? []);
    // Precarga provincia/departamento a partir de la cadena de jurisdicción
    // que devuelve el backend, para que el desplegable en cascada arranque
    // ya posicionado en la localidad guardada (ver InstitutionResource).
    setProvinceId(fetchedInstitution.province?.id ?? "");
    setDepartmentId(fetchedInstitution.department?.id ?? "");
  }, [fetchedInstitution]);

  useEffect(() => {
    if (institutionQueryError) setError("No se pudo cargar la institución.");
  }, [institutionQueryError]);

  function addArticulation() {
    const inst = allInstitutions.find((i) => i.id === articulationToAdd);
    if (!inst) return;
    setArticulations((list) =>
      [...list, { id: inst.id, name: inst.name, type_label: inst.type_label ?? "", is_active: inst.is_active }]
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
    setArticulationToAdd("");
  }

  async function saveNewProgramArea() {
    const name = (newProgramArea ?? "").trim();
    setProgramAreaError(null);
    if (name.length < 2) {
      setProgramAreaError("Escribí el nombre de la dependencia.");
      return;
    }
    try {
      const area = await createProgramAreaMutation.mutateAsync(name);
      setForm((f) => ({ ...f, program_area_id: area.id }));
      setNewProgramArea(null);
    } catch (err) {
      const message = isAxiosError<ApiErrorBody>(err)
        ? (err.response?.data?.errors?.name?.[0] ?? err.response?.data?.message)
        : undefined;
      setProgramAreaError(message ?? "No se pudo agregar la dependencia.");
    }
  }

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value, type } = e.target;
    const checked =
      type === "checkbox" ? (e.target as HTMLInputElement).checked : undefined;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
    setFieldErrors((fe) => ({ ...fe, [name]: null }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setFieldErrors({});

    try {
      // El responsable solo envía los campos que le corresponden editar
      const payload = canEditSensitiveFields
        ? {
            ...form,
            administrative_dependency: form.administrative_dependency || null,
            program_area_id: form.program_area_id || null,
            beneficiaries: form.beneficiaries.trim() || null,
            observations: form.observations.trim() || null,
            articulation_ids: articulations.map((a) => a.id),
          }
        : { address: form.address, phone: form.phone };

      if (isEdit && id) {
        await updateInstitutionMutation.mutateAsync(payload);
        setSuccess("Institución actualizada correctamente.");
      } else {
        const { data } = await createInstitutionMutation.mutateAsync(payload);
        // No navegamos todavía: el backend devuelve la contraseña institucional
        // inicial una sola vez y hay que mostrarla antes de salir de esta pantalla.
        setRevealedPassword({
          password: data.initial_password,
          context: "create",
        });
      }
    } catch (err) {
      if (isAxiosError<ApiErrorBody>(err) && err.response?.status === 422) {
        const errs = err.response.data.errors ?? {};
        setFieldErrors(errs);
        setError(
          "Hay errores en el formulario. Revisá los campos marcados en rojo.",
        );
      } else {
        const message = isAxiosError<ApiErrorBody>(err)
          ? err.response?.data?.message
          : undefined;
        setError(message ?? "Error al guardar la institución.");
      }
    }
  }

  const handleCancel = () => {
    if (isInstitucion) {
      navigate("/");
      return;
    }
    navigate("/institutions");
  };

  async function handleResetPassword() {
    if (!id) return;
    if (
      !confirm(
        `¿Resetear la contraseña de "${form.name}"?\n` +
          "La contraseña actual dejará de funcionar de inmediato y se cerrarán " +
          "las sesiones activas de la institución. Se generará una nueva que verás una sola vez.",
      )
    )
      return;

    setError(null);
    try {
      const { data } = await resetPasswordMutation.mutateAsync(id);
      setRevealedPassword({ password: data.initial_password, context: "reset" });
    } catch (err) {
      const message = isAxiosError<ApiErrorBody>(err)
        ? err.response?.data?.message
        : undefined;
      setError(message ?? "No se pudo resetear la contraseña institucional.");
    }
  }

  function handleCloseReveal() {
    const context = revealedPassword?.context;
    setRevealedPassword(null);
    if (context === "create") navigate("/institutions");
  }

  if (loading) {
    return <p className="text-muted">Cargando…</p>;
  }

  return (
    <>
      <div className={styles.page}>
        <Link
          to={isInstitucion ? "/" : "/institutions"}
          className={styles.back}
        >
          ← {isInstitucion ? "Volver al inicio" : "Volver a instituciones"}
        </Link>
        <div className={styles.intro}>
          <h1>
            {isEdit ? form.name || "Editar institución" : "Nueva institución"}
          </h1>
          {isEdit && fetchedInstitution?.code != null && (
            <p
              className="text-muted"
              style={{ marginTop: "0.25rem", fontSize: "0.875rem" }}
            >
              ID_EFECTOR <strong>{fetchedInstitution.code}</strong>
            </p>
          )}
          {isInstitucion && (
            <p
              className="text-muted"
              style={{ marginTop: "0.25rem", fontSize: "0.875rem" }}
            >
              Podés actualizar la dirección y el teléfono de contacto de tu
              institución. El resto de la ficha lo mantiene el administrador.
            </p>
          )}
        </div>

        <section className={styles.formCard}>
          <form className={styles.form} onSubmit={handleSubmit}>
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}
            <Field label="Nombre de la institución *">
              <Input
                id="name"
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required={!isEdit || canEditSensitiveFields}
                disabled={!canEditSensitiveFields}
                style={
                  !canEditSensitiveFields
                    ? { background: "#f8fafc", color: "var(--color-muted)" }
                    : {}
                }
              />
              {fieldErrors.name && (
                <span className="field-error">{fieldErrors.name[0]}</span>
              )}
              {!canEditSensitiveFields && (
                <span
                  className="field-error"
                  style={{ color: "var(--color-muted)", fontWeight: "normal" }}
                >
                  El nombre solo puede modificarlo el administrador del sistema.
                </span>
              )}
            </Field>
            <FormRow>
              <Field label="Sector *">
                <Select
                  id="type"
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                  required={canEditSensitiveFields}
                  disabled={!canEditSensitiveFields}
                >
                  {sectorOptions(form.type).map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
                {fieldErrors.type && (
                  <span className="field-error">{fieldErrors.type[0]}</span>
                )}
                {!canEditSensitiveFields && (
                  <span
                    className="field-error"
                    style={{
                      color: "var(--color-muted)",
                      fontWeight: "normal",
                    }}
                  >
                    El sector solo puede modificarlo el administrador.
                  </span>
                )}
              </Field>
              {canEditSensitiveFields && form.type === "educacion" && (
                <Field label="Niveles educativos que ofrece">
                  <Checkbox
                    type="checkbox"
                    id="offers_jardin"
                    name="offers_jardin"
                    checked={form.offers_jardin}
                    onChange={handleChange}
                    label="Jardín maternal e infantil (sala 1 a 5)"
                  />
                  <Checkbox
                    type="checkbox"
                    id="offers_primario"
                    name="offers_primario"
                    checked={form.offers_primario}
                    onChange={handleChange}
                    label="Primario"
                  />
                  {form.offers_primario && (
                    <div
                      className="field"
                      style={{ marginLeft: "1.5rem", maxWidth: "220px" }}
                    >
                      <Field label="Cantidad de años de primario">
                        <Select
                          id="primario_years"
                          name="primario_years"
                          value={form.primario_years}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              primario_years: Number(e.target.value) as 6 | 7,
                            }))
                          }
                        >
                          <option value={6}>6 años</option>
                          <option value={7}>7 años</option>
                        </Select>
                      </Field>
                    </div>
                  )}
                  <Checkbox
                    type="checkbox"
                    id="offers_secundario"
                    name="offers_secundario"
                    checked={form.offers_secundario}
                    onChange={handleChange}
                    label="Secundario"
                  />
                  {form.offers_secundario && (
                    <div
                      className="field"
                      style={{ marginLeft: "1.5rem", maxWidth: "220px" }}
                    >
                      <Field label="Cantidad de años de secundario">
                        <Select
                          id="secundario_years"
                          name="secundario_years"
                          value={form.secundario_years}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              secundario_years: Number(e.target.value) as 6 | 7,
                            }))
                          }
                        >
                          <option value={6}>6 años</option>
                          <option value={7}>7 años</option>
                        </Select>
                      </Field>
                    </div>
                  )}
                </Field>
              )}
              {isEdit && canEditSensitiveFields && (
                <Field label="Estado">
                  <Checkbox
                    label="Institución activa"
                    type="checkbox"
                    id="is_active"
                    name="is_active"
                    checked={form.is_active}
                    onChange={handleChange}
                  />
                </Field>
              )}
            </FormRow>
            <FormRow>
              <Field label="Provincia *">
                <Select
                  id="province"
                  value={provinceId}
                  onChange={(e) => {
                    setProvinceId(e.target.value);
                    setDepartmentId("");
                    setForm((f) => ({ ...f, locality_id: "" }));
                  }}
                  required={canEditSensitiveFields}
                  disabled={!canEditSensitiveFields}
                >
                  <option value="">Seleccioná una provincia…</option>
                  {provinces.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Departamento *">
                <Select
                  defaultValue="LA MATANZA"
                  id="department"
                  value={departmentId}
                  onChange={(e) => {
                    setDepartmentId(e.target.value);
                    setForm((f) => ({ ...f, locality_id: "" }));
                  }}
                  required={canEditSensitiveFields}
                  disabled={!canEditSensitiveFields || !provinceId}
                >
                  <option value="">Seleccioná un departamento…</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </FormRow>
            <Field label="Localidad *">
              <Select
                defaultValue="SAN JUSTO"
                id="locality_id"
                name="locality_id"
                value={form.locality_id}
                onChange={handleChange}
                required={canEditSensitiveFields}
                disabled={!canEditSensitiveFields || !departmentId}
              >
                <option value="">Seleccioná una localidad…</option>
                {localities.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
              {fieldErrors.locality_id && (
                <span className="field-error">
                  {fieldErrors.locality_id[0]}
                </span>
              )}
            </Field>
            <FormRow>
              <Field label="Dirección">
                <Input
                  onChange={handleChange}
                  value={form.address}
                  id="address"
                  type="text"
                  name="address"
                  placeholder="Ej: Av. Siempreviva 742"
                />
                {fieldErrors.address && (
                  <span className="field-error">{fieldErrors.address[0]}</span>
                )}
              </Field>
              <Field label="Teléfono">
                <Input
                  id="phone"
                  name="phone"
                  value={form.phone}
                  placeholder="01122334455"
                  onChange={handleChange}
                />
                {fieldErrors.phone && (
                  <span className="field-error">{fieldErrors.phone[0]}</span>
                )}
              </Field>
            </FormRow>

            {/* ── Ficha del efector (un efector ES una institución) ── */}
            <SectionTitle>Ficha del efector</SectionTitle>

            <FormRow>
              <Field label="Dependencia administrativa">
                <Select
                  id="administrative_dependency"
                  name="administrative_dependency"
                  value={form.administrative_dependency}
                  onChange={handleChange}
                  disabled={!canEditSensitiveFields}
                >
                  <option value="">Sin especificar</option>
                  {ADMINISTRATIVE_DEPENDENCY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
                {fieldErrors.administrative_dependency && (
                  <span className="field-error">
                    {fieldErrors.administrative_dependency[0]}
                  </span>
                )}
              </Field>

              <div>
                <Field label="Dependencia programática">
                  <Select
                    id="program_area_id"
                    name="program_area_id"
                    value={form.program_area_id}
                    onChange={handleChange}
                    disabled={!canEditSensitiveFields}
                  >
                    <option value="">Sin especificar</option>
                    {programAreas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </Select>
                  {fieldErrors.program_area_id && (
                    <span className="field-error">
                      {fieldErrors.program_area_id[0]}
                    </span>
                  )}
                </Field>
                {canEditSensitiveFields && newProgramArea === null && (
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    style={{ marginTop: 6 }}
                    onClick={() => {
                      setProgramAreaError(null);
                      setNewProgramArea("");
                    }}
                  >
                    + Agregar nueva
                  </button>
                )}
                {newProgramArea !== null && (
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      marginTop: 6,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ flex: "1 1 180px" }}>
                      <Input
                        value={newProgramArea}
                        placeholder="Ej.: Secretaría de Salud municipal"
                        maxLength={200}
                        onChange={(e) => setNewProgramArea(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            saveNewProgramArea();
                          }
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      disabled={createProgramAreaMutation.isPending}
                      onClick={saveNewProgramArea}
                    >
                      Agregar
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => setNewProgramArea(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                )}
                {programAreaError && (
                  <span className="field-error">{programAreaError}</span>
                )}
              </div>
            </FormRow>

            <Field label="Destinatarios">
              <Textarea
                id="beneficiaries"
                name="beneficiaries"
                rows={2}
                maxLength={3000}
                value={form.beneficiaries}
                onChange={handleChange}
                disabled={!canEditSensitiveFields}
                placeholder="Ej.: niños y niñas de 0 a 3 años y sus familias"
              />
              {fieldErrors.beneficiaries && (
                <span className="field-error">{fieldErrors.beneficiaries[0]}</span>
              )}
            </Field>

            <div>
              <span
                style={{
                  display: "block",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  marginBottom: 6,
                }}
              >
                Articulaciones
              </span>
              <p
                className="text-muted"
                style={{ margin: "0 0 8px", fontSize: "0.8rem" }}
              >
                Efectores con los que trabaja. La relación es mutua: también
                aparece en la ficha de la otra institución.
              </p>
              {articulations.length === 0 ? (
                <p className="text-muted" style={{ margin: 0, fontSize: "0.875rem" }}>
                  Sin articulaciones cargadas.
                </p>
              ) : (
                <ul
                  style={{
                    listStyle: "none",
                    margin: 0,
                    padding: 0,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                  }}
                >
                  {articulations.map((a) => (
                    <li key={a.id}>
                      <Badge tone={a.is_active ? "primary" : "neutral"}>
                        {a.name}
                        {a.type_label ? ` · ${a.type_label}` : ""}
                        {!a.is_active ? " (inactiva)" : ""}
                        {canEditSensitiveFields && (
                          <button
                            type="button"
                            aria-label={`Quitar ${a.name}`}
                            title="Quitar"
                            onClick={() =>
                              setArticulations((list) =>
                                list.filter((x) => x.id !== a.id),
                              )
                            }
                            style={{
                              border: "none",
                              background: "none",
                              cursor: "pointer",
                              padding: "0 0 0 4px",
                              color: "inherit",
                              fontWeight: 700,
                            }}
                          >
                            ×
                          </button>
                        )}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
              {canEditSensitiveFields && (
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    marginTop: 8,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <div style={{ flex: "1 1 220px", maxWidth: 420 }}>
                    <Select
                      aria-label="Institución a articular"
                      value={articulationToAdd}
                      onChange={(e) => setArticulationToAdd(e.target.value)}
                    >
                      <option value="">Elegir institución…</option>
                      {articulationCandidates.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name}
                          {i.type_label ? ` (${i.type_label})` : ""}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    disabled={!articulationToAdd}
                    onClick={addArticulation}
                  >
                    + Agregar
                  </button>
                </div>
              )}
              {fieldErrors.articulation_ids && (
                <span className="field-error">
                  {fieldErrors.articulation_ids[0]}
                </span>
              )}
            </div>

            <Field label="Observaciones">
              <Textarea
                id="observations"
                name="observations"
                rows={4}
                maxLength={10000}
                value={form.observations}
                onChange={handleChange}
                disabled={!canEditSensitiveFields}
              />
              {fieldErrors.observations && (
                <span className="field-error">{fieldErrors.observations[0]}</span>
              )}
            </Field>

            <div className={styles.actions}>
              <Button variant="secondary" onClick={handleCancel}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                Guardar cambios
              </Button>
            </div>
          </form>
        </section>

        {isEdit && isAdmin && (
          <section className={styles.formCard} style={{ marginTop: "20px" }}>
            <h2 style={{ margin: "0 0 6px", fontSize: "18px" }}>
              Contraseña institucional
            </h2>
            <p className="text-muted" style={{ margin: "0 0 16px", fontSize: "14px" }}>
              La institución usa esta contraseña para el ingreso institucional
              (provincia → departamento → localidad → sector → institución). Si se
              perdió o nunca se anotó, generá una nueva. Podés verla una sola vez.
            </p>
            <Button
              type="button"
              variant="danger"
              onClick={handleResetPassword}
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending
                ? "Generando…"
                : "Resetear contraseña institucional"}
            </Button>
          </section>
        )}

        {isEdit && isInstitucion && (
          <InstitutionChangePasswordCard
            mustChange={authUser?.password_must_change ?? false}
          />
        )}
      </div>

      {revealedPassword && (
        <PasswordRevealModal
          title={
            revealedPassword.context === "create"
              ? "Institución creada"
              : "Contraseña reseteada"
          }
          description={
            revealedPassword.context === "create" ? (
              <>
                Esta es la contraseña de ingreso institucional de{" "}
                <strong>{form.name}</strong>. Entregala a la persona responsable
                de la institución.
              </>
            ) : (
              <>
                Nueva contraseña de ingreso institucional de{" "}
                <strong>{form.name}</strong>. La anterior ya no funciona.
              </>
            )
          }
          password={revealedPassword.password}
          closeLabel={
            revealedPassword.context === "create"
              ? "Ir a instituciones"
              : "Entendido"
          }
          onClose={handleCloseReveal}
        />
      )}
    </>
  );
}
