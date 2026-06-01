import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import api from '../api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { MapPin, RefreshCw, Car, Users, Activity, Navigation } from 'lucide-react';

let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

// Custom motorcycle icon using SVG
const createDriverIcon = (status) => {
    const color = status === 'ONLINE' ? '#10b981' : status === 'BUSY' ? '#f59e0b' : '#94a3b8';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>`;
    return L.divIcon({
        html: `<div style="background:white;border-radius:50%;padding:4px;box-shadow:0 2px 8px rgba(0,0,0,0.15);border:2px solid ${color};display:flex;align-items:center;justify-content:center;width:36px;height:36px;">${svg}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        className: ''
    });
};

const MapController = ({ center, zoom }) => {
    const map = useMap();
    useEffect(() => { map.flyTo(center, zoom, { duration: 1 }); }, [center, zoom, map]);
    return null;
};

const DriverMap = () => {
    const [data, setData] = useState({ drivers: [], orderHotspots: [], stats: {} });
    const [loading, setLoading] = useState(true);
    const [showDrivers, setShowDrivers] = useState(true);
    const [showHotspots, setShowHotspots] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const center = [3.5952, 98.6722];

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/drivers/map');
            setData(res.data.data || { drivers: [], orderHotspots: [], stats: {} });
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); const id = setInterval(fetchData, 30000); return () => clearInterval(id); }, []);

    const filteredDrivers = data.drivers.filter(d => !statusFilter || d.status === statusFilter);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Driver Acquisition Map</h1>
                    <p className="text-slate-500 mt-1">Monitor driver locations, order hotspots, and territory coverage.</p>
                </div>
                <Button variant="outline" icon={RefreshCw} onClick={fetchData} isLoading={loading}>Refresh</Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center"><MapPin size={18} /></div>
                    <div><p className="text-xs text-slate-500">On Map</p><p className="text-lg font-bold">{data.stats.totalWithCoords || 0}</p></div>
                </Card>
                <Card className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Activity size={18} /></div>
                    <div><p className="text-xs text-slate-500">Online</p><p className="text-lg font-bold text-emerald-700">{data.stats.onlineDrivers || 0}</p></div>
                </Card>
                <Card className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><Car size={18} /></div>
                    <div><p className="text-xs text-slate-500">Busy</p><p className="text-lg font-bold text-amber-700">{data.stats.busyDrivers || 0}</p></div>
                </Card>
                <Card className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center"><Navigation size={18} /></div>
                    <div><p className="text-xs text-slate-500">Order Hotspots</p><p className="text-lg font-bold">{data.orderHotspots?.length || 0}</p></div>
                </Card>
            </div>

            {/* Controls */}
            <Card className="p-3">
                <div className="flex flex-wrap gap-3 items-center">
                    <select className="px-3 py-2 border border-emerald-200/80 rounded-xl text-sm bg-white" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                        <option value="">All Drivers</option>
                        <option value="ONLINE">Online Only</option>
                        <option value="BUSY">Busy Only</option>
                    </select>
                    <Button variant={showDrivers ? 'default' : 'outline'} size="sm" onClick={() => setShowDrivers(v => !v)}>
                        {showDrivers ? 'Hide' : 'Show'} Drivers
                    </Button>
                    <Button variant={showHotspots ? 'default' : 'outline'} size="sm" onClick={() => setShowHotspots(v => !v)}>
                        {showHotspots ? 'Hide' : 'Show'} Hotspots
                    </Button>
                    <span className="text-sm text-slate-500 ml-auto">{filteredDrivers.length} drivers visible</span>
                </div>
            </Card>

            {/* Map */}
            <Card className="overflow-hidden rounded-2xl h-[600px] relative z-0">
                <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                    <MapController center={center} zoom={12} />
                    <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />

                    {showHotspots && data.orderHotspots.map((o, idx) => (
                        <Circle key={`h-${idx}`} center={[o.originLat, o.originLng]} radius={150}
                            pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.15, weight: 0 }} />
                    ))}

                    {showDrivers && filteredDrivers.map(d => (
                        <Marker key={d.id} position={[d.latitude, d.longitude]} icon={createDriverIcon(d.status)}>
                            <Popup>
                                <div className="text-sm min-w-[180px]">
                                    <p className="font-bold">{d.name}</p>
                                    <p className="text-slate-500">{d.vehicleType} • {d.vehiclePlate}</p>
                                    <p className="mt-1">
                                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${d.status === 'ONLINE' ? 'bg-green-100 text-green-700' : d.status === 'BUSY' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {d.status}
                                        </span>
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">Rating: {d.rating?.toFixed(1)} ⭐</p>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>

                {/* Floating Legend */}
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-emerald-100/50 z-[1000] text-xs space-y-1.5">
                    <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-blue-500" /> Driver Marker</div>
                    <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-amber-400" /> Order Hotspot</div>
                </div>
            </Card>
        </div>
    );
};

export default DriverMap;
