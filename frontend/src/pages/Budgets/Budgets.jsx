import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import API from "../../api/axios";
import "./Budgets.css";

function Budgets() {
  const navigate = useNavigate();
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/login");
      return;
    }
    fetchBudgets();
    fetchCategories();
  }, []);

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const res = await API.get("/budgets/status");
      setBudgets(res.data.status || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load budgets");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await API.get("/categories/type/expense");
      setCategories(res.data.categories || []);
    } catch (error) {
      console.error(error);
    }
  };

  const saveBudget = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    const category = form.get("category");
    const limitValue = form.get("limit");
    const limit = Number(limitValue);

    if (!category) return toast.error("Please choose a category");
    if (!limitValue) return toast.error("Please enter a monthly limit");
    if (limit <= 0) return toast.error("Budget limit must be greater than zero");

    const month = new Date().toISOString().slice(0, 7);

    try {
      await API.post("/budgets", {
        category,
        month,
        limitAmount: limit,
        alertPercentage: 80,
      });

      toast.success("Budget added");
      setShowForm(false);
      fetchBudgets();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save budget");
    }
  };

  const deleteBudget = async (id) => {
    if (!window.confirm("Delete this budget?")) return;
    try {
      await API.delete(`/budgets/${id}`);
      toast.success("Budget deleted");
      fetchBudgets();
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete failed");
    }
  };

  const overBudget = budgets.find((b) => b.status === "exceeded");

  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>Budgets</h1>
          <p>Set monthly limits and monitor your spending.</p>
        </div>

        <button
          type="button"
          className="budget-add-button"
          onClick={() => setShowForm((c) => !c)}
        >
          <Plus size={16} />
          Set Budget
        </button>
      </div>

      {showForm && (
        <form className="budget-form" onSubmit={saveBudget} noValidate>
          <select name="category" defaultValue="">
            <option value="">Choose category</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>

          <input name="limit" type="number" placeholder="Monthly limit" />

          <button type="submit">Save Budget</button>
        </form>
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
            <span>Action</span>
          </div>

          {budgets.map((item) => {
            const b = item.budget;
            const percent = item.percentage || 0;

            let status = "On track";
            if (percent >= 100) status = "Over limit";
            else if (percent >= 80) status = "Near limit";

            return (
              <div className="budget-row" key={b._id}>
                <strong>{b.category?.name || "—"}</strong>

                <span>
                  ₹{item.used.toLocaleString()} / ₹{b.limitAmount.toLocaleString()}
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

                <button
                  type="button"
                  className="budget-delete-btn"
                  onClick={() => deleteBudget(b._id)}
                  aria-label="Delete budget"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {overBudget && (
        <div className="budget-alert">
          <AlertTriangle size={18} />
          <span>
            {overBudget.budget?.category?.name} has exceeded its monthly budget.
          </span>
        </div>
      )}
    </div>
  );
}

export default Budgets;