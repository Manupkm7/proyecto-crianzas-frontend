import { useState } from "react";
import { Link } from "react-router-dom";
import { isAxiosError } from "axios";
import { useUsersQuery, useDeleteUserMutation } from "../hooks/useUsers";
import { useAuth } from "../context/AuthContext";
import type { ApiErrorBody, AuthUser, Role } from "../types";
import { PageHeader } from "../components/PageHeader";
import { IconChevronRight, IconPlus, IconUsers } from "../components/icons";
import { SearchInput } from "../components/SearchInput";
import { Table, type Column } from "../components/Table";
import { EmptyState } from "../components/EmptyState";
import { Avatar } from "../components/Avatar";
import list from "./css/list.module.css";

const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  coordinador: "Coordinador",
  institucion: "Responsable",
  representante: "Representante",
};

export default function UsersListPage() {
  const { user: authUser } = useAuth();
  const [search, setSearch] = useState("");

  const {
    data: users = [],
    isLoading: loading,
    error: queryError,
  } = useUsersQuery();
  const deleteUserMutation = useDeleteUserMutation();

  const authRole = authUser?.roles?.[0];
  const isAdmin = authRole === "admin";
  const isInstitucion = authRole === "institucion";
  const canCreate = isAdmin;

  async function handleDeactivate(userId: string, userName: string) {
    if (
      !confirm(
        `¿Desactivar al usuario "${userName}"?\nNo podrá iniciar sesión hasta que sea reactivado.`,
      )
    )
      return;
    try {
      await deleteUserMutation.mutateAsync(userId);
    } catch (err) {
      const message = isAxiosError<ApiErrorBody>(err)
        ? err.response?.data?.message
        : undefined;
      alert(message ?? "No se pudo desactivar el usuario.");
    }
  }

  const filtered = users.filter((u) => {
    if (!search) return true;
    const haystack = `${u.name} ${u.email}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  const columns: Column<AuthUser>[] = [
    {
      key: "name",
      header: "Nombre",
      render: (u) => (
        <div className={list.nameCell}>
          <div className={list.nameMainWrap}>
            <Avatar name={u.name} size="sm" />
            <div>
              <div className={list.nameMain}>{u.name}</div>
              <div className={list.nameSub}>{u.email}</div>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Rol",
      render: (u) => {
        const role = u.roles?.[0];
        return role ? (
          <span className="badge badge-blue">{ROLE_LABELS[role] ?? role}</span>
        ) : (
          <span className={list.muted}>—</span>
        );
      },
    },
    {
      key: "institution",
      header: "Institución",
      render: (u) =>
        u.institution ? (
          <span>{u.institution.name}</span>
        ) : (
          <span className={list.muted}>—</span>
        ),
    },
    {
      key: "status",
      header: "Estado",
      render: (u) =>
        u.is_active === false ? (
          <span className="badge badge-red">Inactivo</span>
        ) : (
          <span className="badge badge-green">Activo</span>
        ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      width: "120px",
      render: (u) => (
        <div className={list.rowActions}>
          {(isAdmin || isInstitucion) && u.is_active !== false && (
            <button
              className={list.actionBtn}
              onClick={() => handleDeactivate(u.id, u.name)}
              disabled={deleteUserMutation.isPending}
            >
              Desactivar
            </button>
          )}
          <Link to={`/users/${u.id}`} className={list.link}>
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
        title="Usuarios"
        subtitle="Administrá roles, instituciones y accesos de todos los usuarios del sistema."
        actions={
          canCreate ? (
            <Link to="/users/new" className="btn btn-primary">
              <IconPlus size={18} />
              Nuevo usuario
            </Link>
          ) : undefined
        }
      />

      <div className={list.toolbar}>
        <SearchInput
          placeholder="Buscar por nombre o email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className={list.count}>
          {loading
            ? "Cargando…"
            : `${filtered.length} ${filtered.length === 1 ? "usuario" : "usuarios"}`}
        </span>
      </div>

      {queryError && (
        <div className="alert alert-error">
          Error al cargar la lista de usuarios.
        </div>
      )}

      <Table
        columns={columns}
        data={filtered}
        rowKey={(u) => u.id}
        empty={
          <EmptyState
            icon={<IconUsers size={26} />}
            title="No se encontraron usuarios"
            description={
              search
                ? "Probá con otro nombre o email."
                : "No hay usuarios en el sistema."
            }
            action={
              canCreate && !search ? (
                <Link to="/users/new" className="btn btn-secondary">
                  Crear el primero
                </Link>
              ) : undefined
            }
          />
        }
      />
    </div>
  );
}
