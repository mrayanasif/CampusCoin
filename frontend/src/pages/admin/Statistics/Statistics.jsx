import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import toast from "react-hot-toast";

import API from "../../../api/axios";
import "./Statistics.css";

function Statistics() {
  const [usage, setUsage] = useState([]);
  const [summary, setSummary] = useState({ activeUsers: 0, totalTransactions: 0, topCategory: "—" });

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      const [usageRes, overviewRes] = await Promise.all([
        API.get("/admin/stats/usage"),
        API.get("/admin/stats/overview"),
      ]);
      setUsage(usageRes.data.usage || []);
      setSummary(overviewRes.data || {});
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load statistics");
    }
  };

  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>Usage Statistics</h1>
          <p>Monitor Campus Coin usage across the system.</p>
        </div>
      </div>

      <div className="statistics-summary">
        <div>
          <span>Active Users</span>
          <strong>{summary.activeUsers || 0}</strong>
        </div>
        <div>
          <span>Transactions Logged</span>
          <strong>{summary.totalTransactions || 0}</strong>
        </div>
        <div>
          <span>Most Used Category</span>
          <strong>{summary.topCategory || "—"}</strong>
        </div>
      </div>

      <section className="statistics-chart">
        <h2>Monthly Usage</h2>
        <div>
          <ResponsiveContainer>
            <BarChart data={usage}>
              <CartesianGrid stroke="#eee" vertical={false} />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="transactions" fill="#7f1d3a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

export default Statistics;