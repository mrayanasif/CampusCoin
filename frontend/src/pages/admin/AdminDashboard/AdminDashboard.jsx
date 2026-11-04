import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, ArrowLeftRight, FolderCog, UsersRound } from "lucide-react";
import toast from "react-hot-toast";

import API from "../../../api/axios";
import { formatCurrency } from "../../../context/CurrencyContext";
import "./AdminDashboard.css";

const chartColors = ["#155e37", "#15803d", "#22c55e", "#65a30d", "#84cc16"];

function AdminDashboard() {
  const [stats, setStats] = useState({
    activeUsers: 0,
    totalTransactions: 0,
    topCategory: "—",
    mostUsedCategories: [],
  });
  const [usage, setUsage] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [overviewRes, usageRes, recentRes] = await Promise.all([
          API.get("/admin/stats/overview"),
          API.get("/admin/stats/usage"),
          API.get("/admin/stats/recent-transactions"),
        ]);
        setStats(overviewRes.data || {});
        setUsage(usageRes.data.usage || []);
        setRecentTransactions(recentRes.data.transactions || []);
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-heading">
        <div>
          <span className="admin-eyebrow">Overview</span>
          <h1>Admin Dashboard</h1>
          <p>Campus Coin system overview.</p>
        </div>
        <span className="admin-live-badge"><Activity size={15} /> Live system data</span>
      </div>

      <div className="admin-stat-grid">
        <article className="admin-stat-card">
          <UsersRound size={21} />
          <span>Active Users</span>
          <strong>{loading ? "—" : stats.activeUsers ?? 0}</strong>
        </article>
        <article className="admin-stat-card">
          <ArrowLeftRight size={21} />
          <span>Total Transactions</span>
          <strong>{loading ? "—" : stats.totalTransactions ?? 0}</strong>
        </article>
        <article className="admin-stat-card">
          <FolderCog size={21} />
          <span>Most Used Category</span>
          <strong className="admin-top-category">{loading ? "—" : stats.topCategory || "—"}</strong>
        </article>
      </div>

      <section className="admin-panel admin-usage-panel">
        <div className="admin-panel-heading">
          <div>
            <h2>Transaction Overview</h2>
            <p>Transactions per month · last six months</p>
          </div>
          <span className="admin-total-pill">{loading ? "—" : `${stats.totalTransactions ?? 0} total`}</span>
        </div>
        <div className="admin-line-chart">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={usage} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="adminUsageFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#15803d" stopOpacity={0.14} />
                  <stop offset="100%" stopColor="#15803d" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#edf0e9" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={32} />
              <Tooltip />
              <Area type="monotone" dataKey="transactions" stroke="#168044" strokeWidth={3} fill="url(#adminUsageFill)" activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="admin-dashboard-lower">
        <section className="admin-panel admin-chart-panel">
          <div className="admin-panel-heading">
            <div><h2>Most Used Categories</h2><p>Transaction count by category</p></div>
          </div>
          {stats.mostUsedCategories?.length ? (
            <div className="admin-category-chart-wrap">
              <div className="admin-donut-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.mostUsedCategories} dataKey="count" nameKey="category" innerRadius="58%" outerRadius="88%" paddingAngle={2}>
                      {stats.mostUsedCategories.map((item, index) => <Cell key={`${item.category}-${index}`} fill={chartColors[index % chartColors.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="admin-category-legend">
                {stats.mostUsedCategories.map((item, index) => (
                  <div key={`${item.category}-${index}`}>
                    <span><i style={{ backgroundColor: chartColors[index % chartColors.length] }} />{item.category}</span>
                    <strong>{item.count}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="admin-empty-state">Category statistics will appear when transactions are available.</p>}
        </section>

        <section className="admin-panel admin-chart-panel admin-monthly-panel">
          <div className="admin-panel-heading">
            <div><h2>Monthly Activity</h2><p>Transaction volume by month</p></div>
          </div>
          <div className="admin-small-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={usage} margin={{ top: 8, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#edf0e9" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="transactions" fill="#15803d" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="admin-panel admin-recent-panel">
        <div className="admin-panel-heading">
          <div><h2>Recent Transaction Activity</h2><p>Most recent income and expense entries</p></div>
        </div>
        <div className="admin-table-scroll">
          <table className="admin-recent-table">
            <thead><tr><th>Period</th><th>User</th><th>Category / Source</th><th>Type</th><th>Status</th><th className="amount-heading">Amount</th></tr></thead>
            <tbody>
              {recentTransactions.map((transaction) => (
                <tr key={transaction._id}>
                  <td>{new Date(transaction.date).toLocaleDateString("en", { month: "short", year: "numeric" })}</td>
                  <td className="admin-table-user" title={transaction.user?.email || undefined}>
                    {transaction.user?.name || transaction.user?.email}
                  </td>
                  <td>{transaction.category?.name || transaction.description || transaction.source || "Uncategorized"}</td>
                  <td><span className={`admin-type-pill ${transaction.type}`}>{transaction.type}</span></td>
                  <td><span className="admin-status-pill">Successful</span></td>
                  <td className={`admin-amount ${transaction.type}`}>
                    {transaction.type === "income" ? "+" : "−"}{formatCurrency(transaction.amount, "PKR")}
                  </td>
                </tr>
              ))}
              {!loading && recentTransactions.length === 0 && <tr><td colSpan="6" className="admin-empty-table">No transaction activity yet.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="admin-table-note">Saved entries are successful transactions. Income is green and expenses are red.</p>
      </section>
    </div>
  );
}

export default AdminDashboard;