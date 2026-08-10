import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import styles from "./css/dashboard.module.css";
import { Card } from "../components/Card";
import {
  IconAlert,
  IconBuilding,
  IconChevronRight,
  IconChildren,
  IconDownload,
  IconHeart,
  IconPlus,
  IconUsers,
  type IconProps,
} from "../components/icons";
import { Button } from "../components/Button";
import { ChildrenAlertsTable } from "../components/ChildrenAlertsTable";
import { EducationLevelDashboard } from "../components/EducationLevelDashboard";
import { useChildrenQuery } from "../hooks/useChildren";
import { useUsersQuery } from "../hooks/useUsers";
import { useInstitutionsQuery } from "../hooks/useInstitutions";
import { downloadDatabaseExport } from "../api/databaseExport";

interface Stat {
  label: string;
  value: number;
  icon: (props: IconProps) => JSX.Element;
  color: string;
  soft: string;
}

interface Action {
  title: string;
  text: string;
  href: string;
  cta: string;
  icon: (props: IconProps) => JSX.Element;
  color: string;
  soft: string;
  primary?: boolean;
}

function getHeroDescription(
  role: string | undefined,
  institutionName: string | undefined,
  institutionType: string | undefined,
): string {
  switch (role) {
    case "admin":
      return "Tenés acceso total al sistema. Podés ver y gestionar todos los niños, instituciones y usuarios.";
    case "coordinador":
      return "Tenés acceso de solo lectura a todo el sistema. Podés consultar registros de todas las instituciones sin modificarlos.";
    case "institucion": {
      const sector =
        institutionType === "educacion"
          ? "educativos"
          : institutionType === "salud"
          ? "de salud"
          : "";
      return `Administrás ${institutionName ?? "tu institución"}. Gestionás los registros ${sector} y los representantes de tu institución.`;
    }
    case "representante": {
      const sector =
        institutionType === "educacion"
          ? "educativos"
          : institutionType === "salud"
          ? "de salud"
          : "";
      return `Trabajás en ${institutionName ?? "tu institución"}. Podés registrar y consultar niños con registros ${sector} vinculados a tu institución.`;
    }
    default:
      return "";
  }
}

