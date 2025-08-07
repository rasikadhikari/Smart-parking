import { useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import AdminSidebar from "./AdminSidebar";

const Layout = ({ user, handleLogout, children }) => {
  const location = useLocation();

  // List of routes where you don't want the layout (including sidebar and navbar)
  const excludedPaths = ["/login", "/register"];

  const shouldExcludeLayout = excludedPaths.includes(location.pathname);

  if (shouldExcludeLayout) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Navbar user={user} handleLogout={handleLogout} />
      <main className="flex-1 ">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;