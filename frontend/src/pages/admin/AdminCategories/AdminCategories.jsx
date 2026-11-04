import { useEffect, useState } from "react";
import { Pencil, Plus, Power, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";

import API from "../../../api/axios";
import AdminConfirmModal from "../../../components/AdminConfirmModal/AdminConfirmModal";
import "./AdminCategories.css";

function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("expense");
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let ignore = false;

    const fetchCategories = async () => {
      try {
        setLoading(true);
        const res = await API.get("/admin/categories");
        if (!ignore) setCategories(res.data.categories || []);
      } catch (error) {
        if (!ignore) {
          toast.error(
            error.response?.data?.message || "Failed to load categories"
          );
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchCategories();

    return () => {
      ignore = true;
    };
  }, []);

  const addCategory = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = form.get("name")?.trim();
    const type = form.get("type");

    if (!name) return toast.error("Please enter a category name");
    if (!type) return toast.error("Please select a category type");

    try {
      setSubmitting(true);
      await API.post("/admin/categories", { name, type: type.toLowerCase() });
      toast.success("Category added");
      formElement.reset();
      const res = await API.get("/admin/categories");
      setCategories(res.data.categories || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (category) => {
    setEditingId(category._id);
    setEditName(category.name || "");
    setEditType(category.type || "expense");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditType("expense");
  };

  const saveEdit = async (id) => {
    const cleanName = editName.trim();
    if (!cleanName) return toast.error("Category name cannot be empty");

    try {
      const res = await API.put(`/admin/categories/${id}`, {
        name: cleanName,
        type: editType,
      });
      const updated = res.data.category;
      setCategories((curr) =>
        curr.map((c) => (c._id === id ? { ...c, ...updated } : c))
      );
      toast.success("Category updated");
      cancelEdit();
    } catch (error) {
      toast.error(error.response?.data?.message || "Update failed");
    }
  };

  const removeCategory = async () => {
    if (!categoryToDelete || deleting) return;
    try {
      setDeleting(true);
      await API.delete(`/admin/categories/${categoryToDelete._id}`);
      toast.success("Category removed");
      setCategories((curr) => curr.filter((c) => c._id !== categoryToDelete._id));
      if (editingId === categoryToDelete._id) cancelEdit();
      setCategoryToDelete(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const toggleActive = async (id) => {
    try {
      const res = await API.put(`/admin/categories/${id}/toggle`);
      const updated = res.data.category;
      setCategories((curr) =>
        curr.map((c) => (c._id === id ? { ...c, isActive: updated.isActive } : c))
      );
      toast.success(updated.isActive ? "Activated" : "Deactivated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Toggle failed");
    }
  };

  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>Default Categories</h1>
          <p>Manage categories available to all students.</p>
        </div>
      </div>

      <form className="admin-category-form" onSubmit={addCategory} noValidate>
        <input name="name" type="text" placeholder="Category name" />
        <select name="type" defaultValue="expense">
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <button type="submit" disabled={submitting}>
          <Plus size={15} />
          {submitting ? "Adding..." : "Add"}
        </button>
      </form>

      {loading ? (
        <p style={{ padding: "20px", color: "#888" }}>Loading...</p>
      ) : categories.length === 0 ? (
        <p style={{ padding: "20px", color: "#888" }}>No categories yet.</p>
      ) : (
        <div className="admin-category-list">
          {categories.map((category) => (
            <div key={category._id}>
              {editingId === category._id ? (
                <>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    aria-label="Category name"
                  />
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    aria-label="Category type"
                  >
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => saveEdit(category._id)}
                    title="Save changes"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    title="Cancel edit"
                    aria-label="Cancel edit"
                  >
                    <X size={15} />
                  </button>
                </>
              ) : (
                <>
                  <span>
                    {category.icon || "📦"} {category.name}
                  </span>
                  <small>{category.type}</small>
                  <small
                    style={{
                      color: category.isActive ? "#16a34a" : "#dc2626",
                      marginRight: 8,
                    }}
                  >
                    {category.isActive ? "Active" : "Inactive"}
                  </small>
                  <button
                    type="button"
                    onClick={() => startEdit(category)}
                    title="Edit category"
                    aria-label="Edit category"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(category._id)}
                    title="Toggle active"
                  >
                    <Power size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryToDelete(category)}
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {categoryToDelete && (
        <AdminConfirmModal
          title="Delete category?"
          message={`Are you sure you want to delete “${categoryToDelete.name}”? This action cannot be undone.`}
          confirmLabel="Delete category"
          loading={deleting}
          onCancel={() => setCategoryToDelete(null)}
          onConfirm={removeCategory}
        />
      )}
    </div>
  );
}

export default AdminCategories;
