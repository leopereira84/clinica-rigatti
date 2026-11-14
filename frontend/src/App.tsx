import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { AppLayout } from './components/layout/AppLayout';
import { NotFoundPage } from './components/NotFoundPage';
import { ThemeProvider } from './components/theme/ThemeProvider';
import { ToastProvider } from './components/ui/Toast';
import { AuthProvider } from './features/auth/AuthContext';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { ProtectedRoute, PublicOnlyRoute, RequirePermission } from './features/auth/routeGuards';
import { AssistantPage } from './features/chat/AssistantPage';
import { ProductFormPage } from './features/products/ProductFormPage';
import { ProductsPage } from './features/products/ProductsPage';
import { UsersPage } from './features/users/UsersPage';

export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<PublicOnlyRoute />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/cadastro" element={<RegisterPage />} />
              </Route>

              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route index element={<Navigate to="/produtos" replace />} />
                  <Route path="/produtos" element={<ProductsPage />} />
                  <Route
                    path="/produtos/novo"
                    element={
                      <RequirePermission permission="products:write">
                        <ProductFormPage />
                      </RequirePermission>
                    }
                  />
                  <Route
                    path="/produtos/:id/editar"
                    element={
                      <RequirePermission permission="products:write">
                        <ProductFormPage />
                      </RequirePermission>
                    }
                  />
                  <Route
                    path="/assistente"
                    element={
                      <RequirePermission permission="chat:use">
                        <AssistantPage />
                      </RequirePermission>
                    }
                  />
                  <Route
                    path="/usuarios"
                    element={
                      <RequirePermission permission="users:manage">
                        <UsersPage />
                      </RequirePermission>
                    }
                  />
                </Route>
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
