import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Crosshair, MapPin, Brain, Navigation, Layers } from 'lucide-react';
import Legend from './Legend';
import RiskPredictorCard from './RiskPredictorCard';
import RoutePlannerCard from './RoutePlannerCard';
import { API_BASE_URL } from '../config';

const JALANDHAR_CENTER = [31.3260, 75.5762];
const DEFAULT_ZOOM = 13;

const RISK_STYLES = {
  lower: {
    color: '#059669',
    fillColor: '#10b981',
    fillOpacity: 0.28,
    badgeBg: '#064e3b',
    badgeText: '#6ee7b7',
    label: 'Lower Risk',
  },
  moderate: {
    color: '#d97706',
    fillColor: '#f59e0b',
    fillOpacity: 0.28,
    badgeBg: '#78350f',
    badgeText: '#fcd34d',
    label: 'Moderate Risk',
  },
  higher: {
    color: '#dc2626',
    fillColor: '#ef4444',
    fillOpacity: 0.32,
    badgeBg: '#7f1d1d',
    badgeText: '#fca5a5',
    label: 'Higher Risk (Demo)',
  },
};

const FALLBACK_ZONES = [
  { area_id: 'Z01', area_name: 'Model Town Commercial Hub', lat: 31.3090, lng: 75.5790, radius_meters: 550, time_period: 'Evening (18:00-22:00)', incident_count: 2, lighting_score: 9, crowd_density: 8, risk_label: 'lower', notes: 'Well-lit shopping district with active foot traffic' },
  { area_id: 'Z02', area_name: 'BMC Chowk Central Crossing', lat: 31.3195, lng: 75.5805, radius_meters: 450, time_period: 'Peak Hours (17:00-21:00)', incident_count: 6, lighting_score: 6, crowd_density: 7, risk_label: 'moderate', notes: 'Major transit junction with heavy vehicular movement' },
  { area_id: 'Z03', area_name: 'City Railway Station Back Alley', lat: 31.3325, lng: 75.5840, radius_meters: 400, time_period: 'Late Night (23:00-04:00)', incident_count: 14, lighting_score: 2, crowd_density: 2, risk_label: 'higher', notes: 'Demonstration zone with low lighting in service alleys' },
  { area_id: 'Z04', area_name: 'Devi Talab Mandir Environs', lat: 31.3415, lng: 75.5900, radius_meters: 500, time_period: 'Day & Evening (06:00-21:00)', incident_count: 1, lighting_score: 8, crowd_density: 8, risk_label: 'lower', notes: 'Pilgrim center perimeter with regular local presence' },
  { area_id: 'Z05', area_name: 'Rama Mandi Highway Junction', lat: 31.3150, lng: 75.6150, radius_meters: 600, time_period: 'Night (21:00-03:00)', incident_count: 7, lighting_score: 5, crowd_density: 5, risk_label: 'moderate', notes: 'High-speed road intersection with mixed illumination' },
  { area_id: 'Z06', area_name: 'Jalandhar Cantt Military Area', lat: 31.2850, lng: 75.6050, radius_meters: 700, time_period: 'All Day (24 Hours)', incident_count: 0, lighting_score: 9, crowd_density: 4, risk_label: 'lower', notes: 'Secure perimeter with checkpoints and high visibility' },
  { area_id: 'Z07', area_name: 'Maqsudan Bypass Service Lane', lat: 31.3650, lng: 75.5650, radius_meters: 500, time_period: 'Night (22:00-04:00)', incident_count: 12, lighting_score: 3, crowd_density: 2, risk_label: 'higher', notes: 'Outer corridor demonstration zone with sparse night traffic' },
  { area_id: 'Z08', area_name: 'Basti Nau Craft Bazaar', lat: 31.3210, lng: 75.5520, radius_meters: 400, time_period: 'Evening (18:00-22:00)', incident_count: 5, lighting_score: 6, crowd_density: 6, risk_label: 'moderate', notes: 'Narrow commercial lanes with crowded daytime footfall' },
  { area_id: 'Z09', area_name: 'PAP Ground Outer Ring', lat: 31.2990, lng: 75.6180, radius_meters: 500, time_period: 'Night (20:00-02:00)', incident_count: 6, lighting_score: 5, crowd_density: 4, risk_label: 'moderate', notes: 'Peripheral road section with intermediate street illumination' },
  { area_id: 'Z10', area_name: 'Guru Gobind Singh Stadium Perimeter', lat: 31.3170, lng: 75.5680, radius_meters: 450, time_period: 'Evening (17:00-21:00)', incident_count: 1, lighting_score: 8, crowd_density: 7, risk_label: 'lower', notes: 'Open sports facility perimeter with active evening visitors' },
  { area_id: 'Z11', area_name: 'Industrial Area Focal Point Outer', lat: 31.3520, lng: 75.6120, radius_meters: 550, time_period: 'Late Night (23:00-04:00)', incident_count: 13, lighting_score: 2, crowd_density: 3, risk_label: 'higher', notes: 'Industrial access lane demonstration zone with low night pedestrian count' },
  { area_id: 'Z12', area_name: 'Jyoti Chowk Old Market', lat: 31.3255, lng: 75.5750, radius_meters: 400, time_period: 'Evening (18:00-22:00)', incident_count: 4, lighting_score: 7, crowd_density: 8, risk_label: 'moderate', notes: 'Vibrant traditional bazaar corridor with dense pedestrian movement' },
];

