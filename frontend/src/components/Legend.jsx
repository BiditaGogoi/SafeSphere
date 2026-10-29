import React from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon, Info } from 'lucide-react';

export default function Legend({ showZones, onToggleZones, zoneCount }) {
  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-3.5 shadow-2xl backdrop-blur text-xs w-72 text-slate-200">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
        <span className="font-semibold text-slate-100 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-indigo-400" />
          Risk Zone Legend ({zoneCount})
        </span>
        <button
          onClick={onToggleZones}
          className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium underline cursor-pointer"
        >
          {showZones ? 'Hide Overlay' : 'Show Overlay'}
        </button>
      </div>

      <div className="space-y-2">
        {/* Lower Risk */}
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-300 ring-2 ring-emerald-500/20 shrink-0" />
          <div className="flex-1">
            <span className="font-medium text-emerald-300">Lower Risk</span>
            <p className="text-[10px] text-slate-400">Well-lit commercial & secure perimeters</p>
          </div>
        </div>

        {/* Moderate Risk */}
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full bg-amber-500 border border-amber-300 ring-2 ring-amber-500/20 shrink-0" />
          <div className="flex-1">
            <span className="font-medium text-amber-300">Moderate Risk</span>
            <p className="text-[10px] text-slate-400">High-transit junctions & crowded bazaars</p>
          </div>
        </div>

        {/* Higher Risk */}
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full bg-rose-500 border border-rose-300 ring-2 ring-rose-500/20 shrink-0" />
          <div className="flex-1">
            <span className="font-medium text-rose-300">Higher Risk (Demo)</span>
            <p className="text-[10px] text-slate-400">Late night / low light service alleys</p>
          </div>
        </div>
      </div>

      {/* Visible Synthetic Data Disclaimer */}
      <div className="mt-3 pt-2.5 border-t border-slate-800 text-[10px] text-slate-400 leading-tight">
        <span className="text-amber-400 font-semibold uppercase tracking-wider block mb-0.5">
          Academic Notice
        </span>
        All zones & incident counts are <strong>synthetic</strong> demonstration data for academic AI CA1 testing. Not real crime statistics.
      </div>
    </div>
  );
}
