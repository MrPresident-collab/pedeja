import { useEffect, useRef, useState } from 'react';
import { Crosshair, Loader2, MapPin, Search } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

const LUANDA_CENTER = { lat: -8.8383, lng: 13.2344 };

function normalizeAddress(data) {
  const address = data?.address || {};
  return {
    addressLine1: [address.road || address.pedestrian || address.footway, address.house_number]
      .filter(Boolean)
      .join(' ')
      .trim(),
    neighborhood: address.neighbourhood || address.suburb || address.quarter || '',
    municipality: address.municipality || '',
    city: address.city || address.town || address.village || 'Luanda',
    province: address.state || 'Luanda',
    displayName: data?.display_name || '',
  };
}

export default function CustomerAddressPicker({ value, onChange }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const searchTimerRef = useRef(null);
  const searchAbortRef = useRef(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const emitLocation = (lat, lng, address = {}) => {
    onChange({
      ...value,
      latitude: lat,
      longitude: lng,
      ...address,
    });
  };

  useEffect(() => {
    let cancelled = false;

    import('leaflet').then(({ default: L }) => {
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center: [value.latitude || LUANDA_CENTER.lat, value.longitude || LUANDA_CENTER.lng],
        zoom: value.latitude && value.longitude ? 16 : 12,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      map.on('click', async (event) => {
        const { lat, lng } = event.latlng;
        if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
        else markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);

        if (!markerRef.current._pedejaBound) {
          markerRef.current.on('dragend', async (e) => {
            const p = e.target.getLatLng();
            emitLocation(p.lat, p.lng);
          });
          markerRef.current._pedejaBound = true;
        }

        emitLocation(lat, lng);
      });

      if (value.latitude && value.longitude) {
        markerRef.current = L.marker([value.latitude, value.longitude], { draggable: true }).addTo(map);
        markerRef.current.on('dragend', (event) => {
          const p = event.target.getLatLng();
          emitLocation(p.lat, p.lng);
        });
      }

      mapRef.current = map;
      setMapReady(true);
      setTimeout(() => map.invalidateSize(), 0);
    });

    return () => {
      cancelled = true;
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      if (searchAbortRef.current) searchAbortRef.current.abort();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !value.latitude || !value.longitude) return;
    const L = window.L;
    if (markerRef.current) {
      markerRef.current.setLatLng([value.latitude, value.longitude]);
    } else if (L) {
      markerRef.current = L.marker([value.latitude, value.longitude], { draggable: true }).addTo(mapRef.current);
    }
    mapRef.current.panTo([value.latitude, value.longitude]);
  }, [value.latitude, value.longitude]);

  const searchAddress = (text) => {
    const trimmed = text.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (searchAbortRef.current) searchAbortRef.current.abort();

    setSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      searchAbortRef.current = controller;

      try {
        const params = new URLSearchParams({
          format: 'jsonv2',
          q: trimmed,
          countrycodes: 'ao',
          limit: '5',
          addressdetails: '1',
          'accept-language': 'pt',
        });

        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?${params.toString()}`,
          { signal: controller.signal, headers: { Accept: 'application/json' } },
        );

        if (!response.ok) throw new Error('Geocoding failed');
        setResults(await response.json());
      } catch (error) {
        if (error.name !== 'AbortError') setResults([]);
      } finally {
        setSearching(false);
      }
    }, 450);
  };

  const selectResult = (result) => {
    const lat = Number(result.lat);
    const lng = Number(result.lon);
    const normalized = normalizeAddress(result);

    setQuery(normalized.displayName);
    setResults([]);

    if (mapRef.current) {
      mapRef.current.setView([lat, lng], 17, { animate: true });
      if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
      else {
        import('leaflet').then(({ default: L }) => {
          markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(mapRef.current);
          markerRef.current.on('dragend', (event) => {
            const p = event.target.getLatLng();
            emitLocation(p.lat, p.lng);
          });
        });
      }
    }

    emitLocation(lat, lng, normalized);
  };

  const useDeviceLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLocating(false);

        if (mapRef.current) mapRef.current.setView([lat, lng], 17, { animate: true });
        if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
        else {
          import('leaflet').then(({ default: L }) => {
            markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(mapRef.current);
            markerRef.current.on('dragend', (event) => {
              const p = event.target.getLatLng();
              emitLocation(p.lat, p.lng);
            });
          });
        }

        emitLocation(lat, lng);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  const hasCoordinates = Number.isFinite(value.latitude) && Number.isFinite(value.longitude);

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1.5">Morada</label>
        <input
          value={value.addressLine1}
          onChange={(e) => onChange({ ...value, addressLine1: e.target.value })}
          className="input-field dark:bg-gray-800 dark:text-white dark:border-gray-700"
          placeholder="Rua / Avenida e nº da casa"
          autoComplete="street-address"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input
          value={value.neighborhood}
          onChange={(e) => onChange({ ...value, neighborhood: e.target.value })}
          className="input-field dark:bg-gray-800 dark:text-white dark:border-gray-700"
          placeholder="Bairro"
          autoComplete="address-level3"
        />
        <input
          value={value.municipality}
          onChange={(e) => onChange({ ...value, municipality: e.target.value })}
          className="input-field dark:bg-gray-800 dark:text-white dark:border-gray-700"
          placeholder="Município"
          autoComplete="address-level2"
        />
      </div>

      <div>
        <input
          value={value.reference}
          onChange={(e) => onChange({ ...value, reference: e.target.value })}
          className="input-field dark:bg-gray-800 dark:text-white dark:border-gray-700"
          placeholder="Referência (ex.: perto do mercado...)"
        />
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-3 text-gray-400" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            searchAddress(e.target.value);
          }}
          className="input-field pl-9 dark:bg-gray-800 dark:text-white dark:border-gray-700"
          placeholder="Pesquisar a morada no mapa"
        />
        {searching && <Loader2 size={16} className="absolute right-3 top-3 animate-spin text-violet-600" />}

        {results.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 z-[2000] bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {results.map((result) => (
              <button
                key={result.place_id}
                type="button"
                onClick={() => selectResult(result)}
                className="w-full text-left px-3 py-2.5 hover:bg-violet-50 dark:hover:bg-gray-800 border-b last:border-b-0 border-gray-100 dark:border-gray-800"
              >
                <div className="text-xs font-semibold text-gray-900 dark:text-white">{result.display_name.split(',')[0]}</div>
                <div className="text-[11px] text-gray-500 truncate">{result.display_name}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 relative">
        <div ref={containerRef} className="h-52 w-full" />
        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
            <Loader2 className="animate-spin text-violet-600" />
          </div>
        )}
        <button
          type="button"
          onClick={useDeviceLocation}
          disabled={locating}
          className="absolute bottom-3 right-3 z-[1000] bg-white dark:bg-gray-900 shadow-lg rounded-xl px-3 py-2 text-xs font-bold text-violet-700 disabled:opacity-60"
        >
          <Crosshair size={14} className="inline mr-1" />
          {locating ? 'A localizar…' : 'Usar localização actual'}
        </button>
      </div>

      <div className={`rounded-xl px-3 py-2 text-xs ${hasCoordinates ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'}`}>
        <MapPin size={14} className="inline mr-1" />
        {hasCoordinates
          ? 'Localização confirmada. Pode ajustar o pin no mapa.'
          : 'Confirme a localização no mapa para permitir entregas precisas.'}
      </div>
    </div>
  );
}
