import { useEffect, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

import API from "../../../api/axios";
import "./Users.css";

function Users() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await API.get("/admin/users");
      setUsers(res.data.users || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    try {
      const endpoint = currentStatus
        ? `/admin/users/${id}/disable`
        : `/admin/users/${id}/enable`;

      await API.put(endpoint);
      toast.success(currentStatus ? "User disabled" : "User enabled");

      setUsers((current) =>
        current.map((u) =>
          u._id === id ? { ...u, isActive: !u.isActive } : u
        )
      );
    } catch (error) {
      toast.error(error.response?.data?.message || "Action failed");
    }
  };

  const resetUser = async (id) => {
    if (!window.confirm("Send password reset link to this user?")) return;
    try {
      await API.put(`/admin/users/${id}/reset-password`);
      toast.success("Password reset link sent");
    } catch (error) {
      toast.error(error.response?.data?.message || "Reset failed");
    }
  };

  const visibleUsers = users.filter(
    (user) =>
      user.name?.toLowerCase().includes(search.toLowerCase()) ||
      user.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>User Accounts</h1>
          <p>View, disable or reset Campus Coin users.</p>
        </div>
      </div>

      <div className="user-search">
        <Search size={16} />
        <input
          type="search"
          placeholder="Search users"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={{ padding: "40px", textAlign: "center" }}>
          <Loader2 size={24} className="spin" />
        </div>
      ) : (
        <div className="users-table">
          <div className="users-head">
            <span>Name</span>
            <span>Email</span>
            <span>Status</span>
            <span>Action</span>
          </div>

          {visibleUsers.length === 0 ? (
            <p style={{ padding: "20px", color: "#888" }}>No users found.</p>
          ) : (
            visibleUsers.map((user) => (
              <div className="user-row" key={user._id}>
                <strong>{user.name}</strong>
                <span>{user.email}</span>
                <span className={user.isActive ? "user-active" : "user-disabled"}>
                  {user.isActive ? "Active" : "Disabled"}
                </span>
                <div>
                  <button type="button" onClick={() => toggleStatus(user._id, user.isActive)}>
                    {user.isActive ? "Disable" : "Enable"}
                  </button>
                  <button type="button" onClick={() => resetUser(user._id)}>
                    Reset
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default Users;