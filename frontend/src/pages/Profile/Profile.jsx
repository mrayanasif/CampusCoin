import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import API from "../../api/axios";
import "./Profile.css";

function Profile() {
  const navigate = useNavigate();
  const readPreferences = () => {
    try {
      return JSON.parse(localStorage.getItem("student_preferences") || "{}");
    } catch {
      return {};
    }
  };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [darkMode, setDarkMode] = useState(() => Boolean(readPreferences().darkMode));
  const [fontSize, setFontSize] = useState(() => readPreferences().fontSize || "normal");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    academicYear: "",
    monthlyAllowance: 0,
    savingsGoal: 0,
  });

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/login");
      return;
    }

    fetchProfile();
  }, []);

  useEffect(() => {
    document.body.classList.toggle("dark-mode", darkMode);
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
    document.documentElement.dataset.fontSize = fontSize;
    document.documentElement.style.fontSize =
      fontSize === "small" ? "14px" : fontSize === "large" ? "18px" : "16px";

    localStorage.setItem(
      "student_preferences",
      JSON.stringify({ darkMode, fontSize })
    );
  }, [darkMode, fontSize]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await API.get("/users/profile");
      const user = res.data.user;

      const yearMap = {
        "1st Year": "1",
        "2nd Year": "2",
        "3rd Year": "3",
        "4th Year": "4",
      };

      setFormData({
        name: user.name || "",
        email: user.email || "",
        academicYear: yearMap[user.academicYear] || user.academicYear || "2",
        monthlyAllowance: user.monthlyAllowance || 0,
        savingsGoal: user.savingsGoal || 0,
      });

      // Accessibility preferences are persisted on the user record; hydrate
      // them (and sync localStorage) so they follow the student across devices.
      if (user.preferences) {
        setDarkMode(Boolean(user.preferences.darkMode));
        setFontSize(user.preferences.fontSize || "normal");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    if (saving) return;

    const form = new FormData(event.currentTarget);
    const name = form.get("name")?.trim();
    const academicYear = form.get("academicYear");
    const allowanceValue = form.get("allowance");
    const savingsValue = form.get("savingsGoal");

    if (!name) return toast.error("Please enter your full name");
    if (!academicYear) return toast.error("Please select your academic year");
    if (allowanceValue === "" || Number(allowanceValue) < 0)
      return toast.error("Invalid allowance");
    if (savingsValue === "" || Number(savingsValue) < 0)
      return toast.error("Invalid savings goal");

    const academicYearMap = {
      "1": "1st Year",
      "2": "2nd Year",
      "3": "3rd Year",
      "4": "4th Year",
    };

    try {
      setSaving(true);

      const profileResponse = await API.put("/users/profile", {
        name,
        academicYear: academicYearMap[academicYear] || academicYear,
        monthlyAllowance: Number(allowanceValue) || 0,
        savingsGoal: Number(savingsValue) || 0,
      });

      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      const updatedUser = profileResponse.data?.user || {};
      localStorage.setItem(
        "user",
        JSON.stringify({
          ...storedUser,
          ...updatedUser,
          name,
          academicYear: academicYearMap[academicYear],
          monthlyAllowance: Number(allowanceValue) || 0,
          savingsGoal: Number(savingsValue) || 0,
        })
      );

      window.dispatchEvent(new Event("campuscoin:user-updated"));
      await API.put("/users/preferences", { darkMode, fontSize });

      toast.success("Profile updated!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: "40px" }}>Loading profile...</div>;
  }

  return (
    <div className="profile-page">
      <div className="page-heading">
        <div>
          <h1>Profile & Settings</h1>
          <p>Manage your personal details and preferences.</p>
        </div>
      </div>

      <form className="profile-layout" onSubmit={saveProfile} noValidate>
        <section className="profile-card">
          <h2>Personal Information</h2>

          <div className="profile-grid">
            <div className="profile-field">
              <label>Full name</label>
              <input name="name" type="text" defaultValue={formData.name} />
            </div>

            <div className="profile-field">
              <label>Email</label>
              <input
                name="email"
                type="email"
                defaultValue={formData.email}
                disabled
                className="profile-email-input"
                style={{ cursor: "not-allowed" }}
              />
            </div>

            <div className="profile-field">
              <label>Academic year</label>
              <select name="academicYear" defaultValue={formData.academicYear}>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>

            <div className="profile-field">
              <label>Monthly allowance</label>
              <input
                name="allowance"
                type="number"
                defaultValue={formData.monthlyAllowance}
              />
            </div>

            <div className="profile-field">
              <label>Monthly savings goal</label>
              <input
                name="savingsGoal"
                type="number"
                defaultValue={formData.savingsGoal}
              />
            </div>
          </div>

          <button className="profile-save" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </section>

        <section className="profile-card">
          <h2>Accessibility</h2>

          <div className="preference-row">
            <div>
              <strong>Dark mode</strong>
              <span>Use a darker interface (student panel only).</span>
            </div>

            <label className="switch">
              <input
                type="checkbox"
                checked={darkMode}
                onChange={(e) => setDarkMode(e.target.checked)}
              />
              <span />
            </label>
          </div>

          <div className="preference-row font-row">
            <div>
              <strong>Font size</strong>
              <span>Adjust text size across the application.</span>
            </div>

            <div className="font-options">
              <button
                type="button"
                className={fontSize === "small" ? "active" : ""}
                onClick={() => setFontSize("small")}
              >
                A-
              </button>
              <button
                type="button"
                className={fontSize === "normal" ? "active" : ""}
                onClick={() => setFontSize("normal")}
              >
                A
              </button>
              <button
                type="button"
                className={fontSize === "large" ? "active" : ""}
                onClick={() => setFontSize("large")}
              >
                A+
              </button>
            </div>
          </div>
        </section>
      </form>
    </div>
  );
}

export default Profile;
