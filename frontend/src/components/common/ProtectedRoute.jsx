import { Navigate, Outlet, useLocation } from 'react-router-dom';

export default function ProtectedRoute({ roleRequired }) {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const location = useLocation();

  // ── Debug logs (remove in production) ──
  console.log("--- Auth Check ---");
  console.log("Token exists:", !!token);
  console.log("Stored Role:", userRole);
  console.log("Required Role:", roleRequired);
  console.log("Current Path:", location.pathname);

  // 1. If no token, redirect to login
  if (!token) {
    console.log("Redirecting to login: No token found");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Check if token is expired
  try {
    const tokenData = JSON.parse(atob(token.split('.')[1]));
    if (tokenData.exp && tokenData.exp * 1000 < Date.now()) {
      console.log("Token expired, redirecting to login");
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userName');
      localStorage.removeItem('agentId');
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
  } catch (err) {
    console.warn("Could not parse token:", err);
  }

  // 3. Role Check (case-insensitive)
  const currentRole = userRole ? userRole.trim().toLowerCase() : null;
  const requiredRole = roleRequired ? roleRequired.toLowerCase() : null;

  // 4. If no role required, just check if authenticated
  if (!requiredRole) {
    console.log("Authenticated (no role required)");
    return <Outlet />;
  }

  // 5. Check if user is authorized for this role
  const isAuthorized = currentRole === requiredRole;

  if (!isAuthorized) {
    console.log(`Redirecting: Role mismatch. Current: ${currentRole}, Required: ${requiredRole}`);

    // Redirect to appropriate dashboard based on current role
    const roleRoutes = {
      'admin': '/admin/dashboard',
      'agent': '/agent/dashboard',
      'seller': '/seller/dashboard',
      'buyer': '/buyer/dashboard'
    };

    // If user has a valid role, redirect to their dashboard
    if (currentRole && roleRoutes[currentRole]) {
      return <Navigate to={roleRoutes[currentRole]} replace />;
    }

    // If role is unknown or user has no role, redirect to login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 6. Agent-specific checks
  if (currentRole === 'agent') {
    // Check if agent is active
    if (user.status && user.status !== 'active') {
      console.log("Agent account is not active");
      return <Navigate to="/login" state={{ 
        from: location, 
        message: 'Your account is not active. Please contact admin.' 
      }} replace />;
    }
  }

  // 7. Authorized
  console.log("Authorized access granted");
  return <Outlet />;
}