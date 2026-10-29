import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowDownRight,
  ArrowUpRight,
  Lightbulb,
  PiggyBank,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
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

        const [budgetRes, spendingRes, tipsRes] = await Promise.allSettled([
          budgetFallback,
          spendingFallback,
          tipsFallback,
        ]);
        if (ignore) return;

        if (!ignore) setDashboardData(data);

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

      <div className="dashboard-grid">
        <section className="dashboard-panel">
          <div className="panel-heading">
            <div>
              <h3>Budget vs Actual</h3>
              <p>Your category spending this month</p>
            </div>
            <Link to="/budgets">View all</Link>
          </div>

          <div className="budget-list">
            {budgets.length === 0 ? (
              <p style={{ color: "#888", padding: "1rem" }}>
                No budgets set yet. Go to Budgets page to create one.
              </p>
            ) : (
              budgets.map((budget) => {
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
              })
            )}
          </div>
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

      <div className="dashboard-bottom">
        <div className="top-category">
          <span>This Month's Top Category</span>
          <strong>{topCategory?.category || "No data"}</strong>
          <p>
            {formatCurrency(topCategory?.total || 0, currency)} spent this month
          </p>
        </div>

        <div className="saving-tip">
          <div className="tip-icon">
            <Lightbulb size={22} />
          </div>

          <div className="saving-tip-body">
            <strong>Saving Tips</strong>

            {tips.length === 0 ? (
              <p>
                No tips yet. Add more transactions and visit Saving Tips to
                generate personalised suggestions.
              </p>
            ) : (
              <ul className="saving-tip-list">
                {tips.slice(0, 2).map((tip) => (
                  <li key={tip._id}>
                    <span>
                      <strong>{tip.title}</strong>
                      {tip.message}
                    </span>
                    <button
                      type="button"
                      className="tip-dismiss"
                      onClick={() => dismissTip(tip._id)}
                      aria-label="Dismiss saving tip"
                      title="Dismiss this tip"
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Link to="/saving-tips">View tips</Link>
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
