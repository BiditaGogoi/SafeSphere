import React, { useState, useEffect } from 'react';
import { Brain, Sparkles, Sliders, AlertCircle, X, CheckCircle2 } from 'lucide-react';
import { API_BASE_URL } from '../config';

const RISK_BADGES = {
  lower: {
    bg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
    bar: 'bg-emerald-500',
    label: 'Lower Risk',
  },
  moderate: {
    bg: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
    bar: 'bg-amber-500',
    label: 'Moderate Risk',
  },
  higher: {
    bg: 'bg-rose-500/15 border-rose-500/40 text-rose-300',
    bar: 'bg-rose-500',
    label: 'Higher Risk (Demo)',
  },
};

export default function RiskPredictorCard({ selectedZone, onClose }) {
  // Sliders for interactive viva testing
  const [lighting, setLighting] = useState(selectedZone?.lighting_score || 7);
  const [crowd, setCrowd] = useState(selectedZone?.crowd_density || 6);
  const [incidents, setIncidents] = useState(selectedZone?.incident_count || 3);

  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sync state when selectedZone prop changes
  useEffect(() => {
    if (selectedZone) {
      setLighting(selectedZone.lighting_score ?? 7);
      setCrowd(selectedZone.crowd_density ?? 6);
      setIncidents(selectedZone.incident_count ?? 3);
    }
  }, [selectedZone]);

  // Query /api/predict when features change
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${API_BASE_URL}/api/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        incident_count: incidents,
        lighting_score: lighting,
        crowd_density: crowd,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`API returned HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data.status === 'success') {
          setPrediction(data);
        } else {
          throw new Error(data.message || 'Prediction failed');
        }
      })
      .catch((err) => {
        setError('Prediction API offline. Showing baseline classification.');
      })
      .finally(() => setLoading(false));
  }, [lighting, crowd, incidents]);

  if (!selectedZone) return null;

  const predictedClass = prediction?.predicted_risk || selectedZone.risk_label || 'moderate';
  const badgeStyle = RISK_BADGES[predictedClass] || RISK_BADGES.moderate;
  const probs = prediction?.probabilities || { lower: 0, moderate: 0, higher: 0 };

  return (
    <div className="bg-slate-900/95 border border-indigo-500/30 rounded-xl p-4 shadow-2xl backdrop-blur text-xs w-80 text-slate-200 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-md">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-xs tracking-wide">
              ML Decision Tree Inspector
            </h3>
            <span className="text-[10px] text-indigo-300 font-mono">
              scikit-learn Model Active
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          title="Close Inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Target Zone Info */}
      <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
          Selected Demonstration Zone
        </div>
        <div className="font-bold text-slate-100 text-sm mt-0.5">
          {selectedZone.area_name}
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5">
          {selectedZone.time_period} &bull; Zone ID: {selectedZone.area_id}
        </div>
      </div>

      {/* API Connection Error Notice */}
      {error && (
        <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] flex items-center gap-1.5 leading-tight">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Prediction Output */}
      <div className={`p-3 rounded-lg border flex flex-col gap-1.5 ${badgeStyle.bg}`}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300">
            Predicted Risk Class:
          </span>
          {loading && <span className="text-[10px] animate-pulse text-indigo-300">Evaluating...</span>}
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-bold text-sm tracking-wide">{badgeStyle.label}</span>
        </div>

        {/* Probability Bars */}
        <div className="mt-2 pt-2 border-t border-slate-700/50 space-y-1.5">
          <div className="text-[10px] text-slate-300 font-medium">Model Class Probabilities:</div>
          {['lower', 'moderate', 'higher'].map((cls) => {
            const val = probs[cls] !== undefined ? Math.round(probs[cls] * 100) : 0;
            const style = RISK_BADGES[cls];
            return (
              <div key={cls} className="flex items-center gap-2 text-[10px]">
                <span className="w-14 capitalize text-slate-400">{cls}:</span>
                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${style.bar} transition-all duration-300`}
                    style={{ width: `${val}%` }}
                  />
                </div>
                <span className="font-mono w-8 text-right text-slate-300">{val}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Feature Adjustment Sandbox (Viva Demonstration) */}
      <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
          <span className="flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            Interactive Feature Sandbox
          </span>
          <span className="text-[10px] text-slate-500 font-normal">Test Split Rule</span>
        </div>

        {/* Lighting Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-slate-300">
            <span>Lighting Level:</span>
            <span className="font-mono text-indigo-300 font-bold">{lighting} / 10</span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            value={lighting}
            onChange={(e) => setLighting(parseInt(e.target.value, 10))}
            className="w-full accent-indigo-500 cursor-pointer h-1 bg-slate-700 rounded-lg"
          />
        </div>

        {/* Crowd Density Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-slate-300">
            <span>Crowd Density:</span>
            <span className="font-mono text-indigo-300 font-bold">{crowd} / 10</span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            value={crowd}
            onChange={(e) => setCrowd(parseInt(e.target.value, 10))}
            className="w-full accent-indigo-500 cursor-pointer h-1 bg-slate-700 rounded-lg"
          />
        </div>

        <div className="text-[10px] text-slate-500 italic">
          Try moving Lighting &gt; 7 (predicts Lower) or &le; 7 with Crowd &le; 3 (predicts Higher).
        </div>
      </div>

      {/* Mandatory Academic Disclaimer */}
      <div className="flex items-start gap-1.5 p-2 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-200/90 leading-tight">
        <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
        <span>
          <strong>Academic Demo:</strong> Predictions are based on synthetic demonstration data for CA1 evaluation. Not a real safety rating in Jalandhar.
        </span>
      </div>
    </div>
  );
}
