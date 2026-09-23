import { useEffect, useRef, useState } from 'react';
import { Crosshair, Loader2, MapPin, Search } from 'lucide-react';

function normalizeAddress(data) {
  const address = data?.address || {};
  return {
    addressLine1: [address.road || address.pedestrian || address.footway, address.house_number]
      .filter(Boolean)
      .join(' ')
      .trim(),
    neighborhood: address.neighbourhood || address.suburb || address.quarter || '',
    municipality: address.municipality || '',
    city: address.city || address.town || address.village || '',
    province: address.state || '',
    displayName: data?.display_name || '',
  };
}

function hasCoordinates(value) {
  return Number.isFinite(Number(value?.latitude)) && Number.isFinite(Number(value?.longitude));
}

export default function CustomerAddressPicker({ value = {}, onChange }) {
  const searchTimerRef = useRef(null);
  const searchAbortRef = useRef(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      if (searchAbortRef.current) searchAbortRef.current.abort();
    };
  }, []);

  const update = (patch) => onChange({ ...value, ...patch, latitude: patch.latitude ?? value.latitude ?? null, longitude: patch.longitude ?? value.longitude ?? null });

  const searchAddress = (text) => {
    const trimmed = text.trim();

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (searchAbortRef.current) searchAbortRef.current.abort();

    if (!trimmed) {
      setResults([]);
      setSearching(false);
      return;
    }

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
        const data = await response.json();
        if (!controller.signal.aborted) setResults(Array.isArray(data) ? data : []);
      } catch (error) {
        if (error.name !== 'AbortError') setResults([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 450);
  };

  const selectResult = (result) => {
    const lat = Number(result.lat);
    const lng = Number(result.lon);
    const normalized = normalizeAddress(result);

    setQuery(normalized.displayName);
    setResults([]);
    setLocationError('');

    update({
      ...normalized,
      latitude: Number.isFinite(lat) ? lat : null,
      longitude: Number.isFinite(lng) ? lng : null,
      locationResolutionStatus: Number.isFinite(lat) && Number.isFinite(lng)
        ? 'resolved'
        : 'unresolved',
      locationSource: Number.isFinite(lat) && Number.isFinite(lng) ? 'geocoder' : null,
    });
  };

  const useDeviceLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('O dispositivo não disponibiliza localização.');
      return;
    }

    setLocationError('');
    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const lat = Number(coords.latitude);
        const lng = Number(coords.longitude);
        setLocating(false);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          setLocationError('Não foi possível obter uma localização válida.');
          return;
        }

        update({
          latitude: lat,
          longitude: lng,
          locationResolutionStatus: 'resolved',
          locationSource: 'device',
        });
      },
      () => {
        setLocating(false);
        setLocationError('Não foi possível obter a localização. Pode continuar a preencher a morada manualmente.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  const resolved = hasCoordinates(value);

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1.5">Morada</label>
        <input
          value={value.addressLine1 || ''}
          onChange={(e) => update({ addressLine1: e.target.value, locationResolutionStatus: 'unresolved' })}
          className="input-field dark:bg-gray-800 dark:text-white dark:border-gray-700"
          placeholder="Rua / Avenida e nº da casa"
          autoComplete="street-address"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input
          value={value.neighborhood || ''}
          onChange={(e) => update({ neighborhood: e.target.value })}
          className="input-field dark:bg-gray-800 dark:text-white dark:border-gray-700"
          placeholder="Bairro"
          autoComplete="address-level3"
        />
        <input
          value={value.municipality || ''}
          onChange={(e) => update({ municipality: e.target.value })}
          className="input-field dark:bg-gray-800 dark:text-white dark:border-gray-700"
          placeholder="Município"
          autoComplete="address-level2"
        />
      </div>

      <div>
        <input
          value={value.reference || ''}
          onChange={(e) => update({ reference: e.target.value })}
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
          placeholder="Pesquisar esta morada (opcional)"
          aria-label="Pesquisar morada"
        />
        {searching && <Loader2 size={16} className="absolute right-3 top-3 animate-spin text-violet-600" />}

        {results.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {results.map((result) => (
              <button
                key={result.place_id}
                type="button"
                onClick={() => selectResult(result)}
                className="w-full text-left px-3 py-2.5 hover:bg-violet-50 dark:hover:bg-gray-800 border-b last:border-b-0 border-gray-100 dark:border-gray-800"
              >
                <div className="text-xs font-semibold text-gray-900 dark:text-white">
                  {result.display_name?.split(',')[0] || 'Morada encontrada'}
                </div>
                <div className="text-[11px] text-gray-500 truncate">{result.display_name}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={useDeviceLocation}
        disabled={locating}
        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2.5 text-xs font-bold text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-gray-800 disabled:opacity-60"
      >
        <Crosshair size={14} className="inline mr-1" />
        {locating ? 'A localizar…' : 'Usar localização actual (opcional)'}
      </button>

      <div className={`rounded-xl px-3 py-2 text-xs ${
        resolved
          ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300'
          : 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
      }`}>
        <MapPin size={14} className="inline mr-1" />
        {resolved
          ? 'Localização encontrada. A morada continua a ser a informação principal para a entrega.'
          : 'Pode guardar a morada mesmo sem localização automática. A nossa equipa pode resolver o resto.'}
      </div>

      {locationError && (
        <p className="text-xs text-amber-700 dark:text-amber-300">{locationError}</p>
      )}
    </div>
  );
}
