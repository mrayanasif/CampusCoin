import { useEffect, useState } from "react";
import {
  Save,
  Plus,
  Trash2,
  Pencil,
  X,
  Settings as SettingsIcon,
  Moon,
} from "lucide-react";
import toast from "react-hot-toast";

import API from "../../../api/axios";
import "./Settings.css";

function Settings() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editKey, setEditKey] = useState("");
  const [editValue, setEditValue] = useState("");

  const [adminDarkMode, setAdminDarkMode] = useState(false);

  useEffect(() => {
    const prefs = JSON.parse(
      localStorage.getItem("admin_preferences") || "{}"
    );
    if (prefs.darkMode) setAdminDarkMode(prefs.darkMode);

    fetchSettings();
  }, []);

  useEffect(() => {
    document.body.classList.toggle("dark-mode", adminDarkMode);
    localStorage.setItem(
      "admin_preferences",
      JSON.stringify({ darkMode: adminDarkMode })
    );
  }, [adminDarkMode]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await API.get("/admin/settings");
      setSettings(res.data.settings || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const addSetting = async (e) => {
    e.preventDefault();
    if (!newKey.trim()) return toast.error("Please enter a key");

    try {
      await API.post("/admin/settings", {
        key: newKey.trim(),
        value: newValue.trim(),
      });
      toast.success("Setting saved");
      setNewKey("");
      setNewValue("");
      fetchSettings();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save");
    }
  };

  const startEdit = (setting) => {
    setEditingId(setting._id);
    setEditKey(setting.key);
    setEditValue(setting.value ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditKey("");
    setEditValue("");
  };

  const saveEdit = async (oldKey) => {
    if (!editKey.trim()) return toast.error("Key cannot be empty");

    try {
      if (editKey.trim() !== oldKey) {
        await API.delete(`/admin/settings/${oldKey}`);
      }
      await API.post("/admin/settings", {
        key: editKey.trim(),
        value: editValue,
      });

      toast.success("Updated");
      cancelEdit();
      fetchSettings();
    } catch (error) {
      toast.error(error.response?.data?.message || "Update failed");
    }
  };

  const deleteSetting = async (key) => {
    if (!window.confirm(`Delete setting "${key}"?`)) return;
    try {
      await API.delete(`/admin/settings/${key}`);
      toast.success("Deleted");
      setSettings((curr) => curr.filter((s) => s.key !== key));
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>System Settings</h1>
          <p>Configure global values for Campus Coin.</p>
        </div>
      </div>

      <div className="admin-appearance-card">
        <div className="admin-appearance-row">
          <div className="admin-appearance-icon">
            <Moon size={18} />
          </div>

          <div className="admin-appearance-text">
            <strong>Admin Dark Mode</strong>
            <span>Applies to admin panel only (not student panel)</span>
          </div>

          <label className="admin-switch">
            <input
              type="checkbox"
              checked={adminDarkMode}
              onChange={(e) => setAdminDarkMode(e.target.checked)}
            />
            <span />
          </label>
        </div>
      </div>

      <form className="settings-form" onSubmit={addSetting}>
        <input
          type="text"
          placeholder="Key (e.g., maxBudgetAlert)"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
        />
        <input
          type="text"
          placeholder="Value (e.g., 80)"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
        />
        <button type="submit">
          <Plus size={15} />
          Add Setting
        </button>
      </form>

      {loading ? (
        <p className="settings-empty">Loading...</p>
      ) : settings.length === 0 ? (
        <p className="settings-empty">
          No settings yet. Add your first one above.
        </p>
      ) : (
        <div className="settings-list">
          {settings.map((s) => {
            const isEditing = editingId === s._id;

            return (
              <div className="settings-item" key={s._id}>
                <div className="settings-item-icon">
                  <SettingsIcon size={18} />
                </div>

                {isEditing ? (
                  <>
                    <div className="settings-item-content">
                      <label>Key</label>
                      <input
                        type="text"
                        value={editKey}
                        onChange={(e) => setEditKey(e.target.value)}
                      />
                    </div>

                    <div className="settings-item-content">
                      <label>Value</label>
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="settings-item-content">
                      <label>{s.key}</label>
                      <p className="settings-value">{s.value ?? "—"}</p>
                    </div>
                  </>
                )}

                <div className="settings-item-actions">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        className="settings-save-btn"
                        onClick={() => saveEdit(s.key)}
                      >
                        <Save size={15} />
                        Save
                      </button>
                      <button
                        type="button"
                        className="settings-cancel-btn"
                        onClick={cancelEdit}
                      >
                        <X size={15} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="settings-edit-btn"
                        onClick={() => startEdit(s)}
                      >
                        <Pencil size={15} />
                        Edit
                      </button>
                      <button
                        type="button"
                        className="settings-del-btn"
                        onClick={() => deleteSetting(s.key)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Settings;