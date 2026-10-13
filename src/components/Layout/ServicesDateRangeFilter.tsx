import { useEffect, useState } from "react";
import { useServicesDateRange } from "../../context/ServicesDateRangeContext";
import {
  EMPTY_SERVICES_DATE_RANGE,
  isServicesDateRangeActive,
  isServicesDateRangeValid,
  type ServicesDateRange,
} from "../../api/servicesDateRange";
import styles from "./styles.module.css";

// Filtro global "Fecha de prestaciones" — en el sidebar y en la barra de filtros
// del dashboard; ambos comparten ServicesDateRangeContext. Se aplica apenas el
// rango es válido (desde ≤ hasta); mientras no lo es, queda como borrador con aviso.
export function ServicesDateRangeFilter({
  variant = "sidebar",
}: {
  variant?: "sidebar" | "inline";
}) {
  const { range, setRange } = useServicesDateRange();
  const [draft, setDraft] = useState<ServicesDateRange>(range);

  // Si el rango cambia desde afuera (chip del topbar, logout), se refleja acá.
  useEffect(() => {
    setDraft(range);
  }, [range]);

  const invalid = !isServicesDateRangeValid(draft);

  function update(next: ServicesDateRange) {
    setDraft(next);
    if (isServicesDateRangeValid(next)) setRange(next);
  }

  return (
    <div className={variant === "inline" ? styles.filterInline : styles.scope}>
      <span className={styles.navLabel}>Fecha de prestaciones</span>
      <div className={styles.dateGrid}>
        <label className={styles.dateField}>
          <span>Desde</span>
          <input
            type="date"
            className={styles.dateInput}
            value={draft.from}
            max={draft.to || undefined}
            onChange={(e) => update({ ...draft, from: e.target.value })}
          />
        </label>
        <label className={styles.dateField}>
          <span>Hasta</span>
          <input
            type="date"
            className={styles.dateInput}
            value={draft.to}
            min={draft.from || undefined}
            onChange={(e) => update({ ...draft, to: e.target.value })}
          />
        </label>
      </div>
      {invalid && (
        <p className={styles.dateError}>
          La fecha hasta no puede ser anterior a la fecha desde.
        </p>
      )}
      {(isServicesDateRangeActive(draft) || invalid) && (
        <button
          type="button"
          className={styles.dateClear}
          onClick={() => update(EMPTY_SERVICES_DATE_RANGE)}
        >
          Limpiar fechas
        </button>
      )}
    </div>
  );
}
