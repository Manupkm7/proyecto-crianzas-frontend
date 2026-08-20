import { useState } from "react";
import { Link } from "react-router-dom";
import { isAxiosError } from "axios";
import {
  useInstitutionsQuery,
  useDeleteInstitutionMutation,
} from "../hooks/useInstitutions";
import { useAuth } from "../context/AuthContext";
import type { ApiErrorBody, Institution, InstitutionType } from "../types";
import { PageHeader } from "../components/PageHeader";
import { IconBuilding, IconChevronRight, IconPlus } from "../components/icons";
import { SearchInput } from "../components/SearchInput";
import { Table, type Column } from "../components/Table";
import { EmptyState } from "../components/EmptyState";
import list from "./css/list.module.css";

const TYPE_LABELS: Record<InstitutionType, string> = {
  salud: "Salud",
  educacion: "Educación",
  desarrollo_social: "Desarrollo Social",
  justicia: "Justicia",
  otro: "Otro",
};

export default function InstitutionsListPage() {
  const { user: authUser } = useAuth();
  const [search, setSearch] = useState("");

  const {
    data: institutions = [],
    isLoading: loading,
    error: queryError,
  } = useInstitutionsQuery();
  const deleteInstitutionMutation = useDeleteInstitutionMutation();

  const authRole = authUser?.roles?.[0];
  const isAdmin = authRole === "admin";
  const canCreate = isAdmin;

  async function handleDeactivate(id: string, name: string) {
    if (
      !confirm(
        `¿Desactivar la institución "${name}"?\n` +
          "Sus registros históricos se conservan. Los usuarios asociados no podrán iniciar sesión.",
      )
    )
      return;

    try {
      await deleteInstitutionMutation.mutateAsync(id);
    } catch (err) {
      const message = isAxiosError<ApiErrorBody>(err)
        ? err.response?.data?.message
        : undefined;
      alert(message ?? "No se pudo desactivar la institución.");
    }
  }

  const filtered = institutions.filter((inst) => {
    if (!search) return true;
    return inst.name.toLowerCase().includes(search.toLowerCase());
  });

  const columns: Column<Institution>[] = [
    {
      key: "name",
      header: "Nombre",
      render: (inst) => (
        <div className={list.nameCell}>
          <div className={list.nameMain}>{inst.name}</div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Tipo",
      render: (inst) => TYPE_LABELS[inst.type] ?? inst.type,
    },
    {
      key: "jurisdiction",
      header: "Jurisdicción",
      render: (inst) =>
        inst.locality ? (
          <span style={{ color: "var(--text-muted)" }}>
            {inst.locality.name}
            {inst.province ? ` (${inst.province.name})` : ""}
          </span>
        ) : (
          <span className="badge badge-red">Sin asignar</span>
        ),
    },
    {
      key: "users",
      header: "Usuarios",
      render: (inst) => (
        <span style={{ color: "var(--text-muted)" }}>
          {inst.users_count ?? 0}
        </span>
      ),
    },
    {
      key: "status",
      header: "Estado",
      render: (inst) =>
        inst.is_active ? (
          <span className="badge badge-green">Activa</span>
        ) : (
          <span className="badge badge-red">Inactiva</span>
        ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      width: "140px",
      render: (inst) => (
        <div className={list.rowActions}>
          {isAdmin && inst.is_active && (
            <button
              className={list.actionBtn}
              onClick={() => handleDeactivate(inst.id, inst.name)}
              disabled={deleteInstitutionMutation.isPending}
            >
              Desactivar
            </button>
          )}
          <Link to={`/institutions/${inst.id}`} className={list.link}>
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
        title="Instituciones"
        subtitle="Creá, modificá o desactivá instituciones educativas y de salud del sistema."
        actions={
          canCreate ? (
            <Link to="/institutions/new" className="btn btn-primary">
              <IconPlus size={18} />
              Nueva institución
            </Link>
          ) : undefined
        }
      />

      <div className={list.toolbar}>
        <SearchInput
          placeholder="Buscar por nombre…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className={list.count}>
          {loading
            ? "Cargando…"
            : `${filtered.length} ${filtered.length === 1 ? "institución" : "instituciones"}`}
        </span>
      </div>

      {queryError && (
        <div className="alert alert-error">
          Error al cargar las instituciones.
        </div>
      )}

      <Table
        columns={columns}
        data={filtered}
        rowKey={(inst) => inst.id}
        empty={
          <EmptyState
            icon={<IconBuilding size={26} />}
            title="No se encontraron instituciones"
            description={
              search
                ? "Probá con otro nombre."
                : "No hay instituciones en el sistema."
            }
            action={
              canCreate && !search ? (
                <Link to="/institutions/new" className="btn btn-secondary">
                  Crear la primera
                </Link>
              ) : undefined
            }
          />
        }
      />
    </div>
  );
}
