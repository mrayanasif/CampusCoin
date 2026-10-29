import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bookmark, BookmarkCheck, Lightbulb, X, Pin, PinOff } from "lucide-react";
import toast from "react-hot-toast";

import API from "../../api/axios";
import "./SavingTips.css";

function SavingTips() {
  const navigate = useNavigate();
  const [tips, setTips] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/login");
      return;
    }
    fetchTips();
    fetchBookmarks();
  }, []);

  const fetchTips = async () => {
    try {
      setLoading(true);
      const res = await API.get("/saving-tips");
      setTips(res.data.tips || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load tips");
    } finally {
      setLoading(false);
    }
  };

  const fetchBookmarks = async () => {
    try {
      const res = await API.get("/bookmarks");
      setBookmarks(res.data.bookmarks || []);
    } catch (error) {}
  };

  const togglePin = async (id) => {
    try {
      const res = await API.put(`/saving-tips/${id}/pin`);
      const updated = res.data.tip;
      setTips((curr) =>
        curr.map((t) => (t._id === id ? { ...t, isPinned: updated.isPinned } : t))
      );
      toast.success(updated.isPinned ? "Tip pinned" : "Tip unpinned");
    } catch (error) {
      toast.error(error.response?.data?.message || "Action failed");
    }
  };

  const dismissTip = async (id) => {
    try {
      await API.put(`/saving-tips/${id}/dismiss`);
      setTips((curr) => curr.filter((t) => t._id !== id));
      toast.success("Tip dismissed");
    } catch (error) {
      toast.error(error.response?.data?.message || "Dismiss failed");
    }
  };

  const isBookmarked = (tipId) =>
    bookmarks.some((b) => b.referenceId === tipId && b.type === "saving_tip");

  const getBookmark = (tipId) =>
    bookmarks.find((b) => b.referenceId === tipId && b.type === "saving_tip");

  const toggleBookmark = async (tip) => {
    const existing = getBookmark(tip._id);

    try {
      if (existing) {
        await API.delete(`/bookmarks/${existing._id}`);
        setBookmarks((curr) => curr.filter((b) => b._id !== existing._id));
        toast.success("Bookmark removed");
      } else {
        const res = await API.post("/bookmarks", {
          type: "saving_tip",
          referenceId: tip._id,
          title: tip.title,
        });
        setBookmarks((curr) => [...curr, res.data.bookmark]);
        toast.success("Tip bookmarked");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Bookmark failed");
    }
  };

  let displayed = [...tips].sort(
    (a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)
  );

  if (filter === "bookmarked") {
    displayed = displayed.filter((t) => isBookmarked(t._id));
  }

  const bookmarkedCount = tips.filter((t) => isBookmarked(t._id)).length;

  return (
    <div className="saving-tips-page">
      <div className="page-heading">
        <div>
          <h1>Saving Tips</h1>
          <p>Suggestions based on your spending habits.</p>
        </div>
      </div>

      <div className="tips-intro">
        <Lightbulb size={20} />
        <span>Tips with the highest potential savings are shown first.</span>
      </div>

      <div className="saving-tips-filters">
        <button
          type="button"
          className={filter === "all" ? "active" : ""}
          onClick={() => setFilter("all")}
        >
          All Tips ({tips.length})
        </button>
        <button
          type="button"
          className={filter === "bookmarked" ? "active" : ""}
          onClick={() => setFilter("bookmarked")}
        >
          🔖 Bookmarked ({bookmarkedCount})
        </button>
      </div>

      {loading ? (
        <p className="saving-tips-loading">Loading tips...</p>
      ) : (
        <div className="tips-list">
          {displayed.map((tip) => {
            const bookmarked = isBookmarked(tip._id);

            return (
              <article className="tip-card" key={tip._id}>
                <div className="tip-card-icon">
                  <Lightbulb size={21} />
                </div>

                <div className="tip-card-content">
                  <div className="tip-card-title">
                    <h2>{tip.title}</h2>
                    <span>
                      {tip.potentialSavings > 1000
                        ? "High impact"
                        : tip.potentialSavings > 500
                          ? "Medium impact"
                          : "Low impact"}
                    </span>
                  </div>
                  <p>{tip.message}</p>
                </div>

                <div className="tip-card-actions">
                  <button
                    type="button"
                    className={bookmarked ? "tip-btn-active" : ""}
                    onClick={() => toggleBookmark(tip)}
                    aria-label={bookmarked ? "Remove bookmark" : "Bookmark tip"}
                    title={bookmarked ? "Remove bookmark" : "Bookmark for later"}
                  >
                    {bookmarked ? (
                      <BookmarkCheck size={18} />
                    ) : (
                      <Bookmark size={18} />
                    )}
                  </button>

                  <button
                    type="button"
                    className={tip.isPinned ? "tip-btn-pin" : ""}
                    onClick={() => togglePin(tip._id)}
                    aria-label={tip.isPinned ? "Unpin tip" : "Pin tip"}
                    title={tip.isPinned ? "Unpin from top" : "Pin to top"}
                  >
                    {tip.isPinned ? <PinOff size={18} /> : <Pin size={18} />}
                  </button>

                  <button
                    type="button"
                    onClick={() => dismissTip(tip._id)}
                    aria-label="Dismiss tip"
                    title="Dismiss this tip"
                  >
                    <X size={18} />
                  </button>
                </div>
              </article>
            );
          })}

          {displayed.length === 0 && (
            <div className="empty-tips">
              {filter === "bookmarked"
                ? "No bookmarked tips yet. Click the bookmark icon to save a tip for later."
                : "No saving tips right now. Add more transactions to get personalized tips."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SavingTips;