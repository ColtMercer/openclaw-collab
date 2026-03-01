"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const RULE_FIELDS = [
  { value: "description", label: "Description" },
  { value: "full_description", label: "Full Description" },
  { value: "account", label: "Account" },
  { value: "institution", label: "Institution" },
];

const RULE_MATCH_TYPES = [
  { value: "exact", label: "Exact" },
  { value: "contains", label: "Contains" },
  { value: "regex", label: "Regex" },
];

type Rule = {
  _id: string;
  name: string;
  field: string;
  match_type: string;
  match_value: string;
  target_category: string;
  priority: number;
  enabled: boolean;
};

type RuleForm = Omit<Rule, "_id">;

const defaultForm: RuleForm = {
  name: "",
  field: "description",
  match_type: "contains",
  match_value: "",
  target_category: "",
  priority: 100,
  enabled: true,
};

export default function RulesPageWrapper() {
  return (
    <Suspense fallback={<div className="text-zinc-500 py-8">Loading rules...</div>}>
      <RulesPage />
    </Suspense>
  );
}

function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<RuleForm>(defaultForm);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [applyResults, setApplyResults] = useState<
    { rule_id: string; name: string; matched: number; modified: number; error?: string }[]
  >([]);

  const searchParams = useSearchParams();
  const router = useRouter();
  const prefillDone = useRef(false);

  const loadRules = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/finance/rules");
      if (!res.ok) throw new Error("Failed to load rules");
      const data = (await res.json()) as Rule[];
      setRules(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load rules");
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadRules();
  }, []);

  useEffect(() => {
    if (prefillDone.current) return;
    const shouldCreate = searchParams.get("create");
    if (shouldCreate !== "true") return;

    const description = (searchParams.get("description") || "").trim();
    const category = (searchParams.get("category") || "").trim();
    const name = description
      ? `${description} → ${category || "Category"}`
      : "";

    setEditing(null);
    setForm({
      ...defaultForm,
      name,
      match_value: description,
      target_category: category,
    });
    setFormOpen(true);
    prefillDone.current = true;

    const params = new URLSearchParams(searchParams.toString());
    params.delete("create");
    router.replace(`/rules?${params.toString()}`);
  }, [searchParams, router]);

  const resetForm = () => {
    setEditing(null);
    setForm(defaultForm);
    setFormOpen(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm);
    setFormOpen(true);
  };

  const openEdit = (rule: Rule) => {
    setEditing(rule);
    setForm({
      name: rule.name,
      field: rule.field,
      match_type: rule.match_type,
      match_value: rule.match_value,
      target_category: rule.target_category,
      priority: rule.priority,
      enabled: rule.enabled,
    });
    setFormOpen(true);
  };

  const submitForm = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/finance/rules", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { _id: editing._id, ...form } : form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || "Failed to save rule");
      }
      await loadRules();
      resetForm();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save rule");
    }
    setSaving(false);
  };

  const deleteRule = async (rule: Rule) => {
    if (!confirm(`Delete rule "${rule.name}"?`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/rules?id=${rule._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete rule");
      await loadRules();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete rule");
    }
  };

  const toggleEnabled = async (rule: Rule) => {
    setError(null);
    try {
      const res = await fetch("/api/finance/rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: rule._id, enabled: !rule.enabled }),
      });
      if (!res.ok) throw new Error("Failed to update rule");
      await loadRules();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update rule");
    }
  };

  const applyRules = async () => {
    setApplyLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/finance/rules/apply", { method: "POST" });
      if (!res.ok) throw new Error("Failed to apply rules");
      const data = await res.json();
      setApplyResults(data.results || []);
      await loadRules();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to apply rules");
    }
    setApplyLoading(false);
  };

  const resultsSummary = useMemo(() => {
    if (!applyResults.length) return null;
    const matched = applyResults.reduce((sum, r) => sum + (r.matched || 0), 0);
    return `${matched.toLocaleString()} matches across ${applyResults.length} rules`;
  }, [applyResults]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Category Rules</h1>
          <p className="text-zinc-500 text-sm">Automate transaction categorization with rule-based matches.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg text-sm font-medium"
            onClick={applyRules}
            disabled={applyLoading}
          >
            {applyLoading ? "Applying..." : "Apply Rules Now"}
          </button>
          <button
            className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg text-sm font-medium"
            onClick={openCreate}
          >
            Create Rule
          </button>
        </div>
      </div>

      {error && <div className="text-sm text-red-400">{error}</div>}

      <div className="bg-[#141420] border border-[#27272a] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-zinc-500 text-left bg-zinc-900/50">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Field</th>
              <th className="px-4 py-3 font-medium">Match</th>
              <th className="px-4 py-3 font-medium">Value</th>
              <th className="px-4 py-3 font-medium">Target</th>
              <th className="px-4 py-3 font-medium text-right">Priority</th>
              <th className="px-4 py-3 font-medium text-center">Enabled</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-zinc-500">Loading rules...</td>
              </tr>
            )}
            {!loading && rules.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-zinc-500">No rules yet. Create one to get started.</td>
              </tr>
            )}
            {!loading && rules.map((rule) => (
              <tr key={rule._id} className="border-b border-zinc-800/50">
                <td className="px-4 py-3 text-zinc-200 max-w-xs truncate">{rule.name}</td>
                <td className="px-4 py-3 text-zinc-400">{rule.field}</td>
                <td className="px-4 py-3 text-zinc-400">{rule.match_type}</td>
                <td className="px-4 py-3 text-zinc-400 max-w-xs truncate">{rule.match_value}</td>
                <td className="px-4 py-3">
                  <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full text-xs">{rule.target_category}</span>
                </td>
                <td className="px-4 py-3 text-right font-mono text-zinc-300">{rule.priority}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    className={`w-10 h-5 rounded-full border transition-colors ${
                      rule.enabled ? "bg-indigo-500/60 border-indigo-400" : "bg-zinc-800 border-zinc-700"
                    }`}
                    onClick={() => void toggleEnabled(rule)}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-zinc-100 transition-transform ${
                        rule.enabled ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      className="text-xs bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded"
                      onClick={() => openEdit(rule)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-xs text-red-300 hover:text-red-200"
                      onClick={() => void deleteRule(rule)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {applyResults.length > 0 && (
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-200">Apply results</p>
            {resultsSummary && <p className="text-xs text-zinc-400">{resultsSummary}</p>}
          </div>
          <div className="mt-3 space-y-2 text-xs">
            {applyResults.map((r) => (
              <div key={r.rule_id} className="flex items-center justify-between">
                <span className="text-zinc-300 truncate max-w-md">{r.name}</span>
                <span className="text-zinc-400">
                  {r.error ? r.error : `${r.matched} matched · ${r.modified} updated`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="bg-[#141420] border border-[#27272a] rounded-2xl p-6 w-full max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editing ? "Edit Rule" : "Create Rule"}</h2>
              <button className="text-zinc-400 hover:text-zinc-200" onClick={resetForm}>✕</button>
            </div>

            <form onSubmit={submitForm} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm w-full"
                    placeholder="Rev-up Auto → Auto Maintenance"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Target Category</label>
                  <input
                    value={form.target_category}
                    onChange={(e) => setForm({ ...form, target_category: e.target.value })}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm w-full"
                    placeholder="Auto Maintenance"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Field</label>
                  <select
                    value={form.field}
                    onChange={(e) => setForm({ ...form, field: e.target.value })}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm w-full"
                  >
                    {RULE_FIELDS.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Match Type</label>
                  <select
                    value={form.match_type}
                    onChange={(e) => setForm({ ...form, match_type: e.target.value })}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm w-full"
                  >
                    {RULE_MATCH_TYPES.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Priority</label>
                  <input
                    type="number"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm w-full"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-500 block mb-1">Match Value</label>
                <input
                  value={form.match_value}
                  onChange={(e) => setForm({ ...form, match_value: e.target.value })}
                  className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm w-full"
                  placeholder="Rev-up Auto"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-zinc-400">
                  <input
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                  />
                  Enabled
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg text-sm"
                    onClick={resetForm}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg text-sm font-medium"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : editing ? "Update Rule" : "Create Rule"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
