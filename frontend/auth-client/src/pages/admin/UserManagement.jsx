import { useState, useEffect } from "react";
import { getAdminUsers, changeUserRole } from "../../api/admin";

const SERIF = "font-['Playfair_Display',Georgia,'Times_New_Roman',serif]";

const roleBadge = (role) => {
  switch (role) {
    case "super_admin":
      return "bg-[#fb7185]/10 text-[#fb7185] border-[#fb7185]/20";
    case "admin":
      return "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20";
    default:
      return "bg-[#7c6cff]/10 text-[#7c6cff] border-[#7c6cff]/20";
  }
};

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await getAdminUsers();
        setUsers(res.data.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const changeRole = async (id, currentRole) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    setSaving(id);
    try {
      await changeUserRole(id, newRole);
      setUsers((prev) => prev.map((u) => (u._id === id ? { ...u, role: newRole } : u)));
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Failed to change role");
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="inline-block animate-spin text-3xl text-[#b6abff]">⟳</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`${SERIF} m-0 text-[34px] font-bold tracking-[-0.01em] text-[#ededf2]`}>
          User Management
        </h1>
        <p className="mt-1 text-[#9a9aae]">
          View and manage all user accounts. Admins can be promoted or demoted here.
        </p>
      </div>

      <div className="admin-table-wrap rounded-[20px] border-[0.5px] border-white/[0.07] bg-[#0f0f18]">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/[0.07] bg-[#0f0f18]/50">
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">Username</th>
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">Email</th>
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">Role</th>
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">Provider</th>
              <th className="px-6 py-4 text-xs uppercase tracking-[0.1em] text-[#6a6a7c]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {users.map((u) => (
              <tr key={u._id} className="hover:bg-white/[0.02]">
                <td className="px-6 py-4">{u.username}</td>
                <td className="px-6 py-4 text-[#9a9aae]">{u.email}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-semibold border ${roleBadge(u.role)}`}>
                    {u.role.replace("_", " ")}
                  </span>
                </td>
                <td className="px-6 py-4 text-[#9a9aae]">{u.provider}</td>
                <td className="px-6 py-4">
                  {u.role === "super_admin" ? (
                    <span className="text-[11px] text-[#6a6a7c]">Protected</span>
                  ) : (
                    <button
                      onClick={() => changeRole(u._id, u.role)}
                      disabled={saving === u._id}
                      className="cursor-pointer rounded px-3 py-1.5 text-[11px] font-medium transition-colors border border-white/[0.07] bg-transparent text-[#9a9aae] hover:text-[#b6abff] hover:bg-white/[0.03] disabled:opacity-50"
                    >
                      {saving === u._id ? "Saving…" : u.role === "admin" ? "Demote" : "Promote"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <div className="rounded-[20px] border-[0.5px] border-white/[0.07] bg-[#0f0f18] p-16 text-center">
          <p className="text-[#9a9aae]">No users found.</p>
        </div>
      )}
    </div>
  );
}
