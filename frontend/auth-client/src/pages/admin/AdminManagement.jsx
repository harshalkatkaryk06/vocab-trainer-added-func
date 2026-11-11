import { useState, useEffect } from "react";
import { getAdmins, createAdmin, revokeAdmin } from "../../api/admin";

const SERIF = "font-['Playfair_Display',Georgia,'Times_New_Roman',serif]";

export default function AdminManagement() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [revoking, setRevoking] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await getAdmins();
        setAdmins(res.data.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setCreating(true);
    try {
      await createAdmin(newEmail.trim());
      setNewEmail("");
      const res = await getAdmins();
      setAdmins(res.data.data);
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to create admin");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id) => {
    if (!window.confirm("Revoke admin privileges for this user?")) return;
    setRevoking(id);
    try {
      await revokeAdmin(id);
      setAdmins((prev) => prev.filter((a) => a._id !== id));
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to revoke admin");
    } finally {
      setRevoking(null);
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
          Admin Management
        </h1>
        <p className="mt-1 text-[#9a9aae]">
          Promote users to admin or revoke admin privileges. Super Admin only.
        </p>
      </div>

      <div className="rounded-[20px] border-[0.5px] border-white/[0.07] bg-[#0f0f18] p-6">
        <h2 className={`${SERIF} mb-4 text-[20px] font-bold text-[#ededf2]`}>
          Promote to Admin
        </h2>
        <form onSubmit={handleCreate} className="flex flex-wrap gap-3">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="user@example.com"
            className="flex-1 min-w-[200px] rounded-[12px] border-[0.5px] border-white/[0.07] bg-white/[0.02] px-4 py-3 text-[15px] text-[#ededf2] outline-none focus:border-[#7c6cff]/50"
          />
          <button
            type="submit"
            disabled={creating}
            className="rounded-[12px] bg-[#7c6cff] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {creating ? "Promoting…" : "Promote"}
          </button>
        </form>
      </div>

      <div className="rounded-[20px] border-[0.5px] border-white/[0.07] bg-[#0f0f18] p-6">
        <h2 className={`${SERIF} mb-4 text-[20px] font-bold text-[#ededf2]`}>
          Current Admins
        </h2>
        <div className="divide-y divide-white/[0.05]">
          {admins.map((a) => (
            <div key={a._id} className="flex items-center justify-between py-4">
              <div>
                <div className="font-medium text-[#ededf2]">{a.username}</div>
                <div className="text-[12px] text-[#9a9aae]">{a.email}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-semibold border ${a.role === "super_admin" ? "bg-[#fb7185]/10 text-[#fb7185] border-[#fb7185]/20" : "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20"}`}>
                  {a.role.replace("_", " ")}
                </span>
                {a.role !== "super_admin" ? (
                  <button
                    onClick={() => handleRevoke(a._id)}
                    disabled={revoking === a._id}
                    className="cursor-pointer rounded px-3 py-1.5 text-[11px] font-medium transition-colors border border-[#fb7185]/20 bg-[#fb7185]/10 text-[#fb7185] hover:bg-[#fb7185]/20 disabled:opacity-50"
                  >
                    {revoking === a._id ? "Revoking…" : "Revoke"}
                  </button>
                ) : (
                  <span className="text-[11px] text-[#6a6a7c]">Protected</span>
                )}
              </div>
            </div>
          ))}
          {admins.length === 0 && (
            <p className="py-4 text-center text-[#9a9aae]">No admins found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
