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
  AlertCircle,
  PiggyBank,
  Camera,
} from "lucide-react";
import toast from "react-hot-toast";

import API from "../../api/axios";
import { formatCurrency, fromPKR, toPKR, useCurrency } from "../../context/CurrencyContext";
import { displayCategoryName, sortExpenseCategories } from "../../utils/categoryPresentation";
import AdminConfirmModal from "../../components/AdminConfirmModal/AdminConfirmModal";
import { Skeleton } from "../../components/Skeleton/Skeleton";
import "./Transactions.css";

const PAGE_SIZE = 20;

const getTodayString = () => new Date().toLocaleDateString("en-CA");

function extractReceiptFields(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const totalPatterns = [
    /(?:grand\s*total|net\s*(?:total|payable)|amount\s*(?:due|paid)|total\s*(?:amount|due)?)\s*[:\-]?\s*(?:rs\.?|pkr|₨|\$)?\s*([\d,]+(?:\.\d{1,2})?)/gi,
  ];
  const totals = [];
  for (const pattern of totalPatterns) {
    for (const match of text.matchAll(pattern)) {
      const amount = Number(match[1].replace(/,/g, ""));
      if (Number.isFinite(amount) && amount > 0) totals.push(amount);
    }
  }

  let amount = totals.at(-1) || "";
  if (!amount) {
    const currencyAmounts = [...String(text || "").matchAll(/(?:rs\.?|pkr|₨)\s*([\d,]+(?:\.\d{1,2})?)/gi)]
      .map((match) => Number(match[1].replace(/,/g, "")))
      .filter((value) => Number.isFinite(value) && value > 0);
    amount = currencyAmounts.length ? Math.max(...currencyAmounts) : "";
  }

  const dateMatch = String(text || "").match(
    /\bdate\s*[:\-]?\s*(\d{1,2}\s+[a-z]{3,9}\s+\d{4}|\d{1,2}[/.\-]\d{1,2}[/.\-]\d{4})/i
  );
  let date = getTodayString();
  if (dateMatch) {
    const value = dateMatch[1];
    const slashDate = value.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
    const parsed = slashDate
      ? new Date(Number(slashDate[3]), Number(slashDate[2]) - 1, Number(slashDate[1]))
      : new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      date = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
    }
  }

  const merchant = lines.find((line) =>
    line.length > 2 && !/^(receipt|invoice|tax invoice)$/i.test(line)
  ) || "Receipt purchase";
  const itemLine = lines.find((line) => /biryani|burger|pizza|meal|food|grocery|tea|coffee/i.test(line));
  const item = itemLine?.replace(/(?:rs\.?|pkr|₨|\$)\s*[\d,.]+/gi, "").replace(/\s+/g, " ").trim();
  const description = [merchant, item && item.toLowerCase() !== merchant.toLowerCase() ? item : ""]
    .filter(Boolean)
    .join(" - ")
    .slice(0, 120);

  return { amount, date, description };
}

