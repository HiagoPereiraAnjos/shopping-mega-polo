/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/layout/Layout';
import { PageLoader } from './components/ui/PageLoader';
import { SEO } from './components/ui/SEO';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from './components/auth/ProtectedRoute';
import {
  ADMIN_HOME_PATH,
  ADMIN_ROUTE_ALLOWED_ROLES,
  ADMIN_ROUTE_SEGMENTS,
} from './config/adminRoutes';
import { CMS_ROLES, type AdminRole } from './lib/permissions';

// Lazy loaded pages
const Home = lazy(() => import('./pages/Home'));
const Stores = lazy(() => import('./pages/Stores'));
const StoreDetail = lazy(() => import('./pages/StoreDetail'));
const Launches = lazy(() => import('./pages/Launches'));
const Planning = lazy(() => import('./pages/Planning'));
const MyRoute = lazy(() => import('./pages/MyRoute'));
const Leasing = lazy(() => import('./pages/Leasing'));
const CmsPage = lazy(() => import('./pages/CmsPage'));
const Login = lazy(() => import('./pages/Login'));
const NotFound = lazy(() => import('./pages/NotFound'));
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const SiteSettingsAdmin = lazy(() => import('./pages/admin/SiteSettingsAdmin'));
const NavigationAdmin = lazy(() => import('./pages/admin/NavigationAdmin'));
const FooterAdmin = lazy(() => import('./pages/admin/FooterAdmin'));
const HomeAdmin = lazy(() => import('./pages/admin/HomeAdmin'));
const ContentBlocksAdmin = lazy(() => import('./pages/admin/ContentBlocksAdmin'));
const PagesAdmin = lazy(() => import('./pages/admin/PagesAdmin'));
const StoresAdmin = lazy(() => import('./pages/admin/StoresAdmin'));
const CategoriesAdmin = lazy(() => import('./pages/admin/CategoriesAdmin'));
const LaunchesAdmin = lazy(() => import('./pages/admin/LaunchesAdmin'));
const CatalogsAdmin = lazy(() => import('./pages/admin/CatalogsAdmin'));
const LeadsAdmin = lazy(() => import('./pages/admin/LeadsAdmin'));
const NewsletterAdmin = lazy(() => import('./pages/admin/NewsletterAdmin'));
const MediaAdmin = lazy(() => import('./pages/admin/MediaAdmin'));
const SeoAdmin = lazy(() => import('./pages/admin/SeoAdmin'));
const UsersAdmin = lazy(() => import('./pages/admin/UsersAdmin'));
const ActivityLogsAdmin = lazy(() => import('./pages/admin/ActivityLogsAdmin'));

export function DashboardAliasRedirect() {
  return (
    <>
      <SEO
        title="Redirecionamento Administrativo"
        description="Alias administrativo do CMS do Mega Polo Moda."
        canonical="/dashboard"
        robots="noindex,nofollow"
      />
      <Navigate to="/admin" replace />
    </>
  );
}

