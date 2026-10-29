import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, NotebookPen, Pencil, Plus, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";

import API from "../../api/axios";
import "./Notes.css";

const TYPE_LABELS = {
  transaction: "Transaction",
  saving_tip: "Saving Tip",
  insight: "Insight",
};

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function referenceLabel(refType, item) {
  if (!item) return "Removed item";

  if (refType === "transaction") {
    const category = item.category?.name || "Uncategorized";
    const description = item.description?.trim();
    return `${formatDate(item.date)} · ${category}${
      description ? ` · ${description}` : ""
    } · ₹${Number(item.amount || 0).toLocaleString()}`;
  }

  if (refType === "saving_tip") {
    return item.title || "Saving tip";
  }

  if (refType === "insight") {
    return item.month
      ? `Insight for ${item.month}`
      : item.summaryText?.slice(0, 48) || "Monthly insight";
  }

  return "Attached item";
}

function Notes() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [references, setReferences] = useState({
    transaction: [],
    saving_tip: [],
    insight: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState("transaction");
  const [referenceId, setReferenceId] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/login");
      return;
    }

    let ignore = false;

    const loadNotes = async () => {
      try {
        setLoading(true);
        const [notesRes, txRes, tipsRes, insightsRes] = await Promise.allSettled([
          API.get("/notes"),
          API.get("/transactions"),
          API.get("/saving-tips"),
          API.get("/insights"),
        ]);
        if (ignore) return;

        if (notesRes.status === "fulfilled") {
          setNotes(notesRes.value.data?.notes || []);
        } else {
          toast.error(
            notesRes.reason?.response?.data?.message || "Failed to load notes"
          );
        }

        setReferences({
          transaction:
            txRes.status === "fulfilled"
              ? txRes.value.data?.transactions || []
              : [],
          saving_tip:
            tipsRes.status === "fulfilled" ? tipsRes.value.data?.tips || [] : [],
          insight:
            insightsRes.status === "fulfilled"
              ? insightsRes.value.data?.insights || []
              : [],
        });
      } catch (error) {
        if (!ignore) {
          toast.error(error.response?.data?.message || "Failed to load notes");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadNotes();

    return () => {
      ignore = true;
    };
  }, [navigate]);

  const refreshNotes = async () => {
    const res = await API.get("/notes");
    setNotes(res.data?.notes || []);
  };

  const resetForm = () => {
    setEditingId(null);
    setReferenceId("");
    setContent("");
    setType("transaction");
  };

  const saveNote = async (event) => {
    event.preventDefault();
    if (saving) return;

    const cleanContent = content.trim();
    if (!editingId && !referenceId) {
      return toast.error("Please choose what this note is attached to");
    }
    if (!cleanContent) return toast.error("Please write something in the note");

    try {
      setSaving(true);
      if (editingId) {
        await API.put(`/notes/${editingId}`, { content: cleanContent });
        toast.success("Note updated");
      } else {
        await API.post("/notes", {
          referenceType: type,
          referenceId,
          content: cleanContent,
        });
        toast.success("Note added");
      }
      resetForm();
      await refreshNotes();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  const editNote = (note) => {
    setEditingId(note._id);
    setType(note.referenceType);
    setReferenceId(note.referenceId);
    setContent(note.content || "");
  };

  const deleteNote = async (id) => {
    if (!window.confirm("Delete this note?")) return;
    try {
      await API.delete(`/notes/${id}`);
      setNotes((curr) => curr.filter((note) => note._id !== id));
      if (editingId === id) resetForm();
      toast.success("Note deleted");
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete failed");
    }
  };

  const findReference = (refType, id) =>
    (references[refType] || []).find((item) => item._id === id);

  const displayed =
    filter === "all"
      ? notes
      : notes.filter((note) => note.referenceType === filter);

  const referenceOptions = references[type] || [];

  return (
    <div className="notes-page">
      <div className="page-heading">
        <div>
          <h1>Notes</h1>
          <p>Keep private notes on your transactions, tips and insights.</p>
        </div>
      </div>

      <div className="notes-layout">
        <section className="notes-form-panel">
          <h2>{editingId ? "Edit Note" : "Add Note"}</h2>

          <form onSubmit={saveNote} noValidate>
            {!editingId && (
              <>
                <div className="notes-field">
                  <label htmlFor="note-type">Attach to</label>
                  <select
                    id="note-type"
                    value={type}
                    onChange={(e) => {
                      setType(e.target.value);
                      setReferenceId("");
                    }}
                  >
                    <option value="transaction">Transaction</option>
                    <option value="saving_tip">Saving Tip</option>
                    <option value="insight">Insight</option>
                  </select>
                </div>

                <div className="notes-field">
                  <label htmlFor="note-reference">Item</label>
                  <select
                    id="note-reference"
                    value={referenceId}
                    onChange={(e) => setReferenceId(e.target.value)}
                  >
                    <option value="">Choose an item</option>
                    {referenceOptions.map((item) => (
                      <option key={item._id} value={item._id}>
                        {referenceLabel(type, item)}
                      </option>
                    ))}
                  </select>
                  {referenceOptions.length === 0 && (
                    <small>
                      Nothing to attach yet — add a transaction, tip or insight
                      first.
                    </small>
                  )}
                </div>
              </>
            )}

            {editingId && (
              <div className="notes-field">
                <label>Attached to</label>
                <p className="notes-editing-reference">
                  {TYPE_LABELS[type] || type}:{" "}
                  {referenceLabel(type, findReference(type, referenceId))}
                </p>
              </div>
            )}

            <div className="notes-field">
              <label htmlFor="note-content">Note</label>
              <textarea
                id="note-content"
                rows="4"
                placeholder="e.g. Ask parents about next month's allowance"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>

            <div className="notes-form-actions">
              <button className="notes-save" type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 size={15} className="spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Plus size={15} />
                    {editingId ? "Update Note" : "Add Note"}
                  </>
                )}
              </button>
              {editingId && (
                <button
                  type="button"
                  className="notes-cancel"
                  onClick={resetForm}
                >
                  <X size={15} />
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="notes-list-panel">
          <div className="notes-filters">
            {[
              ["all", "All"],
              ["transaction", "Transactions"],
              ["saving_tip", "Saving Tips"],
              ["insight", "Insights"],
            ].map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={filter === value ? "active" : ""}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="notes-empty">Loading notes...</p>
          ) : displayed.length === 0 ? (
            <div className="notes-empty">
              <NotebookPen size={36} />
              <h3>No notes yet</h3>
              <p>
                Add your first note and attach it to a transaction, saving tip
                or insight.
              </p>
            </div>
          ) : (
            <div className="notes-list">
              {displayed.map((note) => {
                const item = findReference(note.referenceType, note.referenceId);
                return (
                  <article className="note-card" key={note._id}>
                    <div className="note-card-head">
                      <span className={`note-type note-type-${note.referenceType}`}>
                        {TYPE_LABELS[note.referenceType] || note.referenceType}
                      </span>
                      <span className="note-date">
                        {formatDate(note.createdAt)}
                      </span>
                    </div>

                    <p className="note-content">{note.content}</p>

                    <div className="note-card-foot">
                      <span className="note-reference">
                        {referenceLabel(note.referenceType, item)}
                      </span>

                      <div className="note-actions">
                        <button
                          type="button"
                          onClick={() => editNote(note)}
                          aria-label="Edit note"
                          title="Edit note"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className="note-delete"
                          onClick={() => deleteNote(note._id)}
                          aria-label="Delete note"
                          title="Delete note"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default Notes;