export default function MapView() {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const zonesLayerGroupRef = useRef(null);
  const routeLayerGroupRef = useRef(null);

  const [zones, setZones] = useState([]);
  const [showZones, setShowZones] = useState(true);
  const [clickedCoords, setClickedCoords] = useState(null);
  const [dataSource, setDataSource] = useState('loading');
  const [selectedZone, setSelectedZone] = useState(null);
  const [activeRoute, setActiveRoute] = useState(null);
  const [activeTool, setActiveTool] = useState('routing'); // 'routing' | 'ml'

  // 1. Fetch zones from Flask API (with fallback)
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/zones`)
      .then((res) => {
        if (!res.ok) throw new Error('Backend responded with error');
        return res.json();
      })
      .then((data) => {
        if (data.data && Array.isArray(data.data)) {
          setZones(data.data);
          setDataSource('Flask Backend (Live)');
          if (data.data.length > 0) setSelectedZone(data.data[0]);
        } else {
          setZones(FALLBACK_ZONES);
          setDataSource('Local Dataset');
          setSelectedZone(FALLBACK_ZONES[0]);
        }
      })
      .catch(() => {
        setZones(FALLBACK_ZONES);
        setDataSource('Local Dataset');
        setSelectedZone(FALLBACK_ZONES[0]);
      });
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

    // Layer groups for zones and routes
    const zonesGroup = L.layerGroup().addTo(map);
    zonesLayerGroupRef.current = zonesGroup;

    const routeGroup = L.layerGroup().addTo(map);
    routeLayerGroupRef.current = routeGroup;

    // City Center Pin
    const centerIcon = L.divIcon({
      className: 'custom-map-marker',
      html: `
        <div style="background-color: #4f46e5; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.4);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });

    const centerMarker = L.marker(JALANDHAR_CENTER, { icon: centerIcon }).addTo(map);
    centerMarker.bindPopup(`
      <div>
        <strong style="color: #6366f1; font-size: 14px;">Jalandhar City Center</strong><br/>
        <span style="font-size: 12px; color: #94a3b8;">Punjab, India</span><br/>
        <div style="margin-top: 6px; font-size: 11px; color: #cbd5e1;">Lat: 31.3260, Lng: 75.5762</div>
      </div>
    `);

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
        <div style="min-width: 200px;">
          <div style="margin-bottom: 6px;">
            <strong style="color: #f8fafc; font-size: 13px;">${zone.area_name}</strong>
          </div>
          <span style="
            display: inline-block;
            background: ${style.badgeBg};
            color: ${style.badgeText};
            font-size: 10px;
            font-weight: 600;
            padding: 2px 8px;
            border-radius: 9999px;
            margin-bottom: 6px;
            border: 1px solid ${style.color}50;
          ">
            ${style.label}
          </span>
          <div style="font-size: 11px; color: #cbd5e1; line-height: 1.4; margin-top: 4px;">
            <div><strong>Active Period:</strong> ${zone.time_period}</div>
            <div><strong>Lighting Level:</strong> ${zone.lighting_score}/10</div>
            <div><strong>Crowd Density:</strong> ${zone.crowd_density}/10</div>
            <div><strong>Demo Incidents:</strong> ${zone.incident_count} proxy events</div>
            <div style="margin-top: 4px; font-style: italic; color: #94a3b8;">${zone.notes}</div>
          </div>
          <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #334155; font-size: 9px; color: #fbbf24;">
            * Synthetic data for AI CA1 evaluation only
          </div>
        </div>
      `);

      zonesLayerGroupRef.current.addLayer(circle);
    });
  }, [zones, showZones]);

  // 4. Render A* Calculated Route & Straight-Line Comparison
  useEffect(() => {
    if (!routeLayerGroupRef.current || !mapInstanceRef.current) return;

    routeLayerGroupRef.current.clearLayers();

    if (!activeRoute || activeRoute.status !== 'success' || !activeRoute.route || activeRoute.route.length === 0) {
      return;
    }

    // Use detailed road segment geometry if returned from backend, else fall back to node coordinates
    const roadCoords = (activeRoute.geometry && activeRoute.geometry.length > 0)
      ? activeRoute.geometry
      : activeRoute.route.map((p) => [p.lat, p.lng]);
    const nodeCoords = activeRoute.route.map((p) => [p.lat, p.lng]);

    // Draw Straight-Line Heuristic Chord (dashed amber line) connecting start and destination
    if (nodeCoords.length >= 2) {
      const straightLine = L.polyline([nodeCoords[0], nodeCoords[nodeCoords.length - 1]], {
        color: '#f59e0b',
        weight: 2.5,
        dashArray: '6, 8',
        opacity: 0.85,
      });
      straightLine.bindTooltip(`Straight-Line (Heuristic): ${activeRoute.straight_line_distance_km} km`, {
        sticky: true,
      });
      routeLayerGroupRef.current.addLayer(straightLine);
    }

    // Draw Road Route Polyline (solid indigo line following true OSM road segments)
    const routeLine = L.polyline(roadCoords, {
      color: '#6366f1',
      weight: 5,
      opacity: 0.9,
    });
    routeLine.bindTooltip(`A* Road Route (OSM): ${activeRoute.road_distance_km} km`, {
      sticky: true,
    });
    routeLayerGroupRef.current.addLayer(routeLine);

    // Start Pin (emerald circle marker)
    const startMarker = L.circleMarker(nodeCoords[0], {
      radius: 8,
      color: '#ffffff',
      weight: 2,
      fillColor: '#10b981',
      fillOpacity: 1,
    });
    startMarker.bindPopup(`<strong>Start:</strong> ${activeRoute.route[0].name || 'Start Point'}`);
    routeLayerGroupRef.current.addLayer(startMarker);

    // Goal Pin (rose circle marker)
    const goalMarker = L.circleMarker(nodeCoords[nodeCoords.length - 1], {
      radius: 9,
      color: '#ffffff',
      weight: 2,
      fillColor: '#ef4444',
      fillOpacity: 1,
    });
    goalMarker.bindPopup(`<strong>Destination:</strong> ${activeRoute.route[activeRoute.route.length - 1].name || 'Help Point'}`);
    routeLayerGroupRef.current.addLayer(goalMarker);

    // Fit map view to route bounds
    if (roadCoords.length > 1) {
      mapInstanceRef.current.fitBounds(L.latLngBounds(roadCoords), { padding: [50, 50] });
    }
  }, [activeRoute]);

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(JALANDHAR_CENTER, DEFAULT_ZOOM);
    }
  };

  return (
    <div className="relative w-full h-full flex-1">
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating Controls Top-Right (Tool Switcher + Recenter) */}
      <div className="absolute top-4 right-4 z-[500] flex flex-col items-end gap-2.5 max-h-[92vh] overflow-y-auto pr-1">
        <div className="flex items-center gap-2">
          {/* Tool Tab Switcher */}
          <div className="flex items-center bg-slate-900/90 border border-slate-700 rounded-lg p-0.5 shadow-lg backdrop-blur">
            <button
              onClick={() => setActiveTool('routing')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                activeTool === 'routing'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>A* Router</span>
            </button>
            <button
              onClick={() => setActiveTool('ml')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                activeTool === 'ml'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
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

        {/* Legend */}
        <Legend
          showZones={showZones}
          onToggleZones={() => setShowZones(!showZones)}
          zoneCount={zones.length}
        />

        {/* Tab 1: A* Road-Graph Router */}
        {activeTool === 'routing' && (
          <RoutePlannerCard
            onRouteCalculated={(route) => setActiveRoute(route)}
            onClearRoute={() => setActiveRoute(null)}
            activeRoute={activeRoute}
          />
        )}

        {/* Tab 2: AI Decision Tree Inspector */}
        {activeTool === 'ml' && selectedZone && (
          <RiskPredictorCard
            selectedZone={selectedZone}
            onClose={() => setActiveTool('routing')}
          />
        )}
      </div>

      {/* Status Bar Bottom-Left */}
      <div className="absolute bottom-6 left-6 z-[500] flex flex-col gap-2">
        {clickedCoords && (
          <div className="bg-slate-900/95 border border-slate-700/80 text-slate-200 text-xs px-3 py-2 rounded-lg shadow-xl backdrop-blur flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            <span>Map Coordinate:</span>
            <span className="font-mono text-amber-300 font-semibold">
              {clickedCoords.lat}° N, {clickedCoords.lng}° E
            </span>
          </div>
        )}

        <div className="bg-slate-900/90 border border-slate-800 text-slate-400 text-[11px] px-3 py-1.5 rounded-lg shadow backdrop-blur flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Data Feed: <strong className="text-slate-200">{dataSource}</strong></span>
          <span className="text-slate-600">|</span>
          <Navigation className="w-3 h-3 text-indigo-400" />
          <span>Engine: <strong className="text-indigo-300">Custom A* Graph Search</strong></span>
        </div>
      </div>
    </div>
  );
}
