import React, { useState, useEffect } from "react";
import { notificationAPI } from "../../services/api"; // we'll need to export adminAPI properly, or just use api directly
import { adminAPI } from "../../services/api";
import { useNotifications } from "../../context/LiveContext";

const TYPES = [
  "INFO", "SUCCESS", "WARNING", "ERROR", "ANNOUNCEMENT",
  "EXAM_DATES", "ASSIGNMENT_DEADLINES", "PLACEMENT_DRIVE_ALERTS",
  "HOLIDAY_ANNOUNCEMENTS", "CLASSROOM_CHANGES", "ATTENDANCE_WARNINGS"
];

const AdminTemplatesTab = ({ onApplyTemplate }) => {
  const { addToast } = useNotifications();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  
  const emptyForm = {
    name: "", titleTemplate: "", messageTemplate: "", summaryTemplate: "",
    type: "INFO", priority: "MEDIUM", actionButtonText: "", actionButtonUrl: ""
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getTemplates();
      setTemplates(res.data.data || []);
    } catch (e) {
      console.error(e);
      addToast({ title: "Error", message: "Failed to load templates", type: "ERROR" });
    }
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingTemplate) {
        await adminAPI.updateTemplate(editingTemplate.id, form);
        addToast({ title: "Success", message: "Template updated", type: "SUCCESS" });
      } else {
        await adminAPI.createTemplate(form);
        addToast({ title: "Success", message: "Template created", type: "SUCCESS" });
      }
      setEditingTemplate(null);
      setForm(emptyForm);
      loadTemplates();
    } catch (e) {
      console.error(e);
      addToast({ title: "Error", message: "Failed to save template", type: "ERROR" });
    }
  };

  const handleEdit = (tmpl) => {
    setEditingTemplate(tmpl);
    setForm({
      name: tmpl.name,
      titleTemplate: tmpl.titleTemplate,
      messageTemplate: tmpl.messageTemplate,
      summaryTemplate: tmpl.summaryTemplate || "",
      type: tmpl.type || "INFO",
      priority: tmpl.priority || "MEDIUM",
      actionButtonText: tmpl.actionButtonText || "",
      actionButtonUrl: tmpl.actionButtonUrl || ""
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this template?")) return;
    try {
      await adminAPI.deleteTemplate(id);
      addToast({ title: "Success", message: "Template deleted", type: "SUCCESS" });
      loadTemplates();
    } catch (e) {
      console.error(e);
      addToast({ title: "Error", message: "Failed to delete template", type: "ERROR" });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* List of Templates */}
      <div className="lg:col-span-1 border-r border-gray-100 pr-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Saved Templates</h2>
          <button 
            onClick={() => { setEditingTemplate(null); setForm(emptyForm); }}
            className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg"
          >
            + New
          </button>
        </div>
        <div className="space-y-3">
          {loading ? <p className="text-sm text-gray-400">Loading...</p> : null}
          {!loading && templates.length === 0 && <p className="text-sm text-gray-400">No templates found.</p>}
          {templates.map(t => (
            <div key={t.id} className="p-4 rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-sm bg-white cursor-pointer transition-all">
              <div onClick={() => onApplyTemplate(t)}>
                <h3 className="text-sm font-bold text-gray-900">{t.name}</h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{t.titleTemplate}</p>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
                <button onClick={() => onApplyTemplate(t)} className="text-[10px] font-bold text-green-600 uppercase">Use</button>
                <div className="flex-1" />
                <button onClick={() => handleEdit(t)} className="text-[10px] font-bold text-indigo-600 uppercase">Edit</button>
                <button onClick={() => handleDelete(t.id)} className="text-[10px] font-bold text-red-600 uppercase">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Template Form */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <span className="w-2 h-6 bg-purple-600 rounded-full" />
            {editingTemplate ? "Edit Template" : "Create New Template"}
          </h2>

          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="text-xs font-bold text-gray-500 ml-1">Template Name (Unique)</label>
              <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none text-sm font-medium" placeholder="E.g., Exam Alert Template" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 ml-1">Type</label>
                <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none text-sm font-medium">
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 ml-1">Priority</label>
                <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none text-sm font-medium">
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="URGENT">URGENT</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 ml-1">Title Template</label>
              <input required value={form.titleTemplate} onChange={e => setForm({...form, titleTemplate: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none text-sm font-medium" placeholder="Alert: {{examName}} is near!" />
              <p className="text-[10px] text-gray-400 ml-1 mt-1">Use {"{{variable}}"} for dynamic data.</p>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 ml-1">Message Template</label>
              <textarea required value={form.messageTemplate} onChange={e => setForm({...form, messageTemplate: e.target.value})} rows={3} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none text-sm font-medium" placeholder="The exam {{examName}} is scheduled for {{date}}." />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 ml-1">Summary Template (Optional)</label>
              <input value={form.summaryTemplate} onChange={e => setForm({...form, summaryTemplate: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none text-sm font-medium" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 ml-1">Action Button Text</label>
                <input value={form.actionButtonText} onChange={e => setForm({...form, actionButtonText: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none text-sm font-medium" placeholder="E.g., View Details" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 ml-1">Action Button URL</label>
                <input value={form.actionButtonUrl} onChange={e => setForm({...form, actionButtonUrl: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none text-sm font-medium" placeholder="/courses/{{courseId}}" />
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button type="submit" className="px-6 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 transition">
                {editingTemplate ? "Save Changes" : "Create Template"}
              </button>
              {editingTemplate && (
                <button type="button" onClick={() => { setEditingTemplate(null); setForm(emptyForm); }} className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminTemplatesTab;
