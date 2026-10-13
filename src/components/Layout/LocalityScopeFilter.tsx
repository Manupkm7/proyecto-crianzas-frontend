import { useId } from "react";
import { useLocalityScope } from "../../context/LocalityScopeContext";
import { LOCALITY_SCOPE_OPTIONS } from "../../api/localityScope";
import styles from "./styles.module.css";

const cx = (...c: (string | false | undefined)[]) =>
  c.filter(Boolean).join(" ");

// Ámbito global (San Justo / Uriburu) — se usa en el sidebar y en la barra de
// filtros del dashboard. Ambos leen/escriben el mismo LocalityScopeContext, así
// que cambiar uno actualiza el otro. Solo admin/coordinador lo ven.
export function LocalityScopeFilter({
  variant = "sidebar",
}: {
  variant?: "sidebar" | "inline";
}) {
  const { scope, setScope, canChoose } = useLocalityScope();
  // Dos instancias en pantalla (sidebar + dashboard): ids únicos para aria.
  const labelId = useId();

  if (!canChoose) return null;

  return (
    <div className={variant === "inline" ? styles.filterInline : styles.scope}>
      <span className={styles.navLabel} id={labelId}>
        Ámbito
      </span>
      <div className={styles.scopeGroup} role="radiogroup" aria-labelledby={labelId}>
        {LOCALITY_SCOPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={scope === opt.value}
            title={opt.label}
            className={cx(styles.scopeBtn, scope === opt.value && styles.scopeBtnActive)}
            onClick={() => setScope(opt.value)}
          >
            {variant === "inline" ? opt.label : opt.short}
          </button>
        ))}
      </div>
    </div>
  );
}
