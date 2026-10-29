import { useEffect, useState } from "react";
import { ArrowLeftRight, FolderCog, UsersRound } from "lucide-react";
import toast from "react-hot-toast";

import API from "../../../api/axios";
import "./AdminDashboard.css";

function AdminDashboard() {
  const [stats, setStats] = useState({
    activeUsers: 0,
    totalTransactions: 0,
    topCategory: "—",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await API.get("/admin/stats/overview");
      setStats(res.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load stats");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Campus Coin system overview.</p>
        </div>
      </div>

      <div className="admin-stat-grid">
        <div>
          <UsersRound size={20} />
          <span>Active Users</span>
          <strong>{loading ? "..." : stats.activeUsers}</strong>
        </div>

        <div>
          <ArrowLeftRight size={20} />
          <span>Total Transactions</span>
          <strong>{loading ? "..." : stats.totalTransactions}</strong>
        </div>

        <div>
          <FolderCog size={20} />
          <span>Most Used Category</span>
          <strong>{loading ? "..." : stats.topCategory}</strong>
        </div>
      </div>

      <section className="admin-panel">
        <h2>System Overview</h2>
        <p>
          Campus Coin is operating normally. User and transaction
          statistics are live from the backend.
        </p>
      </section>
    </div>
  );
}

export default AdminDashboard;