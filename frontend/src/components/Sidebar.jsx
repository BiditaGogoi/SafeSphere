import React from 'react';
import { AlertCircle, Shield } from 'lucide-react';
import HelpPointDetailsCard from './HelpPointDetailsCard';

export default function Sidebar({ selectedHelpPoint, roadDistanceKm, onClearHelpPoint }) {
  return (
    <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col h-full z-10 text-slate-200 overflow-y-auto">
      {/* App description */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-1.5">
          <Shield className="w-4 h-4 text-indigo-400 shrink-0" />
          <h2 className="text-xs font-bold text-indigo-300 tracking-wide uppercase m-0">
            About SafeRoute
          </h2>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed m-0">
          Navigate safely with AI risk prediction, custom A* routing on real OpenStreetMap roads, and one-tap nearest help-point selection.
        </p>
      </div>

      {/* Selected Help Point Details */}
      {selectedHelpPoint ? (
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-xs font-bold text-indigo-300 tracking-wide uppercase mb-2">
            Selected Safe Point
          </h2>
          <HelpPointDetailsCard
            point={selectedHelpPoint}
            distanceKm={roadDistanceKm}
            onClose={onClearHelpPoint}
          />
        </div>
      ) : (
        <div className="p-4 border-b border-slate-800 text-center">
          <p className="text-[11px] text-slate-500 m-0">
            Click a help-point marker on the map or use <strong className="text-slate-400">Auto-Select</strong> to view details here.
          </p>
        </div>
      )}

      {/* Academic Disclaimer — pushed to bottom */}
      <div className="mt-auto p-3 border-t border-slate-800 bg-slate-950/60">
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[10px]">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold text-amber-300">Academic Demo:</span>
            <span className="text-amber-200/80"> All risk zones, incident counts, and help-point locations are synthetic demonstration data for academic evaluation. Not real crime statistics.</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
