import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Crosshair, MapPin, Brain, Navigation } from 'lucide-react';
import Legend from './Legend';
import RiskPredictorCard from './RiskPredictorCard';
import RoutePlannerCard from './RoutePlannerCard';
import { API_BASE_URL } from '../config';

const JALANDHAR_CENTER = [31.3260, 75.5762];
const DEFAULT_ZOOM = 13;

const RISK_STYLES = {
  lower: { color: '#059669', fillColor: '#10b981', fillOpacity: 0.28, badgeBg: '#064e3b', badgeText: '#6ee7b7', label: 'Lower Risk' },
  moderate: { color: '#d97706', fillColor: '#f59e0b', fillOpacity: 0.28, badgeBg: '#78350f', badgeText: '#fcd34d', label: 'Moderate Risk' },
  higher: { color: '#dc2626', fillColor: '#ef4444', fillOpacity: 0.32, badgeBg: '#7f1d1d', badgeText: '#fca5a5', label: 'Higher Risk (Demo)' },
};

export default function MapView({ onHelpPointSelected, selectedHelpPoint }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const zonesLayerGroupRef = useRef(null);
  const helpPointsLayerGroupRef = useRef(null);
  const routeLayerGroupRef = useRef(null);

  const [zones, setZones] = useState([]);
  const [helpNodes, setHelpNodes] = useState([]);
  const [showZones, setShowZones] = useState(true);
  const [clickedCoords, setClickedCoords] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [activeRoute, setActiveRoute] = useState(null);
  const [activeTool, setActiveTool] = useState('routing'); // 'routing' | 'ml'

  // 1. Fetch risk zones and help points from Flask API
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/zones`)
      .then((res) => res.json())
      .then((data) => {
        if (data.data && Array.isArray(data.data)) {
          setZones(data.data);
          if (data.data.length > 0) setSelectedZone(data.data[0]);
        }
      })
      .catch((err) => console.error('Failed to load risk zones:', err));

    fetch(`${API_BASE_URL}/api/nodes`)
      .then((res) => res.json())
      .then((data) => {
        if (data.nodes && Array.isArray(data.nodes)) {
          const hps = data.nodes.filter((n) => n.type === 'help_point');
          setHelpNodes(hps);
        }
      })
      .catch((err) => console.error('Failed to load help points:', err));
  }, []);

  // 2. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: JALANDHAR_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
    });
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    zonesLayerGroupRef.current = L.layerGroup().addTo(map);
    helpPointsLayerGroupRef.current = L.layerGroup().addTo(map);
    routeLayerGroupRef.current = L.layerGroup().addTo(map);

    // City Center Pin
    const centerMarker = L.circleMarker(JALANDHAR_CENTER, {
      radius: 9,
      color: '#ffffff',
      weight: 2,
      fillColor: '#4f46e5',
      fillOpacity: 1,
    }).addTo(map);
    centerMarker.bindPopup('<strong>Jalandhar City Center</strong><br/><span style="font-size:11px;color:#94a3b8;">Punjab, India</span>');

    map.on('click', (e) => {
      setClickedCoords({
        lat: e.latlng.lat.toFixed(4),
        lng: e.latlng.lng.toFixed(4),
      });
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 3. Render Risk Circles
  useEffect(() => {
    if (!zonesLayerGroupRef.current) return;
    zonesLayerGroupRef.current.clearLayers();
    if (!showZones) return;

    zones.forEach((zone) => {
      const style = RISK_STYLES[zone.risk_label] || RISK_STYLES.moderate;
      const circle = L.circle([zone.lat, zone.lng], {
        radius: zone.radius_meters,
        color: style.color,
        weight: 2,
        fillColor: style.fillColor,
        fillOpacity: style.fillOpacity,
      });

      circle.on('click', () => {
        setSelectedZone(zone);
        setActiveTool('ml');
      });

      circle.bindPopup(`
        <div style="min-width: 180px;">
          <strong style="color: #f8fafc; font-size: 13px;">${zone.area_name}</strong>
          <div style="margin: 4px 0;"><span style="background:${style.badgeBg};color:${style.badgeText};font-size:10px;font-weight:600;padding:2px 8px;border-radius:9999px;">${style.label}</span></div>
          <div style="font-size: 11px; color: #cbd5e1; line-height: 1.4;">
            <div>Lighting: ${zone.lighting_score}/10 | Crowd: ${zone.crowd_density}/10</div>
            <div>Incidents: ${zone.incident_count} proxy events</div>
          </div>
          <div style="margin-top:6px;font-size:9px;color:#fbbf24;">* Synthetic demonstration data</div>
        </div>
      `);
      zonesLayerGroupRef.current.addLayer(circle);
    });
  }, [zones, showZones]);

  // 4. Render Help-Point Markers (Feature 2)
  useEffect(() => {
    if (!helpPointsLayerGroupRef.current) return;
    helpPointsLayerGroupRef.current.clearLayers();

    helpNodes.forEach((hp) => {
      const isSelected = selectedHelpPoint && selectedHelpPoint.id === hp.id;
      const marker = L.circleMarker([hp.lat, hp.lng], {
        radius: isSelected ? 11 : 8,
        color: '#ffffff',
        weight: isSelected ? 3 : 2,
        fillColor: '#3b82f6',
        fillOpacity: 1,
      });

      marker.on('click', () => {
        if (onHelpPointSelected) {
          onHelpPointSelected(hp);
        }
      });

      marker.bindPopup(`
        <div style="min-width: 180px;">
          <strong style="color: #60a5fa; font-size: 12px;">${hp.name}</strong>
          <div style="font-size: 11px; color: #cbd5e1; margin-top: 4px;">
            <div>Category: <strong>${hp.category || 'Help Point'}</strong></div>
            <div>Hours: <strong>${hp.opening_hours || 'Information unavailable'}</strong></div>
            <div>Status: <span style="color:#f59e0b;">${hp.verification_status || 'Synthetic Demonstration Location'}</span></div>
          </div>
          <div style="margin-top: 6px; font-size: 9px; color: #94a3b8;">Click to view full details in sidebar</div>
        </div>
      `);

      helpPointsLayerGroupRef.current.addLayer(marker);
    });
  }, [helpNodes, selectedHelpPoint, onHelpPointSelected]);

  // 5. Render A* Route & Straight-Line Comparison
  useEffect(() => {
    if (!routeLayerGroupRef.current || !mapInstanceRef.current) return;
    routeLayerGroupRef.current.clearLayers();

    const isRouteValid = activeRoute &&
      (activeRoute.status === 'success' || activeRoute.status === 'demo_alert_triggered') &&
      activeRoute.route && activeRoute.route.length > 0;

    if (!isRouteValid) return;

    const roadCoords = (activeRoute.geometry && activeRoute.geometry.length > 0)
      ? activeRoute.geometry
      : activeRoute.route.map((p) => [p.lat, p.lng]);
    const nodeCoords = activeRoute.route.map((p) => [p.lat, p.lng]);

    // Straight-line chord (dashed amber)
    if (nodeCoords.length >= 2) {
      const straightLine = L.polyline([nodeCoords[0], nodeCoords[nodeCoords.length - 1]], {
        color: '#f59e0b',
        weight: 2.5,
        dashArray: '6, 8',
        opacity: 0.85,
      });
      straightLine.bindTooltip(`Straight-Line (Heuristic): ${activeRoute.straight_line_distance_km} km`, { sticky: true });
      routeLayerGroupRef.current.addLayer(straightLine);
    }

    // A* road route (solid indigo)
    const routeLine = L.polyline(roadCoords, { color: '#6366f1', weight: 5, opacity: 0.9 });
    routeLine.bindTooltip(`A* Road Route (OSM): ${activeRoute.road_distance_km} km`, { sticky: true });
    routeLayerGroupRef.current.addLayer(routeLine);

    // Start & Destination pins
    const startPin = L.circleMarker(nodeCoords[0], { radius: 8, color: '#fff', weight: 2, fillColor: '#10b981', fillOpacity: 1 });
    startPin.bindPopup(`<strong>Start:</strong> ${activeRoute.route[0].name || 'Start Point'}`);
    routeLayerGroupRef.current.addLayer(startPin);

    const goalPin = L.circleMarker(nodeCoords[nodeCoords.length - 1], { radius: 9, color: '#fff', weight: 2, fillColor: '#ef4444', fillOpacity: 1 });
    goalPin.bindPopup(`<strong>Destination:</strong> ${activeRoute.route[activeRoute.route.length - 1].name || 'Help Point'}`);
    routeLayerGroupRef.current.addLayer(goalPin);

    // Fit map bounds
    if (roadCoords.length > 1) {
      mapInstanceRef.current.fitBounds(L.latLngBounds(roadCoords), { padding: [50, 50] });
    }
  }, [activeRoute]);

  const handleRecenter = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.setView(JALANDHAR_CENTER, DEFAULT_ZOOM);
  };

  return (
    <div className="relative w-full h-full flex-1">
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating Controls Top-Right */}
      <div className="absolute top-4 right-4 z-[500] flex flex-col items-end gap-2.5 max-h-[92vh] overflow-y-auto pr-1">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-900/90 border border-slate-700 rounded-lg p-0.5 shadow-lg backdrop-blur">
            <button
              onClick={() => setActiveTool('routing')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${activeTool === 'routing' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>A* Router</span>
            </button>
            <button
              onClick={() => setActiveTool('ml')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${activeTool === 'ml' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <Brain className="w-3.5 h-3.5" />
              <span>ML Inspector</span>
            </button>
          </div>

          <button
            onClick={handleRecenter}
            className="flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-100 text-xs font-medium px-3 py-2 rounded-lg border border-slate-700 shadow-lg backdrop-blur transition cursor-pointer"
            title="Recenter map on Jalandhar"
          >
            <Crosshair className="w-4 h-4 text-indigo-400" />
            <span>Recenter</span>
          </button>
        </div>

        <Legend showZones={showZones} onToggleZones={() => setShowZones(!showZones)} zoneCount={zones.length} />

        {activeTool === 'routing' && (
          <RoutePlannerCard
            onRouteCalculated={(route) => setActiveRoute(route)}
            onClearRoute={() => {
              setActiveRoute(null);
            }}
            onHelpPointSelected={onHelpPointSelected}
            activeRoute={activeRoute}
          />
        )}

        {activeTool === 'ml' && selectedZone && (
          <RiskPredictorCard selectedZone={selectedZone} onClose={() => setActiveTool('routing')} />
        )}
      </div>

      {/* Status Bar Bottom-Left */}
      <div className="absolute bottom-6 left-6 z-[500] flex flex-col gap-2">
        {clickedCoords && (
          <div className="bg-slate-900/95 border border-slate-700/80 text-slate-200 text-xs px-3 py-2 rounded-lg shadow-xl backdrop-blur flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            <span>Map Coordinate:</span>
            <span className="font-mono text-amber-300 font-semibold">{clickedCoords.lat}° N, {clickedCoords.lng}° E</span>
          </div>
        )}
        <div className="bg-slate-900/90 border border-slate-800 text-slate-400 text-[11px] px-3 py-1.5 rounded-lg shadow backdrop-blur flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Data Feed: <strong className="text-slate-200">OpenStreetMap & Synthetic Zones</strong></span>
          <span className="text-slate-600">|</span>
          <Navigation className="w-3 h-3 text-indigo-400" />
          <span>Engine: <strong className="text-indigo-300">Custom A* Graph Search</strong></span>
        </div>
      </div>
    </div>
  );
}
