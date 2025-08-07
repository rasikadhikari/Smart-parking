import { useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import AdminSidebar from "./AdminSidebar";

const Layout = ({ user, handleLogout, children }) => {
  const location = useLocation();

  // List of routes where you don't want the layout (including sidebar and navbar)
  const excludedPaths = ["/login", "/register"];
  const shouldExcludeLayout = excludedPaths.includes(location.pathname);

  // Show sidebar only for admin pages
  const isAdminRoute = location.pathname.startsWith("/admin") && user?.role === "admin";

  if (shouldExcludeLayout) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Navbar user={user} handleLogout={handleLogout} />
      <div className="flex flex-1 min-h-0">
      {isAdminRoute && (
  <aside className="w-64 p-20 pt-6 bg-white border-r border-gray-200 min-h-full sticky z-10">
    <AdminSidebar />
  </aside>
)}

        <main className="flex-1 p-20 overflow-auto">
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default Layout;