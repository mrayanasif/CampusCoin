import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import toast from "react-hot-toast";

import API from "../../../api/axios";
import "./Statistics.css";

const categoryColors = ["#155e37", "#15803d", "#22c55e", "#65a30d", "#84cc16"];

function Statistics() {
  const [usage, setUsage] = useState([]);
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState({
    activeUsers: 0,
    totalTransactions: 0,
    topCategory: "—",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        const [usageRes, overviewRes] = await Promise.all([
          API.get("/admin/stats/usage"),
          API.get("/admin/stats/overview"),
        ]);
        setUsage(usageRes.data.usage || []);
        setCategories(usageRes.data.mostUsedCategories || overviewRes.data.mostUsedCategories || []);
        setSummary(overviewRes.data || {});
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to load statistics");
      } finally {
        setLoading(false);
      }
    };
    fetchStatistics();
  }, []);

  return (
    <div className="admin-statistics-page">
      <div className="page-heading">
        <div>
          <h1>Usage Statistics</h1>
          <p>Monitor Campus Coin usage across the system.</p>
        </div>
      </div>

      <div className="statistics-summary">
        <div><span>Active Users</span><strong>{loading ? "—" : summary.activeUsers || 0}</strong></div>
        <div><span>Transactions Logged</span><strong>{loading ? "—" : summary.totalTransactions || 0}</strong></div>
        <div><span>Most Used Category</span><strong>{loading ? "—" : summary.topCategory || "—"}</strong></div>
      </div>

      <section className="statistics-chart statistics-transactions-chart">
        <div className="statistics-chart-heading">
          <div><h2>Monthly Transactions</h2><p>Transaction count over the last six months</p></div>
          <span>Line graph</span>
        </div>
        <div className="statistics-chart-body">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={usage} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#edf0e9" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={38} />
              <Tooltip />
              <Line type="monotone" dataKey="transactions" name="Transactions" stroke="#168044" strokeWidth={3} dot={{ r: 4, fill: "#168044" }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="statistics-secondary-grid">
        <section className="statistics-chart">
          <div className="statistics-chart-heading">
            <div><h2>New Users by Month</h2><p>Student accounts created each month</p></div>
            <span>Bar graph</span>
          </div>
          <div className="statistics-chart-body">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={usage} margin={{ top: 12, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="#edf0e9" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="users" name="New users" fill="#168044" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="statistics-chart statistics-category-chart">
          <div className="statistics-chart-heading">
            <div><h2>Transactions by Category</h2><p>Share of transactions per category</p></div>
            <span>Pie chart</span>
          </div>
          {categories.length ? (
            <div className="statistics-category-content">
              <div className="statistics-pie-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categories} dataKey="count" nameKey="category" innerRadius="52%" outerRadius="83%" paddingAngle={2}>
                      {categories.map((item, index) => <Cell key={`${item.category}-${index}`} fill={categoryColors[index % categoryColors.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="statistics-category-legend">
                {categories.map((item, index) => (
                  <div key={`${item.category}-${index}`}>
                    <span><i style={{ backgroundColor: categoryColors[index % categoryColors.length] }} />{item.category}</span>
                    <strong>{item.count}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="statistics-empty">Category data will appear when transactions are available.</p>}
        </section>
      </div>
    </div>
  );
}

export default Statistics;
