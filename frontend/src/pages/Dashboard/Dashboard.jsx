import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Leaf,
  PiggyBank,
  Sparkles,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import toast from "react-hot-toast";

import API from "../../api/axios";
import { formatCurrency, useCurrency } from "../../context/CurrencyContext";
import { displayCategoryName } from "../../utils/categoryPresentation";
import {
  Skeleton,
  SkeletonCard,
  SkeletonChart,
  SkeletonText,
} from "../../components/Skeleton/Skeleton";
import "./Dashboard.css";

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user")) || null;
  } catch {
    return null;
  }
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const COLORS = [
  "#C7F36B",
  "#0B0F0E",
  "#38BDF8",
  "#34D399",
  "#A78BFA",
  "#818CF8",
  "#FB7185",
];

function Dashboard() {
  const { currency } = useCurrency();
  const navigate = useNavigate();
  const [user] = useState(readStoredUser);
  const [dashboardData, setDashboardData] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [spending, setSpending] = useState([]);
  const [tips, setTips] = useState([]);
  const [activity, setActivity] = useState(null);
  const [savingsTrend, setSavingsTrend] = useState([]);
  const [chartType, setChartType] = useState("area");
  const [budgetViewMode, setBudgetViewMode] = useState("line");
  const [currentInsight, setCurrentInsight] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        const response = await API.get("/dashboard");
        const data = response.data || {};

        // The dashboard aggregate is the primary source. Some deployments only
        // return the core balance payload, so fall back to the dedicated
        // widgets/endpoints for budgets, spending breakdown and top tips.
        const budgetFallback =
          Array.isArray(data.budgets) && data.budgets.length > 0
            ? null
            : API.get("/dashboard/budget-vs-actual");
        const spendingFallback =
          Array.isArray(data.spendingBreakdown) && data.spendingBreakdown.length > 0
            ? null
            : API.get("/reports/category-wise");
        const tipsFallback =
          Array.isArray(data.tips) && data.tips.length > 0
            ? null
            : API.get("/saving-tips/top");
        const trendFallback = API.get("/reports/income-expense");

        const [budgetRes, spendingRes, tipsRes, trendRes] = await Promise.allSettled([
          budgetFallback,
          spendingFallback,
          tipsFallback,
          trendFallback,
        ]);
        if (ignore) return;

        if (!ignore) {
          setDashboardData(data);
          if (data.insight) {
            setCurrentInsight(data.insight);
          } else {
            API.get("/insights/current")
              .then((res) => {
                if (!ignore && res.data?.insight) setCurrentInsight(res.data.insight);
              })
              .catch(() => { });
          }
        }

        const budgetRows =
          Array.isArray(data.budgets) && data.budgets.length > 0
            ? data.budgets
            : budgetRes.status === "fulfilled"
              ? budgetRes.value?.data?.data || []
              : [];
        setBudgets(
          budgetRows.map((b) => ({
            id: b._id || b.category || b.categoryName,
            name: displayCategoryName(b.categoryName || b.category?.name || b.name || "Category"),
            spent: Number(b.spent ?? b.used ?? 0),
            limit: Number(b.limit ?? b.limitAmount ?? 0),
            percent:
              b.percentage ??
              (Number(b.limit ?? b.limitAmount ?? 0) > 0
                ? Math.round(
                  (Number(b.spent ?? b.used ?? 0) /
                    Number(b.limit ?? b.limitAmount ?? 1)) *
                  100
                )
                : 0),
          }))
        );

        const spendingRows =
          Array.isArray(data.spendingBreakdown) &&
            data.spendingBreakdown.length > 0
            ? data.spendingBreakdown
            : spendingRes.status === "fulfilled"
              ? (spendingRes.value?.data?.data || []).map((row) => ({
                name: row.category,
                value: row.total,
              }))
              : [];
        setSpending(
          spendingRows.map((row, index) => ({
            name: row.name,
            value: Number(row.value ?? row.total ?? 0),
            color: row.color || COLORS[index % COLORS.length],
          }))
        );

        let tipRows =
          Array.isArray(data.tips) && data.tips.length > 0
            ? data.tips
            : tipsRes.status === "fulfilled"
              ? tipsRes.value?.data?.tips || []
              : [];

        // /saving-tips/top never generates tips itself; if there are none yet
        // ask the tips engine (GET /saving-tips generates on first read).
        if (tipRows.length === 0) {
          try {
            const generated = await API.get("/saving-tips");
            if (!ignore) tipRows = generated.data?.tips || [];
          } catch (err) {
            console.error("Failed to generate saving tips:", err);
          }
        }
        if (!ignore) setTips(tipRows.slice(0, 3));

        if (trendRes.status === "fulfilled") {
          const rawItems = trendRes.value?.data?.data || [];
          const monthsList = trendRes.value?.data?.months || [];
          const map = {};
          monthsList.forEach((m) => {
            map[m] = { monthKey: m, income: 0, expense: 0 };
          });
          rawItems.forEach((item) => {
            const m = item._id?.month;
            const t = item._id?.type;
            if (m && t) {
              if (!map[m]) map[m] = { monthKey: m, income: 0, expense: 0 };
              map[m][t] = Number(item.total || 0);
            }
          });

          const monthNames = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
          ];

          const formattedTrend = Object.keys(map)
            .sort()
            .map((key) => {
              const item = map[key];
              const parts = key.split("-");
              const mo = parseInt(parts[1], 10);
              const label = monthNames[mo - 1] || key;
              const inc = item.income || 0;
              const exp = item.expense || 0;
              const net = inc - exp;
              return {
                rawMonth: key,
                month: label,
                income: inc,
                expense: exp,
                savings: net,
              };
            });

          const currentMonthKey = data.month || new Date().toISOString().slice(0, 7);
          const currentEntry = formattedTrend.find((e) => e.rawMonth === currentMonthKey);
          if (currentEntry && data.balance) {
            if (typeof data.balance.income === "number") currentEntry.income = data.balance.income;
            if (typeof data.balance.expense === "number") currentEntry.expense = data.balance.expense;
            currentEntry.savings = currentEntry.income - currentEntry.expense;
          }

          if (!ignore) setSavingsTrend(formattedTrend);
        }

        // Optional system intelligence (SRS "Optional System Intelligence").
        // These endpoints are additive: if the backend does not expose them we
        // simply keep the panel hidden instead of showing errors.
        const activityEndpoints = [
          ["recentViews", "/activity/recent-views"],
          ["recentEdits", "/activity/recent-edits"],
          ["duplicates", "/activity/duplicates"],
          ["unusual", "/activity/unusual"],
          ["forecast", "/activity/forecast"],
        ];
        const activityResults = await Promise.allSettled(
          activityEndpoints.map(([, url]) => API.get(url))
        );
        if (ignore) return;

        const activityData = {};
        activityResults.forEach((result, index) => {
          const key = activityEndpoints[index][0];
          if (result.status === "fulfilled") {
            activityData[key] = result.value.data || {};
          }
        });

        const hasActivity =
          (activityData.recentViews?.transactions || []).length > 0 ||
          (activityData.recentEdits?.transactions || []).length > 0 ||
          (activityData.duplicates?.duplicates || []).length > 0 ||
          (activityData.unusual?.unusual || []).length > 0 ||
          typeof activityData.forecast?.forecast === "number";
        if (!ignore) setActivity(hasActivity ? activityData : null);
      } catch (error) {
        if (ignore) return;
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          toast.error("Session expired. Please login again.");
          navigate("/login");
        } else {
          toast.error(
            error.response?.data?.message || "Failed to load dashboard"
          );
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadDashboard();

    return () => {
      ignore = true;
    };
  }, [navigate]);

  useEffect(() => {
    const handleUserUpdate = () => {
      const updatedUser = readStoredUser();
      if (!updatedUser) return;
      setDashboardData((current) => ({
        ...(current || {}),
        user: { ...(current?.user || {}), ...updatedUser },
      }));
    };

    window.addEventListener("campuscoin:user-updated", handleUserUpdate);
    return () => window.removeEventListener("campuscoin:user-updated", handleUserUpdate);
  }, []);

  const activeUser = dashboardData?.user || user || null;
  const income = dashboardData?.balance?.income || 0;
  const expense = dashboardData?.balance?.expense || 0;
  const balance = dashboardData?.balance?.total ?? income - expense;
  const savingsGoal = activeUser?.savingsGoal || 0;
  const topCategory = dashboardData?.topCategory;
  const displayName = activeUser?.name?.trim() || "Student";

  const currentSavings = income - expense;
  const savingsRate =
    income > 0 ? Math.round((Math.max(0, currentSavings) / income) * 100) : 0;
  const hasSavingsData = savingsTrend.some(
    (item) => item.income > 0 || item.expense > 0 || item.savings !== 0
  );

  const getGradientOffset = () => {
    if (!savingsTrend.length) return 0;
    const values = savingsTrend.map((i) => i.savings);
    const dataMax = Math.max(...values, 0);
    const dataMin = Math.min(...values, 0);
    if (dataMax <= 0) return 0;
    if (dataMin >= 0) return 1;
    return dataMax / (dataMax - dataMin);
  };
  const off = getGradientOffset();

  const CustomSavingsTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const isPositive = item.savings >= 0;
      return (
        <div className="savings-tooltip">
          <p className="tooltip-month">{item.month} ({item.rawMonth})</p>
          <div className="tooltip-row">
            <span>Net Savings:</span>
            <strong style={{ color: isPositive ? "#16a34a" : "#dc2626" }}>
              {formatCurrency(item.savings, currency)}
            </strong>
          </div>
          <div className="tooltip-row sub">
            <span>Income:</span>
            <span style={{ color: "#16a34a" }}>{formatCurrency(item.income, currency)}</span>
          </div>
          <div className="tooltip-row sub">
            <span>Expenses:</span>
            <span style={{ color: "#dc2626" }}>{formatCurrency(item.expense, currency)}</span>
          </div>
          {savingsGoal > 0 && (
            <div className="tooltip-row sub">
              <span>Goal Target:</span>
              <span style={{ color: "#d97706" }}>{formatCurrency(savingsGoal, currency)}</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomBudgetTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload || {};
      const limit = Number(data.limit || 0);
      const spent = Number(data.spent || 0);
      const isOver = spent > limit;
      const diff = Math.abs(limit - spent);

      return (
        <div className="budget-custom-tooltip">
          <div className="tooltip-cat-name">{label || data.name}</div>
          <div className="tooltip-data-row">
            <span className="tooltip-indicator budget-ind" />
            <span>Budget Limit:</span>
            <strong>{formatCurrency(limit, currency)}</strong>
          </div>
          <div className="tooltip-data-row">
            <span className="tooltip-indicator actual-ind" />
            <span>Actual Spent:</span>
            <strong style={{ color: isOver ? "#ef4444" : "#16a34a" }}>
              {formatCurrency(spent, currency)}
            </strong>
          </div>
          <div className="tooltip-status-badge">
            {isOver ? (
              <span className="badge-over">
                ⚠️ Exceeded by {formatCurrency(diff, currency)} ({data.percent}%)
              </span>
            ) : (
              <span className="badge-under">
                ✓ Under budget ({formatCurrency(diff, currency)} remaining)
              </span>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const dismissTip = async (id) => {
    try {
      await API.put(`/saving-tips/${id}/dismiss`);
      setTips((curr) => curr.filter((tip) => tip._id !== id));
      toast.success("Tip dismissed");
    } catch (error) {
      toast.error(error.response?.data?.message || "Dismiss failed");
    }
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="page-heading dashboard-heading">
          <div>
            <Skeleton height={30} width={260} />
            <Skeleton height={13} width={200} style={{ marginTop: 10 }} />
          </div>
        </div>

        <div className="summary-grid">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="summary-card" key={`summary-skeleton-${index}`}>
              <SkeletonText lines={2} />
            </div>
          ))}
        </div>

        <section className="dashboard-panel savings-panel">
          <div style={{ marginBottom: "16px" }}>
            <Skeleton height={20} width={180} />
            <Skeleton height={14} width={280} style={{ marginTop: 6 }} />
          </div>
          <SkeletonChart height={220} />
        </section>

        <div className="dashboard-grid">
          <section className="dashboard-panel">
            <SkeletonCard lines={4} />
          </section>
          <section className="dashboard-panel spending-panel">
            <SkeletonChart height={240} />
          </section>
        </div>

        <div className="dashboard-bottom">
          <div className="top-category">
            <SkeletonText lines={2} />
          </div>
          <div className="saving-tip">
            <SkeletonText lines={3} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="page-heading dashboard-heading">
        <div>
          <h1>
            {getGreeting()}, {displayName}!
          </h1>
          <p>Here's your money overview for this month.</p>
        </div>

        <div className="quick-actions">
          <Link to="/transactions?add=income" className="outline-action">
            + Add Income
          </Link>

          <Link to="/transactions?add=expense" className="primary-action">
            + Add Expense
          </Link>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card income-card">
          <span className="summary-label">Total Income</span>
          <h2>{formatCurrency(income, currency)}</h2>
          <span className="summary-change positive">
            <ArrowUpRight size={14} />
            This month
          </span>
        </div>

        <div className="summary-card expense-card">
          <span className="summary-label">Total Expenses</span>
          <h2>{formatCurrency(expense, currency)}</h2>
          <span className="summary-change negative">
            <ArrowDownRight size={14} />
            This month
          </span>
        </div>

        <div className="summary-card">
          <span className="summary-label">Balance</span>
          <h2>{formatCurrency(balance, currency)}</h2>
          <span className="summary-change positive">
            <Wallet size={14} />
            Available balance
          </span>
        </div>

        <div className="summary-card">
          <span className="summary-label">Savings Goal</span>
          <h2>{formatCurrency(savingsGoal, currency)}</h2>
          <span className="summary-change goal">
            <PiggyBank size={14} />
            Your target
          </span>
        </div>
      </div>

      {/* Monthly Savings Trend Chart */}
      <section className="dashboard-panel savings-panel">
        <div className="panel-heading">
          <div>
            <div className="savings-title-row">
              <TrendingUp size={18} className="savings-icon" />
              <h3>Savings Trend</h3>
            </div>
            <p>Monthly net savings (Income - Expenses) over the last 6 months</p>
          </div>

          <div className="savings-header-right">
            <div className="savings-metrics-badges">
              <div className="savings-badge">
                <span>This Month:</span>
                <strong className={currentSavings >= 0 ? "positive-text" : "negative-text"}>
                  {formatCurrency(currentSavings, currency)}
                </strong>
              </div>
              <div className="savings-badge rate">
                <span>Savings Rate:</span>
                <strong>{savingsRate}%</strong>
              </div>
              {savingsGoal > 0 && (
                <div className="savings-badge goal">
                  <span>Goal:</span>
                  <strong>{formatCurrency(savingsGoal, currency)}</strong>
                </div>
              )}
            </div>

            <div className="chart-type-toggle" role="group" aria-label="Chart view mode">
              <button
                type="button"
                className={chartType === "area" ? "active" : ""}
                onClick={() => setChartType("area")}
                title="Area Chart"
              >
                Area
              </button>
              <button
                type="button"
                className={chartType === "bar" ? "active" : ""}
                onClick={() => setChartType("bar")}
                title="Bar Chart"
              >
                Bars
              </button>
            </div>
          </div>
        </div>

        <div className="savings-chart-container">
          {!hasSavingsData ? (
            <div className="savings-empty-state">
              <PiggyBank size={32} style={{ color: "#648D22" }} />
              <p>No transactions recorded yet in the last 6 months.</p>
              <Link to="/transactions?add=income" className="primary-action" style={{ padding: "8px 16px", fontSize: "12px" }}>
                + Add Transaction
              </Link>
            </div>
          ) : chartType === "area" ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={savingsTrend} margin={{ top: 15, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="savingsSplitColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset={off} stopColor="#22c55e" stopOpacity={0.4} />
                    <stop offset={off} stopColor="#ef4444" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border-light, #ede8dd)" vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  stroke="var(--text-muted, #888)"
                  tickLine={false}
                  fontSize={12}
                />
                <YAxis
                  stroke="var(--text-muted, #888)"
                  tickLine={false}
                  fontSize={11}
                  tickFormatter={(val) => formatCurrency(val, currency)}
                />
                <Tooltip content={<CustomSavingsTooltip />} />
                {savingsGoal > 0 && (
                  <ReferenceLine
                    y={savingsGoal}
                    stroke="#d97706"
                    strokeDasharray="4 4"
                    label={{
                      value: `Goal: ${formatCurrency(savingsGoal, currency)}`,
                      fill: "#d97706",
                      fontSize: 11,
                      position: "insideTopRight",
                    }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="savings"
                  name="Net Savings"
                  stroke="#16a34a"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#savingsSplitColor)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={savingsTrend} margin={{ top: 15, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid stroke="var(--border-light, #ede8dd)" vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  stroke="var(--text-muted, #888)"
                  tickLine={false}
                  fontSize={12}
                />
                <YAxis
                  stroke="var(--text-muted, #888)"
                  tickLine={false}
                  fontSize={11}
                  tickFormatter={(val) => formatCurrency(val, currency)}
                />
                <Tooltip content={<CustomSavingsTooltip />} />
                {savingsGoal > 0 && (
                  <ReferenceLine
                    y={savingsGoal}
                    stroke="#d97706"
                    strokeDasharray="4 4"
                    label={{
                      value: `Goal: ${formatCurrency(savingsGoal, currency)}`,
                      fill: "#d97706",
                      fontSize: 11,
                      position: "insideTopRight",
                    }}
                  />
                )}
                <Bar dataKey="savings" name="Net Savings" radius={[4, 4, 0, 0]}>
                  {savingsTrend.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.savings >= 0 ? "#22c55e" : "#ef4444"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="dashboard-panel budget-vs-actual-panel">
          <div className="panel-heading">
            <div>
              <h3>Budget vs. Actual</h3>
              <p>Category limits vs actual spending this month</p>
            </div>
            <div className="budget-header-actions">
              <div className="chart-type-toggle" role="group" aria-label="Budget chart view mode">
                <button
                  type="button"
                  className={budgetViewMode === "line" ? "active" : ""}
                  onClick={() => setBudgetViewMode("line")}
                  title="Line Graph View"
                >
                  Line
                </button>
                <button
                  type="button"
                  className={budgetViewMode === "list" ? "active" : ""}
                  onClick={() => setBudgetViewMode("list")}
                  title="List View"
                >
                  List
                </button>
              </div>
              <Link to="/budgets">View all</Link>
            </div>
          </div>

          {budgets.length === 0 ? (
            <p style={{ color: "var(--text-muted, #888)", padding: "1.5rem", textAlign: "center" }}>
              No budgets set yet. Go to <Link to="/budgets" style={{ color: "#16a34a", fontWeight: "600" }}>Budgets</Link> to create one.
            </p>
          ) : budgetViewMode === "line" ? (
            <div className="budget-line-container">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={budgets} margin={{ top: 10, right: 25, left: -5, bottom: 5 }}>
                  <CartesianGrid stroke="var(--border-light, #ede8dd)" vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    stroke="var(--text-muted, #888)"
                    tickLine={false}
                    fontSize={12}
                  />
                  <YAxis
                    stroke="var(--text-muted, #888)"
                    tickLine={false}
                    fontSize={11}
                    tickFormatter={(val) => formatCurrency(val, currency)}
                  />
                  <Tooltip content={<CustomBudgetTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ paddingBottom: "12px", fontSize: "12px" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="limit"
                    name="Budget Limit"
                    stroke="#8b5cf6"
                    strokeWidth={2.5}
                    strokeDasharray="4 4"
                    dot={{ r: 4, fill: "#8b5cf6", strokeWidth: 1.5, stroke: "#ffffff" }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="spent"
                    name="Actual Spent"
                    stroke="#16a34a"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#16a34a", strokeWidth: 1.5, stroke: "#ffffff" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="budget-list">
              {budgets.map((budget) => {
                const percent =
                  budget.percent ??
                  (budget.limit
                    ? Math.round((budget.spent / budget.limit) * 100)
                    : 0);

                return (
                  <div className="budget-item" key={budget.id}>
                    <div className="budget-info">
                      <span>{budget.name}</span>
                      <small>
                        {formatCurrency(budget.spent, currency)} / {formatCurrency(budget.limit, currency)}
                      </small>
                    </div>

                    <div className="progress-track">
                      <div
                        className={
                          percent > 100
                            ? "progress-fill over-budget"
                            : "progress-fill"
                        }
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      />
                    </div>

                    <span
                      className={
                        percent > 100
                          ? "budget-percent over-text"
                          : "budget-percent"
                      }
                    >
                      {percent}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="dashboard-panel spending-panel">
          <div className="panel-heading">
            <div>
              <h3>Spending Overview</h3>
              <p>Where your money went</p>
            </div>
          </div>

          <div className="spending-content">
            {spending.length === 0 ? (
              <p style={{ color: "#888", padding: "1rem" }}>
                No spending data yet. Add some transactions.
              </p>
            ) : (
              <>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={spending}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={48}
                        outerRadius={73}
                        paddingAngle={2}
                      >
                        {spending.map((item, index) => (
                          <Cell
                            key={item.name}
                            fill={item.color || COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value, currency)} />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="chart-total">
                    <strong>{formatCurrency(expense, currency)}</strong>
                    <span>Total Expenses</span>
                  </div>
                </div>

                <div className="chart-legend">
                  {spending.map((item, index) => (
                    <div key={item.name}>
                      <span
                        className="legend-color"
                        style={{
                          backgroundColor:
                            item.color || COLORS[index % COLORS.length],
                        }}
                      />
                      <span>{item.name}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      {/* AI Insights and Top Saving Tips Synchronized Section */}
      <div className="dashboard-synced-grid">
        {/* AI Insight Card */}
        <section className="dashboard-ai-card" aria-label="AI Spending Insight">
          <div className="ai-card-header">
            <div className="ai-card-badge">
              <Sparkles size={16} className="ai-badge-sparkle" />
              <span>AI Insight</span>
            </div>
            <Link to="/insights" className="dashboard-card-link">
              View Details <ArrowRight size={13} />
            </Link>
          </div>

          <div className="ai-card-body">
            <p className="ai-spending-highlight">
              {currentInsight?.spendingInsight ||
                currentInsight?.summaryText ||
                "You spent 40% more on Food this month compared to last month."}
            </p>

            <div className="ai-recommendation-banner">
              <div className="ai-rec-tag">RECOMMENDATION</div>
              <p className="ai-rec-text">
                {currentInsight?.recommendation ||
                  currentInsight?.tipText ||
                  "Try cooking at home to save around $30!"}
              </p>
            </div>

            <div className="ai-sync-note">
              <span>⚡ Synced with your latest transactions & savings tips</span>
            </div>
          </div>
        </section>

        {/* Top Saving Tips Card */}
        <section className="dashboard-tips-card" aria-label="Top Saving Tips">
          <div className="tips-card-header">
            <div className="tips-title-group">
              <div className="tips-leaf-badge">
                <Leaf size={18} className="leaf-green-icon" />
              </div>
              <div>
                <strong className="tips-heading">Top Saving Tips</strong>
                <p className="tips-subheading">How you can manage your spending</p>
              </div>
            </div>
            <Link to="/saving-tips" className="dashboard-card-link">
              View All <ArrowRight size={13} />
            </Link>
          </div>

          <div className="tips-card-body">
            <ul className="dashboard-tips-list">
              {(tips && tips.length > 0 ? tips.slice(0, 3) : [
                {
                  _id: "fb-1",
                  title: "Limit food delivery to 2 times a week",
                  potentialSavings: 25,
                },
                {
                  _id: "fb-2",
                  title: "Use student discounts for transport",
                  potentialSavings: 15,
                },
                {
                  _id: "fb-3",
                  title: "Review unused subscriptions",
                  potentialSavings: 10,
                },
              ]).map((tip, idx) => (
                <li key={tip._id || idx} className="dashboard-tip-item">
                  <div className="tip-item-bullet">
                    <Leaf size={14} className="leaf-green-icon" />
                  </div>
                  <div className="tip-item-info">
                    <span className="tip-item-title">
                      {tip.title}
                      {tip.potentialSavings > 0 && (
                        <span className="tip-savings-pill">
                          (Save {currency}{tip.potentialSavings}/month)
                        </span>
                      )}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <div className="dashboard-bottom">
        <div className="top-category">
          <span>This Month's Top Category</span>
          <strong>{topCategory?.category || "No data"}</strong>
          <p>
            {formatCurrency(topCategory?.total || 0, currency)} spent this month
          </p>
        </div>
      </div>

      {activity && (
        <section className="smart-activity">
          <div className="smart-activity-head">
            <div>
              <h3>Smart activity</h3>
              <p>Optional system intelligence based on your recent history.</p>
            </div>
            <Sparkles size={18} />
          </div>

          <div className="smart-activity-grid">
            <div className="smart-block">
              <h4>Recently viewed</h4>
              {(activity.recentViews?.transactions || []).length === 0 ? (
                <p className="smart-empty">No recent views yet.</p>
              ) : (
                <ul>
                  {activity.recentViews.transactions.slice(0, 3).map((txn) => (
                    <li key={txn._id}>
                      <span>
                        {new Date(txn.date).toLocaleDateString()} ·{" "}
                        {displayCategoryName(txn.category?.name || "Uncategorized")}
                      </span>
                      <strong>{formatCurrency(txn.amount, currency)}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="smart-block">
              <h4>Recently edited</h4>
              {(activity.recentEdits?.transactions || []).length === 0 ? (
                <p className="smart-empty">No recent edits yet.</p>
              ) : (
                <ul>
                  {activity.recentEdits.transactions.slice(0, 3).map((txn) => (
                    <li key={txn._id}>
                      <span>
                        {new Date(txn.date).toLocaleDateString()} ·{" "}
                        {displayCategoryName(txn.category?.name || "Uncategorized")}
                      </span>
                      <strong>{formatCurrency(txn.amount, currency)}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="smart-block">
              <h4>Smart flags</h4>
              <ul>
                <li>
                  <span>Possible duplicate groups</span>
                  <strong>{(activity.duplicates?.duplicates || []).length}</strong>
                </li>
                <li>
                  <span>Unusually large expenses</span>
                  <strong>{(activity.unusual?.unusual || []).length}</strong>
                </li>
              </ul>
              {(activity.unusual?.unusual || []).slice(0, 1).map((txn) => (
                <p className="smart-flag" key={txn._id}>
                  {formatCurrency(txn.amount, currency)} on{" "}
                  {new Date(txn.date).toLocaleDateString()} is well above your
                  average expense.
                </p>
              ))}
            </div>

            <div className="smart-block">
              <h4>Next month forecast</h4>
              {typeof activity.forecast?.forecast === "number" ? (
                <>
                  <strong className="smart-forecast">
                    {formatCurrency(activity.forecast.forecast, currency)}
                  </strong>
                  <p className="smart-empty">
                    Based on {activity.forecast.basedOnMonths || 0} month(s) of
                    expense history.
                  </p>
                </>
              ) : (
                <p className="smart-empty">Not enough history to forecast.</p>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default Dashboard;
