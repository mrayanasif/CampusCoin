import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, ImageDown, Loader2, RotateCcw, Mail } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import toast from "react-hot-toast";

import API from "../../api/axios";
import {
  Skeleton,
  SkeletonChart,
  SkeletonText,
} from "../../components/Skeleton/Skeleton";
import "./Reports.css";

const COLORS = ["#C7F36B", "#38BDF8", "#2563eb", "#16a34a", "#a855f7", "#0ea5e9"];

function Reports() {
  const navigate = useNavigate();
  const reportRef = useRef(null);

  const [monthly, setMonthly] = useState([]);
  const [categories, setCategories] = useState([]);
  const [weekly, setWeekly] = useState([]);
  const [weeklySummary, setWeeklySummary] = useState([]);
  const [summary, setSummary] = useState({ income: 0, expense: 0, savings: 0 });
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [emailing, setEmailing] = useState(false);

  const [filters, setFilters] = useState({
    dateRange: "thisMonth",
    from: "",
    to: "",
    category: "all",
    type: "all",
  });

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/login");
      return;
    }
    fetchReports();
    fetchAllCategories();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchFilteredData();
    }
  }, [filters]);

  const fetchAllCategories = async () => {
    try {
      const res = await API.get("/categories");
      setAllCategories(res.data.categories || []);
    } catch (error) {
      // silent
    }
  };

  const computeDateRange = () => {
    if (filters.dateRange === "custom") {
      return {
        from: filters.from || null,
        to: filters.to || new Date().toISOString().slice(0, 10),
      };
    }

    const now = new Date();
    const to = now.toISOString().slice(0, 10);
    let from = null;

    if (filters.dateRange === "thisMonth") {
      from = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .slice(0, 10);
    } else if (filters.dateRange === "last30") {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      from = d.toISOString().slice(0, 10);
    } else if (filters.dateRange === "last6") {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 5);
      d.setDate(1);
      from = d.toISOString().slice(0, 10);
    }

    return { from, to };
  };

  const periodLabel = () => {
    if (filters.dateRange === "thisMonth") return "Current month";
    if (filters.dateRange === "last30") return "Last 30 days";
    if (filters.dateRange === "last6") return "Last 6 months";
    if (filters.dateRange === "custom") {
      if (!filters.from && !filters.to) return "Custom range";
      return `${filters.from || "Start"} → ${filters.to || "Today"}`;
    }
    return "All time";
  };

  const fetchReports = async () => {
    try {
      setLoading(true);

      const trendRes = await API.get("/reports/income-expense");
      const map = {};
      (trendRes.data.data || []).forEach((item) => {
        if (!map[item._id.month]) map[item._id.month] = { month: item._id.month };
        map[item._id.month][item._id.type] = item.total;
      });
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const formatted = Object.values(map).map((m) => {
        const [y, mo] = m.month.split("-");
        return {
          month: `${monthNames[parseInt(mo) - 1]}`,
          income: m.income || 0,
          expense: m.expense || 0,
        };
      });
      setMonthly(formatted);

      const dailyRes = await API.get("/reports/daily");
      const daily = dailyRes.data.data || [];
      const dayMap = {};
      daily.forEach((d) => {
        if (d._id.type === "expense") dayMap[d._id.day] = d.total;
      });
      const last7 = Object.entries(dayMap).slice(-7).map(([day, amount]) => ({
        day: new Date(day).toLocaleDateString("en-US", { weekday: "short" }),
        amount,
      }));
      setWeekly(last7);

      const weeklyRes = await API.get("/reports/weekly");
      const weeklyData = weeklyRes.data.data || [];
      const weekMap = {};
      weeklyData.forEach((d) => {
        if (d._id.type === "expense") weekMap[d._id.week] = d.total;
      });
      setWeeklySummary(
        Object.entries(weekMap).map(([week, amount]) => ({
          week: `Week ${week}`,
          amount,
        }))
      );

      await fetchFilteredData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const fetchFilteredData = async () => {
    try {
      const { from, to } = computeDateRange();
      const params = new URLSearchParams();
      if (from) params.append("from", from);
      if (to) params.append("to", to);
      if (filters.category !== "all") params.append("category", filters.category);

      const res = await API.get(`/reports/filter?${params.toString()}`);
      let txns = res.data.transactions || [];

      if (filters.type !== "all") {
        txns = txns.filter((t) => t.type === filters.type);
      }

      const income = txns
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + t.amount, 0);
      const expense = txns
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + t.amount, 0);

      setSummary({ income, expense, savings: income - expense });

      const catMap = {};
      txns
        .filter((t) => t.type === "expense")
        .forEach((t) => {
          const name = t.category?.name || "Uncategorized";
          if (!catMap[name]) catMap[name] = 0;
          catMap[name] += t.amount;
        });

      const catData = Object.entries(catMap).map(([name, value], i) => ({
        name,
        value,
        color: COLORS[i % COLORS.length],
      }));
      setCategories(catData);
    } catch (error) {
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      dateRange: "thisMonth",
      from: "",
      to: "",
      category: "all",
      type: "all",
    });
  };

  const isFilterActive =
    filters.dateRange !== "thisMonth" ||
    Boolean(filters.from) ||
    Boolean(filters.to) ||
    filters.category !== "all" ||
    filters.type !== "all";

  const captureCanvas = async () => {
    if (!reportRef.current) throw new Error("Report not ready");

    const canvas = await html2canvas(reportRef.current, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: reportRef.current.scrollWidth,
      windowHeight: reportRef.current.scrollHeight,

      onclone: (clonedDoc) => {
        clonedDoc.body.classList.remove("dark-mode");

        const exportArea = clonedDoc.querySelector(".report-export-area");
        if (exportArea) {
          exportArea.style.background = "#ffffff";
          exportArea.style.color = "#1f2937";
          exportArea.style.padding = "20px";
          exportArea.style.borderRadius = "12px";
        }

        const header = clonedDoc.querySelector(".report-export-header");
        if (header) {
          header.style.display = "block";
          header.style.marginBottom = "16px";
          header.style.paddingBottom = "12px";
          header.style.borderBottom = "2px solid #7f1d3a";
        }

        clonedDoc.querySelectorAll(".report-summary div").forEach((el) => {
          el.style.background = "#ffffff";
          el.style.border = "1px solid #e5e7eb";
        });

        clonedDoc.querySelectorAll(".report-summary span").forEach((el) => {
          el.style.color = "#6b7280";
        });

        clonedDoc.querySelectorAll(".report-summary strong").forEach((el) => {
          el.style.color = "#1f2937";
        });

        clonedDoc.querySelectorAll(".report-card").forEach((el) => {
          el.style.background = "#ffffff";
          el.style.border = "1px solid #e5e7eb";
        });

        clonedDoc.querySelectorAll(".report-card h3").forEach((el) => {
          el.style.color = "#1f2937";
        });

        clonedDoc.querySelectorAll(".report-card p").forEach((el) => {
          el.style.color = "#6b7280";
        });

        clonedDoc.querySelectorAll(".recharts-text").forEach((el) => {
          el.style.fill = "#6b7280";
        });

        clonedDoc.querySelectorAll(".recharts-cartesian-grid line").forEach((el) => {
          el.style.stroke = "#e5e7eb";
        });
      },
    });

    return canvas;
  };

  const exportImage = async () => {
    if (exporting) return;
    setExporting(true);
    const toastId = toast.loading("Generating image...");

    try {
      const canvas = await captureCanvas();
      const link = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      link.download = `campus-coin-report-${date}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      toast.success("Image downloaded!", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Failed to export image", { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  const exportPDF = async () => {
    if (exporting) return;
    setExporting(true);
    const toastId = toast.loading("Generating PDF...");

    try {
      const canvas = await captureCanvas();
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const margin = 10;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.setFontSize(16);
      pdf.setTextColor(127, 29, 58);
      pdf.text("Campus Coin — Financial Report", margin, margin);
      pdf.setFontSize(10);
      pdf.setTextColor(120, 120, 120);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, margin + 6);

      const headerOffset = margin + 14;

      let heightLeft = imgHeight;
      let position = headerOffset;

      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - headerOffset - margin;

      while (heightLeft > 0) {
        position = position - (imgHeight - (pageHeight - headerOffset - margin)) + headerOffset + margin;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - margin;
      }

      const date = new Date().toISOString().slice(0, 10);
      pdf.save(`campus-coin-report-${date}.pdf`);

      toast.success("PDF downloaded!", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Failed to export PDF", { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  const shareByEmail = async () => {
    if (emailing) return;
    setEmailing(true);
    const toastId = toast.loading("Sending report to your email...");

    try {
      const { from, to } = computeDateRange();

      const res = await API.post("/reports/share/email", {
        from,
        to,
        category: filters.category,
        periodLabel: periodLabel(),
      });

      toast.success(res.data.message || "Report sent to your email!", {
        id: toastId,
      });
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to send email",
        { id: toastId }
      );
    } finally {
      setEmailing(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="page-heading">
          <div>
            <Skeleton height={28} width={180} />
            <Skeleton height={13} width={250} style={{ marginTop: 10 }} />
          </div>
        </div>

        <div className="report-summary">
          {[0, 1, 2].map((index) => (
            <div key={`report-summary-skeleton-${index}`}>
              <SkeletonText lines={2} />
            </div>
          ))}
        </div>

        <div className="report-grid">
          <section className="report-card wide-report">
            <Skeleton height={14} width={160} />
            <SkeletonChart height={260} />
          </section>
          <section className="report-card">
            <Skeleton height={14} width={160} />
            <SkeletonChart height={260} />
          </section>
          <section className="report-card">
            <Skeleton height={14} width={140} />
            <SkeletonChart height={200} />
          </section>
          <section className="report-card">
            <Skeleton height={14} width={140} />
            <SkeletonChart height={200} />
          </section>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>Reports</h1>
          <p>Review your spending and income patterns.</p>
        </div>

        <div className="report-actions">
          <button
            type="button"
            onClick={shareByEmail}
            disabled={emailing}
            title="Send report to your email"
          >
            {emailing ? (
              <Loader2 size={15} className="spin" />
            ) : (
              <Mail size={15} />
            )}
            Email
          </button>

          <button type="button" onClick={exportImage} disabled={exporting}>
            {exporting ? (
              <Loader2 size={15} className="spin" />
            ) : (
              <ImageDown size={15} />
            )}
            Image
          </button>

          <button type="button" onClick={exportPDF} disabled={exporting}>
            {exporting ? (
              <Loader2 size={15} className="spin" />
            ) : (
              <Download size={15} />
            )}
            PDF
          </button>
        </div>
      </div>

      <div className="report-filters">
        <select
          value={filters.dateRange}
          onChange={(e) => handleFilterChange("dateRange", e.target.value)}
          aria-label="Date range"
        >
          <option value="thisMonth">This Month</option>
          <option value="last30">Last 30 Days</option>
          <option value="last6">Last 6 Months</option>
          <option value="all">All Time</option>
          <option value="custom">Custom Range</option>
        </select>

        {filters.dateRange === "custom" && (
          <>
            <label className="report-date-field">
              <span>From</span>
              <input
                type="date"
                value={filters.from}
                max={filters.to || undefined}
                onChange={(e) => handleFilterChange("from", e.target.value)}
              />
            </label>

            <label className="report-date-field">
              <span>To</span>
              <input
                type="date"
                value={filters.to}
                min={filters.from || undefined}
                onChange={(e) => handleFilterChange("to", e.target.value)}
              />
            </label>
          </>
        )}

        <select
          value={filters.category}
          onChange={(e) => handleFilterChange("category", e.target.value)}
          aria-label="Category or income source"
          title="Filter by expense category or income source"
        >
          <option value="all">All Categories / Income Sources</option>
          {allCategories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name} ({c.type})
            </option>
          ))}
        </select>

        <select
          value={filters.type}
          onChange={(e) => handleFilterChange("type", e.target.value)}
          aria-label="Transaction type"
        >
          <option value="all">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>

        {isFilterActive && (
          <button
            type="button"
            className="report-reset-btn"
            onClick={resetFilters}
          >
            <RotateCcw size={14} />
            Reset
          </button>
        )}
      </div>

      <div ref={reportRef} className="report-export-area">
        <div className="report-export-header">
          <h2>Campus Coin — Financial Report</h2>
          <span>
            {new Date().toLocaleDateString("en-US", { dateStyle: "long" })}
          </span>
        </div>

        <div className="report-summary">
          <div>
            <span>Total Income</span>
            <strong>₹{summary.income.toLocaleString()}</strong>
          </div>
          <div>
            <span>Total Expenses</span>
            <strong>₹{summary.expense.toLocaleString()}</strong>
          </div>
          <div>
            <span>Total Savings</span>
            <strong>₹{summary.savings.toLocaleString()}</strong>
          </div>
        </div>

        <div className="report-grid">
          <section className="report-card wide-report">
            <h3>Income vs Expense</h3>
            <p>Last six months</p>

            <div className="report-chart">
              {monthly.length === 0 ? (
                <p style={{ padding: "20px", color: "#888" }}>No data yet</p>
              ) : (
                <ResponsiveContainer>
                  <LineChart data={monthly}>
                    <CartesianGrid stroke="#eee" vertical={false} />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line dataKey="income" stroke="#16a34a" strokeWidth={2} />
                    <Line dataKey="expense" stroke="#7f1d3a" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          <section className="report-card">
            <h3>Spending by Category</h3>
            <p>{periodLabel()}</p>

            <div className="report-chart">
              {categories.length === 0 ? (
                <p style={{ padding: "20px", color: "#888" }}>No data yet</p>
              ) : (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={categories}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={48}
                      outerRadius={75}
                    >
                      {categories.map((c) => (
                        <Cell key={c.name} fill={c.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          <section className="report-card">
            <h3>Daily Spending</h3>
            <p>Current month (last 7 days with activity)</p>

            <div className="report-chart">
              {weekly.length === 0 ? (
                <p style={{ padding: "20px", color: "#888" }}>No data yet</p>
              ) : (
                <ResponsiveContainer>
                  <BarChart data={weekly}>
                    <CartesianGrid stroke="#eee" vertical={false} />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="amount" fill="#7f1d3a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          <section className="report-card">
            <h3>Weekly Spending</h3>
            <p>Current month by week</p>

            <div className="report-chart">
              {weeklySummary.length === 0 ? (
                <p style={{ padding: "20px", color: "#888" }}>No data yet</p>
              ) : (
                <ResponsiveContainer>
                  <BarChart data={weeklySummary}>
                    <CartesianGrid stroke="#eee" vertical={false} />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="amount" fill="#9CC83E" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default Reports;
