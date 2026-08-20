import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { isAxiosError } from "axios";
import {
  useInstitutionQuery,
  useCreateInstitutionMutation,
  useUpdateInstitutionMutation,
} from "../hooks/useInstitutions";
import {
  useDepartmentsQuery,
  useLocalitiesQuery,
  useProvincesQuery,
} from "../hooks/useGeo";
import { useAuth } from "../context/AuthContext";
import type { ApiErrorBody, InstitutionType } from "../types";
import styles from "./css/forms.module.css";
import {
  Checkbox,
  Field,
  FormRow,
  Input,
  Select,
} from "../components/FormControls";
import { Button } from "../components/Button";

const INSTITUTION_TYPES: { value: InstitutionType; label: string }[] = [
  { value: "salud", label: "Salud" },
  { value: "educacion", label: "Educación" },
  { value: "desarrollo_social", label: "Desarrollo Social" },
  { value: "justicia", label: "Justicia" },
  { value: "otro", label: "Otro" },
];

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
  });

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

  const {
    data: fetchedInstitution,
    isLoading: loadingInstitution,
    error: institutionQueryError,
  } = useInstitutionQuery(isEdit ? id : undefined);
  const createInstitutionMutation = useCreateInstitutionMutation();
  const updateInstitutionMutation = useUpdateInstitutionMutation(id ?? "");
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
    });
    // Precarga provincia/departamento a partir de la cadena de jurisdicción
    // que devuelve el backend, para que el desplegable en cascada arranque
    // ya posicionado en la localidad guardada (ver InstitutionResource).
    setProvinceId(fetchedInstitution.province?.id ?? "");
    setDepartmentId(fetchedInstitution.department?.id ?? "");
  }, [fetchedInstitution]);

  useEffect(() => {
    if (institutionQueryError) setError("No se pudo cargar la institución.");
  }, [institutionQueryError]);

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
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
        ? { ...form }
        : { address: form.address, phone: form.phone };

      if (isEdit && id) {
        await updateInstitutionMutation.mutateAsync(payload);
        setSuccess("Institución actualizada correctamente.");
      } else {
        await createInstitutionMutation.mutateAsync(payload);
        navigate("/institutions");
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
          {isInstitucion && (
            <p
              className="text-muted"
              style={{ marginTop: "0.25rem", fontSize: "0.875rem" }}
            >
              Podés actualizar la dirección y el teléfono de contacto de tu
              institución.
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
              <Field label="Tipo de institución *">
                <Select
                  id="type"
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                  required={canEditSensitiveFields}
                  disabled={!canEditSensitiveFields}
                >
                  {INSTITUTION_TYPES.map((t) => (
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
                    El tipo solo puede modificarlo el administrador.
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
      </div>
    </>
  );
}
