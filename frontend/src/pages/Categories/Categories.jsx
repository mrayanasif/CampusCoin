import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BriefcaseBusiness,
  CircleDollarSign,
  GraduationCap,
  House,
  Pencil,
  Plus,
  ShoppingBag,
  Trash2,
  Utensils,
} from "lucide-react";
import toast from "react-hot-toast";

import API from "../../api/axios";
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
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/login");
      return;
    }
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await API.get("/categories");
      setCategories(res.data.categories || []);
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
      if (editingId) {
        await API.put(`/categories/${editingId}`, { name: cleanName, type });
        toast.success("Category updated");
      } else {
        await API.post("/categories", { name: cleanName, type });
        toast.success("Category added");
      }

      setName("");
      setType("expense");
      setEditingId(null);
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
    setName(category.name);
    setType(category.type);
    setEditingId(category._id);
  };

  const deleteCategory = async (id, isDefault) => {
    if (isDefault) {
      toast.error("Default categories cannot be deleted");
      return;
    }
    if (!window.confirm("Delete this category?")) return;

    try {
      await API.delete(`/categories/${id}`);
      toast.success("Category deleted");
      if (editingId === id) {
        setName("");
        setType("expense");
        setEditingId(null);
      }
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete failed");
    }
  };

  const incomeCats = categories.filter((c) => c.type === "income");
  const expenseCats = categories.filter((c) => c.type === "expense");

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
          <h2>{editingId ? "Edit Category" : "Add Category"}</h2>

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
              {editingId ? "Update Category" : "Add Category"}
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
                <h2>Expense Categories</h2>
                {expenseCats.length === 0 ? (
                  <p style={{ color: "#888" }}>No expense categories</p>
                ) : (
                  expenseCats.map((category) => {
                    const Icon = icons[category.icon] || ShoppingBag;
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
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default Categories;