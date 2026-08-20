import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import InstitutionalLoginPage from './pages/InstitutionalLoginPage'
import DashboardPage from './pages/DashboardPage'
import ChildrenListPage from './pages/ChildrenListPage'
import ChildDetailPage from './pages/ChildDetailPage'
import ChildFormPage from './pages/ChildFormPage'
import UsersListPage from './pages/UsersListPage'
import UserFormPage from './pages/UserFormPage'
import UserActivityPage from './pages/UserActivityPage'
import InstitutionsListPage from './pages/InstitutionsListPage'
import InstitutionFormPage from './pages/InstitutionFormPage'
import ImportsListPage from './pages/ImportsListPage'
import ImportReviewPage from './pages/ImportReviewPage'
import UserImportsListPage from './pages/UserImportsListPage'
import UserImportReviewPage from './pages/UserImportReviewPage'
import RolesPage from './pages/RolesPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Públicas */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/login/institucional" element={<InstitutionalLoginPage />} />

          {/* Protegidas — requieren sesión activa */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Niños */}
          <Route
            path="/children"
            element={
              <ProtectedRoute>
                <ChildrenListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/children/new"
            element={
              <ProtectedRoute>
                <ChildFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/children/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ChildFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/children/:id"
            element={
              <ProtectedRoute>
                <ChildDetailPage />
              </ProtectedRoute>
            }
          />

          {/* Usuarios — listado y gestión: solo admin y coordinador */}
          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={['admin', 'coordinador']}>
                <UsersListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users/new"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <UserFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users/:id"
            element={
              <ProtectedRoute allowedRoles={['admin', 'coordinador']}>
                <UserFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users/:id/activity"
            element={
              <ProtectedRoute allowedRoles={['admin', 'coordinador']}>
                <UserActivityPage />
              </ProtectedRoute>
            }
          />

          {/* Instituciones */}
          <Route
            path="/institutions"
            element={
              <ProtectedRoute>
                <InstitutionsListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/institutions/new"
            element={
              <ProtectedRoute>
                <InstitutionFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/institutions/:id"
            element={
              <ProtectedRoute>
                <InstitutionFormPage />
              </ProtectedRoute>
            }
          />

          {/* Roles y permisos (solo admin) */}
          <Route
            path="/roles"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <RolesPage />
              </ProtectedRoute>
            }
          />

          {/* Importaciones masivas (solo admin) */}
          <Route
            path="/imports"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ImportsListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/imports/:id/review"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ImportReviewPage />
              </ProtectedRoute>
            }
          />

          {/* Carga masiva de usuarios (admin, coordinador y responsable de institución) */}
          <Route
            path="/user-imports"
            element={
              <ProtectedRoute allowedRoles={['admin', 'coordinador', 'institucion']}>
                <UserImportsListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-imports/:id/review"
            element={
              <ProtectedRoute allowedRoles={['admin', 'coordinador', 'institucion']}>
                <UserImportReviewPage />
              </ProtectedRoute>
            }
          />

          {/* Cualquier ruta desconocida redirige al inicio */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
