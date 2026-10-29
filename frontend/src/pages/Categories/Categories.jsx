import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BriefcaseBusiness,
  CircleDollarSign,
  GraduationCap,
  GripVertical,
  House,
  Pencil,
  Plus,
  ShoppingBag,
  Trash2,
  Utensils,
} from "lucide-react";
import toast from "react-hot-toast";

import API from "../../api/axios";
import {
  displayCategoryName,
  getExpenseCategoryOrderKey,
  saveExpenseCategoryOrder,
  sortExpenseCategories,
} from "../../utils/categoryPresentation";
import "./Categories.css";

const icons = {
  money: CircleDollarSign,
  job: BriefcaseBusiness,
  school: GraduationCap,
  food: Utensils,
  house: House,
  shopping: ShoppingBag,
};

function Categories() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [type, setType] = useState("expense");
  const [name, setName] = useState("");
  const [editingCategory, setEditingCategory] = useState(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("expense");
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expenseOrder, setExpenseOrder] = useState([]);
  const [draggedCategoryId, setDraggedCategoryId] = useState(null);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/login");
      return;
    }
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!editingCategory && !categoryToDelete) return undefined;
    const handleEscape = (event) => {
      if (event.key === "Escape" && !savingEdit && !deleting) {
        setEditingCategory(null);
        setCategoryToDelete(null);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [editingCategory, categoryToDelete, savingEdit, deleting]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await API.get("/categories");
      const loadedCategories = res.data.categories || [];
      const validExpenseIds = loadedCategories
        .filter((category) => category.type === "expense")
        .map((category) => category._id);
      let storedOrder = [];
      try {
        storedOrder = JSON.parse(localStorage.getItem(getExpenseCategoryOrderKey()) || "[]");
      } catch {
        storedOrder = [];
      }
      const nextOrder = [
        ...storedOrder.filter((id) => validExpenseIds.includes(id)),
        ...validExpenseIds.filter((id) => !storedOrder.includes(id)),
      ];
      setCategories(loadedCategories);
      setExpenseOrder(nextOrder);
      saveExpenseCategoryOrder(nextOrder);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const saveCategory = async (event) => {
    event.preventDefault();
    const cleanName = name.trim();

    if (!cleanName) return toast.error("Please enter a category name");
    if (!type) return toast.error("Please choose a category type");

    try {
      await API.post("/categories", { name: cleanName, type });
      toast.success("Category added");

      setName("");
      setType("expense");
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.message || "Save failed");
    }
  };

  const editCategory = (category) => {
    if (category.isDefault) {
      toast.error("Default categories cannot be edited");
      return;
    }
    setEditingCategory(category);
    setEditName(category.name);
    setEditType(category.type);
  };

  const saveCategoryEdit = async (event) => {
    event.preventDefault();
    const cleanName = editName.trim();
    if (!cleanName) return toast.error("Please enter a category name");
    if (!editType) return toast.error("Please choose a category type");

    try {
      setSavingEdit(true);
      await API.put(`/categories/${editingCategory._id}`, {
        name: cleanName,
        type: editType,
      });
      toast.success("Category updated successfully");
      setEditingCategory(null);
      setEditName("");
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.message || "Update failed");
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteCategory = async (id, isDefault) => {
    if (isDefault) {
      toast.error("Default categories cannot be deleted");
      return;
    }
    setCategoryToDelete({ id, name: categories.find((category) => category._id === id)?.name || "this category" });
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete || deleting) return;
    try {
      setDeleting(true);
      await API.delete(`/categories/${categoryToDelete.id}`);
      toast.success("Category deleted successfully");
      if (editingCategory?._id === categoryToDelete.id) setEditingCategory(null);
      setCategoryToDelete(null);
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const incomeCats = categories.filter((c) => c.type === "income");
  const expenseCats = sortExpenseCategories(
    categories.filter((c) => c.type === "expense"),
    expenseOrder
  );

  const reorderExpenseCategory = (sourceId, targetId) => {
    if (!sourceId || sourceId === targetId) return;
    const nextOrder = expenseCats.map((category) => category._id);
    const sourceIndex = nextOrder.indexOf(sourceId);
    const targetIndex = nextOrder.indexOf(targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    nextOrder.splice(sourceIndex, 1);
    nextOrder.splice(targetIndex, 0, sourceId);
    setExpenseOrder(nextOrder);
    saveExpenseCategoryOrder(nextOrder);
  };

  const handleCategoryDragStart = (event, categoryId) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", categoryId);
    setDraggedCategoryId(categoryId);
  };

  const handleCategoryDrop = (event, targetId) => {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData("text/plain") || draggedCategoryId;
    reorderExpenseCategory(sourceId, targetId);
    setDraggedCategoryId(null);
  };

  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>Categories</h1>
          <p>Manage your personal income and expense categories.</p>
        </div>
      </div>

      <div className="category-layout">
        <section className="category-form-panel">
          <h2>Add Category</h2>

          <form onSubmit={saveCategory} noValidate>
            <div className="category-field">
              <label>Category name</label>
              <input
                type="text"
                value={name}
                placeholder="e.g. Gym"
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="category-field">
              <label>Category type</label>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>

            <button className="category-save" type="submit">
              <Plus size={16} />
              Add Category
            </button>
          </form>
        </section>

        <section className="category-list-panel">
          {loading ? (
            <p style={{ padding: "20px", color: "#888" }}>Loading...</p>
          ) : (
            <>
              <div className="category-group">
                <h2>Income Categories</h2>
                {incomeCats.length === 0 ? (
                  <p style={{ color: "#888" }}>No income categories</p>
                ) : (
                  incomeCats.map((category) => {
                    const Icon = icons[category.icon] || CircleDollarSign;
                    return (
                      <div className="category-row" key={category._id}>
                        <div className="category-name">
                          <span className="category-icon">
                            <Icon size={18} />
                          </span>
                          <span>
                            {category.name}
                            {category.isDefault && (
                              <small style={{ color: "#888", marginLeft: 6 }}>
                                (default)
                              </small>
                            )}
                          </span>
                        </div>
                        {!category.isDefault && (
                          <div className="category-actions">
                            <button
                              type="button"
                              onClick={() => editCategory(category)}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              className="category-delete"
                              onClick={() => deleteCategory(category._id, category.isDefault)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="category-group">
                <div className="category-group-heading">
                  <h2>Expense Categories</h2>
                  <p>Drag categories to arrange them. Newly added categories can be moved too.</p>
                </div>
                {expenseCats.length === 0 ? (
                  <p style={{ color: "#888" }}>No expense categories</p>
                ) : (
                  expenseCats.map((category) => {
                    const Icon = icons[category.icon] || ShoppingBag;
                    return (
                      <div
                        className={`category-row category-draggable-row ${draggedCategoryId === category._id ? "is-dragging" : ""}`}
                        key={category._id}
                        draggable
                        onDragStart={(event) => handleCategoryDragStart(event, category._id)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => handleCategoryDrop(event, category._id)}
                        onDragEnd={() => setDraggedCategoryId(null)}
                      >
                        <div className="category-name">
                          <GripVertical className="category-drag-handle" size={17} aria-hidden="true" />
                          <span className="category-icon">
                            <Icon size={18} />
                          </span>
                          <span>
                            {displayCategoryName(category.name)}
                            {category.isDefault && (
                              <small style={{ color: "#888", marginLeft: 6 }}>
                                (default)
                              </small>
                            )}
                          </span>
                        </div>
                        {!category.isDefault && (
                          <div className="category-actions">
                            <button
                              type="button"
                              onClick={() => editCategory(category)}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              className="category-delete"
                              onClick={() => deleteCategory(category._id, category.isDefault)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {editingCategory && (
        <div
          className="category-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !savingEdit) setEditingCategory(null);
          }}
        >
          <section
            className="category-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-category-title"
          >
            <div className="category-modal-header">
              <div>
                <h2 id="edit-category-title">Edit Category</h2>
                <p>Update the category name or type.</p>
              </div>
              <button
                type="button"
                className="category-modal-close"
                onClick={() => setEditingCategory(null)}
                disabled={savingEdit}
                aria-label="Close edit category dialog"
              >
                ×
              </button>
            </div>

            <form onSubmit={saveCategoryEdit} noValidate>
              <div className="category-field">
                <label htmlFor="edit-category-name">Category name</label>
                <input
                  id="edit-category-name"
                  type="text"
                  value={editName}
                  autoFocus
                  onChange={(event) => setEditName(event.target.value)}
                />
              </div>
              <div className="category-field">
                <label htmlFor="edit-category-type">Category type</label>
                <select
                  id="edit-category-type"
                  value={editType}
                  onChange={(event) => setEditType(event.target.value)}
                >
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>
              <div className="category-modal-actions">
                <button
                  type="button"
                  className="category-modal-cancel"
                  onClick={() => setEditingCategory(null)}
                  disabled={savingEdit}
                >
                  Cancel
                </button>
                <button className="category-save" type="submit" disabled={savingEdit}>
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {categoryToDelete && (
        <div
          className="category-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleting) setCategoryToDelete(null);
          }}
        >
          <section
            className="category-modal category-delete-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-category-title"
            aria-describedby="delete-category-description"
          >
            <div className="category-modal-header">
              <div>
                <h2 id="delete-category-title">Delete Category?</h2>
                <p id="delete-category-description">
                  Are you sure you want to delete <strong>{displayCategoryName(categoryToDelete.name)}</strong>? This cannot be undone.
                </p>
              </div>
              <button
                type="button"
                className="category-modal-close"
                onClick={() => setCategoryToDelete(null)}
                disabled={deleting}
                aria-label="Close delete confirmation"
              >
                ×
              </button>
            </div>
            <div className="category-modal-actions">
              <button
                type="button"
                className="category-modal-cancel"
                onClick={() => setCategoryToDelete(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="category-modal-delete"
                onClick={confirmDeleteCategory}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete Category"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default Categories;
