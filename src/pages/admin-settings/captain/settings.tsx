import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Save, Shield, BookOpenText, Zap, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { CAPTAIN_API_BASE, captainFetch } from '@/lib/captain-api';

type Assistant = {
  id: string;
  name: string;
  config?: {
    handoff_message?: string;
    resolution_message?: string;
    temperature?: number;
  };
  guardrails?: string[];
  response_guidelines?: string[];
};

const ControlCard = ({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  description,
  onClick,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  onClick?: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-start justify-between gap-4 rounded-2xl border border-gray-200 bg-white px-5 py-4 text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700/60"
  >
    <div className="flex items-start gap-3">
      <div className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full ${iconBg} ${iconColor}`}>
        <Icon className="size-4" />
      </div>
      <div>
        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</div>
        <div className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{description}</div>
      </div>
    </div>
    <ChevronRight className="mt-1 size-4 shrink-0 text-gray-400 dark:text-muted-foreground" />
  </button>
);

const CaptainSettings = () => {
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [handoffMessage, setHandoffMessage] = useState('');
  const [resolutionMessage, setResolutionMessage] = useState('');
  const [temperature, setTemperature] = useState(0.7);

  // Global engine settings
  const [isEnabled, setIsEnabled] = useState(true);
  const [model, setModel] = useState('gpt-5.4');

  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [isUpdatingEngine, setIsUpdatingEngine] = useState(false);

  const activeAssistant = assistants.find((a) => a.id === activeId) ?? null;

  useEffect(() => {
    Promise.all([
      captainFetch(`${CAPTAIN_API_BASE}/assistants`).then((r) => r.json()),
      captainFetch(`${CAPTAIN_API_BASE}/settings`).then((r) => r.json()),
    ])
      .then(([aJson, sJson]) => {
        const list: Assistant[] = aJson.data || [];
        setAssistants(list);
        if (list.length > 0) {
          const first = list[0];
          setActiveId(first.id);
          setHandoffMessage(first.config?.handoff_message || '');
          setResolutionMessage(first.config?.resolution_message || '');
          setTemperature(first.config?.temperature ?? 0.7);
        } else {
          setTemperature(sJson.default_temperature ?? 0.3);
        }
        const sData = sJson?.data !== undefined ? sJson.data : sJson;
        if (typeof sData?.is_enabled === 'boolean') {
          setIsEnabled(sData.is_enabled);
        } else if (typeof sJson?.is_enabled === 'boolean') {
          setIsEnabled(sJson.is_enabled);
        }
        if (sData?.default_model_name) {
          setModel(sData.default_model_name);
        } else if (sJson?.default_model_name) {
          setModel(sJson.default_model_name);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const handleToggleEnabled = async (checked: boolean) => {
    setIsEnabled(checked);
    setIsUpdatingEngine(true);
    setError('');
    try {
      const res = await captainFetch(`${CAPTAIN_API_BASE}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: checked }),
      });
      if (!res.ok) {
        throw new Error('Failed to update engine status');
      }
      const data = await res.json();
      const updated = data?.data !== undefined ? data.data : data;
      if (typeof updated?.is_enabled === 'boolean') {
        setIsEnabled(updated.is_enabled);
      }
    } catch (err: any) {
      setIsEnabled(!checked);
      setError(err?.message || 'Failed to update engine status');
    } finally {
      setIsUpdatingEngine(false);
    }
  };

  const handleModelChange = async (newModel: string) => {
    setModel(newModel);
    setError('');
    try {
      const res = await captainFetch(`${CAPTAIN_API_BASE}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ default_model_name: newModel }),
      });
      if (!res.ok) {
        throw new Error('Failed to update default model');
      }
      const data = await res.json();
      const updated = data?.data !== undefined ? data.data : data;
      if (updated?.default_model_name) {
        setModel(updated.default_model_name);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to update default model');
    }
  };

  const handleAssistantChange = (id: string) => {
    setActiveId(id);
    const a = assistants.find((x) => x.id === id);
    if (!a) return;
    setHandoffMessage(a.config?.handoff_message || '');
    setResolutionMessage(a.config?.resolution_message || '');
    setTemperature(a.config?.temperature ?? 0.7);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    setSaved(false);
    try {
      const requests: Promise<Response>[] = [];

      // Save global engine settings
      requests.push(
        captainFetch(`${CAPTAIN_API_BASE}/settings`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            is_enabled: isEnabled,
            default_model_name: model,
            default_temperature: temperature,
          }),
        }),
      );

      // Save per-assistant fields
      if (activeId) {
        requests.push(
          captainFetch(`${CAPTAIN_API_BASE}/assistants/${activeId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              config: {
                ...(activeAssistant?.config || {}),
                handoff_message: handoffMessage,
                resolution_message: resolutionMessage,
                temperature,
              },
            }),
          }),
        );
      }

      const results = await Promise.all(requests);
      if (results.some((r) => !r.ok)) throw new Error('Failed to save some settings');

      // Update local assistant list
      if (activeId) {
        setAssistants((prev) =>
          prev.map((a) =>
            a.id === activeId
              ? { ...a, config: { ...a.config, handoff_message: handoffMessage, resolution_message: resolutionMessage, temperature } }
              : a,
          ),
        );
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e?.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="flex h-full w-full flex-col gap-6 overflow-y-auto p-6">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">Captain Settings</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Configure the AI engine and assistant behaviour.</div>
        </div>
        {assistants.length > 1 && (
          <select
            value={activeId}
            onChange={(e) => handleAssistantChange(e.target.value)}
            className="h-9 rounded-lg border border-gray-200 bg-white pl-3 text-sm text-gray-900 outline-none focus:border-primary dark:focus:border-primary dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          >
            {assistants.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Engine strip — Enable + Model */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-1 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Zap className="size-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Captain AI</div>
            <div className="text-xs text-gray-500 dark:text-muted-foreground">Enable or disable AI responses across all inboxes</div>
          </div>
        </div>
        <Switch checked={isEnabled} onCheckedChange={handleToggleEnabled} disabled={isUpdatingEngine} />
        <div className="h-6 w-px bg-gray-200 dark:bg-gray-600" />
        <div className="flex items-center gap-2">
          <Bot className="size-4 text-gray-400 dark:text-muted-foreground" />
          <select
            value={model}
            onChange={(e) => handleModelChange(e.target.value)}
            disabled={isUpdatingEngine}
            className="h-8 rounded-lg border border-gray-200 bg-gray-50 pl-2.5 pr-6 text-sm text-gray-900 outline-none focus:border-primary dark:focus:border-primary dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 disabled:opacity-60"
          >
            <option value="gpt-5.4">GPT-5.4</option>
            <option value="gpt-5.4-mini">GPT-5.4 Mini</option>
            <option value="gpt-4.1">GPT-4.1</option>
            <option value="gpt-4.1-mini">GPT-4.1 Mini</option>
          </select>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-10">

        {/* Left — System settings */}
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">System settings</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Customize what the assistant says when ending a conversation or transferring to a human.
            </p>
          </div>

          {/* Handoff Message */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Handoff Message</label>
            <textarea
              value={handoffMessage}
              onChange={(e) => setHandoffMessage(e.target.value)}
              maxLength={200}
              rows={4}
              placeholder="Enter handoff message"
              className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-primary dark:focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
            <div className="text-right text-xs text-gray-400 dark:text-muted-foreground">{handoffMessage.length} / 200</div>
          </div>

          {/* Resolution Message */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Resolution Message</label>
            <textarea
              value={resolutionMessage}
              onChange={(e) => setResolutionMessage(e.target.value)}
              maxLength={200}
              rows={4}
              placeholder="Enter resolution message"
              className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-primary dark:focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
            <div className="text-right text-xs text-gray-400 dark:text-muted-foreground">{resolutionMessage.length} / 200</div>
          </div>

          {/* Temperature */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Response Temperature</label>
              <span className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-sm font-semibold text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200">
                {temperature.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-primary"
            />
            <p className="text-xs italic text-gray-400 dark:text-gray-500">
              Adjust how creative or restrictive the assistant's responses should be. Lower values are more precise, higher values more creative.
            </p>
            <div className="flex justify-between text-xs text-gray-400 dark:text-muted-foreground">
              <span>0.0 — Precise</span>
              <span>0.5 — Balanced</span>
              <span>1.0 — Creative</span>
            </div>
          </div>

          {/* Errors / success */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">{error}</div>
          )}
          {saved && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400">
              Settings saved successfully.
            </div>
          )}

          <div>
            <Button type="button" variant="primary" disabled={isSaving} onClick={handleSave}>
              <Save className="size-4" />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>

        {/* Right — Control items */}
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">The Fun Stuff</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Add more control to the assistant. Query guardrail → scenarios → output. Nudges the assistant to stay on track and reply in the right style.
            </p>
          </div>

          <ControlCard
            icon={Shield}
            iconBg="bg-violet-100 dark:bg-violet-950"
            iconColor="text-violet-600 dark:text-violet-400"
            title="Guardrails"
            description="Keeps things on track — only the kinds of questions you want your assistant to answer, nothing off-limits or off-topic."
            onClick={() => navigate('/admin-settings/captain/settings/guardrails')}
          />

          <ControlCard
            icon={BookOpenText}
            iconBg="bg-blue-100 dark:bg-blue-950"
            iconColor="text-blue-600 dark:text-blue-400"
            title="Response guidelines"
            description="The vibe and structure of your assistant's replies — clear and friendly? Short and snappy? Detailed and formal?"
            onClick={() => navigate('/admin-settings/captain/settings/response-guidelines')}
          />
        </div>
      </div>
    </div>
  );
};

export default CaptainSettings;
