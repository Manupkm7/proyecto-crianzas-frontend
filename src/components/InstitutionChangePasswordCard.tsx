import { useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { useChangeMyInstitutionPasswordMutation } from "../hooks/useInstitutions";
import type { ApiErrorBody } from "../types";
import { Field, Input } from "./FormControls";
import { Button } from "./Button";
import styles from "../pages/css/forms.module.css";

/**
 * InstitutionChangePasswordCard — Sección de "Mi institución" para que la propia
 * institución reemplace su contraseña por una que pueda recordar, típicamente
 * después de que el admin le reseteó la clave (que es aleatoria).
 *
 * Llama a POST /institution/change-password (InstitutionAuthController). El
 * backend exige la contraseña actual y la misma política de fortaleza que el
 * resto del sistema (mín. 12, mayúsculas, minúsculas, números y símbolos).
 */
export function InstitutionChangePasswordCard({ mustChange = false }: { mustChange?: boolean }) {
  const mutation = useChangeMyInstitutionPasswordMutation();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | null>>({});

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setFieldErrors({});

    if (next !== confirm) {
      setFieldErrors({ password_confirmation: ["Las contraseñas no coinciden."] });
      return;
    }

    try {
      await mutation.mutateAsync({
        current_password: current,
        password: next,
        password_confirmation: confirm,
      });
      setSuccess(true);
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      if (isAxiosError<ApiErrorBody>(err) && err.response?.status === 422) {
        setFieldErrors(err.response.data.errors ?? {});
        setError("Revisá los campos marcados.");
      } else {
        const message = isAxiosError<ApiErrorBody>(err)
          ? err.response?.data?.message
          : undefined;
        setError(message ?? "No se pudo cambiar la contraseña.");
      }
    }
  }

  return (
    <section className={styles.formCard} style={{ marginTop: "20px" }}>
      <h2 style={{ margin: "0 0 6px", fontSize: "18px" }}>Cambiar contraseña</h2>
      <p className="text-muted" style={{ margin: "0 0 16px", fontSize: "14px" }}>
        Es la contraseña con la que la institución ingresa al sistema. Elegí una
        que puedas recordar: mínimo 12 caracteres, con mayúsculas, minúsculas,
        números y símbolos.
      </p>

      {mustChange && !success && (
        <div className="alert alert-error" style={{ marginBottom: "14px" }}>
          Estás usando una contraseña temporal generada por el administrador.
          Cambiala por una propia.
        </div>
      )}
      {error && <div className="alert alert-error" style={{ marginBottom: "14px" }}>{error}</div>}
      {success && (
        <div className="alert alert-success" style={{ marginBottom: "14px" }}>
          Contraseña actualizada. Se cerraron las demás sesiones de la institución.
        </div>
      )}

      <form className={styles.form} onSubmit={handleSubmit} style={{ maxWidth: "420px" }}>
        <Field label="Contraseña actual">
          <Input
            type="password"
            name="current_password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
            autoComplete="current-password"
          />
          {fieldErrors.current_password && (
            <span className="field-error">{fieldErrors.current_password[0]}</span>
          )}
        </Field>
        <Field label="Nueva contraseña">
          <Input
            type="password"
            name="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
            autoComplete="new-password"
          />
          {fieldErrors.password && (
            <span className="field-error">{fieldErrors.password[0]}</span>
          )}
        </Field>
        <Field label="Repetir nueva contraseña">
          <Input
            type="password"
            name="password_confirmation"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
          />
          {fieldErrors.password_confirmation && (
            <span className="field-error">{fieldErrors.password_confirmation[0]}</span>
          )}
        </Field>
        <div>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Guardando…" : "Cambiar contraseña"}
          </Button>
        </div>
      </form>
    </section>
  );
}
