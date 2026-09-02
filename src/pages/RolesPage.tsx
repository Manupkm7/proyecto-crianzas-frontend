import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { isAxiosError } from 'axios'
import { useRolesQuery, useCreateRoleMutation, useUpdateRolePermissionsMutation, useDeleteRoleMutation, usePermissionsQuery, useCreatePermissionMutation, useDeletePermissionMutation, useSyncUserPermissionsMutation } from '../hooks/useRoles'
import { useUsersQuery, useUserQuery } from '../hooks/useUsers'
import { Button } from '../components/Button'
import { PageHeader } from '../components/PageHeader'
import { Spinner } from '../components/Spinner'
import type { ApiErrorBody } from '../types/index'
import styles from './css/roles.module.css'

type Tab = 'roles' | 'permisos' | 'usuarios'

// ─── Componente de tarjeta de rol ─────────────────────────────────────────────

interface RoleCardProps {
  role: {
    id: number
    name: string
    is_built_in: boolean
    users_count: number
    permissions: string[]
  }
  allPermissions: string[]
}

function RoleCard({ role, allPermissions }: RoleCardProps) {
  const [editing, setEditing] = useState(false)
  const [selected, setSelected] = useState<string[]>(role.permissions)
  const [error, setError] = useState<string | null>(null)

  const updateMutation = useUpdateRolePermissionsMutation()
  const deleteMutation = useDeleteRoleMutation()

  function togglePermission(name: string) {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]
    )
  }

  async function handleSave() {
    setError(null)
    try {
      await updateMutation.mutateAsync({ id: role.id, permissions: selected })
      setEditing(false)
    } catch (err) {
      const msg = isAxiosError<ApiErrorBody>(err) ? err.response?.data?.message : undefined
      setError(msg ?? 'No se pudo guardar.')
    }
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar el rol "${role.name}"? Esta acción no se puede deshacer.`)) return
    setError(null)
    try {
      await deleteMutation.mutateAsync(role.id)
    } catch (err) {
      const msg = isAxiosError<ApiErrorBody>(err) ? err.response?.data?.message : undefined
      setError(msg ?? 'No se pudo eliminar el rol.')
    }
  }

  function handleEdit() {
    setSelected(role.permissions)
    setEditing(true)
    setError(null)
  }

  return (
    <div className={styles.roleCard}>
      <div className={styles.roleCardHeader}>
        <div>
          <p className={styles.roleCardTitle}>
            {role.name}
            {role.is_built_in ? (
              <span className={styles.badgeSystem}>Sistema</span>
            ) : (
              <span className={styles.badgeCustom}>Personalizado</span>
            )}
          </p>
          <span className={styles.roleUsersCount}>
            {role.users_count} {role.users_count === 1 ? 'usuario' : 'usuarios'}
          </span>
        </div>
      </div>

      {editing ? (
        <div className={styles.checkList}>
          {allPermissions.map((perm) => (
            <label key={perm} className={styles.checkItem}>
              <input
                type="checkbox"
                checked={selected.includes(perm)}
                onChange={() => togglePermission(perm)}
              />
              {perm}
            </label>
          ))}
          {allPermissions.length === 0 && (
            <span className={styles.chipEmpty}>No hay permisos creados.</span>
          )}
        </div>
      ) : (
        <div className={styles.chips}>
          {role.permissions.length === 0 ? (
            <span className={styles.chipEmpty}>Sin permisos asignados</span>
          ) : (
            role.permissions.map((p) => (
              <span key={p} className={styles.chip}>{p}</span>
            ))
          )}
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      <div className={styles.cardActions}>
        {editing ? (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { setEditing(false); setError(null) }}
              disabled={updateMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Guardando…' : 'Guardar permisos'}
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" size="sm" onClick={handleEdit}>
              Editar permisos
            </Button>
            {!role.is_built_in && (
              <Button
                variant="dangerSoft"
                size="sm"
                onClick={handleDelete}
                disabled={deleteMutation.isPending || role.users_count > 0}
                title={role.users_count > 0 ? 'Reasigná los usuarios antes de eliminar este rol' : undefined}
              >
                Eliminar
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Página principal ──────────────────────────────────────────────────────────

export default function RolesPage() {
  const [tab, setTab] = useState<Tab>('roles')

  const { data: roles = [], isLoading: loadingRoles, isError: rolesError } = useRolesQuery()
  const { data: permissions = [], isLoading: loadingPermissions, isError: permsError } = usePermissionsQuery()

  const allPermissionNames = permissions.map((p) => p.name)

  return (
    <div>
      <PageHeader
        eyebrow="Administración"
        title="Roles y permisos"
        subtitle="Gestioná los roles del sistema, los permisos disponibles y los accesos directos por usuario."
      />

      <div className={styles.tabs}>
        {([
          ['roles', 'Roles'],
          ['permisos', 'Permisos del sistema'],
          ['usuarios', 'Permisos de usuario'],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            className={`${styles.tab} ${tab === key ? styles.tabActive : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {(rolesError || permsError) && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          No se pudo cargar los datos. Verificá la conexión con el servidor.
        </div>
      )}

      {tab === 'roles' && (
        <RolesTab
          roles={roles}
          allPermissionNames={allPermissionNames}
          loading={loadingRoles}
        />
      )}
      {tab === 'permisos' && (
        <PermissionsTab permissions={permissions} loading={loadingPermissions} />
      )}
      {tab === 'usuarios' && (
        <UserPermissionsTab allPermissionNames={allPermissionNames} />
      )}
    </div>
  )
}

