import React, { useEffect, useState } from 'react';
import { Megaphone, Save } from 'lucide-react';
import { apiRequest } from '../api';
import { useToast } from '../components/Toast';

export default function MarqueeSettings({ marquee, onMarqueeUpdated }) {
  const toast = useToast();
  const [enabled, setEnabled] = useState(true);
  const [text, setText] = useState('');
  const [behavior, setBehavior] = useState('scroll');
  const [speed, setSpeed] = useState('normal');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (marquee) {
      setEnabled(Boolean(marquee.enabled));
      setText(marquee.text || '');
      setBehavior(marquee.behavior || 'scroll');
      setSpeed(marquee.speed || 'normal');
    }
  }, [marquee]);

  const durationSec = speed === 'slow' ? 28 : speed === 'fast' ? 10 : 18;
  const animName =
    behavior === 'alternate' ? 'marquee-alternate' : 'marquee-scroll';

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiRequest('/api/settings/marquee', {
        method: 'PUT',
        body: JSON.stringify({ enabled, text, behavior, speed }),
      });
      onMarqueeUpdated?.(res.marquee);
      toast.success('Marquee banner saved & updated!');
    } catch (err) {
      toast.error(err.message || 'Failed to save marquee settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Marquee Behaviour (Moving One-Line Text)
            </h3>
            <p className="text-xs text-slate-500">
              Configure the scrolling one-line announcement ticker shown at the
              top of the portal
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm font-semibold text-slate-800">
              Show Moving Marquee Text on Portal
            </span>
          </label>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              One-Line Marquee Text:
            </label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter moving announcement text..."
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Marquee Behaviour:
              </label>
              <select
                value={behavior}
                onChange={(e) => setBehavior(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="scroll">Scroll (Continuous Left)</option>
                <option value="alternate">Alternate (Bounce Left &amp; Right)</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Moving Speed:
              </label>
              <select
                value={speed}
                onChange={(e) => setSpeed(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="slow">Slow</option>
                <option value="normal">Normal</option>
                <option value="fast">Fast</option>
              </select>
            </div>
          </div>

          {/* Live Preview */}
          <div>
            <span className="mb-1.5 block text-xs font-semibold text-slate-500">
              Live Preview:
            </span>
            <div className="marquee-track overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 via-rose-50 to-amber-50 px-4 py-2">
              {enabled && text.trim() ? (
                <div
                  className="marquee-content inline-block whitespace-nowrap text-xs font-semibold text-rose-800"
                  style={{
                    animation: `${animName} ${durationSec}s linear infinite`,
                  }}
                >
                  {text}
                </div>
              ) : (
                <div className="text-center text-xs text-slate-400">
                  Marquee is hidden or empty
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Marquee Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
