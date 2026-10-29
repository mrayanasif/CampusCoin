import { useEffect, useState } from "react";
import { Pencil, Power, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";

import API from "../../../api/axios";
import "./Templates.css";

const TRIGGER_TYPES = [
  ["general", "General"],
  ["high_spending", "High Spending"],
  ["budget_near_limit", "Budget Near Limit"],
  ["budget_exceeded", "Budget Exceeded"],
  ["low_savings", "Low Savings"],
];

function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    message: "",
    triggerType: "general",
  });

  useEffect(() => {
    let ignore = false;

    const fetchTemplates = async () => {
      try {
        setLoading(true);
        const res = await API.get("/admin/tip-templates");
        if (!ignore) setTemplates(res.data.templates || []);
      } catch (error) {
        if (!ignore) {
          toast.error(
            error.response?.data?.message || "Failed to load templates"
          );
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchTemplates();

    return () => {
      ignore = true;
    };
  }, []);

  const refreshTemplates = async () => {
    const res = await API.get("/admin/tip-templates");
    setTemplates(res.data.templates || []);
  };

  const addTemplate = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    const title = form.get("title")?.trim();
    const message = form.get("text")?.trim();
    const triggerType = form.get("triggerType") || "general";

    if (!title) return toast.error("Please enter a title");
    if (!message) return toast.error("Please enter the template text");

    try {
      setSubmitting(true);
      await API.post("/admin/tip-templates", { title, message, triggerType });
      toast.success("Template added");
      formElement.reset();
      await refreshTemplates();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (template) => {
    setEditingId(template._id);
    setEditForm({
      title: template.title || "",
      message: template.message || "",
      triggerType: template.triggerType || "general",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ title: "", message: "", triggerType: "general" });
  };

  const saveEdit = async (id) => {
    if (!editForm.title.trim()) return toast.error("Title cannot be empty");
    if (!editForm.message.trim()) {
      return toast.error("Template text cannot be empty");
    }

    try {
      const res = await API.put(`/admin/tip-templates/${id}`, {
        title: editForm.title.trim(),
        message: editForm.message.trim(),
        triggerType: editForm.triggerType,
      });
      const updated = res.data.template;
      setTemplates((curr) =>
        curr.map((t) => (t._id === id ? { ...t, ...updated } : t))
      );
      toast.success("Template updated");
      cancelEdit();
    } catch (error) {
      toast.error(error.response?.data?.message || "Update failed");
    }
  };

  const removeTemplate = async (id) => {
    if (!window.confirm("Delete this template?")) return;
    try {
      await API.delete(`/admin/tip-templates/${id}`);
      toast.success("Template removed");
      setTemplates((curr) => curr.filter((t) => t._id !== id));
      if (editingId === id) cancelEdit();
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete failed");
    }
  };

  const toggleActive = async (id) => {
    try {
      const res = await API.put(`/admin/tip-templates/${id}/toggle`);
      const updated = res.data.template;
      setTemplates((curr) =>
        curr.map((t) => (t._id === id ? { ...t, isActive: updated.isActive } : t))
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
          <h1>Templates</h1>
          <p>Manage announcement and saving tip templates.</p>
        </div>
      </div>

      <form className="template-form" onSubmit={addTemplate} noValidate>
        <select name="triggerType" defaultValue="general">
          {TRIGGER_TYPES.map(([value, label]) => (
            <option value={value} key={value}>
              {label}
            </option>
          ))}
        </select>

        <input name="title" type="text" placeholder="Title" />

        <textarea name="text" placeholder="Template text" />

        <button type="submit" disabled={submitting}>
          {submitting ? "Adding..." : "Add Template"}
        </button>
      </form>

      {loading ? (
        <p style={{ padding: "20px", color: "#888" }}>Loading...</p>
      ) : templates.length === 0 ? (
        <p style={{ padding: "20px", color: "#888" }}>No templates yet.</p>
      ) : (
        <div className="template-list">
          {templates.map((template) =>
            editingId === template._id ? (
              <article key={template._id}>
                <div className="template-edit-form">
                  <select
                    value={editForm.triggerType}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        triggerType: e.target.value,
                      }))
                    }
                    aria-label="Template trigger type"
                  >
                    {TRIGGER_TYPES.map(([value, label]) => (
                      <option value={value} key={value}>
                        {label}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, title: e.target.value }))
                    }
                    aria-label="Template title"
                  />

                  <textarea
                    value={editForm.message}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, message: e.target.value }))
                    }
                    aria-label="Template text"
                  />

                  <div className="template-edit-actions">
                    <button type="button" onClick={() => saveEdit(template._id)}>
                      Save
                    </button>
                    <button type="button" onClick={cancelEdit}>
                      <X size={15} />
                      Cancel
                    </button>
                  </div>
                </div>
              </article>
            ) : (
              <article key={template._id}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>{template.triggerType || "general"}</span>
                  <div>
                    <button
                      type="button"
                      onClick={() => startEdit(template)}
                      title="Edit"
                      aria-label="Edit template"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleActive(template._id)}
                      title="Toggle"
                    >
                      <Power size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeTemplate(template._id)}
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <h2>{template.title}</h2>
                <p>{template.message}</p>
                <small
                  style={{ color: template.isActive ? "#16a34a" : "#dc2626" }}
                >
                  {template.isActive ? "Active" : "Inactive"}
                </small>
              </article>
            )
          )}
        </div>
      )}
    </div>
  );
}

export default Templates;