// ─── Tab: Roles ───────────────────────────────────────────────────────────────

function RolesTab({
  roles,
  allPermissionNames,
  loading,
}: {
  roles: { id: number; name: string; is_built_in: boolean; users_count: number; permissions: string[] }[]
  allPermissionNames: string[]
  loading: boolean
}) {
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPerms, setNewPerms] = useState<string[]>([])
  const [createError, setCreateError] = useState<string | null>(null)

  const createMutation = useCreateRoleMutation()

  function toggleNewPerm(name: string) {
    setNewPerms((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]
    )
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setCreateError(null)
    try {
      await createMutation.mutateAsync({ name: newName.trim(), permissions: newPerms })
      setNewName('')
      setNewPerms([])
      setShowCreate(false)
    } catch (err) {
      const msg = isAxiosError<ApiErrorBody>(err)
        ? err.response?.data?.message ?? err.response?.data?.errors?.name?.[0]
        : undefined
      setCreateError(msg ?? 'No se pudo crear el rol.')
    }
  }

  return (
    <div>
      <div className={styles.sectionHeader}>
        <p className={styles.sectionTitle}>
          {roles.length} rol{roles.length !== 1 ? 'es' : ''} en el sistema
        </p>
        <Button
          variant={showCreate ? 'secondary' : 'primary'}
          size="sm"
          onClick={() => { setShowCreate((v) => !v); setCreateError(null) }}
        >
          {showCreate ? 'Cancelar' : '+ Nuevo rol'}
        </Button>
      </div>

      {showCreate && (
        <div className={styles.createForm}>
          <p className={styles.createFormTitle}>Crear rol personalizado</p>
          {createError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{createError}</div>}
          <form onSubmit={handleCreate}>
            <div className={styles.formRow} style={{ marginBottom: 16 }}>
              <input
                className={styles.formInput}
                type="text"
                placeholder="Nombre del rol (ej: auditor)"
                value={newName}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNewName(e.target.value)}
                required
              />
              <Button type="submit" size="sm" disabled={createMutation.isPending || !newName.trim()}>
                {createMutation.isPending ? 'Creando…' : 'Crear rol'}
              </Button>
            </div>
            {allPermissionNames.length > 0 && (
              <>
                <p style={{ fontSize: 13, color: 'var(--text-soft)', marginBottom: 10 }}>
                  Permisos iniciales (opcional):
                </p>
                <div className={styles.checkList}>
                  {allPermissionNames.map((perm) => (
                    <label key={perm} className={styles.checkItem}>
                      <input
                        type="checkbox"
                        checked={newPerms.includes(perm)}
                        onChange={() => toggleNewPerm(perm)}
                      />
                      {perm}
                    </label>
                  ))}
                </div>
              </>
            )}
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '1.5rem 0' }}>
          <Spinner size={20} />
          Cargando roles…
        </div>
      ) : (
        <div className={styles.roleGrid}>
          {roles.map((role) => (
            <RoleCard key={role.id} role={role} allPermissions={allPermissionNames} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Permisos del sistema ────────────────────────────────────────────────

function PermissionsTab({
  permissions,
  loading,
}: {
  permissions: { id: number; name: string; roles_count: number; users_count: number }[]
  loading: boolean
}) {
  const [newName, setNewName] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const createMutation = useCreatePermissionMutation()
  const deleteMutation = useDeletePermissionMutation()

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setCreateError(null)
    try {
      await createMutation.mutateAsync(newName.trim())
      setNewName('')
    } catch (err) {
      const msg = isAxiosError<ApiErrorBody>(err)
        ? err.response?.data?.message ?? err.response?.data?.errors?.name?.[0]
        : undefined
      setCreateError(msg ?? 'No se pudo crear el permiso.')
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`¿Eliminar el permiso "${name}"?`)) return
    setDeleteError(null)
    try {
      await deleteMutation.mutateAsync(id)
    } catch (err) {
      const msg = isAxiosError<ApiErrorBody>(err) ? err.response?.data?.message : undefined
      setDeleteError(msg ?? 'No se pudo eliminar el permiso.')
    }
  }

  return (
    <div>
      <div className={styles.createForm}>
        <p className={styles.createFormTitle}>Nuevo permiso</p>
        <p style={{ fontSize: 13, color: 'var(--text-soft)', marginBottom: 12 }}>
          Formato: <code>grupo.accion</code> — por ejemplo <code>reportes.exportar</code>
        </p>
        {createError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{createError}</div>}
        <form onSubmit={handleCreate}>
          <div className={styles.formRow}>
            <input
              className={styles.formInput}
              type="text"
              placeholder="ej: reportes.exportar"
              value={newName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setNewName(e.target.value)}
              required
            />
            <Button type="submit" size="sm" disabled={createMutation.isPending || !newName.trim()}>
              {createMutation.isPending ? 'Creando…' : 'Crear permiso'}
            </Button>
          </div>
        </form>
      </div>

      {deleteError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{deleteError}</div>}

      {loading ? (
        <div className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '1.5rem 0' }}>
          <Spinner size={20} />
          Cargando permisos…
        </div>
      ) : (
        <table className={styles.permTable}>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Roles</th>
              <th>Usuarios directos</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {permissions.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-soft)', padding: 24 }}>
                  No hay permisos creados.
                </td>
              </tr>
            )}
            {permissions.map((perm) => {
              const inUse = perm.roles_count > 0 || perm.users_count > 0
              return (
                <tr key={perm.id}>
                  <td><span className={styles.permName}>{perm.name}</span></td>
                  <td>{perm.roles_count}</td>
                  <td>{perm.users_count}</td>
                  <td style={{ textAlign: 'right' }}>
                    <Button
                      variant="dangerSoft"
                      size="sm"
                      onClick={() => handleDelete(perm.id, perm.name)}
                      disabled={inUse || deleteMutation.isPending}
                      title={inUse ? 'El permiso está en uso. Removelo de los roles y usuarios primero.' : undefined}
                    >
                      Eliminar
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ─── Tab: Permisos directos de usuario ───────────────────────────────────────

function UserPermissionsTab({ allPermissionNames }: { allPermissionNames: string[] }) {
  const [selectedUserId, setSelectedUserId] = useState('')
  const [editingPerms, setEditingPerms] = useState<string[]>([])
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const { data: users = [], isLoading: loadingUsers } = useUsersQuery()
  const { data: selectedUser, isLoading: loadingUser } = useUserQuery(selectedUserId || undefined)
  const syncMutation = useSyncUserPermissionsMutation()

  const userAllPerms: string[] = selectedUser?.permissions ?? []
  const userDirectPerms: string[] = selectedUser?.direct_permissions ?? []
  const userRolePerms = userAllPerms.filter((p) => !userDirectPerms.includes(p))
  const availableForDirect = allPermissionNames.filter((p) => !userRolePerms.includes(p))

  useEffect(() => {
    if (selectedUser) {
      setEditingPerms(selectedUser.direct_permissions ?? [])
      setSaveError(null)
      setSaveSuccess(false)
    }
  }, [selectedUser])

  function toggleDirectPerm(name: string) {
    setSaveSuccess(false)
    setEditingPerms((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]
    )
  }

  async function handleSave() {
    if (!selectedUserId) return
    setSaveError(null)
    setSaveSuccess(false)
    try {
      await syncMutation.mutateAsync({ userId: selectedUserId, permissions: editingPerms })
      setSaveSuccess(true)
    } catch (err) {
      const msg = isAxiosError<ApiErrorBody>(err) ? err.response?.data?.message : undefined
      setSaveError(msg ?? 'No se pudo guardar los permisos.')
    }
  }

  return (
    <div>
      <p style={{ fontSize: 13.5, color: 'var(--text-soft)', marginBottom: 16 }}>
        Seleccioná un usuario para ver y editar los permisos asignados directamente,
        por encima de los que hereda de su rol.
      </p>

      <select
        className={styles.userSelect}
        value={selectedUserId}
        onChange={(e) => setSelectedUserId(e.target.value)}
        disabled={loadingUsers}
      >
        <option value="">
          {loadingUsers ? 'Cargando usuarios…' : 'Seleccionar usuario…'}
        </option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name} — {u.roles?.[0] ?? 'sin rol'}
          </option>
        ))}
      </select>

      {selectedUserId && (
        loadingUser ? (
          <div className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '1rem 0' }}>
            <Spinner size={18} />
            Cargando datos del usuario…
          </div>
        ) : selectedUser ? (
          <div className={styles.userPermPanel}>
            <p className={styles.userPermName}>{selectedUser.name}</p>
            <p className={styles.userPermRole}>
              Rol: <strong>{selectedUser.roles?.[0] ?? '—'}</strong> · {selectedUser.email}
            </p>

            <div className={styles.permColumns}>
              <div className={styles.permColumn}>
                <h4>Permisos del rol (heredados)</h4>
                {userRolePerms.length === 0 ? (
                  <span style={{ fontSize: 13, color: 'var(--text-soft)', fontStyle: 'italic' }}>
                    Sin permisos de rol
                  </span>
                ) : (
                  <div>
                    {userRolePerms.map((p) => (
                      <span key={p} className={styles.rolePermChip}>✓ {p}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.permColumn}>
                <h4>Permisos directos adicionales</h4>
                {availableForDirect.length === 0 ? (
                  <span style={{ fontSize: 13, color: 'var(--text-soft)', fontStyle: 'italic' }}>
                    El rol ya cubre todos los permisos disponibles.
                  </span>
                ) : (
                  <div className={styles.checkList}>
                    {availableForDirect.map((perm) => (
                      <label key={perm} className={styles.checkItem}>
                        <input
                          type="checkbox"
                          checked={editingPerms.includes(perm)}
                          onChange={() => toggleDirectPerm(perm)}
                        />
                        {perm}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {saveError && (
              <div className="alert alert-error" style={{ marginTop: 16 }}>{saveError}</div>
            )}

            <div className={styles.saveRow}>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={syncMutation.isPending}
              >
                {syncMutation.isPending ? 'Guardando…' : 'Guardar permisos directos'}
              </Button>
              {saveSuccess && (
                <span style={{ fontSize: 13.5, color: 'var(--success, #2c7a4b)' }}>
                  ✓ Permisos actualizados correctamente.
                </span>
              )}
            </div>
          </div>
        ) : null
      )}
    </div>
  )
}
