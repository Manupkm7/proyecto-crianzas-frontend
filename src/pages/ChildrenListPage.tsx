import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLocalityScope } from "../context/LocalityScopeContext";
import { useServicesDateRange } from "../context/ServicesDateRangeContext";
import { useChildrenQuery } from "../hooks/useChildren";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { PageHeader } from "../components/PageHeader";
import { IconChevronRight, IconChildren, IconPlus } from "../components/icons";
import { SearchInput } from "../components/SearchInput";
import { Table, type Column } from "../components/Table";
import { EmptyState } from "../components/EmptyState";
import type { Child } from "../types/index";
import list from "./css/list.module.css";
import { Avatar } from "../components/Avatar";
import {
  ServiceProvidersCell,
  ServicesSummaryCell,
} from "../components/ChildServicesSummaryCells";

const PER_PAGE = 20;

export default function ChildrenListPage() {
  const { user } = useAuth();
  // El filtro por localidad es global (sidebar → header X-Locality-Scope);
  // acá solo se usa para volver a la página 1 cuando cambia.
  const { scope } = useLocalityScope();
  const { range: servicesRange } = useServicesDateRange();
  const [searchInput, setSearchInput] = useState("");
  const [servicesFilter, setServicesFilter] = useState<"all" | "yes" | "no">(
    "all",
  );
  const [page, setPage] = useState(1);
  const search = useDebouncedValue(searchInput);

  useEffect(() => {
    setPage(1);
  }, [search, scope, servicesRange, servicesFilter]);

  const {
    data,
    isLoading: loading,
    error: queryError,
  } = useChildrenQuery({
    search: search || undefined,
    has_services:
      servicesFilter === "all" ? undefined : servicesFilter === "yes",
    page,
    per_page: PER_PAGE,
  });

  const children = data?.items ?? [];
  const lastPage = data?.lastPage ?? 1;
  const total = data?.total ?? 0;

  const role = user?.roles?.[0];
  const canCreate = role !== "coordinador";

  const columns: Column<Child>[] = [
    {
      key: "name",
      header: "Nombre",
      render: (c) => (
        <div className={list.nameCell}>
          <div className={list.nameMainWrap}>
            <Avatar name={`${c.first_name} ${c.last_name}`} size="sm" />
            <div className={list.nameMain}>
              {c.last_name}, {c.first_name}
            </div>
            {c.dni && <div className={list.nameSub}>DNI {c.dni}</div>}
          </div>
        </div>
      ),
    },
    {
      key: "age",
      header: "Edad",
      render: (c) => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {c.age != null ? `${c.age} años` : "—"}
          {c.birth_date_is_placeholder && (
            <span
              className="badge badge-amber"
              title="Fecha de nacimiento estimada (1/1/2000) — el archivo importado no traía este dato. Verificar y corregir."
            >
              ⚠ Estimada
            </span>
          )}
        </span>
      ),
    },
    {
      key: "education",
      header: "Educación",
      render: (c) =>
        c.education_record ? (
          <span className="badge badge-blue">
            {c.education_record.institution?.name ?? "Registrado"}
          </span>
        ) : (
          <span className={list.muted}>Sin registro</span>
        ),
    },
    {
      key: "health",
      header: "Salud",
      render: (c) =>
        c.health_record ? (
          <span className="badge badge-green">
            {c.health_record.institution?.name ?? "Registrado"}
          </span>
        ) : (
          <span className={list.muted}>Sin registro</span>
        ),
    },
    {
      key: "services",
      header: "Prestaciones",
      render: (c) => <ServicesSummaryCell child={c} />,
    },
    {
      key: "providers",
      header: "Efectores",
      render: (c) => <ServiceProvidersCell child={c} />,
    },
    {
      key: "alerts",
      header: "Alertas",
      render: (c) =>
        c.has_alert ? (
          <span className="badge badge-red">⚠ Alerta</span>
        ) : (
          <span className={list.muted}>—</span>
        ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      width: "80px",
      render: (c) => (
        <div className={list.rowActions}>
          <Link to={`/children/${c.id}`} className={list.link}>
            Ver <IconChevronRight size={14} />
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Gestión"
        title="Niños"
        subtitle="Todos los niños del sistema, con sus registros educativos y de salud y sus prestaciones."
        actions={
          canCreate ? (
            <Link to="/children/new" className="btn btn-primary">
              <IconPlus size={18} />
              Registrar niño
            </Link>
          ) : undefined
        }
      />

      <div className={list.toolbar}>
        <div className={list.selectDiv}>
          <SearchInput
            placeholder="Buscar por nombre, apellido o DNI…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <select
            aria-label="Filtrar por prestaciones"
            value={servicesFilter}
            onChange={(e) =>
              setServicesFilter(e.target.value as "all" | "yes" | "no")
            }
            style={{ fontSize: "0.85rem", padding: "6px 8px" }}
          >
            <option value="all">Prestaciones: todas</option>
            <option value="yes">Con prestaciones</option>
            <option value="no">Sin prestaciones</option>
          </select>
        </div>
        <span className={list.count}>
          {loading ? "Cargando…" : `${total} ${total === 1 ? "niño" : "niños"}`}
        </span>
      </div>

      {queryError && (
        <div className="alert alert-error">
          Error al cargar la lista de niños.
        </div>
      )}

      <Table
        columns={columns}
        data={children}
        rowKey={(c) => c.id}
        loading={loading}
        empty={
          <EmptyState
            icon={<IconChildren size={26} />}
            title="No se encontraron niños"
            description={
              search
                ? "Probá con otro nombre o DNI."
                : canCreate
                  ? "Todavía no hay niños registrados en el sistema."
                  : "No hay niños registrados en el sistema."
            }
            action={
              canCreate && !search ? (
                <Link to="/children/new" className="btn btn-secondary">
                  Registrar el primero
                </Link>
              ) : undefined
            }
          />
        }
        pagination={
          lastPage > 1
            ? { page, lastPage, onPageChange: setPage, loading }
            : undefined
        }
      />
    </div>
  );
}
