import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLocalityScope } from "../../context/LocalityScopeContext";
import { useServicesDateRange } from "../../context/ServicesDateRangeContext";
import { localityScopeLabel } from "../../api/localityScope";
import { LocalityScopeFilter } from "./LocalityScopeFilter";
import {
  EMPTY_SERVICES_DATE_RANGE,
  isServicesDateRangeActive,
  servicesDateRangeLabel,
} from "../../api/servicesDateRange";
import { ServicesDateRangeFilter } from "./ServicesDateRangeFilter";
import { Avatar } from "../Avatar";
import {
  IconActivity,
  IconHome,
  IconChildren,
  IconUsers,
  IconBuilding,
  IconLogout,
  IconHeart,
  IconMenu,
  IconUpload,
  IconDownload,
} from "../icons";
import type { Role } from "../../types";
import styles from "./styles.module.css";

const cx = (...c: (string | false | undefined)[]) =>
  c.filter(Boolean).join(" ");

const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  coordinador: "Coordinador",
  institucion: "Responsable de institución",
  representante: "Representante",
};

export function AppContainer({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { scope, setScope } = useLocalityScope();
  const { range: dateRange, setRange: setDateRange } = useServicesDateRange();

  const role = user?.roles?.[0];
  const isAdmin = role === "admin";
  const isCoordinador = role === "coordinador";
  const isInstitucion = role === "institucion";

  const roleLabel = (role && ROLE_LABELS[role]) ?? role ?? "Usuario";

  // El responsable va directo a editar su propia institución; el resto ve el listado.
  const institutionsHref = isInstitucion
    ? `/institutions/${user?.institution?.id}`
    : "/institutions";
  const canSeeUsers = isAdmin || isCoordinador;
  const canSeeInstitutions = isAdmin || isCoordinador || isInstitucion;

  const NAV = [
    { href: "/", match: "/", label: "Inicio", icon: IconHome },
    {
      href: "/children",
      match: "/children",
      label: "Niños",
      icon: IconChildren,
    },
    ...(canSeeUsers
      ? [
          {
            href: "/users",
            match: "/users",
            label: "Usuarios",
            icon: IconUsers,
          },
        ]
      : []),
    ...(canSeeInstitutions
      ? [
          {
            href: institutionsHref,
            match: "/institutions",
            label: "Efectores",
            icon: IconBuilding,
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            href: "/imports",
            match: "/imports",
            label: "Importaciones",
            icon: IconUpload,
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            href: "/service-types",
            match: "/service-types",
            label: "Prestaciones",
            icon: IconActivity,
          },
        ]
      : []),

    ...(isAdmin
      ? [
          {
            href: "/database-export",
            match: "/database-export",
            label: "Exportar datos",
            icon: IconDownload,
          },
        ]
      : []),
  ];

  const isActive = (match: string) =>
    match === "/" ? pathname === "/" : pathname.startsWith(match);

  const currentTitle =
    NAV.find((item) => isActive(item.match))?.label ??
    "Sistema de Apoyo a la Crianza";

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className={styles.shell}>
      <aside className={cx(styles.sidebar, open && styles.sidebarOpen)}>
        <div className={styles.brand}>
          <span className={styles.logoMark}>
            <IconHeart size={22} />
          </span>
          <span className={styles.brandText}>
            <span className={styles.brandTitle}>SAC</span>
          </span>
        </div>

        <nav className={styles.nav} aria-label="Navegación principal">
          <span className={styles.navLabel}>Gestión</span>
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.match}
                to={item.href}
                className={cx(
                  styles.navItem,
                  isActive(item.match) && styles.navItemActive,
                )}
                aria-current={isActive(item.match) ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                <span className={styles.navIcon}>
                  <Icon size={20} />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Fecha de prestaciones: trae los períodos (TRIM/BIM) que se cruzan con el rango */}
        <ServicesDateRangeFilter />

        {/* Ámbito global: acota los listados de toda la plataforma a una localidad */}
        <LocalityScopeFilter />

        <div className={styles.sidebarFooter}>
          <div className={styles.userCard}>
            <Avatar name={user?.name ?? "Usuario"} size="sm" />
            <span className={styles.userCardText}>
              <span className={styles.userCardName}>
                {user?.name ?? "Usuario"}
              </span>
              <span className={styles.userCardRole}>{roleLabel}</span>
            </span>
          </div>
        </div>
      </aside>

      <div
        className={cx(styles.overlay, open && styles.overlayVisible)}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <div className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button
              className={styles.menuBtn}
              onClick={() => setOpen((v) => !v)}
              aria-label="Abrir menú"
            >
              <IconMenu size={20} />
            </button>
            <p className={styles.breadcrumb}>
              <strong>{currentTitle}</strong>
            </p>
            {/* Recordatorio visible: los números NO son de todo el sistema */}
            <div className={styles.scopeChips}>
              {scope && (
                <button
                  type="button"
                  className={styles.scopeChip}
                  title="Quitar el filtro de ámbito"
                  onClick={() => setScope("")}
                >
                  Viendo: {localityScopeLabel(scope)}
                  <span aria-hidden="true">×</span>
                </button>
              )}
              {isServicesDateRangeActive(dateRange) && (
                <button
                  type="button"
                  className={styles.scopeChip}
                  title="Quitar el filtro de fecha de prestaciones"
                  onClick={() => setDateRange(EMPTY_SERVICES_DATE_RANGE)}
                >
                  Prestaciones: {servicesDateRangeLabel(dateRange)}
                  <span aria-hidden="true">×</span>
                </button>
              )}
            </div>
          </div>

          <div className={styles.topbarRight}>
            <div className={styles.tenant}>
              <span className={styles.tenantName}>
                {user?.institution?.name ?? "Administración Central"}
              </span>
              <span className={styles.tenantRole}>
                {isAdmin
                  ? "Acceso total al sistema"
                  : isCoordinador
                    ? "Coordinación — acceso de lectura"
                    : (user?.institution?.type_label ??
                      "Sin institución asignada")}
              </span>
            </div>
            <span className={styles.divider} />
            <button
              className={styles.menuBtn}
              style={{ display: "inline-flex" }}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              onClick={handleLogout}
            >
              <IconLogout size={20} />
            </button>
          </div>
        </header>

        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