function Transactions() {
  const { currency } = useCurrency();
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
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [deletingTransaction, setDeletingTransaction] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [transactionFormError, setTransactionFormError] = useState("");
  const [budgetWarning, setBudgetWarning] = useState(null);
  const [deletedSupported, setDeletedSupported] = useState(false);
  const [deletedTransactions, setDeletedTransactions] = useState([]);
  const [deletedLoading, setDeletedLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [suggestedDescriptions, setSuggestedDescriptions] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [csvFile, setCsvFile] = useState(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult, setCsvResult] = useState(null);
  const [csvDeleteConfirmOpen, setCsvDeleteConfirmOpen] = useState(false);
  const [deletingCsvTransactions, setDeletingCsvTransactions] = useState(false);
  const [deletedDeleteConfirmOpen, setDeletedDeleteConfirmOpen] = useState(false);
  const [permanentlyDeletingTransactions, setPermanentlyDeletingTransactions] = useState(false);
  const [csvPreviewRows, setCsvPreviewRows] = useState([]);
  const [csvPreviewLoading, setCsvPreviewLoading] = useState(false);
  const [csvPreviewSource, setCsvPreviewSource] = useState("");
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState("");
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptReading, setReceiptReading] = useState(false);
  const [receiptProgress, setReceiptProgress] = useState(0);
  const [receiptSaving, setReceiptSaving] = useState(false);
  const [receiptDraft, setReceiptDraft] = useState({
    amount: "",
    date: getTodayString(),
    description: "",
    category: "",
  });
  const [recurringItems, setRecurringItems] = useState([]);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [recurringLoading, setRecurringLoading] = useState(true);
  const [recurringType, setRecurringType] = useState("expense");
  const [editingRecurring, setEditingRecurring] = useState(null);
  const [recurringToDelete, setRecurringToDelete] = useState(null);
  const [savingRecurring, setSavingRecurring] = useState(false);
  const [deletingRecurring, setDeletingRecurring] = useState(false);

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

  const fetchTransactions = async ({
    page = 1,
    append = false,
    transactionFilter = filter,
    showLoader = transactions.length === 0,
  } = {}) => {
    try {
      if (append) setLoadingMore(true);
      else if (showLoader) setLoading(true);

      const res = await API.get("/transactions", {
        params: {
          page,
          limit: PAGE_SIZE,
          ...(transactionFilter === "csv" ? { source: "csv" } : {}),
        },
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
      else if (showLoader) setLoading(false);
    }
  };

  const loadMoreTransactions = () => {
    if (!pagination || pagination.page >= pagination.pages) return;

    fetchTransactions({
      page: pagination.page + 1,
      append: true,
      transactionFilter: filter,
    });
  };

  const selectTransactionFilter = (nextFilter) => {
    setFilter(nextFilter);
    if (nextFilter !== "deleted") {
      fetchTransactions({ page: 1, transactionFilter: nextFilter });
    }
  };

  const deleteAllCsvTransactions = async () => {
    let deletedCount = 0;
    try {
      setDeletingCsvTransactions(true);
      const response = await API.get("/transactions", {
        params: { source: "csv" },
      });
      const ids = (response.data?.transactions || []).map((transaction) => transaction._id);

      if (ids.length === 0) {
        setCsvDeleteConfirmOpen(false);
        toast("There are no CSV transactions to delete.");
        await fetchTransactions({ page: 1, transactionFilter: "csv" });
        return;
      }

      for (let index = 0; index < ids.length; index += 200) {
        const result = await API.post("/transactions/bulk-delete", {
          ids: ids.slice(index, index + 200),
        });
        deletedCount += Number(result.data?.deletedCount || 0);
      }

      setCsvDeleteConfirmOpen(false);
      toast.success(`${deletedCount} CSV transaction(s) moved to Deleted`);
      await Promise.all([
        fetchTransactions({ page: 1, transactionFilter: "csv" }),
        loadDeletedTransactions(),
      ]);
      window.dispatchEvent(new Event("campuscoin:user-updated"));
    } catch (error) {
      const message = error.response?.data?.message || "Could not delete CSV transactions";
      toast.error(
        deletedCount > 0
          ? `${deletedCount} transaction(s) moved to Deleted. ${message}`
          : message
      );
    } finally {
      setDeletingCsvTransactions(false);
    }
  };

  const permanentlyDeleteAllDeleted = async () => {
    try {
      setPermanentlyDeletingTransactions(true);
      const response = await API.delete("/transactions/deleted/permanent");
      setDeletedDeleteConfirmOpen(false);
      setDeletedTransactions([]);
      toast.success(response.data?.message || "Deleted transactions permanently removed");
      window.dispatchEvent(new Event("campuscoin:user-updated"));
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not permanently delete transactions");
    } finally {
      setPermanentlyDeletingTransactions(false);
    }
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
      window.dispatchEvent(new Event("campuscoin:user-updated"));
    } catch (error) {
      if (error.response?.status === 404) {
        setDeletedSupported(false);
        toast.error("Restore is not available on this server");
      } else {
        toast.error(error.response?.data?.message || "Restore failed");
      }
    }
  };

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
    const amount = toPKR(form.get("amount"), currency);
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

    const payload = {
      type,
      amount,
      category,
      frequency,
      description: recurringDescription || "",
      startDate,
      ...(editingRecurring ? { nextOccurrence: startDate } : {}),
    };

    try {
      setSavingRecurring(true);
      if (editingRecurring) {
        await API.put(`/recurring/${editingRecurring._id}`, payload);
      } else {
        await API.post("/recurring", { ...payload, nextOccurrence: startDate });
      }

      toast.success(editingRecurring ? "Recurring entry updated" : "Recurring entry added");
      setEditingRecurring(null);
      setRecurringType("expense");
      formElement.reset();
      await refreshRecurring();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to save recurring entry"
      );
    } finally {
      setSavingRecurring(false);
    }
  };

  const editRecurring = (item) => {
    setEditingRecurring(item);
    setRecurringType(item.type);
    setRecurringOpen(true);
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

  const deleteRecurring = async () => {
    if (!recurringToDelete || deletingRecurring) return;
    try {
      setDeletingRecurring(true);
      await API.delete(`/recurring/${recurringToDelete._id}`);
      setRecurringItems((curr) => curr.filter((item) => item._id !== recurringToDelete._id));
      if (editingRecurring?._id === recurringToDelete._id) setEditingRecurring(null);
      setRecurringToDelete(null);

      toast.success("Recurring entry deleted");
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete failed");
    } finally {
      setDeletingRecurring(false);
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
    const matchesType = filter === "all" || filter === "csv" || t.type === filter;
    const matchesSource = filter !== "csv" || t.source === "csv";

    const matchesSearch =
      (t.description || "").toLowerCase().includes(search.toLowerCase()) ||
      (t.category?.name || "").toLowerCase().includes(search.toLowerCase());

    return matchesType && matchesSource && matchesSearch;
  });

  const deletedVisible = deletedTransactions.filter(
    (t) =>
      (t.description || "").toLowerCase().includes(search.toLowerCase()) ||
      (t.category?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (editingTransaction) return;
    if (!description || description.trim().length < 3) return;

    const timer = setTimeout(async () => {
      try {
        setAiLoading(true);

        const res = await API.post("/ai/categorize", { description });

        setAiSuggestion(res.data.suggestedCategory || null);
        setSuggestedDescriptions(res.data.suggestedDescriptions || []);
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

  const applyDescriptionSuggestion = (suggestedDesc) => {
    setDescription(suggestedDesc);
    if (activeAiSuggestion?.id) {
      setSelectedCategory(activeAiSuggestion.id);
      toast.success(`Updated to "${suggestedDesc}" (${activeAiSuggestion.name})`);
    } else {
      toast.success(`Updated to "${suggestedDesc}"`);
    }
  };

  const openAddModal = () => {
    setEditingTransaction(null);
    setDefaultType("income");
    setDescription("");
    setSelectedCategory("");
    setAiSuggestion(null);
    setSuggestedDescriptions([]);
    setModalOpen(true);
  };

  const openEditModal = (transaction) => {
    setEditingTransaction(transaction);
    setDescription(transaction.description || "");
    setSelectedCategory(transaction.category?._id || "");
    setAiSuggestion(null);
    setSuggestedDescriptions([]);
    setModalOpen(true);
  };

  const closeTransactionModal = () => {
    setModalOpen(false);
    setTransactionFormError("");
    setEditingTransaction(null);
    setDescription("");
    setSelectedCategory("");
    setAiSuggestion(null);
    setSuggestedDescriptions([]);

    if (quickAddType) {
      setSearchParams({}, { replace: true });
    }
  };

  const addTransaction = async (event) => {
    event.preventDefault();
    setTransactionFormError("");

    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    const type = form.get("type");
    const amountValue = form.get("amount");
    const category = selectedCategory || form.get("category");
    const desc = form.get("description")?.trim();
    const date = form.get("date");
    const recurring = form.get("recurring") === "on";

    if (!type) return setTransactionFormError("Please choose income or expense.");
    if (!amountValue) return setTransactionFormError("Please enter an amount.");

    const amount = toPKR(amountValue, currency);

    if (!Number.isFinite(amount) || amount <= 0) {
      return setTransactionFormError("Amount must be greater than zero.");
    }

    if (!category) return setTransactionFormError("Please choose a category.");
    if (!date) return setTransactionFormError("Please choose a date.");

    if (date > getTodayString()) {
      return setTransactionFormError(
        "Date cannot be in the future. Please pick today or an earlier date."
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

        if (matchingBudget) {
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
            const excessAmount = projected - limit;
            let availableSavings = 0;
            try {
              const savingsRes = await API.get("/transactions/savings-balance");
              availableSavings = Number(savingsRes.data?.savings || 0);
            } catch (e) {
              console.error("Could not fetch savings balance:", e);
            }

            setBudgetWarning({
              category:
                displayCategoryName(matchingBudget.budget.category?.name || "Selected category"),
              limit,
              spent: Math.max(0, alreadySpent),
              attempted: amount,
              projected,
              excessAmount,
              availableSavings,
              hasEnoughSavings: availableSavings >= excessAmount,
              showInsufficientSavingsAlert: availableSavings < excessAmount,
              payload,
              editing: Boolean(editingTransaction),
              editingId: editingTransaction?._id,
              formElement,
            });

            return;
          }
        }
      } catch (error) {
        setTransactionFormError(
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
      window.dispatchEvent(new Event("campuscoin:user-updated"));
    } catch (error) {
      setTransactionFormError(
        error.response?.data?.message ||
          (editingTransaction ? "Failed to update" : "Failed to add")
      );
    }
  };

  const handleConfirmSavingsDeduction = async () => {
    if (!budgetWarning) return;

    if (budgetWarning.availableSavings < budgetWarning.excessAmount) {
      setBudgetWarning((prev) => ({
        ...prev,
        showInsufficientSavingsAlert: true,
      }));
      return;
    }

    try {
      const payloadWithSavings = {
        ...budgetWarning.payload,
        deductFromSavings: true,
      };

      if (budgetWarning.editing) {
        await API.put(`/transactions/${budgetWarning.editingId}`, payloadWithSavings);
      } else {
        await API.post("/transactions", payloadWithSavings);

        if (activeAiSuggestion && description) {
          API.post("/ai/categorize/feedback", {
            description,
            userSelectedCategory: budgetWarning.payload.category,
          }).catch(() => {});
        }
      }

      toast.success(
        `Transaction saved! ${formatCurrency(budgetWarning.excessAmount, currency)} was deducted from your savings.`
      );

      setBudgetWarning(null);
      if (budgetWarning.formElement) {
        budgetWarning.formElement.reset();
      }
      if (budgetWarning.receipt) closeReceiptModal();
      else closeTransactionModal();
      await fetchTransactions();
      window.dispatchEvent(new Event("campuscoin:user-updated"));
    } catch (error) {
      if (error.response?.data?.insufficientSavings) {
        setBudgetWarning((prev) => ({
          ...prev,
          showInsufficientSavingsAlert: true,
          availableSavings: Number(
            error.response?.data?.availableSavings ?? prev.availableSavings
          ),
        }));
      } else {
        toast.error(
          error.response?.data?.message ||
            "Failed to save transaction with savings deduction."
        );
      }
    }
  };

  const deleteTransaction = async () => {
    if (!transactionToDelete || deletingTransaction) return;
    const id = transactionToDelete;
    setDeletingTransaction(true);
    try {
      await API.delete(`/transactions/${id}`);

      toast.success(
        deletedSupported
          ? "Transaction moved to Deleted (restorable)"
          : "Transaction deleted"
      );

      setTransactions((curr) => curr.filter((t) => t._id !== id));
      setTransactionToDelete(null);
      window.dispatchEvent(new Event("campuscoin:user-updated"));
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete failed");
    } finally {
      setDeletingTransaction(false);
    }
  };

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

  const buildPreviewRows = (baseRows, suggestions) =>
    baseRows.map((row, index) => {
      const suggestion =
        suggestions.find((item) => {
          const rowNumber = Number(item?.row);

          if (!Number.isFinite(rowNumber) || rowNumber === 0) return false;

          return rowNumber - 1 === index || rowNumber === index;
        }) || suggestions[index];

      const matchingCategories = categories.filter(
        (category) => String(category.name).trim().toLowerCase() === String(row.category || "").trim().toLowerCase()
      );
      const csvType = row.type === "income" ? "income" : "expense";
      const matchedCategory =
        matchingCategories.find((category) => category.type === csvType) ||
        matchingCategories[0];
      const correctedType = matchedCategory?.type || csvType;

      return {
        ...row,
        type: correctedType,
        typeCorrectedFrom: correctedType !== csvType ? csvType : "",
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
    if (!csvPreviewRows.length) return toast.error("Please wait for the CSV preview to load");

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
        errors: res.data.batch?.errors || [],
      });

      toast.success(res.data.message);
      fetchTransactions();
    } catch (error) {
      const message = error.response?.data?.message || "Import failed";

      setCsvResult({
        success: false,
        message,
        errors: Array.isArray(error.response?.data?.errors)
          ? error.response.data.errors
          : [],
      });
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

  const closeReceiptModal = () => {
    setReceiptModalOpen(false);
    if (receiptPreview) URL.revokeObjectURL(receiptPreview);
    setReceiptPreview("");
    setReceiptFile(null);
    setReceiptReading(false);
    setReceiptProgress(0);
    setReceiptDraft({ amount: "", date: getTodayString(), description: "", category: "" });
  };

  const handleReceiptFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Choose a receipt image");
    if (file.size > 10 * 1024 * 1024) return toast.error("Receipt image must be smaller than 10 MB");

    if (receiptPreview) URL.revokeObjectURL(receiptPreview);
    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
    setReceiptReading(true);
    setReceiptProgress(0);
    setReceiptDraft({ amount: "", date: getTodayString(), description: "", category: "" });

    let worker;
    try {
      const { createWorker } = await import("tesseract.js");
      worker = await createWorker("eng", 1, {
        logger: (progress) => {
          if (progress.status === "recognizing text") {
            setReceiptProgress(Math.round((progress.progress || 0) * 100));
          }
        },
      });
      const { data } = await worker.recognize(file);
      const extracted = extractReceiptFields(data.text || "");
      setReceiptDraft((current) => ({
        ...current,
        ...extracted,
        amount: extracted.amount
          ? String(Math.round(fromPKR(extracted.amount, currency) * 100) / 100)
          : "",
      }));

      if (extracted.description) {
        try {
          const suggestionRes = await API.post("/ai/categorize", {
            description: extracted.description,
          });
          const suggestion = suggestionRes.data?.suggestedCategory;
          const matched = expenseCategories.find(
            (category) => String(category._id) === String(suggestion?.id) ||
              category.name?.toLowerCase() === suggestion?.name?.toLowerCase()
          );
          if (matched) {
            setReceiptDraft((current) => ({ ...current, category: matched._id }));
          }
        } catch {
        }
      }

      if (extracted.amount) toast.success("Receipt scanned. Review the details before saving.");
      else toast("Receipt scanned. Please enter the total amount manually.");
    } catch (error) {
      console.error("Receipt OCR failed:", error);
      toast.error("Could not read this image. Try a clearer, well-lit receipt.");
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch (error) {
          console.warn("Could not stop receipt OCR worker:", error);
        }
      }
      setReceiptReading(false);
    }
  };

  const saveReceiptTransaction = async (event) => {
    event.preventDefault();
    const amount = toPKR(receiptDraft.amount, currency);
    if (!receiptDraft.category) return toast.error("Choose an expense category");
    if (!Number.isFinite(amount) || amount <= 0) return toast.error("Enter the receipt total");
    if (!receiptDraft.date) return toast.error("Choose the transaction date");
    if (receiptDraft.date > getTodayString()) return toast.error("Date cannot be in the future");

    const payload = {
      type: "expense",
      amount,
      category: receiptDraft.category,
      description: receiptDraft.description.trim() || receiptFile?.name || "Receipt expense",
      date: receiptDraft.date,
      isRecurring: false,
    };

    try {
      setReceiptSaving(true);
      const month = receiptDraft.date.slice(0, 7);
      const budgetRes = await API.get("/budgets/status", { params: { month } });
      const matchingBudget = (budgetRes.data.status || []).find((item) =>
        String(item.budget?.category?._id || item.budget?.category) === String(payload.category)
      );
      if (!matchingBudget) {
        const categoryName = expenseCategories.find((category) => String(category._id) === String(payload.category))?.name || "this category";
        toast.error(`Set a ${month} budget for ${displayCategoryName(categoryName)} before saving this receipt.`);
        return;
      }

      const projected = Number(matchingBudget.used || 0) + amount;
      const limit = Number(matchingBudget.budget?.limitAmount || 0);
      if (projected > limit) {
        const savingsRes = await API.get("/transactions/savings-balance").catch(() => ({ data: { savings: 0 } }));
        const availableSavings = Number(savingsRes.data?.savings || 0);
        setBudgetWarning({
          category: displayCategoryName(matchingBudget.budget?.category?.name || "Selected category"),
          limit,
          spent: Number(matchingBudget.used || 0),
          attempted: amount,
          projected,
          excessAmount: projected - limit,
          availableSavings,
          hasEnoughSavings: availableSavings >= projected - limit,
          showInsufficientSavingsAlert: availableSavings < projected - limit,
          payload,
          editing: false,
          receipt: true,
          formElement: null,
        });
        return;
      }

      await API.post("/transactions", payload);
      toast.success("Receipt transaction added");
      closeReceiptModal();
      await fetchTransactions();
      window.dispatchEvent(new Event("campuscoin:user-updated"));
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not save receipt transaction");
    } finally {
      setReceiptSaving(false);
    }
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

  const expenseCategories = sortExpenseCategories(
    categories.filter((category) => category.type === "expense")
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
            className="secondary-button receipt-scan-trigger"
            onClick={() => setReceiptModalOpen(true)}
          >
            <Camera size={16} />
            Scan Receipt
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
          {["all", "income", "expense", "csv"].map((type) => (
            <button
              type="button"
              key={type}
              className={filter === type ? "active" : ""}
              onClick={() => selectTransactionFilter(type)}
            >
              {type === "csv"
                ? `CSV${filter === "csv" && pagination ? ` (${pagination.total})` : ""}`
                : type.charAt(0).toUpperCase() + type.slice(1)}
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
          Restore them to include them again. <strong>Note: Transactions here will be automatically deleted after 30 days.</strong>
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
              <th>
                <div className="transaction-action-heading">
                  <span>Action</span>
                  {filter === "csv" && !loading && pagination?.total > 0 && (
                    <button
                      type="button"
                      className="csv-delete-all-btn"
                      onClick={() => setCsvDeleteConfirmOpen(true)}
                      aria-label="Delete all CSV-imported transactions"
                      title="Delete all CSV-imported transactions"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                  {filter === "deleted" && !deletedLoading && deletedTransactions.length > 0 && (
                    <button
                      type="button"
                      className="csv-delete-all-btn deleted-delete-all-btn"
                      onClick={() => setDeletedDeleteConfirmOpen(true)}
                      aria-label="Permanently delete all deleted transactions"
                      title="Permanently delete all deleted transactions"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </th>
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
                    <td>{displayCategoryName(transaction.category?.name || "—")}</td>
                    <td>{transaction.description || "—"}</td>
                    <td
                      className={
                        transaction.type === "income"
                          ? "income-amount"
                          : "expense-amount"
                      }
                    >
                      {transaction.type === "income" ? "+" : "-"}
                      {formatCurrency(transaction.amount, currency)}
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
                  {filter === "csv"
                    ? "No CSV-imported transactions found."
                    : "No transactions found. Add your first one!"}
                </td>
              </tr>
            ) : (
              filteredTransactions.map((transaction) => (
                <tr key={transaction._id}>
                  <td>
                    {new Date(transaction.date).toLocaleDateString()}
                  </td>
                  <td>{displayCategoryName(transaction.category?.name || "—")}</td>
                  <td>{transaction.description || "—"}</td>
                  <td
                    className={
                      transaction.type === "income"
                        ? "income-amount"
                        : "expense-amount"
                    }
                  >
                    {transaction.type === "income" ? "+" : "-"}
                    {formatCurrency(transaction.amount, currency)}
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
                        onClick={() => setTransactionToDelete(transaction._id)}
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
              key={editingRecurring?._id || "new-recurring"}
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

              <select
                name="category"
                defaultValue={editingRecurring?.category?._id || editingRecurring?.category || ""}
                aria-label="Category"
              >
                <option value="">Category</option>
                {(recurringType === "income"
                  ? incomeCategories
                  : expenseCategories
                ).map((category) => (
                  <option key={category._id} value={category._id}>
                    {displayCategoryName(category.name)}
                  </option>
                ))}
              </select>

              <input
                key={`recurring-amount-${currency}`}
                name="amount"
                type="number"
                defaultValue={
                  editingRecurring
                    ? fromPKR(editingRecurring.amount, currency)
                    : ""
                }
                placeholder={`Amount (${currency})`}
                aria-label="Amount"
              />

              <select
                name="frequency"
                defaultValue={editingRecurring?.frequency || "monthly"}
                aria-label="Frequency"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>

              <input
                name="startDate"
                type="date"
                defaultValue={
                  editingRecurring?.startDate
                    ? String(editingRecurring.startDate).slice(0, 10)
                    : getTodayString()
                }
                aria-label="Start date"
              />

              <input
                name="description"
                type="text"
                defaultValue={editingRecurring?.description || ""}
                placeholder="Description (optional)"
                aria-label="Description"
              />

              <button type="submit" className="primary-button">
                {editingRecurring ? <Pencil size={15} /> : <Plus size={15} />}
                {savingRecurring
                  ? "Saving…"
                  : editingRecurring
                    ? "Save Changes"
                    : "Add Recurring"}
              </button>
              {editingRecurring && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setEditingRecurring(null);
                    setRecurringType("expense");
                  }}
                >
                  Cancel Edit
                </button>
              )}
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
                          displayCategoryName(item.category?.name || "") ||
                          "Recurring entry"}
                      </strong>

                      <span>
                        {displayCategoryName(item.category?.name || "—")} · {item.frequency} · {formatCurrency(item.amount, currency)} · next{" "}
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
                        onClick={() => editRecurring(item)}
                        aria-label="Edit recurring entry"
                      >
                        <Pencil size={15} />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleRecurring(item._id)}
                      >
                        {item.isActive ? "Pause" : "Resume"}
                      </button>

                      <button
                        type="button"
                        className="delete-button"
                        onClick={() => setRecurringToDelete(item)}
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

      {recurringToDelete && (
        <AdminConfirmModal
          title="Delete recurring entry?"
          message={`“${recurringToDelete.description || displayCategoryName(recurringToDelete.category?.name || "Recurring entry")}” will be removed. Already created transactions will remain.`}
          confirmLabel="Delete entry"
          loading={deletingRecurring}
          onCancel={() => setRecurringToDelete(null)}
          onConfirm={deleteRecurring}
        />
      )}

      {csvDeleteConfirmOpen && (
        <AdminConfirmModal
          title="Delete all CSV transactions?"
          message={`This will move all ${pagination?.total || 0} CSV-imported transactions to Deleted. You can restore them later.`}
          confirmLabel="Delete all CSV transactions"
          loading={deletingCsvTransactions}
          onCancel={() => setCsvDeleteConfirmOpen(false)}
          onConfirm={deleteAllCsvTransactions}
        />
      )}

      {deletedDeleteConfirmOpen && (
        <AdminConfirmModal
          title="Permanently delete all deleted transactions?"
          message={`This will permanently remove all ${deletedTransactions.length} transactions in Deleted from the database. This cannot be undone.`}
          confirmLabel="Delete permanently"
          loading={permanentlyDeletingTransactions}
          onCancel={() => setDeletedDeleteConfirmOpen(false)}
          onConfirm={permanentlyDeleteAllDeleted}
        />
      )}

      {transactionToDelete && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deletingTransaction) {
              setTransactionToDelete(null);
            }
          }}
        >
          <section
            className="transaction-modal delete-confirm-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-transaction-title"
            aria-describedby="delete-transaction-description"
          >
            <div className="delete-confirm-icon"><Trash2 size={22} /></div>
            <h2 id="delete-transaction-title">Delete transaction?</h2>
            <p id="delete-transaction-description">
              This transaction will be moved to Deleted, where you can restore it later.
            </p>
            <div className="delete-confirm-actions">
              <button
                type="button"
                className="delete-cancel-button"
                onClick={() => setTransactionToDelete(null)}
                disabled={deletingTransaction}
              >
                Cancel
              </button>
              <button
                type="button"
                className="delete-confirm-button"
                onClick={deleteTransaction}
                disabled={deletingTransaction}
              >
                {deletingTransaction ? "Deleting…" : "Delete transaction"}
              </button>
            </div>
          </section>
        </div>
      )}

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
                  key={`transaction-amount-${currency}-${editingTransaction?._id || "new"}`}
                  name="amount"
                  type="number"
                  min="0.01"
                  step="any"
                  defaultValue={editingTransaction ? fromPKR(editingTransaction.amount, currency) : ""}
                  placeholder={`Enter amount (${currency})`}
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
                    <div className="ai-suggestion-top">
                      <div className="ai-suggestion-text">
                        <Sparkles size={14} />
                        <span>
                          AI suggests category:{" "}
                          <strong>{activeAiSuggestion.name}</strong>
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={applyAiSuggestion}
                        className="ai-apply-btn"
                      >
                        Apply Category
                      </button>
                    </div>

                    {suggestedDescriptions.length > 0 && (
                      <div className="ai-descriptions-block">
                        <div className="ai-desc-header">
                          <Sparkles size={13} className="ai-desc-icon" />
                          <span>Tap to use a realistic 1-line description:</span>
                        </div>
                        <div className="ai-desc-chips">
                          {suggestedDescriptions.map((descItem, i) => (
                            <button
                              key={i}
                              type="button"
                              className="ai-desc-chip"
                              onClick={() => applyDescriptionSuggestion(descItem)}
                              title="Click to use this description and set category"
                            >
                              <span className="ai-desc-text">{descItem}</span>
                              <span className="ai-desc-action">+ Use this</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
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
                        {displayCategoryName(category.name)}
                      </option>
                    ))}
                  </optgroup>

                  <optgroup label="Expense">
                    {expenseCategories.map((category) => (
                      <option key={category._id} value={category._id}>
                        {displayCategoryName(category.name)}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="modal-field">
                <label>Date</label>
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

              <div className="transaction-form-actions">
                {transactionFormError && (
                  <div className="transaction-form-error" role="alert">
                    {transactionFormError}
                  </div>
                )}

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
              </div>
            </form>
          </div>
        </div>
      )}

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
                          <td>
                            {row.type}
                            {row.typeCorrectedFrom && (
                              <small className="csv-ai-badge">
                                Corrected from CSV {row.typeCorrectedFrom} to match category
                              </small>
                            )}
                          </td>
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
                                  {displayCategoryName(category.name)}
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

                {csvResult.errors?.length > 0 && (
                  <div className="csv-failed-rows">
                    <strong>Why these rows failed</strong>
                    <ul>
                      {csvResult.errors.map((item, index) => (
                        <li key={`${item.row || "row"}-${index}`}>
                          <strong>Row {item.row || index + 1}:</strong>{" "}
                          {item.message || "Could not import this row."}
                        </li>
                      ))}
                    </ul>
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

      {receiptModalOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !receiptSaving && !receiptReading) {
              closeReceiptModal();
            }
          }}
        >
          <section className="transaction-modal receipt-modal" role="dialog" aria-modal="true" aria-labelledby="receipt-modal-title">
            <div className="modal-heading">
              <div>
                <h2 id="receipt-modal-title">Scan a receipt</h2>
                <p>We’ll read the bill and prepare an expense for you to review.</p>
              </div>
              <button type="button" onClick={closeReceiptModal} aria-label="Close" disabled={receiptSaving || receiptReading}>
                <X size={19} />
              </button>
            </div>

            <label className="receipt-image-picker">
              <Camera size={18} />
              {receiptFile ? "Choose another image" : "Select image or take a photo"}
              <input type="file" accept="image/*" capture="environment" onChange={handleReceiptFile} />
            </label>

            {receiptPreview && (
              <div className="receipt-preview-wrap">
                <img src={receiptPreview} alt="Selected receipt preview" />
              </div>
            )}

            {receiptReading && (
              <div className="receipt-reading-status" aria-live="polite">
                <Loader2 size={16} className="spin" />
                <span>Reading receipt… {receiptProgress}%</span>
                <div className="receipt-progress-track"><i style={{ width: `${receiptProgress}%` }} /></div>
              </div>
            )}

            <form onSubmit={saveReceiptTransaction}>
              <div className="receipt-fields-grid">
                <div className="modal-field">
                  <label>Total amount ({currency})</label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={receiptDraft.amount}
                    onChange={(event) => setReceiptDraft((current) => ({ ...current, amount: event.target.value }))}
                    placeholder="Enter bill total"
                    required
                  />
                </div>
                <div className="modal-field">
                  <label>Date</label>
                  <input
                    type="date"
                    max={getTodayString()}
                    value={receiptDraft.date}
                    onChange={(event) => setReceiptDraft((current) => ({ ...current, date: event.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="modal-field">
                <label>Description</label>
                <input
                  type="text"
                  value={receiptDraft.description}
                  onChange={(event) => setReceiptDraft((current) => ({ ...current, description: event.target.value }))}
                  placeholder="e.g., Biryani Wala - Biryani"
                  maxLength={120}
                />
              </div>

              <div className="modal-field">
                <label>Expense category / budget</label>
                <select
                  value={receiptDraft.category}
                  onChange={(event) => setReceiptDraft((current) => ({ ...current, category: event.target.value }))}
                  required
                >
                  <option value="">Choose a category with a monthly budget</option>
                  {expenseCategories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {displayCategoryName(category.name)}
                    </option>
                  ))}
                </select>
                <small>The matching category’s active monthly budget is checked before saving.</small>
              </div>

              <div className="modal-buttons">
                <button type="button" className="secondary-button" onClick={closeReceiptModal} disabled={receiptSaving || receiptReading}>Cancel</button>
                <button type="submit" className="primary-button" disabled={receiptSaving || receiptReading || !receiptFile}>
                  {receiptSaving ? <><Loader2 size={15} className="spin" /> Saving…</> : "Add Expense"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

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
            <div
              className={`budget-warning-icon ${
                budgetWarning.showInsufficientSavingsAlert
                  ? "savings-danger-icon"
                  : "savings-warning-icon"
              }`}
            >
              {budgetWarning.showInsufficientSavingsAlert ? (
                <AlertCircle size={32} />
              ) : (
                <AlertTriangle size={32} />
              )}
            </div>

            <div className="budget-warning-content">
              {budgetWarning.showInsufficientSavingsAlert ? (
                <>
                  <h2 id="budget-warning-title" style={{ color: "#dc2626" }}>
                    You don't have enough savings!
                  </h2>

                  <p>
                    Your available savings is not sufficient to cover the budget excess for{" "}
                    <strong>{budgetWarning.category}</strong>.
                  </p>

                  <div className="budget-warning-details">
                    <div>
                      <span>Monthly Budget</span>
                      <strong>{formatCurrency(budgetWarning.limit, currency)}</strong>
                    </div>

                    <div>
                      <span>Required Excess</span>
                      <strong style={{ color: "#dc2626" }}>
                        {formatCurrency(budgetWarning.excessAmount, currency)}
                      </strong>
                    </div>

                    <div>
                      <span>Your Available Savings</span>
                      <strong>
                        {formatCurrency(budgetWarning.availableSavings, currency)}
                      </strong>
                    </div>

                    <div className="budget-warning-excess">
                      <span>Savings Shortfall</span>
                      <strong>
                        {formatCurrency(
                          Math.max(
                            0,
                            budgetWarning.excessAmount - budgetWarning.availableSavings
                          ),
                          currency
                        )}
                      </strong>
                    </div>
                  </div>

                  <p className="budget-warning-hint" style={{ color: "#dc2626" }}>
                    Please reduce the expense amount or add funds to your savings before proceeding.
                  </p>

                  <div className="budget-warning-actions" style={{ marginTop: "16px" }}>
                    <button
                      type="button"
                      className="primary-button"
                      style={{ width: "100%", padding: "12px", borderRadius: "8px" }}
                      onClick={() => setBudgetWarning(null)}
                    >
                      Close / Adjust Expense
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h2 id="budget-warning-title">
                    Budget Exceeded: Deduct from Savings?
                  </h2>

                  <p>
                    This expense exceeds your <strong>{budgetWarning.category}</strong> monthly budget.
                    The excess amount of <strong>{formatCurrency(budgetWarning.excessAmount, currency)}</strong> will be deducted from your savings.
                  </p>

                  <div className="budget-warning-details">
                    <div>
                      <span>Monthly budget</span>
                      <strong>{formatCurrency(budgetWarning.limit, currency)}</strong>
                    </div>

                    <div>
                      <span>Already spent</span>
                      <strong>{formatCurrency(budgetWarning.spent, currency)}</strong>
                    </div>

                    <div>
                      <span>New expense</span>
                      <strong>{formatCurrency(budgetWarning.attempted, currency)}</strong>
                    </div>

                    <div className="budget-warning-total">
                      <span>Total after expense</span>
                      <strong>{formatCurrency(budgetWarning.projected, currency)}</strong>
                    </div>

                    <div className="budget-warning-excess">
                      <span>Excess to deduct from savings</span>
                      <strong>{formatCurrency(budgetWarning.excessAmount, currency)}</strong>
                    </div>

                    <div>
                      <span>Available savings</span>
                      <strong style={{ color: "#16a34a" }}>
                        {formatCurrency(budgetWarning.availableSavings, currency)}
                      </strong>
                    </div>
                  </div>

                  <p className="budget-warning-hint">
                    Do you want to proceed and deduct{" "}
                    <strong>{formatCurrency(budgetWarning.excessAmount, currency)}</strong> from your savings?
                  </p>

                  <div
                    className="budget-warning-actions"
                    style={{ marginTop: "16px", display: "flex", gap: "10px", width: "100%" }}
                  >
                    <button
                      type="button"
                      className="secondary-button"
                      style={{
                        flex: 1,
                        padding: "11px 16px",
                        borderRadius: "8px",
                        border: "1px solid #d4d4d4",
                        background: "transparent",
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                      onClick={() => setBudgetWarning(null)}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      className="primary-button"
                      style={{
                        flex: 1.4,
                        padding: "11px 16px",
                        borderRadius: "8px",
                        cursor: "pointer",
                        background: "#0a0a0a",
                        color: "#C7F36B",
                        fontWeight: 700,
                      }}
                      onClick={handleConfirmSavingsDeduction}
                    >
                      Confirm & Deduct
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Transactions;