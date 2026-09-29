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

// Respaldo si el backend no mandara type_label (sector = tipo, ver App\Support\Sector).
const TYPE_LABELS: Record<InstitutionType, string> = {
  salud: "Salud",
  educacion: "Cuidado y educación",
  desarrollo_social: "Protección social",
  recreacion: "Recreación, deporte y cultura",
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
  } = useInstitutionsQuery({ scoped: true });
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
    return (
      inst.name.toLowerCase().includes(search.toLowerCase()) ||
      String(inst.code ?? "") === search.trim()
    );
  });

  const columns: Column<Institution>[] = [
    {
      key: "code",
      header: "ID",
      width: "70px",
      render: (inst) => (
        <span style={{ color: "var(--text-muted)" }}>{inst.code ?? "—"}</span>
      ),
    },
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
      header: "Sector",
      render: (inst) => inst.type_label ?? TYPE_LABELS[inst.type] ?? inst.type,
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
        title="Efectores"
        subtitle="Creá, modificá o desactivá Efectores del sistema."
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
            : `${filtered.length} ${filtered.length === 1 ? "Efector" : "Efectores"}`}
        </span>
      </div>

      {queryError && (
        <div className="alert alert-error">
          Error al cargar los Efectores.
        </div>
      )}

      <Table
        columns={columns}
        data={filtered}
        rowKey={(inst) => inst.id}
        loading={loading}
        empty={
          <EmptyState
            icon={<IconBuilding size={26} />}
            title="No se encontraron Efectores"
            description={
              search
                ? "Probá con otro nombre."
                : "No hay Efectores en el sistema."
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
