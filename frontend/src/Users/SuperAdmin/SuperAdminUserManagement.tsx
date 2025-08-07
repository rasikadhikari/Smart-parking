import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import SuperadminSidebar from "../../components/SuperadminSidebar";
import { motion } from "framer-motion";
import { Trash2, UserCog } from "lucide-react";

const SuperAdminUserManagement = ({ user }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.role !== "superadmin") {
      navigate("/login", {
        state: { message: "Access restricted to superadmins only." },
      });
      return;
    }

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await api.get("/users");
        setUsers(res.data);
      } catch (err) {
        setError(err.response?.data?.message || "Error fetching users");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [user, navigate]);
  const handleLogout = () => {
    navigate("/login");
  };

  const handleDeleteUser = async (userId: any) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    setLoading(true);
    try {
      await api.delete(`/users/${userId}`);
      setUsers(users.filter((u) => u._id !== userId));
    } catch (err) {
      setError(err.response?.data?.message || "Error deleting user");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: any, newRole: any) => {
    setLoading(true);
    try {
      const res = await api.put(`/users/${userId}/role`, { role: newRole });
      setUsers(
        users.map((u) => (u._id === userId ? { ...u, role: res.data.role } : u))
      );
    } catch (err) {
      setError(err.response?.data?.message || "Error updating role");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SuperadminSidebar />
      <div className="flex-1 p-6 sm:p-10">
        <h2 className="text-3xl font-extrabold text-blue-700 mb-6 text-center">
          👤 User Management
        </h2>
        {error && (
          <div className="text-red-600 text-center mb-4 font-medium">
            {error}
          </div>
        )}
        <div className="bg-white shadow-xl rounded-lg overflow-x-auto p-6">
          <table className="min-w-full table-auto border-collapse">
            <thead className="bg-blue-100 text-blue-800 text-sm uppercase font-semibold">
              <tr>
                <th className="px-4 py-3 text-left">Full Name</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, index) => (
                <motion.tr
                  key={u._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-t hover:bg-blue-50 transition-colors duration-200"
                >
                  <td className="px-4 py-3 text-sm">{u.fullName}</td>
                  <td className="px-4 py-3 text-sm">{u.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <UserCog className="w-4 h-4 text-blue-500" />
                      <select
                        value={u.role}
                        onChange={(e) =>
                          handleRoleChange(u._id, e.target.value)
                        }
                        className="border rounded px-2 py-1 text-sm"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                        <option value="superadmin">Superadmin</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDeleteUser(u._id)}
                      className="text-red-600 hover:text-red-800 flex items-center gap-1 text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {loading && (
            <div className="text-center text-blue-600 font-medium mt-4">
              Loading...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminUserManagement;