export default function DashboardPage() {
  const { user } = useAuth();

  const role = user?.roles?.[0];
  const isAdmin = role === "admin";
  const isCoordinador = role === "coordinador";
  const isInstitucion = role === "institucion";
  const isRepresentante = role === "representante";
  const institutionType = user?.institution?.type;
  const institutionName = user?.institution?.name;

  const canManageUsers = isAdmin;
  const canCreateChildren = !isCoordinador;
  const canViewUsers = isAdmin || isCoordinador;
  // Solo roles que tienen acceso a la sección de instituciones ven el acceso rápido
  const canSeeInstitutions = isAdmin || isCoordinador || isInstitucion;

  // Las instituciones educativas tienen un dashboard muy distinto: en lugar de las
  // métricas generales del sistema, ven el resumen por nivel/grado de SU institución.
  const isEducationInstitutionalUser =
    (isInstitucion || isRepresentante) && institutionType === "educacion";

  const { data: childrenSummary } = useChildrenQuery();
  const childrenTotal = childrenSummary?.total ?? 0;
  const alertsCount = childrenSummary?.alertsCount ?? 0;
  // Instituciones: solo admin/coordinador necesitan el conteo global
  const { data: institutions = [] } = useInstitutionsQuery({ enabled: isAdmin || isCoordinador });
  const { data: users = [] } = useUsersQuery({ enabled: canViewUsers });

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Descarga autenticada del ZIP: axios trae el archivo como blob (no navegación
  // por <a href>, porque el token va en el header Authorization, no en cookies).
  async function handleDatabaseExport() {
    setExportError(null);
    setExporting(true);
    try {
      const response = await downloadDatabaseExport();
      const disposition = response.headers["content-disposition"] as
        | string
        | undefined;
      const match = disposition?.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] ?? `export_${Date.now()}.zip`;

      const url = URL.createObjectURL(response.data as Blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setExportError("No se pudo generar la exportación. Intentá de nuevo.");
    } finally {
      setExporting(false);
    }
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <h1>Bienvenido/a</h1>
        <p>No se pudo cargar la información del usuario.</p>
      </div>
    );
  }

  const STATS: Stat[] = [
    {
      label: isAdmin || isCoordinador ? "Niños registrados" : "Mis niños",
      value: childrenTotal,
      icon: IconChildren,
      color: "var(--primary)",
      soft: "var(--primary-soft)",
    },
    // Admin/coordinador: conteo global de usuarios activos del sistema
    ...(isAdmin || isCoordinador
      ? [
          {
            label: "Usuarios activos",
            value: users.filter((u) => u.is_active).length,
            icon: IconUsers,
            color: "var(--edu)",
            soft: "var(--edu-soft)",
          },
        ]
      : []),
    // Instituciones del sistema: solo relevante para admin/coordinador
    ...(isAdmin || isCoordinador
      ? [
          {
            label: "Instituciones",
            value: institutions.length,
            icon: IconBuilding,
            color: "var(--health)",
            soft: "var(--health-soft)",
          },
        ]
      : []),
    {
      label: "Con alertas",
      value: alertsCount,
      icon: IconAlert,
      color: "#a9741f",
      soft: "var(--amber-soft)",
    },
  ];

  const ACTIONS: Action[] = [
    {
      title: "Niños",
      text: "Consultá el listado completo con sus registros educativos y de salud.",
      href: "/children",
      cta: "Ver niños",
      icon: IconChildren,
      color: "var(--primary)",
      soft: "var(--primary-soft)",
      primary: true,
    },
    ...(canCreateChildren
      ? [
          {
            title: "Registrar nuevo niño",
            text: "Agregá un nuevo niño al sistema e ingresá sus datos y seguimiento.",
            href: "/children/new",
            cta: "Registrar niño",
            icon: IconPlus,
            color: "var(--edu)",
            soft: "var(--edu-soft)",
          },
        ]
      : []),
    ...(canManageUsers
      ? [
          {
            title: "Gestión de usuarios",
            text: "Administrá roles, instituciones y accesos de todos los usuarios del sistema.",
            href: "/users",
            cta: "Ver usuarios",
            icon: IconUsers,
            color: "var(--health)",
            soft: "var(--health-soft)",
          },
        ]
      : []),
  ];

  return (
    <>
      <div>
        {/* Niños — visible para todos */}
        <section className={styles.hero}>
          <span className={`${styles.heroBlob} ${styles.heroBlob1}`} />
          <span className={`${styles.heroBlob} ${styles.heroBlob2}`} />
          <div className={styles.heroContent}>
            <p className={styles.heroEyebrow}>Bienvenido/a</p>
            <h1 className={styles.heroTitle}>{user.name}</h1>
            <p className={styles.heroText}>
              {getHeroDescription(role, institutionName, institutionType)}
            </p>
          </div>
        </section>
        {isEducationInstitutionalUser ? (
          <>
            <h2 className={styles.sectionTitle}>Niños por grado</h2>
            <EducationLevelDashboard />
          </>
        ) : (
          <>
            <div className={styles.stats}>
              {STATS.map((s) => {
                const Icon = s.icon;
                return (
                  <Card key={s.label} className={styles.stat}>
                    <div className={styles.statTop}>
                      <span className={styles.statValue}>{s.value}</span>
                      <span
                        className={styles.statIcon}
                        style={{ backgroundColor: s.soft, color: s.color }}
                      >
                        <Icon size={22} />
                      </span>
                    </div>
                    <span className={styles.statLabel}>{s.label}</span>
                  </Card>
                );
              })}
            </div>
            <h2 className={styles.sectionTitle}>Accesos rápidos</h2>
            <div className={styles.actions}>
              {ACTIONS.map((a) => {
                const Icon = a.icon;
                return (
                  <a key={a.title} href={a.href} className={styles.cardLink}>
                    <Card className={styles.action} style={{ height: "100%" }}>
                      <div className={styles.actionHead}>
                        <span
                          className={styles.actionIcon}
                          style={{ backgroundColor: a.soft, color: a.color }}
                        >
                          <Icon size={22} />
                        </span>
                        <span className={styles.actionTitle}>{a.title}</span>
                      </div>
                      <p className={styles.actionText}>{a.text}</p>
                      <div className={styles.actionFoot}>
                        <Button
                          variant={a.primary ? "primary" : "secondary"}
                          size="sm"
                        >
                          {a.cta}
                          <IconChevronRight size={16} />
                        </Button>
                      </div>
                    </Card>
                  </a>
                );
              })}

              {/* Exportar toda la base de datos — exclusivo del admin, no es un link
                  de navegación sino una descarga autenticada, así que no usa ACTIONS. */}
              {isAdmin && (
                <Card className={styles.action} style={{ height: "100%" }}>
                  <div className={styles.actionHead}>
                    <span
                      className={styles.actionIcon}
                      style={{
                        backgroundColor: "var(--surface-muted)",
                        color: "var(--text)",
                      }}
                    >
                      <IconDownload size={22} />
                    </span>
                    <span className={styles.actionTitle}>
                      Exportar base de datos
                    </span>
                  </div>
                  <p className={styles.actionText}>
                    Descargá un ZIP con un Excel (una hoja por tabla:
                    instituciones, niños, registros, usuarios, etc.) más los
                    PDF adjuntos, menos el historial de auditoría.
                  </p>
                  {exportError && (
                    <div className="alert alert-error" style={{ marginTop: 8 }}>
                      {exportError}
                    </div>
                  )}
                  <div className={styles.actionFoot}>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleDatabaseExport}
                      disabled={exporting}
                    >
                      {exporting ? "Generando…" : "Descargar ZIP"}
                      <IconChevronRight size={16} />
                    </Button>
                  </div>
                </Card>
              )}
            </div>
            {canSeeInstitutions && (
              <div style={{ marginTop: 24 }}>
                <a
                  href={isInstitucion ? `/institutions/${user.institution?.id}` : "/institutions"}
                  className={styles.cardLink}
                >
                  <Card
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <span
                        className={styles.actionIcon}
                        style={{
                          backgroundColor: "var(--surface-muted)",
                          color: "var(--health)",
                        }}
                      >
                        <IconHeart size={22} />
                      </span>
                      <div>
                        <p className={styles.actionTitle}>
                          {isInstitucion
                            ? user.institution?.name ?? "Mi institución"
                            : "Instituciones"}
                        </p>
                        <p className={styles.actionText}>
                          {isAdmin
                            ? "Creá, modificá o desactivá instituciones educativas y de salud."
                            : isInstitucion
                            ? "Actualizá la dirección y teléfono de contacto de tu institución."
                            : "Consultá el listado de instituciones del sistema."}
                        </p>
                      </div>
                    </div>
                    <IconChevronRight size={22} />
                  </Card>
                </a>
              </div>
            )}
          </>
        )}

        <h2 className={styles.sectionTitle} style={{ marginTop: 32 }}>
          Niños
        </h2>
        <ChildrenAlertsTable
          levelInstitution={isEducationInstitutionalUser ? user.institution : undefined}
        />
      </div>

      {isAdmin && (
        <div className="info-box mt-4">
          <strong>Acceso total:</strong> podés ver y gestionar todos los niños,
          instituciones y usuarios del sistema, independientemente de quién los
          registró.
        </div>
      )}

      {isCoordinador && (
        <div className="info-box mt-4">
          <strong>Acceso de solo lectura:</strong> podés ver todos los niños e
          instituciones del sistema, pero no podés modificar datos ni registrar
          nuevos niños.
        </div>
      )}

      {isInstitucion && institutionType && (
        <div className="info-box mt-4">
          <strong>Responsable de institución:</strong> ves los niños y registros
          de {institutionName}.{" "}
          {institutionType === "educacion" &&
            "Podés gestionar registros educativos de los niños vinculados a tu institución."}
          {institutionType === "salud" &&
            "Podés gestionar registros de salud de los niños vinculados a tu institución."}
        </div>
      )}

      {isRepresentante && institutionType && (
        <div className="info-box mt-4">
          <strong>Acceso de representante:</strong> solo ves los niños y
          registros vinculados a tu institución ({institutionName}).
          {institutionType === "educacion" &&
            " Podés gestionar registros educativos."}
          {institutionType === "salud" &&
            " Podés gestionar registros de salud."}
        </div>
      )}
    </>
  );
}
