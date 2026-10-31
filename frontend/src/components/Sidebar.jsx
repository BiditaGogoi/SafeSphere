import React from 'react';
import { AlertCircle, CheckCircle2, CircleDashed } from 'lucide-react';
import HelpPointDetailsCard from './HelpPointDetailsCard';

const PROJECT_STAGES = [
  { id: 1, name: 'Interactive Map of Jalandhar', done: true, desc: 'Leaflet + OpenStreetMap viewport' },
  { id: 2, name: 'Synthetic Risk Zones & CSV Data', done: true, desc: 'Labelled demo zones & quality checks' },
  { id: 3, name: 'Supervised ML Risk Classifier', done: true, desc: 'Scikit-learn Decision Tree & inference API' },
  { id: 4, name: 'Custom A* Routing & Comparison', done: true, desc: 'Graph routing vs straight-line distance' },
  { id: 5, name: 'Goal-Based Agent & Demo SOS', done: true, desc: 'IF-THEN safety rules + one-tap SOS' },
];

export default function Sidebar({ selectedHelpPoint, roadDistanceKm, onClearHelpPoint }) {
  return (
    <aside className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col h-full z-10 text-slate-200 overflow-y-auto">
      {/* Help Point Information System (Feature 5) */}
      {selectedHelpPoint ? (
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold text-indigo-300 tracking-wide uppercase">
              Selected Safe Point
            </h2>
          </div>
          <HelpPointDetailsCard
            point={selectedHelpPoint}
            distanceKm={roadDistanceKm}
            onClose={onClearHelpPoint}
          />
        </div>
      ) : null}

      {/* Project Roadmap */}
      <div className="p-4 border-b border-slate-800">
        <h2 className="text-sm font-semibold text-white tracking-wide uppercase text-slate-400 mb-2">
          Project Roadmap
        </h2>
        <div className="space-y-2.5">
          {PROJECT_STAGES.map((stage) => (
            <div
              key={stage.id}
              className={`p-2.5 rounded-lg border text-xs transition-all ${
                stage.done
                  ? 'bg-indigo-950/40 border-indigo-500/40 text-slate-200'
                  : 'bg-slate-950/40 border-slate-800/80 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {stage.done ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <CircleDashed className="w-4 h-4 text-slate-500 shrink-0" />
                )}
                <span className={`font-semibold ${stage.done ? 'text-indigo-300' : 'text-slate-300'}`}>
                  Stage {stage.id}: {stage.name}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 ml-6">{stage.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Mandatory Academic & Ethical Disclaimer */}
      <div className="mt-auto p-4 border-t border-slate-800 bg-slate-950/60">
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold text-amber-300">Academic Demo Notice:</span>
            <p className="mt-1 text-[11px] text-amber-200/80">
              This system uses strictly <strong>synthetic demonstration data</strong> for academic evaluation (AI CA1). It does not represent actual crime records or verified government emergency endpoints.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
