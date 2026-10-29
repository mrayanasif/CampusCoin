import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  Lightbulb,
  TrendingUp,
  Sparkles,
  Loader2,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";

import API from "../../api/axios";
import {
  Skeleton,
  SkeletonText,
} from "../../components/Skeleton/Skeleton";
import "./Insights.css";

function Insights() {
  const navigate = useNavigate();
  const [insights, setInsights] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/login");
      return;
    }

    let ignore = false;

    const loadInsights = async () => {
      try {
        setLoading(true);
        const [insightsRes, bookmarksRes] = await Promise.allSettled([
          API.get("/insights"),
          API.get("/bookmarks"),
        ]);
        if (ignore) return;

        if (insightsRes.status === "fulfilled") {
          setInsights(insightsRes.value.data?.insights || []);
        } else {
          toast.error(
            insightsRes.reason?.response?.data?.message ||
              "Failed to load insights"
          );
        }

        if (bookmarksRes.status === "fulfilled") {
          setBookmarks(bookmarksRes.value.data?.bookmarks || []);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadInsights();

    return () => {
      ignore = true;
    };
  }, [navigate]);

  const generateInsight = async () => {
    try {
      setGenerating(true);
      const res = await API.post("/insights/generate");

      toast.success("Insight generated!");

      const newInsight = res.data.insight;
      setInsights((curr) => {
        const filtered = curr.filter((i) => i.month !== newInsight.month);
        return [newInsight, ...filtered];
      });
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to generate insight. Add transactions first."
      );
    } finally {
      setGenerating(false);
    }
  };

  const deleteInsight = async (id) => {
    if (!window.confirm("Delete this insight?")) return;
    try {
      await API.delete(`/insights/${id}`);
      setInsights((curr) => curr.filter((i) => i._id !== id));
      toast.success("Deleted");
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete failed");
    }
  };

  const getBookmark = (insightId) =>
    bookmarks.find((b) => b.type === "insight" && b.referenceId === insightId);

  const isBookmarked = (insightId) => Boolean(getBookmark(insightId));

  const savedCount = insights.filter((insight) => isBookmarked(insight._id)).length;
  const displayedInsights =
    filter === "saved"
      ? insights.filter((insight) => isBookmarked(insight._id))
      : insights;

  const toggleSaved = async (insight) => {
    const existing = getBookmark(insight._id);

    try {
      if (existing) {
        await API.delete(`/bookmarks/${existing._id}`);
        setBookmarks((curr) => curr.filter((b) => b._id !== existing._id));
        toast.success("Removed from saved");
      } else {
        const res = await API.post("/bookmarks", {
          type: "insight",
          referenceId: insight._id,
          title: `Insight ${insight.month || ""}`.trim(),
        });
        setBookmarks((curr) => [...curr, res.data.bookmark]);
        toast.success("Insight saved");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Bookmark failed");
    }
  };

  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>Spending Insights</h1>
          <p>AI-generated summaries of your spending patterns.</p>
        </div>

        <button
          type="button"
          className="insights-generate-btn"
          onClick={generateInsight}
          disabled={generating}
        >
          {generating ? (
            <>
              <Loader2 size={16} className="spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Generate Insight
            </>
          )}
        </button>
      </div>

      <div className="insight-banner">
        <TrendingUp size={19} />
        {insights.length > 0
          ? `${insights.length} insight${insights.length > 1 ? "s" : ""} generated. Click "Generate Insight" for the latest summary.`
          : "Click Generate Insight to analyze your monthly spending."}
      </div>

      {insights.length > 0 && (
        <div className="insight-filters">
          <button
            type="button"
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            All insights ({insights.length})
          </button>
          <button
            type="button"
            className={filter === "saved" ? "active" : ""}
            onClick={() => setFilter("saved")}
          >
            Saved ({savedCount})
          </button>
        </div>
      )}

      {loading ? (
        <div className="insights-list" aria-busy="true">
          {Array.from({ length: 3 }).map((_, index) => (
            <article className="insight-card" key={`insight-skeleton-${index}`}>
              <Skeleton height={12} width={120} />
              <Skeleton
                height={20}
                width="55%"
                style={{ marginTop: 14 }}
              />
              <div style={{ marginTop: 16 }}>
                <SkeletonText lines={3} />
              </div>
              <Skeleton height={46} style={{ marginTop: 16 }} />
            </article>
          ))}
        </div>
      ) : insights.length === 0 ? (
        <div className="insights-empty">
          <Sparkles size={40} className="insights-empty-icon" />
          <h3 className="insights-empty-title">No insights yet</h3>
          <p className="insights-empty-text">
            Add some transactions and click "Generate Insight" to see a monthly
            summary.
          </p>
          <button
            type="button"
            className="insights-generate-btn"
            onClick={generateInsight}
            disabled={generating}
          >
            {generating ? (
              <>
                <Loader2 size={16} className="spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Generate Now
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="insights-list">
          {displayedInsights.length === 0 ? (
            <div className="insights-empty">
              <Bookmark size={36} className="insights-empty-icon" />
              <h3 className="insights-empty-title">No saved insights</h3>
              <p className="insights-empty-text">
                Click the bookmark icon on an insight to keep it here for later.
              </p>
            </div>
          ) : (
            displayedInsights.map((insight) => (
            <article className="insight-card" key={insight._id}>
              <div className="insight-date">
                <CalendarDays size={17} />
                {insight.month}
              </div>

              <div className="insight-heading">
                <h2>
                  {insight.summaryText?.split(".")[0] || "Monthly Summary"}
                </h2>

                <div className="insight-actions">
                  <button
                    type="button"
                    className="insight-save-btn"
                    onClick={() => toggleSaved(insight)}
                    aria-label="Save insight"
                    title={isBookmarked(insight._id) ? "Unsave" : "Save"}
                  >
                    {isBookmarked(insight._id) ? (
                      <BookmarkCheck size={19} />
                    ) : (
                      <Bookmark size={19} />
                    )}
                  </button>

                  <button
                    type="button"
                    className="insight-delete-btn"
                    onClick={() => deleteInsight(insight._id)}
                    aria-label="Delete insight"
                    title="Delete"
                  >
                    <Trash2 size={19} />
                  </button>
                </div>
              </div>

              <p>{insight.summaryText}</p>

              {insight.flaggedCategories?.length > 0 && (
                <div className="insight-flagged">
                  {insight.flaggedCategories.map((f, i) => (
                    <div key={i} className="insight-flagged-item">
                      ⚠️ {f.message}
                    </div>
                  ))}
                </div>
              )}

              {insight.tipText && (
                <div className="insight-advice">
                  <Lightbulb size={17} />
                  <div>
                    <strong>Suggested action</strong>
                    <span>{insight.tipText}</span>
                  </div>
                </div>
              )}
            </article>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default Insights;
