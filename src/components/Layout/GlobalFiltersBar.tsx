import { LocalityScopeFilter } from "./LocalityScopeFilter";
import { ServicesDateRangeFilter } from "./ServicesDateRangeFilter";
import styles from "./styles.module.css";

// Barra horizontal con los filtros globales del sidebar (fecha de prestaciones
// + ámbito), para el dashboard. Son los MISMOS filtros, no una copia: comparten
// contexto con el sidebar y afectan a toda la plataforma.
export function GlobalFiltersBar() {
  return (
    <div className={styles.filtersBar}>
      <ServicesDateRangeFilter variant="inline" />
      <LocalityScopeFilter variant="inline" />
    </div>
  );
}
