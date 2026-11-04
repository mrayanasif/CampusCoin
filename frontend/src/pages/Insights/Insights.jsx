import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  Download,
  Leaf,
  TrendingUp,
  Sparkles,
  Loader2,
  Trash2,
  ArrowRight,
} from "lucide-react";
import toast from "react-hot-toast";
import jsPDF from "jspdf";

import API from "../../api/axios";
import AdminConfirmModal from "../../components/AdminConfirmModal/AdminConfirmModal";
import { formatCurrency, toPKR, useCurrency } from "../../context/CurrencyContext";
import {
  Skeleton,
  SkeletonText,
} from "../../components/Skeleton/Skeleton";
import "./Insights.css";

function Insights() {
  const navigate = useNavigate();
  const { currency } = useCurrency();
  const [insights, setInsights] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [insightToDelete, setInsightToDelete] = useState(null);
  const [deletingInsight, setDeletingInsight] = useState(false);
  const [filter, setFilter] = useState("all");

  const formatInsightText = (text, sourceCurrency = "PKR") => {
    const source = sourceCurrency === "USD" ? "USD" : "PKR";
    return String(text || "")
      .replace(/\b(\d+(?:\.\d+)?)\s*%/g, (match, percentage) =>
        `${Math.min(Number(percentage), 100)}%`
      )
      .replace(
      /(?:₨|Rs\.?|PKR|USD|\$)\s*([\d,]+(?:\.\d+)?)/gi,
      (match, amount) =>
        formatCurrency(toPKR(Number(amount.replace(/,/g, "")), source), currency)
      );
  };

  const insightAmount = (amount, sourceCurrency = "PKR") =>
    formatCurrency(toPKR(amount, sourceCurrency === "USD" ? "USD" : "PKR"), currency);

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
      window.dispatchEvent(new Event("campuscoin:insight-generated"));
      localStorage.setItem("campuscoin:insight_generated", `${newInsight.month}:${Date.now()}`);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
        "Failed to generate insight. Add transactions first."
      );
    } finally {
      setGenerating(false);
    }
  };

  const downloadInsightPdf = (insight) => {
    try {
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 18;
      const lineHeight = 6;
      let y = 20;

      pdf.setFillColor(20, 83, 45);
      pdf.roundedRect(margin, y, pageWidth - margin * 2, 25, 4, 4, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(17);
      pdf.text("Campus Coin Spending Insight", margin + 7, y + 11);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(String(insight.month || "Monthly report"), margin + 7, y + 19);
      y += 37;

      const ensureSpace = (height = lineHeight) => {
        if (y + height > pageHeight - margin) {
          pdf.addPage();
          y = margin;
        }
      };

      const addSection = (heading, body) => {
        if (!body) return;
        ensureSpace(15);
        pdf.setTextColor(22, 101, 52);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(12);
        pdf.text(heading, margin, y);
        y += 7;

        pdf.setTextColor(45, 55, 50);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10.5);
        const lines = pdf.splitTextToSize(String(body), pageWidth - margin * 2);
        lines.forEach((line) => {
          ensureSpace(lineHeight);
          pdf.text(line, margin, y);
          y += lineHeight;
        });
        y += 5;
      };

      const title = formatInsightText(insight.summaryText, insight.currency)?.split(".")[0] || "Monthly Summary";
      addSection("Overview", title);
      addSection("Spending Summary", formatInsightText(insight.summaryText, insight.currency));

      if (insight.flaggedCategories?.length) {
        ensureSpace(15);
        pdf.setTextColor(22, 101, 52);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(12);
        pdf.text("Categories to review", margin, y);
        y += 7;
        pdf.setTextColor(45, 55, 50);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10.5);
        insight.flaggedCategories.forEach((item) => {
          const lines = pdf.splitTextToSize(`- ${formatInsightText(item.message, insight.currency)}`, pageWidth - margin * 2);
          lines.forEach((line) => {
            ensureSpace(lineHeight);
            pdf.text(line, margin, y);
            y += lineHeight;
          });
          y += 2;
        });
        y += 3;
      }

      addSection("Suggested Action", formatInsightText(insight.tipText, insight.currency));

      const pageCount = pdf.internal.getNumberOfPages();
      for (let page = 1; page <= pageCount; page += 1) {
        pdf.setPage(page);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(110, 120, 114);
        pdf.text("Campus Coin | AI-generated student spending insight", margin, pageHeight - 9);
        pdf.text(`${page} / ${pageCount}`, pageWidth - margin, pageHeight - 9, { align: "right" });
      }

      const safeMonth = String(insight.month || "monthly").replace(/[^a-z0-9-]+/gi, "-");
      pdf.save(`campus-coin-insight-${safeMonth}.pdf`);
      toast.success("Insight PDF downloaded");
    } catch (error) {
      console.error("Insight PDF export failed:", error);
      toast.error("Could not download this insight PDF");
    }
  };

  const deleteInsight = async (id) => {
    try {
      setDeletingInsight(true);
      await API.delete(`/insights/${id}`);
      setInsights((curr) => curr.filter((i) => i._id !== id));
      setInsightToDelete(null);
      toast.success("Deleted");
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete failed");
    } finally {
      setDeletingInsight(false);
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
                    {formatInsightText(insight.summaryText, insight.currency)?.split(".")[0] || "Monthly Summary"}
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
                      className="insight-download-btn"
                      onClick={() => downloadInsightPdf(insight)}
                      aria-label="Download insight as PDF"
                      title="Download as PDF"
                    >
                      <Download size={19} />
                    </button>

                    <button
                      type="button"
                      className="insight-delete-btn"
                      onClick={() => setInsightToDelete(insight)}
                      aria-label="Delete insight"
                      title="Delete"
                    >
                      <Trash2 size={19} />
                    </button>
                  </div>
                </div>

                <p>{formatInsightText(insight.summaryText, insight.currency)}</p>

                {insight.flaggedCategories?.length > 0 && (
                  <div className="insight-flagged">
                    {insight.flaggedCategories.map((f, i) => (
                      <div key={i} className="insight-flagged-item">
                        ⚠️ {formatInsightText(f.message, insight.currency)}
                      </div>
                    ))}
                  </div>
                )}

                {insight.tipText && (
                  <div className="insight-advice">
                    <Leaf size={17} style={{ color: "#16a34a", flexShrink: 0 }} />
                    <div>
                      <strong>AI Recommendation</strong>
                      <span>{formatInsightText(insight.tipText, insight.currency)}</span>
                    </div>
                  </div>
                )}

                {insight.syncedTips?.length > 0 && (
                  <div className="insight-synced-tips" style={{ marginTop: "16px", borderTop: "1px dashed #e2e8f0", paddingTop: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px", fontSize: "13px", fontWeight: "700", color: "#15803d" }}>
                      <Leaf size={15} style={{ color: "#16a34a" }} />
                      <span>How You Can Manage (Linked Saving Tips)</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {insight.syncedTips.map((tip, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "10px 14px",
                            borderRadius: "8px",
                            background: "#f0fdf4",
                            border: "1px solid #bbf7d0",
                            fontSize: "13px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontWeight: "700", color: "#16a34a" }}>{idx + 1}.</span>
                            <span style={{ color: "#1e293b", fontWeight: "500" }}>{formatInsightText(tip.title, insight.currency)}</span>
                            <span style={{ color: "#15803d", fontWeight: "700", background: "#dcfce7", padding: "2px 8px", borderRadius: "12px", fontSize: "11px" }}>
                              Save {insightAmount(tip.potentialSavings, insight.currency)}/month
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => navigate("/saving-tips")}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "#16a34a",
                              fontWeight: "600",
                              cursor: "pointer",
                              fontSize: "12px",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            View Tip <ArrowRight size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      )}
      {insightToDelete && (
        <AdminConfirmModal
          title="Delete this insight?"
          message={`The insight for ${insightToDelete.month || "this month"} will be permanently deleted.`}
          confirmLabel="Delete insight"
          loading={deletingInsight}
          onCancel={() => setInsightToDelete(null)}
          onConfirm={() => deleteInsight(insightToDelete._id)}
        />
      )}
    </div>
  );
}

export default Insights;
