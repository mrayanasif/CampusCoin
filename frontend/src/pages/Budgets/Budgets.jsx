import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Pencil,
  PieChart as PieChartIcon,
  Plus,
  Trash2,
  TrendingUp,
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
import AdminConfirmModal from "../../components/AdminConfirmModal/AdminConfirmModal";
import {
  formatCurrency,
  fromPKR,
  toPKR,
  useCurrency,
} from "../../context/CurrencyContext";
import {
  displayCategoryName,
  sortExpenseCategories,
} from "../../utils/categoryPresentation";
import "./Budgets.css";

const COLORS = [
  "#C7F36B",
  "#38BDF8",
  "#FB7185",
  "#34D399",
  "#A78BFA",
  "#FBBF24",
  "#818CF8",
  "#F472B6",
  "#4ADE80",
  "#60A5FA",
];

function Budgets() {
  const { currency } = useCurrency();
  const navigate = useNavigate();
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [budgetToDelete, setBudgetToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/login");
      return;
    }
    fetchBudgets();
    fetchCategories();
  }, []);

  const fetchBudgets = async ({ showLoader = budgets.length === 0 } = {}) => {
    try {
      if (showLoader) setLoading(true);
      const res = await API.get("/budgets/status");
      setBudgets(res.data.status || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load budgets");
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await API.get("/categories/type/expense");
      setCategories(sortExpenseCategories(res.data.categories || []));
    } catch (error) {
      console.error(error);
    }
  };

  const handleEditClick = (item) => {
    const b = item.budget;
    setEditingBudget({
      id: b._id,
      category: b.category?._id || b.category,
      limit: Math.round(fromPKR(b.limitAmount, currency) * 100) / 100,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveBudget = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    const category = form.get("category");
    const limitValue = form.get("limit");
    const limit = toPKR(limitValue, currency);

    if (!category) return toast.error("Please choose a category");
    if (!limitValue) return toast.error("Please enter a monthly limit");
    if (limit <= 0) return toast.error("Budget limit must be greater than zero");

    const month = new Date().toISOString().slice(0, 7);

    try {
      if (editingBudget) {
        await API.put(`/budgets/${editingBudget.id}`, {
          category,
          month,
          limitAmount: limit,
          alertPercentage: 80,
        });
        toast.success("Budget updated successfully");
      } else {
        await API.post("/budgets", {
          category,
          month,
          limitAmount: limit,
          alertPercentage: 80,
        });
        toast.success("Budget added successfully");
      }

      setShowForm(false);
      setEditingBudget(null);
      fetchBudgets();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save budget");
    }
  };

  const deleteBudget = async () => {
    if (!budgetToDelete || deleting) return;
    try {
      setDeleting(true);
      await API.delete(`/budgets/${budgetToDelete.id}`);
      toast.success("Budget deleted");
      if (editingBudget && editingBudget.id === budgetToDelete.id) {
        setEditingBudget(null);
        setShowForm(false);
      }
      setBudgetToDelete(null);
      fetchBudgets();
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const overBudget = budgets.find((b) => b.status === "exceeded");


  const budgetUsageData = budgets.map((item, index) => {
    const catName = displayCategoryName(item.budget?.category?.name || "Category");
    return {
      id: item.budget?._id,
      name: catName,
      used: Number(item.used || 0),
      limit: Number(item.budget?.limitAmount || 0),
      percentage: Number(item.percentage || 0),
      color: COLORS[index % COLORS.length],
    };
  });

  const totalUsed = budgetUsageData.reduce((sum, b) => sum + b.used, 0);
  const totalLimit = budgetUsageData.reduce((sum, b) => sum + b.limit, 0);

  const unavailableCategoryIds = new Set(
    budgets
      .filter((item) => !editingBudget || String(item.budget?._id) !== String(editingBudget.id))
      .map((item) => String(item.budget?.category?._id || item.budget?.category))
  );


  const pieSlices = budgetUsageData.filter((b) => b.used > 0);


  const mostUsedBudget =
    [...budgetUsageData].sort((a, b) => b.used - a.used)[0] || null;

  const CustomBudgetTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="budget-pie-tooltip">
          <strong>{data.name}</strong>
          <div>
            Spent: <span className="spent-val">{formatCurrency(data.used, currency)}</span>
          </div>
          <div>
            Limit: <span>{formatCurrency(data.limit, currency)}</span>
          </div>
          <div>
            Utilization:{" "}
            <span
              className={
                data.percentage >= 100
                  ? "util-danger"
                  : data.percentage >= 80
                    ? "util-warning"
                    : "util-good"
              }
            >
              {data.percentage}%
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="budgets-page">
      <div className="page-heading">
        <div>
          <h1>Budgets</h1>
          <p>Set monthly limits, monitor spending, and track category utilization.</p>
        </div>

        <button
          type="button"
          className="budget-add-button"
          onClick={() => {
            if (showForm && editingBudget) {
              setEditingBudget(null);
            } else {
              setShowForm((c) => !c);
              setEditingBudget(null);
            }
          }}
        >
          <Plus size={16} />
          {showForm && !editingBudget ? "Close Form" : "Set Budget"}
        </button>
      </div>

      {showForm && (
        <form className="budget-form" onSubmit={saveBudget} noValidate>
          <div className="budget-form-meta">
            <h4>{editingBudget ? "Edit Budget Limit" : "Create New Budget"}</h4>
            {editingBudget && (
              <span className="budget-editing-badge">
                Editing active budget
              </span>
            )}
          </div>

          <div className="budget-form-fields">
            <div className="budget-category-field">
              <select
                name="category"
                defaultValue={editingBudget ? editingBudget.category : ""}
                key={editingBudget ? `cat-${editingBudget.category}` : "cat-new"}
                required
              >
                <option value="">Choose category</option>
                {categories.map((c) => (
                  <option
                    key={c._id}
                    value={c._id}
                    disabled={unavailableCategoryIds.has(String(c._id))}
                  >
                    {displayCategoryName(c.name)}
                    {unavailableCategoryIds.has(String(c._id)) ? " — Already added" : ""}
                  </option>
                ))}
              </select>
              <small className="budget-form-hint">
                Categories with an existing monthly budget are disabled.
              </small>
            </div>

            <input
              name="limit"
              type="number"
              step="any"
              defaultValue={editingBudget ? editingBudget.limit : ""}
              key={editingBudget ? `limit-${editingBudget.limit}` : "limit-new"}
              placeholder={`Monthly limit (${currency})`}
              required
            />

            <div className="budget-form-actions">
              <button type="submit" className="budget-save-btn">
                {editingBudget ? "Update Budget" : "Save Budget"}
              </button>

              <button
                type="button"
                className="budget-cancel-btn"
                onClick={() => {
                  setShowForm(false);
                  setEditingBudget(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}


      {!loading && budgets.length > 0 && (
        <section className="budget-chart-card">
          <div className="budget-chart-header">
            <div className="budget-chart-title-wrap">
              <PieChartIcon size={20} className="budget-chart-icon" />
              <div>
                <h3>Budget Utilization Overview</h3>
                <p>Which category budget is being used the most this month</p>
              </div>
            </div>
          </div>

          <div className="budget-chart-body">
            <div className="budget-pie-wrap">
              {pieSlices.length === 0 ? (
                <div className="budget-pie-empty">
                  <p>No expenses recorded yet against your budgets this month.</p>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieSlices}
                        dataKey="used"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={78}
                        paddingAngle={3}
                      >
                        {pieSlices.map((entry) => (
                          <Cell key={`cell-${entry.id}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomBudgetTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="budget-pie-center">
                    <strong>{formatCurrency(totalUsed, currency)}</strong>
                    <span>Total Spent</span>
                  </div>
                </>
              )}
            </div>

            <div className="budget-chart-insights">
              {mostUsedBudget && mostUsedBudget.used > 0 ? (
                <div className="most-used-highlight">
                  <div className="most-used-badge-icon">
                    <TrendingUp size={22} />
                  </div>
                  <div className="most-used-info">
                    <span className="most-used-label">Mostly Used Budget</span>
                    <h4>{mostUsedBudget.name}</h4>
                    <div className="most-used-stats">
                      <span>
                        Spent: <strong>{formatCurrency(mostUsedBudget.used, currency)}</strong> / {formatCurrency(mostUsedBudget.limit, currency)}
                      </span>
                      <span
                        className={`most-used-pct ${
                          mostUsedBudget.percentage >= 100
                            ? "util-danger"
                            : mostUsedBudget.percentage >= 80
                              ? "util-warning"
                              : "util-good"
                        }`}
                      >
                        ({mostUsedBudget.percentage}% utilized)
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="most-used-highlight empty-state">
                  <div className="most-used-info">
                    <span className="most-used-label">Budget Status</span>
                    <h4>All budgets are clear</h4>
                    <p style={{ margin: "4px 0 0", color: "#737373", fontSize: "13px" }}>
                      You haven't spent from any budgeted category yet this month.
                    </p>
                  </div>
                </div>
              )}

              <div className="budget-legend-list">
                {budgetUsageData.map((item) => (
                  <div className="budget-legend-item" key={item.id}>
                    <div className="budget-legend-label">
                      <span
                        className="budget-legend-dot"
                        style={{ backgroundColor: item.color }}
                      />
                      <span>{item.name}</span>
                    </div>
                    <div className="budget-legend-val">
                      <span>{formatCurrency(item.used, currency)}</span>
                      <small>({item.percentage}%)</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {loading ? (
        <p className="budget-empty">Loading...</p>
      ) : budgets.length === 0 ? (
        <p className="budget-empty">
          No budgets yet. Click "Set Budget" to add one.
        </p>
      ) : (
        <div className="budget-table-wrap">
          <div className="budget-table-head">
            <span>Category</span>
            <span>Spent / Limit</span>
            <span>Progress</span>
            <span>Status</span>
            <span style={{ textAlign: "right" }}>Actions</span>
          </div>

          {budgets.map((item) => {
            const b = item.budget;
            const percent = item.percentage || 0;

            let status = "On track";
            if (percent >= 100) status = "Over limit";
            else if (percent >= 80) status = "Near limit";

            return (
              <div className="budget-row" key={b._id}>
                <strong>{displayCategoryName(b.category?.name || "—")}</strong>

                <span>
                  {formatCurrency(item.used, currency)} / {formatCurrency(b.limitAmount, currency)}
                </span>

                <div className="budget-progress">
                  <div className="budget-progress-track">
                    <div
                      className={`budget-progress-fill ${
                        percent >= 100
                          ? "danger-fill"
                          : percent >= 80
                            ? "warning-fill"
                            : ""
                      }`}
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                  </div>
                  <small>{percent}%</small>
                </div>

                <span
                  className={`budget-status ${
                    percent >= 100
                      ? "status-danger"
                      : percent >= 80
                        ? "status-warning"
                        : "status-good"
                  }`}
                >
                  {status}
                </span>

                <div className="budget-actions">
                  <button
                    type="button"
                    className="budget-edit-btn"
                    onClick={() => handleEditClick(item)}
                    aria-label="Edit budget"
                    title="Edit this budget limit"
                  >
                    <Pencil size={15} />
                  </button>

                  <button
                    type="button"
                    className="budget-delete-btn"
                    onClick={() => setBudgetToDelete({
                      id: b._id,
                      category: displayCategoryName(b.category?.name || "this category"),
                    })}
                    aria-label="Delete budget"
                    title="Delete budget"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {overBudget && (
        <div className="budget-alert" style={{ marginTop: "20px" }}>
          <AlertTriangle size={18} />
          <span>
            {displayCategoryName(overBudget.budget?.category?.name || "Category")} has exceeded its monthly budget.
          </span>
        </div>
      )}

      {budgetToDelete && (
        <AdminConfirmModal
          title="Delete this budget?"
          message={`The ${budgetToDelete.category} budget will be permanently removed.`}
          confirmLabel="Delete budget"
          loading={deleting}
          onCancel={() => setBudgetToDelete(null)}
          onConfirm={deleteBudget}
        />
      )}
    </div>
  );
}

export default Budgets;
