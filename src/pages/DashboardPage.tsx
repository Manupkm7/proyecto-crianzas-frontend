import { useAuth } from "../context/AuthContext";
import styles from "./css/dashboard.module.css";
import { Card } from "../components/Card";
import {
  IconAlert,
  IconBuilding,
  IconChevronRight,
  IconChildren,
  IconHeart,
  IconPlus,
  IconUsers,
  type IconProps,
} from "../components/icons";
import { Button } from "../components/Button";
import { ChildServicesGrid } from "../components/ChildServicesGrid";
import { EducationLevelDashboard } from "../components/EducationLevelDashboard";
import { useChildrenQuery } from "../hooks/useChildren";
import { useUsersQuery } from "../hooks/useUsers";
import { useInstitutionsQuery } from "../hooks/useInstitutions";

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
  const { data: institutions = [] } = useInstitutionsQuery({ enabled: isAdmin || isCoordinador, scoped: true });
  const { data: users = [] } = useUsersQuery({ enabled: canViewUsers });

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
    {
      label: "Con alertas",
      value: alertsCount,
      icon: IconAlert,
      color: "#a9741f",
      soft: "var(--amber-soft)",
    },
    // Instituciones del sistema: solo relevante para admin/coordinador
    ...(isAdmin || isCoordinador
      ? [
          {
            label: "Efectores",
            value: institutions.length,
            icon: IconBuilding,
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
          </>
        )}

        <h2 className={styles.sectionTitle} style={{ marginTop: 32 }}>
          Niños
        </h2>
        {/* Una fila por prestación (misma estructura que el archivo que se importa) */}
        <ChildServicesGrid />
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
