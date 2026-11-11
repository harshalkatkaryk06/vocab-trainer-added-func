import { useContext } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { AuthContext, AuthProvider } from "./context/AuthContext";
import AuthPage from "./pages/AuthPage";
import Navbar from "./components/Navbar";
import Search from "./pages/SearchPage";
import Library from "./pages/Library";
import Quiz from "./pages/Quiz";
import Profile from "./pages/Profile";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import AdminWords from "./pages/AdminWords";
import LibraryWordDetails from "./pages/LibraryWordDetails";
import Plans from "./pages/Plans";
import CancelSubscription from "./pages/CancelSubscription";
import AdminLayout from "./components/AdminLayout";
import AdminOverview from "./pages/admin/AdminOverview";
import UserManagement from "./pages/admin/UserManagement";
import AdminManagement from "./pages/admin/AdminManagement";
import AuditLogs from "./pages/admin/AuditLogs";
import SecurityEvents from "./pages/admin/SecurityEvents";
import AdminPayments from "./pages/admin/Payments";
import CancellationRequests from "./pages/admin/CancellationRequests";
import AlertSecurity from "./pages/admin/AlertSecurity";
import AlertSystem from "./pages/admin/AlertSystem";
import AlertAuthentication from "./pages/admin/AlertAuthentication";
import AlertAIUsage from "./pages/admin/AlertAIUsage";
import AlertHistory from "./pages/admin/AlertHistory";
import AdminPlans from "./pages/admin/AdminPlans";
import AdminCreatePlan from "./pages/admin/AdminCreatePlan";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminSystemHealth from "./pages/admin/AdminSystemHealth";


// Authenticated shell: persistent navbar + routed pages via <Outlet/>.
function AppShell() {
  const { pathname } = useLocation();
  const isAdminRoute = pathname.startsWith("/admin") && pathname !== "/admin/words";

  return (
    <div className="vt-app-shell flex min-h-screen flex-col">
      {!isAdminRoute && <Navbar />}
      <Outlet />
    </div>
  );
}

// Admin shell: AdminLayout sidebar + routed admin pages via <Outlet/>.
// Access is gated by backend role middleware; frontend role check is a UI hint only.
function AdminShell() {
  const { user } = useContext(AuthContext);
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    return <Navigate to="/" replace />;
  }
  return <AdminLayout><Outlet /></AdminLayout>;
}

function Inner() {
  const { user, loading } = useContext(AuthContext);

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#08080f]">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#7c6cff]">
            <span className="font-['Georgia',serif] text-xl font-bold text-white">V</span>
          </div>
          <p className="text-sm text-[#9a9aae]">Loading…</p>
        </div>
      </div>
    );

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes — reachable whether or not the user is logged in */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />

        {user ? (
          <Route element={<AppShell />}>
            <Route path="/" element={<Search />} />
            <Route path="/library" element={<Library />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/subscription/cancel" element={<CancelSubscription />} />
            <Route path="*" element={<Navigate to="/" replace />} />
            <Route
              path="/admin/words"
              element={(user.role === "admin" || user.role === "super_admin") ? <AdminWords /> : <Navigate to="/" replace />}
            />
            <Route element={<AdminShell />}>
              <Route path="/admin/overview" element={<AdminOverview />} />
              <Route path="/admin/users" element={<UserManagement />} />
              <Route path="/admin/admins" element={<AdminManagement />} />
              <Route path="/admin/audit-logs" element={<AuditLogs />} />
              <Route path="/admin/security-events" element={<SecurityEvents />} />
              <Route path="/admin/payments" element={<AdminPayments />} />
              <Route
                path="/admin/cancellation-requests"
                element={
                  user.role === "super_admin" ? (
                    <CancellationRequests />
                  ) : (
                    <Navigate to="/admin/overview" replace />
                  )
                }
              />
              <Route path="/admin/alerts/security" element={<AlertSecurity />} />
              <Route path="/admin/alerts/system" element={<AlertSystem />} />
              <Route path="/admin/alerts/authentication" element={<AlertAuthentication />} />
              <Route path="/admin/alerts/ai-usage" element={<AlertAIUsage />} />
              <Route path="/admin/alerts/history" element={<AlertHistory />} />
              <Route path="/admin/plans" element={<AdminPlans />} />
              <Route path="/admin/plans/create" element={<AdminCreatePlan />} />
              <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
              <Route path="/admin/system-health" element={<AdminSystemHealth />} />
              <Route path="/admin" element={<Navigate to="/admin/overview" replace />} />
            </Route>
            <Route
              path="/library/:id"
              element={<LibraryWordDetails />}
            />
          </Route>
        ) : (
          <Route path="*" element={<AuthPage />} />
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Inner />
    </AuthProvider>
  );
}