export default function App() {
  const withPublicLayout = (element: React.ReactNode) => <Layout>{element}</Layout>;
  const withAdminRoles = (
    element: React.ReactNode,
    allowedRoles: readonly AdminRole[] = CMS_ROLES,
  ) => (
    <ProtectedRoute allowedRoles={allowedRoles}>
      {element}
    </ProtectedRoute>
  );

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Admin auth routes without public layout */}
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={ADMIN_ROUTE_ALLOWED_ROLES.dashboard}>
                <DashboardAliasRedirect />
              </ProtectedRoute>
            }
          />
          <Route
            path={ADMIN_HOME_PATH}
            element={
              <ProtectedRoute allowedRoles={ADMIN_ROUTE_ALLOWED_ROLES.dashboard}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={withAdminRoles(<AdminDashboard />, ADMIN_ROUTE_ALLOWED_ROLES.dashboard)} />
            <Route
              path={ADMIN_ROUTE_SEGMENTS.siteSettings}
              element={withAdminRoles(<SiteSettingsAdmin />, ADMIN_ROUTE_ALLOWED_ROLES.siteSettings)}
            />
            <Route
              path={ADMIN_ROUTE_SEGMENTS.navigation}
              element={withAdminRoles(<NavigationAdmin />, ADMIN_ROUTE_ALLOWED_ROLES.navigation)}
            />
            <Route
              path={ADMIN_ROUTE_SEGMENTS.footer}
              element={withAdminRoles(<FooterAdmin />, ADMIN_ROUTE_ALLOWED_ROLES.footer)}
            />
            <Route
              path={ADMIN_ROUTE_SEGMENTS.home}
              element={withAdminRoles(<HomeAdmin />, ADMIN_ROUTE_ALLOWED_ROLES.home)}
            />
            <Route
              path={ADMIN_ROUTE_SEGMENTS.contentBlocks}
              element={withAdminRoles(<ContentBlocksAdmin />, ADMIN_ROUTE_ALLOWED_ROLES.contentBlocks)}
            />
            <Route
              path={ADMIN_ROUTE_SEGMENTS.pages}
              element={withAdminRoles(<PagesAdmin />, ADMIN_ROUTE_ALLOWED_ROLES.pages)}
            />
            <Route
              path={ADMIN_ROUTE_SEGMENTS.stores}
              element={withAdminRoles(<StoresAdmin />, ADMIN_ROUTE_ALLOWED_ROLES.stores)}
            />
            <Route
              path={ADMIN_ROUTE_SEGMENTS.products}
              element={withAdminRoles(<StoresAdmin />, ADMIN_ROUTE_ALLOWED_ROLES.products)}
            />
            <Route
              path={ADMIN_ROUTE_SEGMENTS.categories}
              element={withAdminRoles(<CategoriesAdmin />, ADMIN_ROUTE_ALLOWED_ROLES.categories)}
            />
            <Route
              path={ADMIN_ROUTE_SEGMENTS.launches}
              element={withAdminRoles(<LaunchesAdmin />, ADMIN_ROUTE_ALLOWED_ROLES.launches)}
            />
            <Route
              path={ADMIN_ROUTE_SEGMENTS.catalogs}
              element={withAdminRoles(<CatalogsAdmin />, ADMIN_ROUTE_ALLOWED_ROLES.catalogs)}
            />
            <Route
              path={ADMIN_ROUTE_SEGMENTS.leads}
              element={withAdminRoles(<LeadsAdmin />, ADMIN_ROUTE_ALLOWED_ROLES.leads)}
            />
            <Route
              path={ADMIN_ROUTE_SEGMENTS.newsletter}
              element={withAdminRoles(<NewsletterAdmin />, ADMIN_ROUTE_ALLOWED_ROLES.newsletter)}
            />
            <Route
              path={ADMIN_ROUTE_SEGMENTS.media}
              element={withAdminRoles(<MediaAdmin />, ADMIN_ROUTE_ALLOWED_ROLES.media)}
            />
            <Route
              path={ADMIN_ROUTE_SEGMENTS.seo}
              element={withAdminRoles(<SeoAdmin />, ADMIN_ROUTE_ALLOWED_ROLES.seo)}
            />
            <Route
              path={ADMIN_ROUTE_SEGMENTS.users}
              element={withAdminRoles(<UsersAdmin />, ADMIN_ROUTE_ALLOWED_ROLES.users)}
            />
            <Route
              path={ADMIN_ROUTE_SEGMENTS.activityLogs}
              element={withAdminRoles(<ActivityLogsAdmin />, ADMIN_ROUTE_ALLOWED_ROLES.activityLogs)}
            />
            <Route path="*" element={<Navigate to={ADMIN_HOME_PATH} replace />} />
          </Route>

          {/* Public routes with public Layout */}
          <Route path="/" element={withPublicLayout(<Home />)} />
          <Route path="/lojas" element={withPublicLayout(<Stores />)} />
          <Route path="/lojas/:slug" element={withPublicLayout(<StoreDetail />)} />
          <Route path="/lancamentos" element={withPublicLayout(<Launches />)} />
          <Route path="/planeje-sua-visita" element={withPublicLayout(<Planning />)} />
          <Route path="/meu-roteiro" element={withPublicLayout(<MyRoute />)} />
          <Route path="/abra-sua-loja" element={withPublicLayout(<Leasing />)} />
          <Route path="/privacidade" element={withPublicLayout(<CmsPage slug="privacidade" />)} />
          <Route path="/termos" element={withPublicLayout(<CmsPage slug="termos" />)} />
          <Route path="/sobre" element={withPublicLayout(<CmsPage slug="sobre" />)} />
          <Route path="/pagina/:slug" element={withPublicLayout(<CmsPage />)} />
          <Route path="*" element={withPublicLayout(<NotFound />)} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
