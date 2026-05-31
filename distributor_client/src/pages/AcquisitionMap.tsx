import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import client from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  Target,
  MapPin,
  Users,
  Store,
  TrendingUp,
  RefreshCw,
  Loader2,
  Navigation,
  Eye,
  EyeOff,
  Layers,
  Phone,
  Mail,
  ShoppingBag,
  CreditCard,
  Download
} from 'lucide-react';

// Fix Leaflet default icon issue with Vite bundler
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Custom colored marker icons using divIcon
const createColoredIcon = (color: string) =>
  L.divIcon({
    className: '',
    html: `<div style="
      width:28px;height:28px;
      background:${color};
      border:3px solid #fff;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      box-shadow:0 3px 10px rgba(0,0,0,0.3);
      display:flex;align-items:center;justify-content:center;
    "><div style="width:8px;height:8px;background:#fff;border-radius:50%;transform:rotate(45deg);"></div></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });

const ICON_ACTIVE = createColoredIcon('#0d9488');
const ICON_LEAD = createColoredIcon('#f59e0b');
const ICON_HIGH_VALUE = createColoredIcon('#7c3aed');

// Component to invalidate map size and set view
function MapResizer({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  const initialized = useRef(false);

  useEffect(() => {
    // Force invalidate size after mount to fix grey tiles
    setTimeout(() => {
      map.invalidateSize();
      if (!initialized.current) {
        map.setView(center, zoom);
        initialized.current = true;
      }
    }, 200);
  }, [map]);

  useEffect(() => {
    if (initialized.current) {
      map.setView(center, zoom, { animate: true });
    }
  }, [center, zoom, map]);

  return null;
}

interface MerchantMapData {
  id: string;
  name: string;
  email: string | null;
  storeName: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  category: string;
  phone: string | null;
  totalOrders: number;
  creditLimit: number;
  isActive: boolean;
  joinDate: string;
}

interface MapStats {
  total: number;
  withCoords: number;
  active: number;
  leads: number;
  byLocation: Record<string, number>;
  byCategory: Record<string, number>;
}

type FilterType = 'all' | 'active' | 'leads';

export default function AcquisitionMap() {
  const [merchants, setMerchants] = useState<MerchantMapData[]>([]);
  const [stats, setStats] = useState<MapStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [showMarkers, setShowMarkers] = useState(true);
  const [showHeatCircles, setShowHeatCircles] = useState(true);
  const [selectedMerchant, setSelectedMerchant] = useState<MerchantMapData | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([3.5952, 98.6722]);
  const [mapZoom, setMapZoom] = useState(12);
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    fetchMapData();
  }, [filterType]);

  const fetchMapData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await client.get('/distributor/acquisition-map', {
        params: { type: filterType }
      });
      const data = res.data.data;
      setMerchants(data.merchants || []);
      setStats(data.stats || null);

      // Auto-center map based on merchant locations
      const withCoords = (data.merchants || []).filter((m: MerchantMapData) => m.latitude && m.longitude);
      if (withCoords.length > 0) {
        const avgLat = withCoords.reduce((sum: number, m: MerchantMapData) => sum + (m.latitude || 0), 0) / withCoords.length;
        const avgLng = withCoords.reduce((sum: number, m: MerchantMapData) => sum + (m.longitude || 0), 0) / withCoords.length;
        setMapCenter([avgLat, avgLng]);
        setMapZoom(withCoords.length > 20 ? 12 : 13);
      }
    } catch (err: any) {
      console.error('Failed to fetch acquisition map data:', err);
      setError(err.response?.data?.message || 'Gagal memuat data peta');
    } finally {
      setLoading(false);
    }
  };

  const mappableMerchants = useMemo(() => {
    let filtered = merchants.filter(m => m.latitude && m.longitude);
    if (categoryFilter) {
      filtered = filtered.filter(m => m.category === categoryFilter);
    }
    return filtered;
  }, [merchants, categoryFilter]);

  const categories = useMemo(() => {
    const cats = new Set(merchants.map(m => m.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [merchants]);

  const getMarkerIcon = (merchant: MerchantMapData) => {
    if (merchant.creditLimit > 5000000) return ICON_HIGH_VALUE;
    if (merchant.isActive) return ICON_ACTIVE;
    return ICON_LEAD;
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);

  const handleExportExcel = () => {
    if (merchants.length === 0) return;

    // Build CSV content (Excel-compatible with BOM for UTF-8)
    const headers = [
      'No',
      'Nama Toko',
      'Pemilik',
      'Email',
      'Telepon',
      'Kategori',
      'Lokasi',
      'Latitude',
      'Longitude',
      'Total Orders',
      'Credit Limit (Rp)',
      'Status',
      'Tanggal Bergabung'
    ];

    const rows = merchants.map((m, idx) => [
      idx + 1,
      `"${m.storeName}"`,
      `"${m.name}"`,
      m.email || '-',
      m.phone || '-',
      m.category || '-',
      `"${m.location}"`,
      m.latitude || '',
      m.longitude || '',
      m.totalOrders,
      m.creditLimit,
      m.isActive ? 'Active Buyer' : 'Potential Lead',
      new Date(m.joinDate).toLocaleDateString('id-ID')
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `acquisition_map_${filterType}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Acquisition Map</h1>
          <p className="text-slate-500 dark:text-slate-400">Peta sebaran merchant dan potensi akuisisi</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportExcel} disabled={loading || merchants.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
          <Button variant="outline" onClick={fetchMapData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total Merchant</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Active Buyers</p>
                <p className="text-xl font-bold text-emerald-600">{stats.active}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Potential Leads</p>
                <p className="text-xl font-bold text-amber-600">{stats.leads}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">On Map</p>
                <p className="text-xl font-bold text-indigo-600">{stats.withCoords}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controls */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 gap-1">
              {([
                { value: 'all', label: 'Semua' },
                { value: 'active', label: 'Active' },
                { value: 'leads', label: 'Leads' },
              ] as { value: FilterType; label: string }[]).map(f => (
                <button
                  key={f.value}
                  onClick={() => setFilterType(f.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    filterType === f.value
                      ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <select
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">Semua Kategori</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <div className="flex-1" />

            <button
              onClick={() => setShowMarkers(!showMarkers)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                showMarkers
                  ? 'bg-teal-50 border-teal-200 text-teal-700 dark:bg-teal-900/20 dark:border-teal-800 dark:text-teal-300'
                  : 'bg-white border-slate-200 text-slate-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400'
              }`}
            >
              {showMarkers ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              Markers
            </button>
            <button
              onClick={() => setShowHeatCircles(!showHeatCircles)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                showHeatCircles
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-300'
                  : 'bg-white border-slate-200 text-slate-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Heat
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Map + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map */}
        <div className="lg:col-span-3">
          <Card className="overflow-hidden rounded-xl">
            {loading ? (
              <div className="flex items-center justify-center" style={{ height: '600px' }}>
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-teal-600 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">Loading geospatial data...</p>
                </div>
              </div>
            ) : (
              <>
                {stats && stats.total > 0 && stats.withCoords === 0 && (
                  <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span><strong>{stats.total}</strong> merchant ditemukan, namun belum ada yang memiliki koordinat GPS.</span>
                  </div>
                )}
                <div style={{ height: '600px', width: '100%' }}>
                  <MapContainer
                    center={mapCenter}
                    zoom={mapZoom}
                    scrollWheelZoom={true}
                    style={{ height: '100%', width: '100%', zIndex: 1 }}
                  >
                    <MapResizer center={mapCenter} zoom={mapZoom} />
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {/* Heat Circles */}
                    {showHeatCircles && mappableMerchants.map((m) => (
                      <Circle
                        key={`heat-${m.id}`}
                        center={[m.latitude!, m.longitude!]}
                        radius={m.isActive ? 200 : 150}
                        pathOptions={{
                          color: m.isActive ? '#0d9488' : '#f59e0b',
                          fillColor: m.isActive ? '#0d9488' : '#f59e0b',
                          fillOpacity: 0.15,
                          weight: 0
                        }}
                      />
                    ))}

                    {/* Markers */}
                    {showMarkers && mappableMerchants.map((m) => (
                      <Marker
                        key={m.id}
                        position={[m.latitude!, m.longitude!]}
                        icon={getMarkerIcon(m)}
                        eventHandlers={{
                          click: () => setSelectedMerchant(m)
                        }}
                      >
                        <Tooltip direction="top" offset={[0, -28]} opacity={0.95}>
                          <div style={{ minWidth: '160px', padding: '2px' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' }}>{m.storeName}</div>
                            <div style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.6' }}>
                              <div>👤 {m.name}</div>
                              <div>🛒 {m.totalOrders} pembelian</div>
                              <div>💰 Limit: {formatCurrency(m.creditLimit)}</div>
                              <div>📍 {m.location}</div>
                            </div>
                            <div style={{ marginTop: '4px', fontSize: '10px', fontWeight: 'bold', color: m.isActive ? '#0f766e' : '#92400e' }}>
                              {m.isActive ? '● ACTIVE BUYER' : '○ POTENTIAL LEAD'}
                            </div>
                          </div>
                        </Tooltip>
                        <Popup>
                          <div style={{ minWidth: '220px', padding: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                              <div style={{
                                width: '8px', height: '8px', borderRadius: '50%',
                                background: m.isActive ? '#0d9488' : '#f59e0b'
                              }} />
                              <strong style={{ fontSize: '13px' }}>{m.storeName}</strong>
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.8' }}>
                              <div>👤 {m.name}</div>
                              <div>📍 {m.location}</div>
                              {m.phone && <div>📞 {m.phone}</div>}
                              {m.email && <div>✉️ {m.email}</div>}
                              <div>🛒 Total Pembelian: <strong>{m.totalOrders} orders</strong></div>
                              <div>💳 Credit Limit: <strong>{formatCurrency(m.creditLimit)}</strong></div>
                              <div>🏷️ Kategori: {m.category}</div>
                            </div>
                            <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{
                                fontSize: '10px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '10px',
                                background: m.isActive ? '#ccfbf1' : '#fef3c7',
                                color: m.isActive ? '#0f766e' : '#92400e'
                              }}>
                                {m.isActive ? 'ACTIVE' : 'LEAD'}
                              </span>
                              <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                                Joined {new Date(m.joinDate).toLocaleDateString('id-ID')}
                              </span>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              </>
            )}
          </Card>

          {/* Legend */}
          <div className="mt-3 flex flex-wrap items-center gap-4 px-1">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="w-3 h-3 rounded-full bg-teal-500 border-2 border-white shadow" />
              <span>Active Merchant</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="w-3 h-3 rounded-full bg-amber-500 border-2 border-white shadow" />
              <span>Potential Lead</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="w-3 h-3 rounded-full bg-violet-600 border-2 border-white shadow" />
              <span>High Value (Credit &gt; 5M)</span>
            </div>
            <div className="ml-auto text-xs text-slate-400">
              {mappableMerchants.length} markers on map
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Selected Merchant Detail */}
          {selectedMerchant && (
            <Card className="border-teal-200 dark:border-teal-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-teal-600" />
                  Detail Merchant
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{selectedMerchant.storeName}</p>
                  <p className="text-xs text-slate-500">{selectedMerchant.name}</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{selectedMerchant.location}</span>
                  </div>
                  {selectedMerchant.phone && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{selectedMerchant.phone}</span>
                    </div>
                  )}
                  {selectedMerchant.email && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate text-xs">{selectedMerchant.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <ShoppingBag className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>{selectedMerchant.totalOrders} orders</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>Limit: {formatCurrency(selectedMerchant.creditLimit)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Badge variant={selectedMerchant.isActive ? 'success' : 'warning'}>
                    {selectedMerchant.isActive ? 'Active' : 'Lead'}
                  </Badge>
                  <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                    {selectedMerchant.category}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Location Breakdown */}
          {stats && Object.keys(stats.byLocation).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-500" />
                  Sebaran Lokasi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {Object.entries(stats.byLocation)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10)
                    .map(([loc, count]) => (
                      <div key={loc} className="flex items-center justify-between">
                        <span className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-[140px]">{loc}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-teal-500 rounded-full"
                              style={{ width: `${Math.min((count / stats.total) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 w-6 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Category Breakdown */}
          {stats && Object.keys(stats.byCategory).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Store className="w-4 h-4 text-emerald-500" />
                  Kategori UMKM
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {Object.entries(stats.byCategory)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, count]) => (
                      <div
                        key={cat}
                        className={`flex items-center justify-between cursor-pointer rounded-md px-2 py-1.5 transition-colors ${
                          categoryFilter === cat
                            ? 'bg-teal-50 dark:bg-teal-900/20'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                        onClick={() => setCategoryFilter(categoryFilter === cat ? '' : cat)}
                      >
                        <span className="text-xs text-slate-600 dark:text-slate-300">{cat}</span>
                        <span className={`text-xs font-bold ${
                          categoryFilter === cat ? 'text-teal-600' : 'text-slate-800 dark:text-slate-200'
                        }`}>{count}</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Conversion Card */}
          <Card className="bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 border-teal-100 dark:border-teal-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-teal-600" />
                <span className="text-xs font-semibold text-teal-800 dark:text-teal-300 uppercase tracking-wider">Conversion</span>
              </div>
              <div className="text-center">
                <p className="text-3xl font-black text-teal-700 dark:text-teal-300">
                  {stats && stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%
                </p>
                <p className="text-xs text-teal-600 dark:text-teal-400 mt-1">
                  {stats?.active || 0} dari {stats?.total || 0} merchant aktif membeli
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
