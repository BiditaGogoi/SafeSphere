import React, { useState, useEffect } from 'react';
import { Navigation, Route, ArrowRight, AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function RoutePlannerCard({ onRouteCalculated, onClearRoute, activeRoute }) {
  const [nodes, setNodes] = useState([]);
  const [startNode, setStartNode] = useState('N_MODEL_TOWN');
  const [goalNode, setGoalNode] = useState('H_CIVIL_HOSPITAL');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Fetch graph nodes for dropdown selection
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/nodes`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch road nodes');
        return res.json();
      })
      .then((data) => {
        if (data.nodes && Array.isArray(data.nodes)) {
          setNodes(data.nodes);
        }
      })
      .catch((err) => {
        console.error('Error loading graph nodes:', err);
      });
  }, []);

  const handleFindRoute = () => {
    setLoading(true);
    setErrorMsg(null);

    fetch(`${API_BASE_URL}/api/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start_node: startNode,
        goal_node: goalNode,
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.status === 404 || data.status === 'unreachable') {
          setErrorMsg(data.message || 'Destination is unreachable along connected roads.');
          onRouteCalculated(null);
        } else if (!res.ok || data.status === 'error') {
          setErrorMsg(data.message || 'Route calculation error.');
          onRouteCalculated(null);
        } else {
          onRouteCalculated(data);
        }
      })
      .catch((err) => {
        setErrorMsg('Cannot connect to routing service. Verify backend is running.');
        onRouteCalculated(null);
      })
      .finally(() => setLoading(false));
  };

  const handleClear = () => {
    setErrorMsg(null);
    onClearRoute();
  };

  // Group nodes into starting points and help-point destinations
  const startOptions = nodes.filter((n) => n.type !== 'help_point');
  const helpOptions = nodes.filter((n) => n.type === 'help_point' || n.type === 'test_isolated');

  return (
    <div className="bg-slate-900/95 border border-indigo-500/30 rounded-xl p-4 shadow-2xl backdrop-blur text-xs w-80 text-slate-200 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-md">
            <Navigation className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-xs tracking-wide">
              A* Road-Graph Router
            </h3>
            <span className="text-[10px] text-indigo-300 font-mono">
              Pure Python A* Engine
            </span>
          </div>
        </div>
        {activeRoute && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition cursor-pointer"
            title="Clear Route"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Select Start Node */}
      <div className="space-y-1">
        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
          Starting Location:
        </label>
        <select
          value={startNode}
          onChange={(e) => setStartNode(e.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
        >
          {startOptions.map((n) => (
            <option key={n.id} value={n.id}>
              {n.name}
            </option>
          ))}
        </select>
      </div>

      {/* Select Help Point Destination */}
      <div className="space-y-1">
        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
          Help Point Destination:
        </label>
        <select
          value={goalNode}
          onChange={(e) => setGoalNode(e.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
        >
          {helpOptions.map((n) => (
            <option key={n.id} value={n.id}>
              {n.name} {n.type === 'test_isolated' ? '(Unreachable Test)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Calculate Button */}
      <button
        onClick={handleFindRoute}
        disabled={loading}
        className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 text-white font-medium rounded-lg shadow-md transition flex items-center justify-center gap-2 cursor-pointer text-xs"
      >
        <Route className="w-3.5 h-3.5" />
        <span>{loading ? 'Executing A* Search...' : 'Compute A* Road Route'}</span>
      </button>

      {/* Error Message */}
      {errorMsg && (
        <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
          <div className="leading-tight">
            <strong>Routing Notice:</strong>
            <p className="mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Route Results Box */}
      {activeRoute && activeRoute.status === 'success' && (
        <div className="bg-slate-950/70 p-3 rounded-lg border border-indigo-500/30 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>A* Road Route Found</span>
          </div>

          {/* Distance Comparison */}
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div className="bg-slate-900 p-2 rounded border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Road Distance (A* Path)</span>
              <strong className="text-sm text-indigo-300 font-mono">
                {activeRoute.road_distance_km} km
              </strong>
            </div>
            <div className="bg-slate-900 p-2 rounded border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Straight-Line (Heuristic)</span>
              <strong className="text-sm text-amber-300 font-mono">
                {activeRoute.straight_line_distance_km} km
              </strong>
            </div>
          </div>

          {/* Waypoint sequence */}
          <div className="mt-1 pt-1.5 border-t border-slate-800 text-[10px] text-slate-300">
            <span className="text-slate-400 font-semibold block mb-1">
              Route Nodes ({activeRoute.node_ids ? activeRoute.node_ids.length : activeRoute.route.length}):
            </span>
            <div className="flex flex-wrap items-center gap-1 max-h-24 overflow-y-auto pr-1">
              {activeRoute.route.slice(0, 8).map((p, idx) => (
                <React.Fragment key={p.id || idx}>
                  <span className="bg-slate-800/80 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-200">
                    {p.name ? p.name.split(' ')[0] : `Node ${p.id.slice(-4)}`}
                  </span>
                  {idx < Math.min(activeRoute.route.length, 8) - 1 && (
                    <ArrowRight className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                  )}
                </React.Fragment>
              ))}
              {activeRoute.route.length > 8 && (
                <span className="text-slate-500 font-mono text-[9px]">
                  +{activeRoute.route.length - 8} more
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Academic Disclaimer */}
      <div className="text-[10px] text-slate-500 pt-1.5 border-t border-slate-800/80 leading-tight">
        * <strong>OpenStreetMap Road Network:</strong> Route calculated on central Jalandhar walkable ways. OSM coverage can be incomplete, and this route is an academic demonstration of A* graph search, not a guarantee of pedestrian safety or fastest traversal.
      </div>
    </div>
  );
}
