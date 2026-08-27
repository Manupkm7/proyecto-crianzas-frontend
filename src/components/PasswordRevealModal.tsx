import { useState, type ReactNode } from "react";
import { Button } from "./Button";
import styles from "./css/PasswordRevealModal.module.css";

interface PasswordRevealModalProps {
  title: string;
  /** Texto explicativo — por qué aparece esto y qué tiene que hacer el usuario. */
  description: ReactNode;
  password: string;
  /** Etiqueta del botón de cierre. Por defecto "Entendido". */
  closeLabel?: string;
  onClose: () => void;
}

/**
 * PasswordRevealModal — Muestra una credencial de un solo uso (la contraseña
 * institucional generada por el backend al crear una institución o al resetearla).
 *
 * El backend devuelve la contraseña en texto plano UNA sola vez y no queda
 * recuperable después, así que este modal obliga a leerla antes de continuar
 * y ofrece copiarla al portapapeles.
 */
export function PasswordRevealModal({
  title,
  description,
  password,
  closeLabel = "Entendido",
  onClose,
}: PasswordRevealModalProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Portapapeles no disponible (contexto no seguro o permiso denegado):
      // la contraseña igual está visible para copiarla a mano.
      setCopied(false);
    }
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={title}>
      <div className={styles.card}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.description}>{description}</p>

        <div className={styles.passwordRow}>
          <code className={styles.password}>{password}</code>
          <Button type="button" variant="secondary" size="sm" onClick={handleCopy}>
            {copied ? "Copiada ✓" : "Copiar"}
          </Button>
        </div>

        <p className={styles.warning}>
          Guardala en un lugar seguro. No vas a poder volver a verla: si se pierde,
          hay que resetearla.
        </p>

        <div className={styles.actions}>
          <Button type="button" onClick={onClose}>
            {closeLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
