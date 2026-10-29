import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  X,
  Sparkles,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";

import API from "../../api/axios";
import { Skeleton } from "../../components/Skeleton/Skeleton";
import "./Transactions.css";

const PAGE_SIZE = 20;

// Returns today's LOCAL date in YYYY-MM-DD format.
// Using en-CA (Canadian English) is the cleanest way to get ISO-style YYYY-MM-DD
// in the user's local timezone (toISOString would give the UTC date).
const getTodayString = () => new Date().toLocaleDateString("en-CA");

function Transactions() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const quickAddType = searchParams.get("add");

  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [modalOpen, setModalOpen] = useState(
    quickAddType === "income" || quickAddType === "expense"
  );
  const [defaultType, setDefaultType] = useState(
    quickAddType === "expense" ? "expense" : "income"
  );
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Budget warning modal (over-limit)
  const [budgetWarning, setBudgetWarning] = useState(null);

  // Alert when the expense category has no matching budget
  const [missingBudgetWarning, setMissingBudgetWarning] = useState(null);

  // Deleted transactions
  const [deletedSupported, setDeletedSupported] = useState(false);
  const [deletedTransactions, setDeletedTransactions] = useState([]);
  const [deletedLoading, setDeletedLoading] = useState(false);

  // AI categorization
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // CSV
  const [csvFile, setCsvFile] = useState(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult, setCsvResult] = useState(null);
  const [csvPreviewRows, setCsvPreviewRows] = useState([]);
  const [csvPreviewLoading, setCsvPreviewLoading] = useState(false);
  const [csvPreviewSource, setCsvPreviewSource] = useState("");

  // Recurring entries
  const [recurringItems, setRecurringItems] = useState([]);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [recurringLoading, setRecurringLoading] = useState(true);
  const [recurringType, setRecurringType] = useState("expense");

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/login");
      return;
    }

    let ignore = false;

    const loadInitialData = async () => {
      try {
        setLoading(true);

        const [txRes, categoriesRes, deletedRes] = await Promise.all([
          API.get("/transactions", {
            params: { page: 1, limit: PAGE_SIZE },
          }),
          API.get("/categories"),
          API.get("/transactions/deleted").catch((error) => {
            if (error.response?.status !== 404) {
              console.warn("Deleted history unavailable:", error.message);
            }
            return null;
          }),
        ]);

        if (ignore) return;

        const txData = txRes.data || {};
        const initialRows = txData.transactions || [];
        const initialTotal = txData.total ?? txData.count;

        const initialPages =
          typeof txData.pages === "number"
            ? txData.pages
            : typeof initialTotal === "number" &&
                initialTotal > initialRows.length
              ? Math.ceil(initialTotal / PAGE_SIZE)
              : null;

        setTransactions(initialRows);

        setPagination(
          initialPages
            ? {
                page: txData.page || 1,
                pages: initialPages,
                total: initialTotal ?? initialRows.length,
              }
            : null
        );

        setCategories(categoriesRes.data.categories || []);

        if (deletedRes?.data?.transactions) {
          setDeletedSupported(true);
          setDeletedTransactions(deletedRes.data.transactions);
        } else {
          setDeletedSupported(false);
        }
      } catch (error) {
        if (!ignore) {
          toast.error(error.response?.data?.message || "Failed to load");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadInitialData();

    return () => {
      ignore = true;
    };
  }, [navigate]);

  const fetchTransactions = async ({ page = 1, append = false } = {}) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);

      const res = await API.get("/transactions", {
        params: { page, limit: PAGE_SIZE },
      });

      const data = res.data || {};
      const rows = data.transactions || [];
      const total = data.total ?? data.count;

      const pages =
        typeof data.pages === "number"
          ? data.pages
          : typeof total === "number" && total > rows.length
            ? Math.ceil(total / PAGE_SIZE)
            : null;

      setTransactions((curr) => (append ? [...curr, ...rows] : rows));

      setPagination(
        pages
          ? {
              page: data.page || page,
              pages,
              total: total ?? (append ? null : rows.length),
            }
          : null
      );
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load");
    } finally {
      if (append) setLoadingMore(false);
      else setLoading(false);
    }
  };

  const loadMoreTransactions = () => {
    if (!pagination || pagination.page >= pagination.pages) return;

    fetchTransactions({
      page: pagination.page + 1,
      append: true,
    });
  };

  const loadDeletedTransactions = async () => {
    try {
      setDeletedLoading(true);

      const res = await API.get("/transactions/deleted");

      setDeletedSupported(true);
      setDeletedTransactions(res.data.transactions || []);
    } catch (error) {
      if (error.response?.status === 404) {
        setDeletedSupported(false);
        toast.error("Deleted history is not available on this server");
      } else {
        toast.error(error.response?.data?.message || "Failed to load deleted");
      }
    } finally {
      setDeletedLoading(false);
    }
  };

  const openDeletedView = () => {
    setFilter("deleted");
    setSearch("");
    loadDeletedTransactions();
  };

  const restoreTransaction = async (id) => {
    try {
      await API.post(`/transactions/${id}/restore`);

      toast.success("Transaction restored");

      await Promise.all([loadDeletedTransactions(), fetchTransactions()]);
    } catch (error) {
      if (error.response?.status === 404) {
        setDeletedSupported(false);
        toast.error("Restore is not available on this server");
      } else {
        toast.error(error.response?.data?.message || "Restore failed");
      }
    }
  };

  // Recurring entries
  useEffect(() => {
    if (!localStorage.getItem("token")) return;

    let ignore = false;

    const loadRecurring = async () => {
      try {
        try {
          await API.post("/recurring/process");
        } catch (error) {
          console.warn("Recurring process unavailable:", error.message);
        }

        const res = await API.get("/recurring");

        if (!ignore) {
          setRecurringItems(res.data.items || []);
        }
      } catch (error) {
        if (!ignore) console.error("Recurring load failed:", error);
      } finally {
        if (!ignore) setRecurringLoading(false);
      }
    };

    loadRecurring();

    return () => {
      ignore = true;
    };
  }, []);

  const refreshRecurring = async () => {
    const res = await API.get("/recurring");
    setRecurringItems(res.data.items || []);
  };

  const addRecurring = async (event) => {
    event.preventDefault();

    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    const type = form.get("type");
    const amount = Number(form.get("amount"));
    const category = form.get("category");
    const frequency = form.get("frequency");
    const startDate = form.get("startDate");
    const recurringDescription = form.get("description")?.trim();

    if (!type) return toast.error("Please choose income or expense");
    if (!category) return toast.error("Please choose a category");

    if (!Number.isFinite(amount) || amount <= 0) {
      return toast.error("Amount must be greater than zero");
    }

    if (!frequency) return toast.error("Please choose a frequency");
    if (!startDate) return toast.error("Please choose a start date");

    try {
      await API.post("/recurring", {
        type,
        amount,
        category,
        frequency,
        description: recurringDescription || "",
        startDate,
        nextOccurrence: startDate,
      });

      toast.success("Recurring entry added");
      formElement.reset();
      refreshRecurring();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to add recurring entry"
      );
    }
  };

  const toggleRecurring = async (id) => {
    try {
      const res = await API.put(`/recurring/${id}/toggle`);
      const updated = res.data.item;

      setRecurringItems((curr) =>
        curr.map((item) =>
          item._id === id ? { ...item, isActive: updated.isActive } : item
        )
      );

      toast.success(updated.isActive ? "Recurring entry resumed" : "Paused");
    } catch (error) {
      toast.error(error.response?.data?.message || "Action failed");
    }
  };

  const deleteRecurring = async (id) => {
    if (!window.confirm("Delete this recurring entry?")) return;

    try {
      await API.delete(`/recurring/${id}`);

      setRecurringItems((curr) => curr.filter((item) => item._id !== id));

      toast.success("Recurring entry deleted");
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete failed");
    }
  };

  const runRecurringProcess = async () => {
    try {
      const res = await API.post("/recurring/process");

      toast.success(res.data.message || "Recurring entries processed");
      refreshRecurring();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Recurring processing unavailable"
      );
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    const matchesType = filter === "all" || t.type === filter;

    const matchesSearch =
      (t.description || "").toLowerCase().includes(search.toLowerCase()) ||
      (t.category?.name || "").toLowerCase().includes(search.toLowerCase());

    return matchesType && matchesSearch;
  });

  const deletedVisible = deletedTransactions.filter(
    (t) =>
      (t.description || "").toLowerCase().includes(search.toLowerCase()) ||
      (t.category?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  // AI categorization
  useEffect(() => {
    if (editingTransaction) return;
    if (!description || description.trim().length < 3) return;

    const timer = setTimeout(async () => {
      try {
        setAiLoading(true);

        const res = await API.post("/ai/categorize", { description });

        setAiSuggestion(res.data.suggestedCategory || null);
      } catch (error) {
        console.warn("AI categorization failed:", error);
      } finally {
        setAiLoading(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [description, editingTransaction]);

  const activeAiSuggestion =
    !editingTransaction && description.trim().length >= 3
      ? aiSuggestion
      : null;

  const applyAiSuggestion = () => {
    if (!activeAiSuggestion) return;

    setSelectedCategory(activeAiSuggestion.id);
    toast.success(`Category set to ${activeAiSuggestion.name}`);
  };

  const openAddModal = () => {
    setEditingTransaction(null);
    setDefaultType("income");
    setDescription("");
    setSelectedCategory("");
    setAiSuggestion(null);
    setModalOpen(true);
  };

  const openEditModal = (transaction) => {
    setEditingTransaction(transaction);
    setDescription(transaction.description || "");
    setSelectedCategory(transaction.category?._id || "");
    setAiSuggestion(null);
    setModalOpen(true);
  };

  const closeTransactionModal = () => {
    setModalOpen(false);
    setEditingTransaction(null);
    setDescription("");
    setSelectedCategory("");
    setAiSuggestion(null);
    setMissingBudgetWarning(null);

    if (quickAddType) {
      setSearchParams({}, { replace: true });
    }
  };

  // Check the budget before adding or editing an expense.
  const addTransaction = async (event) => {
    event.preventDefault();

    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    const type = form.get("type");
    const amountValue = form.get("amount");
    const category = selectedCategory || form.get("category");
    const desc = form.get("description")?.trim();
    const date = form.get("date");
    const recurring = form.get("recurring") === "on";

    if (!type) return toast.error("Please choose income or expense");
    if (!amountValue) return toast.error("Please enter an amount");

    const amount = Number(amountValue);

    if (!Number.isFinite(amount) || amount <= 0) {
      return toast.error("Amount must be greater than zero");
    }

    if (!category) return toast.error("Please choose a category");
    if (!date) return toast.error("Please choose a date");

    // NEW: prevent future dates (expense dates must be today or a previous date)
    if (date > getTodayString()) {
      return toast.error(
        "Date cannot be in the future. Please pick today or a previous date."
      );
    }

    const payload = {
      type,
      amount,
      category,
      description: desc || "",
      date,
      isRecurring: recurring,
    };

    if (type === "expense") {
      try {
        const budgetRes = await API.get("/budgets/status");
        const budgetStatuses = budgetRes.data.status || [];

        const matchingBudget = budgetStatuses.find((item) => {
          const budgetCategoryId =
            item.budget?.category?._id || item.budget?.category;

          return String(budgetCategoryId) === String(category);
        });

        // Expense category must have a matching budget
        if (!matchingBudget) {
          const categoryName =
            categories.find((c) => c._id === category)?.name ||
            "this category";

          setMissingBudgetWarning({ category: categoryName });
          return; // stop — do not save
        }

        const limit = Number(matchingBudget.budget.limitAmount || 0);
        let alreadySpent = Number(matchingBudget.used || 0);

        if (
          editingTransaction &&
          editingTransaction.type === "expense" &&
          String(
            editingTransaction.category?._id || editingTransaction.category
          ) === String(category)
        ) {
          alreadySpent -= Number(editingTransaction.amount || 0);
        }

        const projected = Math.max(0, alreadySpent) + amount;

        if (projected > limit) {
          setBudgetWarning({
            category:
              matchingBudget.budget.category?.name || "Selected category",
            limit,
            spent: Math.max(0, alreadySpent),
            attempted: amount,
            projected,
          });

          return;
        }
      } catch (error) {
        toast.error(
          error.response?.data?.message ||
            "Unable to verify your budget. Please try again."
        );
        return;
      }
    }

    try {
      if (editingTransaction) {
        await API.put(`/transactions/${editingTransaction._id}`, payload);
      } else {
        await API.post("/transactions", payload);

        if (activeAiSuggestion && desc) {
          API.post("/ai/categorize/feedback", {
            description: desc,
            userSelectedCategory: category,
          }).catch(() => {});
        }
      }

      const selectedCategoryName = categories.find(
        (item) => String(item._id) === String(category)
      )?.name;
      const isAllowanceTransaction =
        type === "income" &&
        (String(selectedCategoryName || "").trim().toLowerCase() === "allowance" ||
          String(desc || "").trim().toLowerCase() === "monthly allowance" ||
          editingTransaction?.source === "allowance");

      let allowanceSyncError = null;
      if (isAllowanceTransaction) {
        try {
          const profileRes = await API.put("/users/profile", {
            monthlyAllowance: amount,
          });
          const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
          localStorage.setItem(
            "user",
            JSON.stringify({
              ...storedUser,
              ...(profileRes.data?.user || {}),
              monthlyAllowance: amount,
            })
          );
        } catch (error) {
          allowanceSyncError = error;
        }
      }

      if (allowanceSyncError) {
        toast.error(
          `Transaction saved, but profile allowance sync failed: ${allowanceSyncError.response?.data?.message || "Please retry from Profile."}`
        );
      } else {
        toast.success(editingTransaction ? "Transaction updated" : "Transaction added");
      }

      formElement.reset();
      closeTransactionModal();
      await fetchTransactions();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          (editingTransaction ? "Failed to update" : "Failed to add")
      );
    }
  };

  const deleteTransaction = async (id) => {
    if (!window.confirm("Delete this transaction?")) return;

    try {
      await API.delete(`/transactions/${id}`);

      toast.success(
        deletedSupported
          ? "Transaction moved to Deleted (restorable)"
          : "Transaction deleted"
      );

      setTransactions((curr) => curr.filter((t) => t._id !== id));
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete failed");
    }
  };

  // CSV helpers
  const parseCSV = (text) => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0]
      .split(",")
      .map((header) => header.trim().toLowerCase());

    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((value) => value.trim());

      if (!values.length || !values[0]) continue;

      const row = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });

      rows.push(row);
    }

    return rows;
  };

  const findCategoryByName = (name) =>
    categories.find(
      (category) =>
        String(category.name).toLowerCase() ===
        String(name || "").toLowerCase()
    );

  const buildPreviewRows = (baseRows, suggestions) =>
    baseRows.map((row, index) => {
      const suggestion =
        suggestions.find((item) => {
          const rowNumber = Number(item?.row);

          if (!Number.isFinite(rowNumber) || rowNumber === 0) return false;

          return rowNumber - 1 === index || rowNumber === index;
        }) || suggestions[index];

      const matchedCategory = findCategoryByName(row.category);

      return {
        ...row,
        type: row.type === "income" ? "income" : "expense",
        amount: row.amount || "",
        date: row.date || getTodayString(),
        description: row.description || "",
        selectedCategory:
          matchedCategory?._id ||
          suggestion?.suggestedCategory?.id ||
          "",
        suggestedName: suggestion?.suggestedCategory?.name || "",
        confidence: suggestion?.confidence ?? null,
      };
    });

  const handleCsvFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Please upload a .csv file");
      return;
    }

    setCsvFile(file);
    setCsvResult(null);
    setCsvPreviewRows([]);
    setCsvPreviewSource("");

    try {
      setCsvPreviewLoading(true);

      const fileText = await file.text();
      const rows = parseCSV(fileText);

      if (!rows.length) {
        toast.error("CSV file is empty or invalid");
        return;
      }

      let suggestions = null;
      let source = "ai";

      try {
        const previewRes = await API.post("/import/preview", {
          fileName: file.name,
          rows,
        });

        if (Array.isArray(previewRes.data?.suggestions)) {
          suggestions = previewRes.data.suggestions;
          source = "backend";
        }
      } catch (error) {
        console.warn(
          "Batch import preview unavailable:",
          error.response?.status || error.message
        );
      }

      if (!suggestions) {
        suggestions = await Promise.all(
          rows.slice(0, 40).map(async (row, index) => {
            const rowDescription = row.description || row.category || "";

            if (!rowDescription.trim()) {
              return { row: index + 1, suggestedCategory: null };
            }

            try {
              const res = await API.post("/ai/categorize", {
                description: rowDescription,
              });

              return {
                row: index + 1,
                suggestedCategory: res.data?.suggestedCategory || null,
                confidence: res.data?.confidence ?? null,
              };
            } catch (error) {
              console.warn("AI categorization failed:", error);
              return {
                row: index + 1,
                suggestedCategory: null,
              };
            }
          })
        );
      }

      setCsvPreviewRows(buildPreviewRows(rows, suggestions));
      setCsvPreviewSource(source);
    } catch (error) {
      toast.error(error.message || "Could not read the CSV file");
    } finally {
      setCsvPreviewLoading(false);
    }
  };

  const setRowCategory = (index, categoryId) => {
    setCsvPreviewRows((curr) =>
      curr.map((row, rowIndex) =>
        rowIndex === index ? { ...row, selectedCategory: categoryId } : row
      )
    );
  };

  const importCsv = async () => {
    if (!csvFile) return toast.error("Please select a CSV file");

    if (!csvPreviewRows.length) {
      return toast.error("Please wait for the CSV preview to load");
    }

    const missingCategoryRows = csvPreviewRows.filter(
      (row) => !row.selectedCategory && !row.category
    );

    if (missingCategoryRows.length) {
      return toast.error(
        `Assign a category to ${missingCategoryRows.length} row${
          missingCategoryRows.length > 1 ? "s" : ""
        } before importing`
      );
    }

    try {
      setCsvImporting(true);

      const rows = csvPreviewRows.map((row) => ({
        date: row.date,
        amount: row.amount,
        type: row.type,
        description: row.description,
        category:
          categories.find(
            (category) => category._id === row.selectedCategory
          )?.name || row.category,
      }));

      const res = await API.post("/import/csv", {
        fileName: csvFile.name,
        rows,
      });

      setCsvResult({
        success: true,
        message: res.data.message,
        batch: res.data.batch,
      });

      toast.success(res.data.message);
      fetchTransactions();
    } catch (error) {
      const message = error.response?.data?.message || "Import failed";

      setCsvResult({ success: false, message });
      toast.error(message);
    } finally {
      setCsvImporting(false);
    }
  };

  const downloadSampleCSV = () => {
    const sample = `date,category,amount,type,description
2026-09-01,Food,500,expense,Lunch at canteen
2026-09-02,Transport,200,expense,Bus fare
2026-09-03,Allowance,15000,income,Monthly allowance
2026-09-04,Academics,800,expense,Textbook purchase`;

    const blob = new Blob([sample], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = "sample-transactions.csv";
    anchor.click();

    URL.revokeObjectURL(url);
  };

  const closeCsvModal = () => {
    setCsvModalOpen(false);
    setCsvFile(null);
    setCsvResult(null);
    setCsvPreviewRows([]);
    setCsvPreviewSource("");
  };

  const incomeCategories = categories.filter(
    (category) => category.type === "income"
  );

  const expenseCategories = categories.filter(
    (category) => category.type === "expense"
  );

  return (
    <div className="transactions-page">
      <div className="page-heading">
        <div>
          <h1>Transactions</h1>
          <p>Manage your income and expenses.</p>
        </div>

        <div className="transaction-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => setCsvModalOpen(true)}
          >
            <Upload size={16} />
            Import CSV
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={openAddModal}
          >
            <Plus size={16} />
            Add Transaction
          </button>
        </div>
      </div>

      <div className="transaction-toolbar">
        <div className="transaction-tabs">
          {["all", "income", "expense"].map((type) => (
            <button
              type="button"
              key={type}
              className={filter === type ? "active" : ""}
              onClick={() => setFilter(type)}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}

          {deletedSupported && (
            <button
              type="button"
              className={filter === "deleted" ? "active" : ""}
              onClick={openDeletedView}
              title="View and restore deleted transactions"
            >
              Deleted
            </button>
          )}
        </div>

        <div className="transaction-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search transactions"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      {filter === "deleted" && (
        <p className="deleted-hint">
          Deleted items are excluded from reports, budgets and insights.
          Restore them to include them again.
        </p>
      )}

      <div className="transaction-table-wrap">
        <table className="transaction-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {filter === "deleted" ? (
              deletedLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={`deleted-skeleton-${index}`}>
                    <td colSpan="5">
                      <Skeleton
                        height={14}
                        width={index % 2 ? "58%" : "92%"}
                      />
                    </td>
                  </tr>
                ))
              ) : deletedVisible.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty-table">
                    No deleted transactions.
                  </td>
                </tr>
              ) : (
                deletedVisible.map((transaction) => (
                  <tr key={transaction._id}>
                    <td>
                      {new Date(transaction.date).toLocaleDateString()}
                    </td>
                    <td>{transaction.category?.name || "—"}</td>
                    <td>{transaction.description || "—"}</td>
                    <td
                      className={
                        transaction.type === "income"
                          ? "income-amount"
                          : "expense-amount"
                      }
                    >
                      {transaction.type === "income" ? "+" : "-"} ₹
                      {Number(transaction.amount || 0).toLocaleString("en-IN")}
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="restore-button"
                          onClick={() => restoreTransaction(transaction._id)}
                          aria-label="Restore transaction"
                          title="Restore transaction"
                        >
                          <RotateCcw size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )
            ) : loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={`skeleton-${index}`}>
                  <td colSpan="5">
                    <Skeleton
                      height={14}
                      width={index % 2 ? "58%" : "92%"}
                    />
                  </td>
                </tr>
              ))
            ) : filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-table">
                  No transactions found. Add your first one!
                </td>
              </tr>
            ) : (
              filteredTransactions.map((transaction) => (
                <tr key={transaction._id}>
                  <td>
                    {new Date(transaction.date).toLocaleDateString()}
                  </td>
                  <td>{transaction.category?.name || "—"}</td>
                  <td>{transaction.description || "—"}</td>
                  <td
                    className={
                      transaction.type === "income"
                        ? "income-amount"
                        : "expense-amount"
                    }
                  >
                    {transaction.type === "income" ? "+" : "-"} ₹
                    {Number(transaction.amount || 0).toLocaleString("en-IN")}
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        type="button"
                        aria-label="Edit"
                        onClick={() => openEditModal(transaction)}
                      >
                        <Pencil size={15} />
                      </button>

                      <button
                        type="button"
                        className="delete-button"
                        onClick={() => deleteTransaction(transaction._id)}
                        aria-label="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filter !== "deleted" &&
        pagination &&
        pagination.page < pagination.pages && (
          <div className="load-more-wrap">
            <button
              type="button"
              className="secondary-button load-more-btn"
              onClick={loadMoreTransactions}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <>
                  <Loader2 size={15} className="spin" />
                  Loading...
                </>
              ) : (
                `Load more (${transactions.length} of ${pagination.total})`
              )}
            </button>
          </div>
        )}

      <section className="recurring-section">
        <div className="recurring-header">
          <div>
            <h2>Recurring Entries</h2>
            <p>
              Monthly allowances and subscription charges that repeat on a
              schedule.
            </p>
          </div>

          <div className="recurring-header-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={runRecurringProcess}
            >
              Process now
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={() => setRecurringOpen((open) => !open)}
              aria-expanded={recurringOpen}
            >
              {recurringOpen ? "Hide" : "Manage"}
            </button>
          </div>
        </div>

        {recurringOpen && (
          <>
            <form
              className="recurring-form"
              onSubmit={addRecurring}
              noValidate
            >
              <select
                name="type"
                value={recurringType}
                onChange={(event) => setRecurringType(event.target.value)}
                aria-label="Recurring type"
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>

              <select name="category" defaultValue="" aria-label="Category">
                <option value="">Category</option>
                {(recurringType === "income"
                  ? incomeCategories
                  : expenseCategories
                ).map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <input
                name="amount"
                type="number"
                placeholder="Amount"
                aria-label="Amount"
              />

              <select
                name="frequency"
                defaultValue="monthly"
                aria-label="Frequency"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>

              <input
                name="startDate"
                type="date"
                defaultValue={getTodayString()}
                aria-label="Start date"
              />

              <input
                name="description"
                type="text"
                placeholder="Description (optional)"
                aria-label="Description"
              />

              <button type="submit" className="primary-button">
                <Plus size={15} />
                Add Recurring
              </button>
            </form>

            {recurringLoading ? (
              <p className="recurring-empty">Loading recurring entries...</p>
            ) : recurringItems.length === 0 ? (
              <p className="recurring-empty">
                No recurring entries yet. Add your monthly allowance or a
                subscription above.
              </p>
            ) : (
              <div className="recurring-list">
                {recurringItems.map((item) => (
                  <div className="recurring-item" key={item._id}>
                    <div className="recurring-info">
                      <strong>
                        {item.description ||
                          item.category?.name ||
                          "Recurring entry"}
                      </strong>

                      <span>
                        {item.category?.name || "—"} · {item.frequency} · ₹
                        {Number(item.amount || 0).toLocaleString("en-IN")} · next{" "}
                        {item.nextOccurrence
                          ? new Date(
                              item.nextOccurrence
                            ).toLocaleDateString()
                          : "—"}
                      </span>
                    </div>

                    <span
                      className={
                        item.isActive
                          ? "recurring-status recurring-active"
                          : "recurring-status recurring-inactive"
                      }
                    >
                      {item.isActive ? "Active" : "Paused"}
                    </span>

                    <div className="recurring-actions">
                      <button
                        type="button"
                        onClick={() => toggleRecurring(item._id)}
                      >
                        {item.isActive ? "Pause" : "Resume"}
                      </button>

                      <button
                        type="button"
                        className="delete-button"
                        onClick={() => deleteRecurring(item._id)}
                        aria-label="Delete recurring entry"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* Add/Edit Transaction Modal */}
      {modalOpen && (
        <div className="modal-backdrop">
          <div className="transaction-modal">
            <div className="modal-heading">
              <h2>
                {editingTransaction ? "Edit Transaction" : "Add Transaction"}
              </h2>

              <button
                type="button"
                onClick={closeTransactionModal}
                aria-label="Close"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={addTransaction} noValidate>
              <div className="type-selector">
                <label>
                  <input
                    type="radio"
                    name="type"
                    value="income"
                    defaultChecked={
                      editingTransaction
                        ? editingTransaction.type !== "expense"
                        : defaultType !== "expense"
                    }
                  />
                  <span>Income</span>
                </label>

                <label>
                  <input
                    type="radio"
                    name="type"
                    value="expense"
                    defaultChecked={
                      editingTransaction
                        ? editingTransaction.type === "expense"
                        : defaultType === "expense"
                    }
                  />
                  <span>Expense</span>
                </label>
              </div>

              <div className="modal-field">
                <label>Amount</label>
                <input
                  name="amount"
                  type="number"
                  min="0.01"
                  step="any"
                  placeholder="Enter amount"
                  defaultValue={editingTransaction?.amount ?? ""}
                />
              </div>

              <div className="modal-field">
                <label>Description</label>
                <input
                  name="description"
                  type="text"
                  placeholder="e.g., Lunch at campus cafe"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />

                {aiLoading && (
                  <div className="ai-loading">
                    <Loader2 size={14} className="spin" />
                    AI is analyzing...
                  </div>
                )}

                {activeAiSuggestion && !aiLoading && (
                  <div className="ai-suggestion-box">
                    <div className="ai-suggestion-text">
                      <Sparkles size={14} />
                      <span>
                        AI suggests:{" "}
                        <strong>{activeAiSuggestion.name}</strong>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={applyAiSuggestion}
                      className="ai-apply-btn"
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>

              <div className="modal-field">
                <label>Category</label>
                <select
                  name="category"
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.target.value)}
                >
                  <option value="" disabled>
                    Choose category
                  </option>

                  <optgroup label="Income">
                    {incomeCategories.map((category) => (
                      <option key={category._id} value={category._id}>
                        {category.name}
                      </option>
                    ))}
                  </optgroup>

                  <optgroup label="Expense">
                    {expenseCategories.map((category) => (
                      <option key={category._id} value={category._id}>
                        {category.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="modal-field">
                <label>Date</label>
                {/* NEW: max prevents future dates in the picker;
                    validation in addTransaction enforces it. */}
                <input
                  name="date"
                  type="date"
                  max={getTodayString()}
                  defaultValue={
                    editingTransaction
                      ? new Date(editingTransaction.date)
                          .toISOString()
                          .slice(0, 10)
                      : getTodayString()
                  }
                />
                <small className="date-hint">
                  Future dates are not allowed.
                </small>
              </div>

              <label className="recurring-check">
                <input
                  name="recurring"
                  type="checkbox"
                  defaultChecked={Boolean(editingTransaction?.isRecurring)}
                />
                Recurring transaction
              </label>

              <div className="modal-buttons">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeTransactionModal}
                >
                  Cancel
                </button>

                <button type="submit" className="primary-button">
                  {editingTransaction ? "Save Changes" : "Add Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {csvModalOpen && (
        <div className="modal-backdrop">
          <div className="transaction-modal csv-modal">
            <div className="modal-heading">
              <h2>Import CSV</h2>

              <button
                type="button"
                onClick={closeCsvModal}
                aria-label="Close"
              >
                <X size={19} />
              </button>
            </div>

            <div className="csv-instructions">
              Upload a CSV file with columns:{" "}
              <code>date, category, amount, type, description</code>
            </div>

            <div className="csv-upload-box">
              <Upload
                size={32}
                style={{ color: "#7f1d3a", marginBottom: 8 }}
              />

              <input
                type="file"
                accept=".csv"
                onChange={handleCsvFile}
                className="csv-file-input"
              />

              {csvFile && (
                <p className="csv-file-selected">
                  {csvFile.name} selected
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={downloadSampleCSV}
              className="csv-sample-btn"
            >
              Download Sample CSV
            </button>

            {csvPreviewLoading && (
              <div className="csv-preview-loading">
                <Loader2 size={15} className="spin" />
                Getting AI category suggestions for your rows...
              </div>
            )}

            {csvPreviewRows.length > 0 && (
              <div className="csv-preview">
                <div className="csv-preview-head">
                  <strong>
                    {csvPreviewRows.length} rows ready to import
                  </strong>

                  <span>
                    {csvPreviewSource === "backend"
                      ? "Batch AI suggestions from the server"
                      : "AI suggestions from /ai/categorize"}
                    {" — "}review and override any category before importing.
                  </span>
                </div>

                <div className="csv-preview-table-wrap">
                  <table className="csv-preview-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Type</th>
                        <th>Category (editable)</th>
                      </tr>
                    </thead>

                    <tbody>
                      {csvPreviewRows.map((row, index) => (
                        <tr key={`${row.date}-${index}`}>
                          <td>{row.date}</td>
                          <td>{row.description || "—"}</td>
                          <td>{row.amount}</td>
                          <td>{row.type}</td>
                          <td>
                            <select
                              value={row.selectedCategory}
                              onChange={(event) =>
                                setRowCategory(index, event.target.value)
                              }
                              aria-label={`Category for CSV row ${index + 1}`}
                            >
                              <option value="">Choose category</option>

                              {categories.map((category) => (
                                <option
                                  key={category._id}
                                  value={category._id}
                                >
                                  {category.name}
                                </option>
                              ))}
                            </select>

                            {row.suggestedName && (
                              <small className="csv-ai-badge">
                                AI suggests: {row.suggestedName}
                              </small>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {csvResult && (
              <div
                className={`csv-result ${
                  csvResult.success
                    ? "csv-result-success"
                    : "csv-result-error"
                }`}
              >
                {csvResult.message}

                {csvResult.batch && (
                  <div style={{ marginTop: 6 }}>
                    Successful: {csvResult.batch.successfulRows} | Failed:{" "}
                    {csvResult.batch.failedRows}
                  </div>
                )}
              </div>
            )}

            <div className="modal-buttons">
              <button
                type="button"
                className="secondary-button"
                onClick={closeCsvModal}
              >
                Cancel
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={importCsv}
                disabled={
                  csvImporting ||
                  !csvFile ||
                  csvPreviewLoading ||
                  csvPreviewRows.length === 0
                }
              >
                {csvImporting ? (
                  <>
                    <Loader2 size={15} className="spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload size={15} />
                    Import
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Budget Exceeded Warning Modal */}
      {budgetWarning && (
        <div
          className="modal-backdrop budget-warning-backdrop"
          onClick={() => setBudgetWarning(null)}
        >
          <div
            className="transaction-modal budget-warning-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="budget-warning-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="budget-warning-icon">
              <AlertTriangle size={30} />
            </div>

            <div className="budget-warning-content">
              <h2 id="budget-warning-title">
                You don't have enough money!
              </h2>

              <p>
                This expense will exceed your{" "}
                <strong>{budgetWarning.category}</strong> budget.
              </p>

              <div className="budget-warning-details">
                <div>
                  <span>Monthly budget</span>
                  <strong>
                    ₹{budgetWarning.limit.toLocaleString("en-IN")}
                  </strong>
                </div>

                <div>
                  <span>Already spent</span>
                  <strong>
                    ₹{budgetWarning.spent.toLocaleString("en-IN")}
                  </strong>
                </div>

                <div>
                  <span>New expense</span>
                  <strong>
                    ₹{budgetWarning.attempted.toLocaleString("en-IN")}
                  </strong>
                </div>

                <div className="budget-warning-total">
                  <span>Total after expense</span>
                  <strong>
                    ₹{budgetWarning.projected.toLocaleString("en-IN")}
                  </strong>
                </div>

                <div className="budget-warning-excess">
                  <span>Budget exceeded by</span>
                  <strong>
                    ₹
                    {(
                      budgetWarning.projected - budgetWarning.limit
                    ).toLocaleString("en-IN")}
                  </strong>
                </div>
              </div>

              <p className="budget-warning-hint">
                Reduce the expense amount or increase your monthly budget
                before adding this transaction.
              </p>
            </div>

            <button
              type="button"
              className="primary-button budget-warning-close"
              onClick={() => setBudgetWarning(null)}
            >
              Okay, I understand
            </button>
          </div>
        </div>
      )}

      {/* No budget set for this category */}
      {missingBudgetWarning && (
        <div
          className="modal-backdrop budget-warning-backdrop"
          onClick={() => setMissingBudgetWarning(null)}
        >
          <div
            className="transaction-modal budget-warning-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="missing-budget-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="budget-warning-icon">
              <AlertTriangle size={30} />
            </div>

            <div className="budget-warning-content">
              <h2 id="missing-budget-title">
                No budget set for this category
              </h2>

              <p>
                You haven’t set a monthly budget for{" "}
                <strong>{missingBudgetWarning.category}</strong>. Set a
                budget for this category before adding an expense.
              </p>

              <p className="budget-warning-hint">
                Every expense category must match a budget category so your
                spending stays tracked.
              </p>
            </div>

            <div className="budget-warning-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setMissingBudgetWarning(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  setMissingBudgetWarning(null);
                  closeTransactionModal();
                  navigate("/budgets");
                }}
              >
                Set Budget
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Transactions;
