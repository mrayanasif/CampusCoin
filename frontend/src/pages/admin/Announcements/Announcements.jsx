import { useEffect, useState } from "react";
import { Megaphone, Pencil, Plus, Power, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";

import API from "../../../api/axios";
import "./Announcements.css";

const ANNOUNCEMENT_TYPES = [
  ["general", "General"],
  ["info", "Info"],
  ["warning", "Warning"],
  ["update", "Update"],
];

function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    message: "",
    type: "general",
  });

  useEffect(() => {
    let ignore = false;

    const fetchAnnouncements = async () => {
      try {
        setLoading(true);
        const res = await API.get("/admin/announcements");
        if (!ignore) setAnnouncements(res.data.announcements || []);
      } catch (error) {
        if (!ignore) {
          toast.error(error.response?.data?.message || "Failed to load");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchAnnouncements();

    return () => {
      ignore = true;
    };
  }, []);

  const refreshAnnouncements = async () => {
    const res = await API.get("/admin/announcements");
    setAnnouncements(res.data.announcements || []);
  };

  const addAnnouncement = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    const title = form.get("title")?.trim();
    const message = form.get("message")?.trim();
    const type = form.get("type") || "general";

    if (!title) return toast.error("Please enter a title");
    if (!message) return toast.error("Please enter the message");

    try {
      setSubmitting(true);
      const res = await API.post("/admin/announcements", {
        title,
        message,
        type,
      });

      toast.success(res.data.message || "Announcement sent!");
      formElement.reset();
      await refreshAnnouncements();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (announcement) => {
    setEditingId(announcement._id);
    setEditForm({
      title: announcement.title || "",
      message: announcement.message || "",
      type: announcement.type || "general",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ title: "", message: "", type: "general" });
  };

  const saveEdit = async (id) => {
    if (!editForm.title.trim()) return toast.error("Title cannot be empty");
    if (!editForm.message.trim()) {
      return toast.error("Message cannot be empty");
    }

    try {
      const res = await API.put(`/admin/announcements/${id}`, {
        title: editForm.title.trim(),
        message: editForm.message.trim(),
        type: editForm.type,
      });
      const updated = res.data.announcement;
      setAnnouncements((curr) =>
        curr.map((a) => (a._id === id ? { ...a, ...updated } : a))
      );
      toast.success("Announcement updated");
      cancelEdit();
    } catch (error) {
      toast.error(error.response?.data?.message || "Update failed");
    }
  };

  const removeAnnouncement = async (id) => {
    if (!window.confirm("Delete this announcement?")) return;
    try {
      await API.delete(`/admin/announcements/${id}`);
      toast.success("Deleted");
      setAnnouncements((curr) => curr.filter((a) => a._id !== id));
      if (editingId === id) cancelEdit();
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete failed");
    }
  };

  const toggleActive = async (id) => {
    try {
      const res = await API.put(`/admin/announcements/${id}/toggle`);
      const updated = res.data.announcement;
      setAnnouncements((curr) =>
        curr.map((a) => (a._id === id ? { ...a, isActive: updated.isActive } : a))
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
          <h1>Announcements</h1>
          <p>Send system-wide messages to all students.</p>
        </div>
      </div>

      <form className="ann-form" onSubmit={addAnnouncement} noValidate>
        <div className="ann-form-row">
          <select name="type" defaultValue="general">
            {ANNOUNCEMENT_TYPES.map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>

          <input
            name="title"
            type="text"
            placeholder="Announcement title"
          />
        </div>

        <textarea
          name="message"
          placeholder="Write your announcement..."
          rows="3"
        />

        <button type="submit" disabled={submitting}>
          <Plus size={15} />
          {submitting ? "Sending..." : "Send to All Students"}
        </button>
      </form>

      {loading ? (
        <p className="ann-empty">Loading...</p>
      ) : announcements.length === 0 ? (
        <p className="ann-empty">No announcements yet.</p>
      ) : (
        <div className="ann-list">
          {announcements.map((ann) =>
            editingId === ann._id ? (
              <article className="ann-item" key={ann._id}>
                <div className="ann-edit-form">
                  <div className="ann-form-row">
                    <select
                      value={editForm.type}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, type: e.target.value }))
                      }
                      aria-label="Announcement type"
                    >
                      {ANNOUNCEMENT_TYPES.map(([value, label]) => (
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
                      aria-label="Announcement title"
                    />
                  </div>

                  <textarea
                    value={editForm.message}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, message: e.target.value }))
                    }
                    rows="3"
                    aria-label="Announcement message"
                  />

                  <div className="ann-edit-actions">
                    <button
                      type="button"
                      className="ann-btn-toggle"
                      onClick={() => saveEdit(ann._id)}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="ann-btn-delete"
                      onClick={cancelEdit}
                    >
                      <X size={15} />
                      Cancel
                    </button>
                  </div>
                </div>
              </article>
            ) : (
              <article className="ann-item" key={ann._id}>
                <div className="ann-item-header">
                  <div className="ann-item-title">
                    <Megaphone size={18} />
                    <h3>{ann.title}</h3>
                  </div>

                  <div className="ann-item-actions">
                    <span className={`ann-type ann-type-${ann.type}`}>
                      {ann.type}
                    </span>

                    <button
                      type="button"
                      className="ann-btn-toggle"
                      onClick={() => startEdit(ann)}
                      title="Edit announcement"
                      aria-label="Edit announcement"
                    >
                      <Pencil size={15} />
                    </button>

                    <button
                      type="button"
                      className="ann-btn-toggle"
                      onClick={() => toggleActive(ann._id)}
                      title="Toggle active"
                    >
                      <Power size={15} />
                    </button>

                    <button
                      type="button"
                      className="ann-btn-delete"
                      onClick={() => removeAnnouncement(ann._id)}
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <p>{ann.message}</p>

                <div className="ann-item-meta">
                  <span>
                    {new Date(ann.createdAt).toLocaleString()}
                  </span>
                  <span className={ann.isActive ? "ann-active" : "ann-inactive"}>
                    {ann.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </article>
            )
          )}
        </div>
      )}
    </div>
  );
}

export default Announcements;
