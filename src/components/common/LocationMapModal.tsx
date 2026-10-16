import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Navigation, Check, X, Loader2, Sparkles, Satellite, Layers, Info, Compass, ArrowLeft } from 'lucide-react';
import { fetchIndiaPincodeDetails } from '../../utils/indiaLocations';

export interface LocationSelectedData {
  country: string;
  state: string;
  district: string;
  city: string;
  pincode: string;
  streetAddress: string;
  latitude: number;
  longitude: number;
  facilityName?: string;
}

interface LocationMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyLocation: (data: LocationSelectedData) => void;
  initialPincode?: string;
  initialCity?: string;
  initialState?: string;
  initialCountry?: string;
  initialFacilityName?: string;
  modalTitle?: string;
}

const GOOGLE_MAPS_API_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_MAPS_API_KEY) ||
  'AIzaSyAaFLDNxq6cBmjSnyzMSrhbcBGQkOv-XtY';

// Dynamically load Google Maps script
let googleMapsScriptPromise: Promise<void> | null = null;
export function loadGoogleMapsScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if ((window as any).google && (window as any).google.maps) {
    return Promise.resolve();
  }
  if (!googleMapsScriptPromise) {
    googleMapsScriptPromise = new Promise((resolve, reject) => {
      const existingScript = document.getElementById('google-maps-js-sdk');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', (e) => reject(e));
        return;
      }
      const script = document.createElement('script');
      script.id = 'google-maps-js-sdk';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry&v=weekly`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = (err) => reject(err);
      document.head.appendChild(script);
    });
  }
  return googleMapsScriptPromise;
}

export const LocationMapModal: React.FC<LocationMapModalProps> = ({
  isOpen,
  onClose,
  onApplyLocation,
  initialPincode = '',
  initialCity = '',
  initialState = '',
  initialCountry = 'India',
  initialFacilityName = '',
  modalTitle,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const debounceGeocodeTimerRef = useRef<any>(null);

  // Default coordinates: Hyderabad / Central India
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: 17.385044, lng: 78.486671 });
  const [mapType, setMapType] = useState<'hybrid' | 'roadmap' | 'satellite'>('hybrid');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);

  // Extracted location fields
  const [facilityName, setFacilityName] = useState(initialFacilityName || '');
  const [country, setCountry] = useState(initialCountry || 'India');
  const [state, setState] = useState(initialState || '');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState(initialCity || '');
  const [pincode, setPincode] = useState(initialPincode || '');
  const [streetAddress, setStreetAddress] = useState('');
  const [displayName, setDisplayName] = useState('');

  // Extract address details from Google Geocoder results
  const parseGoogleGeocodeResult = (result: any) => {
    if (!result) return;
    const comps: any[] = result.address_components || [];
    let detectedPin = '';
    let detectedCity = '';
    let detectedDistrict = '';
    let detectedState = '';
    let detectedCountry = '';
    let route = '';
    let premise = '';
    let sublocality = '';

    for (const comp of comps) {
      const types = comp.types || [];
      if (types.includes('postal_code')) {
        detectedPin = comp.long_name.replace(/\D/g, '').slice(0, 6);
      } else if (types.includes('locality')) {
        detectedCity = comp.long_name;
      } else if (types.includes('sublocality') || types.includes('sublocality_level_1')) {
        sublocality = comp.long_name;
      } else if (types.includes('administrative_area_level_2')) {
        detectedDistrict = comp.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        detectedState = comp.long_name;
      } else if (types.includes('country')) {
        detectedCountry = comp.long_name;
      } else if (types.includes('route')) {
        route = comp.long_name;
      } else if (types.includes('premise') || types.includes('street_number')) {
        premise = comp.long_name;
      }
    }

    const effectiveCity = detectedCity || sublocality || detectedDistrict || city;
    const effectiveDistrict = detectedDistrict || effectiveCity;
    const effectiveState = detectedState || state;
    const effectiveCountry = detectedCountry || country;
    const effectiveAddress = [premise, route, sublocality, effectiveCity].filter(Boolean).join(', ') || result.formatted_address;

    if (effectiveCountry) setCountry(effectiveCountry);
    if (effectiveState) setState(effectiveState);
    if (effectiveDistrict) setDistrict(effectiveDistrict);
    if (effectiveCity) setCity(effectiveCity);
    if (detectedPin) setPincode(detectedPin);
    if (effectiveAddress) setStreetAddress(effectiveAddress);
    if (result.name && typeof result.name === 'string') {
      setFacilityName(result.name);
    }
    setDisplayName(result.formatted_address || '');

    const hospitalLabel = result.name ? `[${result.name}] ` : '';
    setLocationNotice(
      `✓ Location Pinned: ${hospitalLabel}${effectiveCity}${detectedDistrict && detectedDistrict !== effectiveCity ? ` (${detectedDistrict})` : ''}, ${effectiveState} ${detectedPin ? `• PIN ${detectedPin}` : ''}`
    );
  };

  // Reverse Geocode with debouncing (300ms) to avoid locking up main thread or hitting rate limits
  const reverseGeocodeGoogle = (lat: number, lng: number) => {
    if (debounceGeocodeTimerRef.current) {
      clearTimeout(debounceGeocodeTimerRef.current);
    }
    setGeocoding(true);
    setLocationNotice('Resolving address from Google Maps satellite imagery...');

    debounceGeocodeTimerRef.current = setTimeout(async () => {
      const tryBackendFallback = async () => {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 4000);
          const res = await fetch(`/api/lookup/reverse-geocode?lat=${lat}&lng=${lng}`, { signal: controller.signal });
          clearTimeout(timer);
          if (res.ok) {
            const d = await res.json();
            if (d && d.success) {
              if (d.country) setCountry(d.country);
              if (d.state) setState(d.state);
              if (d.district) setDistrict(d.district);
              if (d.city) setCity(d.city);
              if (d.pincode) setPincode(d.pincode);
              if (d.streetAddress) setStreetAddress(d.streetAddress);
              if (d.formattedAddress) setDisplayName(d.formattedAddress);
              setLocationNotice(`✓ Location identified: ${d.city || d.district}, ${d.state} ${d.pincode ? `• PIN ${d.pincode}` : ''}`);
              return true;
            }
          }
        } catch (err) {
          console.warn('Backend reverse-geocode notice:', err);
        }
        return false;
      };

      if (geocoderRef.current) {
        geocoderRef.current.geocode(
          { location: { lat, lng } },
          async (results: any[], status: string) => {
            setGeocoding(false);
            if (status === 'OK' && results && results.length > 0) {
              parseGoogleGeocodeResult(results[0]);
            } else {
              const ok = await tryBackendFallback();
              if (!ok) {
                setLocationNotice(`Pinned at: ${lat.toFixed(5)}, ${lng.toFixed(5)}. Click 'Confirm This Location' below.`);
              }
            }
            setTimeout(() => setLocationNotice(null), 5000);
          }
        );
      } else {
        const ok = await tryBackendFallback();
        setGeocoding(false);
        if (!ok) {
          setLocationNotice(`Pinned at: ${lat.toFixed(5)}, ${lng.toFixed(5)}.`);
        }
        setTimeout(() => setLocationNotice(null), 5000);
      }
    }, 300);
  };

  // Search by PIN Code or Place Name via Google Maps Geocoder
  const handleSearchLocation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    const clean = searchQuery.trim();
    setLocationNotice(`Searching Google Maps for "${clean}"...`);

    // If 6-digit Indian PIN code, also prefill using instant Indian Postal DB
    if (/^\d{6}$/.test(clean)) {
      try {
        const pinDetails = await fetchIndiaPincodeDetails(clean);
        if (pinDetails) {
          if (pinDetails.state) setState(pinDetails.state);
          if (pinDetails.district) setDistrict(pinDetails.district);
          if (pinDetails.city) setCity(pinDetails.city);
          setPincode(clean);
        }
      } catch {}
    }

    if (geocoderRef.current && mapInstanceRef.current) {
      geocoderRef.current.geocode(
        {
          address: clean,
          componentRestrictions: /^\d{6}$/.test(clean) ? { country: 'in', postalCode: clean } : undefined,
        },
        (results: any[], status: string) => {
          setSearching(false);
          if (status === 'OK' && results && results[0]) {
            const loc = results[0].geometry.location;
            const targetLat = loc.lat();
            const targetLng = loc.lng();
            setCoords({ lat: targetLat, lng: targetLng });

            // Smooth transition
            mapInstanceRef.current.panTo({ lat: targetLat, lng: targetLng });
            mapInstanceRef.current.setZoom(16);

            if (markerInstanceRef.current) {
              markerInstanceRef.current.setPosition({ lat: targetLat, lng: targetLng });
            }

            parseGoogleGeocodeResult(results[0]);
          } else {
            setLocationNotice(`No location found for "${clean}". Click directly on satellite map to pin.`);
            setTimeout(() => setLocationNotice(null), 4000);
          }
        }
      );
    } else {
      setSearching(false);
    }
  };

  // Quick Jump to Selected City
  const handleJumpCity = (cityName: string, lat: number, lng: number) => {
    setCoords({ lat, lng });
    setCity(cityName);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo({ lat, lng });
      mapInstanceRef.current.setZoom(14);
    }
    if (markerInstanceRef.current) {
      markerInstanceRef.current.setPosition({ lat, lng });
    }
    reverseGeocodeGoogle(lat, lng);
    setLocationNotice(`Centered map on ${cityName}. Click satellite map to pinpoint exact location.`);
    setTimeout(() => setLocationNotice(null), 4000);
  };

  // Auto-locate user's actual device location via Browser Geolocation (with explicit permission prompt)
  const handleDetectGPS = () => {
    setDetectingGps(true);
    setLocationNotice('📍 Requesting location services permission... Please click "Allow" in your browser prompt.');

    const applyPos = (latitude: number, longitude: number, label: string) => {
      setCoords({ lat: latitude, lng: longitude });
      setDetectingGps(false);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.panTo({ lat: latitude, lng: longitude });
        mapInstanceRef.current.setZoom(17);
      }
      if (markerInstanceRef.current) {
        markerInstanceRef.current.setPosition({ lat: latitude, lng: longitude });
      }
      reverseGeocodeGoogle(latitude, longitude);
      setLocationNotice(label);
      setTimeout(() => setLocationNotice(null), 6000);
    };

    if (!navigator.geolocation) {
      setDetectingGps(false);
      setLocationNotice('⚠️ Browser Geolocation is not supported in this browser. Please click directly on the map or search.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy || 10);
        applyPos(lat, lng, `✓ Device GPS location captured accurately (±${accuracy}m precision)! Click "Confirm This Location" below.`);
      },
      (err) => {
        setDetectingGps(false);
        if (err.code === 1) { // PERMISSION_DENIED
          setLocationNotice('⚠️ Location access permission was denied. Tap the location/lock icon in your browser address bar to allow location services, or click directly on the satellite map.');
        } else if (err.code === 2) { // POSITION_UNAVAILABLE
          setLocationNotice('⚠️ Location signal unavailable. Please search your city/PIN or click on the satellite map to pin.');
        } else { // TIMEOUT or unknown
          setLocationNotice('⚠️ Location request timed out. Please click directly on the map or search your locality.');
        }
        setTimeout(() => setLocationNotice(null), 7000);
      },
      { timeout: 10000, enableHighAccuracy: true, maximumAge: 0 }
    );
  };

  // Toggle Satellite Hybrid / Roadmap
  const handleToggleMapType = (type: 'hybrid' | 'roadmap' | 'satellite') => {
    setMapType(type);
    if (mapInstanceRef.current && (window as any).google?.maps) {
      mapInstanceRef.current.setMapTypeId(type);
    }
  };

  // Initialize Google Maps instance
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    loadGoogleMapsScript()
      .then(() => {
        if (!isMounted || !mapContainerRef.current) return;
        const google = (window as any).google;
        if (!google || !google.maps) return;

        geocoderRef.current = new google.maps.Geocoder();

        // Initial Map Options with Satellite (hybrid) View and Mandatory attribution
        const mapOptions = {
          center: coords,
          zoom: 15,
          mapTypeId: google.maps.MapTypeId.HYBRID, // SATELLITE WITH LABELS
          streetViewControl: true,
          mapTypeControl: false, // Custom styled switcher
          fullscreenControl: false,
          zoomControl: true,
          zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_CENTER,
          },
          gestureHandling: 'greedy',
          internalUsageAttributionIds: ['gmp_git_agentskills_v1'],
        };

        const map = new google.maps.Map(mapContainerRef.current, mapOptions);
        mapInstanceRef.current = map;

        // Custom Marker
        const marker = new google.maps.Marker({
          position: coords,
          map,
          draggable: true,
          animation: google.maps.Animation.DROP,
          title: 'Selected Healthcare Facility Location',
        });
        markerInstanceRef.current = marker;

        // Map Click Listener - smooth pan & pin drop with POI (Place) detection
        map.addListener('click', (e: any) => {
          if (e.placeId) {
            e.stop(); // Stop default popup window
            if (google.maps.places) {
              const placesService = new google.maps.places.PlacesService(map);
              placesService.getDetails(
                { placeId: e.placeId, fields: ['name', 'formatted_address', 'address_components', 'geometry'] },
                (place: any, status: string) => {
                  if (status === 'OK' && place) {
                    if (place.name) setFacilityName(place.name);
                    if (place.geometry?.location) {
                      const lat = place.geometry.location.lat();
                      const lng = place.geometry.location.lng();
                      setCoords({ lat, lng });
                      marker.setPosition({ lat, lng });
                      map.panTo({ lat, lng });
                    }
                    parseGoogleGeocodeResult(place);
                  }
                }
              );
              return;
            }
          }
          if (!e.latLng) return;
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          setCoords({ lat, lng });
          marker.setPosition({ lat, lng });
          map.panTo({ lat, lng });
          reverseGeocodeGoogle(lat, lng);
        });

        // Marker Drag Listener
        marker.addListener('dragend', (e: any) => {
          if (!e.latLng) return;
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          setCoords({ lat, lng });
          map.panTo({ lat, lng });
          reverseGeocodeGoogle(lat, lng);
        });

        setMapReady(true);

        // Auto trigger search if initialPincode or initialCity provided
        if (initialPincode && initialPincode.length === 6) {
          setSearchQuery(initialPincode);
          geocoderRef.current.geocode(
            { address: initialPincode, componentRestrictions: { country: 'in' } },
            (results: any[], status: string) => {
              if (status === 'OK' && results && results[0]) {
                const loc = results[0].geometry.location;
                const lat = loc.lat();
                const lng = loc.lng();
                setCoords({ lat, lng });
                map.panTo({ lat, lng });
                map.setZoom(16);
                marker.setPosition({ lat, lng });
                parseGoogleGeocodeResult(results[0]);
              }
            }
          );
        } else if (initialCity) {
          setSearchQuery(`${initialCity}, ${initialState || 'India'}`);
          geocoderRef.current.geocode(
            { address: `${initialCity}, ${initialState || 'India'}` },
            (results: any[], status: string) => {
              if (status === 'OK' && results && results[0]) {
                const loc = results[0].geometry.location;
                const lat = loc.lat();
                const lng = loc.lng();
                setCoords({ lat, lng });
                map.panTo({ lat, lng });
                map.setZoom(15);
                marker.setPosition({ lat, lng });
                parseGoogleGeocodeResult(results[0]);
              }
            }
          );
        } else {
          // Auto-fetch user live location immediately via GPS / network
          handleDetectGPS();
        }
      })
      .catch((err) => {
        console.warn('Google Maps load error:', err);
        setLocationNotice('Google Maps script loading failed. Please check network connection.');
      });

    return () => {
      isMounted = false;
      mapInstanceRef.current = null;
      markerInstanceRef.current = null;
      geocoderRef.current = null;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApply = () => {
    onApplyLocation({
      country,
      state,
      district,
      city,
      pincode,
      streetAddress: streetAddress || displayName,
      latitude: coords.lat,
      longitude: coords.lng,
      facilityName: facilityName.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-1 sm:p-2 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-[98vw] w-[98vw] max-h-[97vh] h-[96vh] p-3 sm:p-4 shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pb-2.5 border-b border-slate-100 shrink-0 gap-2">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs border border-slate-200 shrink-0"
              title="Go back to the registration page"
            >
              <ArrowLeft className="w-4 h-4 text-slate-700" />
              <span>Back to Registration</span>
            </button>

            <div className="p-2 bg-amber-500/10 text-amber-700 rounded-xl border border-amber-200/60 shadow-xs hidden sm:block">
              <Satellite className="w-4 h-4 text-amber-600" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight truncate">
                  {modalTitle || 'Google Maps Satellite Location & Pinning'}
                </h3>
                <span className="hidden md:inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                  Google Maps Verified
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                Click anywhere on satellite map or drag the pin to set your exact location.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 justify-end">
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-all ring-2 ring-emerald-500/20"
            >
              <Check className="w-4 h-4 text-emerald-100" />
              <span>Confirm This Location</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
              title="Close and return to registration"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Satellite Toggle Bar */}
        <div className="py-2.5 flex flex-col sm:flex-row gap-2 border-b border-slate-100 shrink-0">
          <form onSubmit={handleSearchLocation} className="relative flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Google Maps: Hospital name, 6-digit PIN (e.g. 500001), or locality..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs transition-colors"
            >
              {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              <span>Search Maps</span>
            </button>
          </form>

          {/* Quick GPS & Layer Switchers */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => handleToggleMapType('hybrid')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  mapType === 'hybrid' || mapType === 'satellite'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Google Maps Satellite Imagery with street labels"
              >
                <Satellite className="w-3.5 h-3.5" />
                <span>Satellite</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleMapType('roadmap')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  mapType === 'roadmap'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Standard street roadmap view"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Map</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleDetectGPS}
              disabled={detectingGps}
              className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
              title="Automatically locate me via Device GPS (prompts browser permission)"
            >
              <Navigation className={`w-3.5 h-3.5 ${detectingGps ? 'animate-spin' : ''}`} />
              <span>{detectingGps ? 'Detecting Location...' : '🎯 Auto-Locate GPS'}</span>
            </button>
          </div>
        </div>

        {/* Quick Indian City Shortcut Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1.5 border-b border-slate-100 shrink-0 text-[11px]">
          <span className="text-slate-400 font-bold shrink-0">Quick Center:</span>
          {[
            { name: 'Hyderabad', lat: 17.385044, lng: 78.486671 },
            { name: 'Bengaluru', lat: 12.971598, lng: 77.594562 },
            { name: 'Mumbai', lat: 19.07609, lng: 72.877426 },
            { name: 'Chennai', lat: 13.08268, lng: 80.270721 },
            { name: 'Pune', lat: 18.52043, lng: 73.856743 },
            { name: 'Kolkata', lat: 22.572646, lng: 88.363895 },
            { name: 'Delhi NCR', lat: 28.613939, lng: 77.209021 },
          ].map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => handleJumpCity(c.name, c.lat, c.lng)}
              className="px-2 py-0.5 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 rounded-lg font-semibold shrink-0 transition-colors border border-slate-200 cursor-pointer"
            >
              📍 {c.name}
            </button>
          ))}
        </div>

        {/* Live Notification Bar */}
        {locationNotice && (
          <div className="my-1.5 p-2 px-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-950 flex items-center gap-2 animate-in fade-in shrink-0">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="truncate">{locationNotice}</span>
          </div>
        )}

        {/* Main Content Area: Dominant Visual Map Window + Floating/Side Address Panel */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0 overflow-hidden pt-2">
          {/* Big Map Canvas (Dominant 9 columns on desktop, full height) */}
          <div className="lg:col-span-9 flex flex-col h-full min-h-[460px] sm:min-h-[580px] relative">
            <div className="relative flex-1 w-full h-full rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-900">
              <div ref={mapContainerRef} className="w-full h-full" />

              {/* Satellite active watermark badge */}
              <div className="absolute top-3 left-3 px-3 py-1.5 bg-slate-950/85 backdrop-blur-md rounded-xl text-white text-[11px] font-bold border border-white/20 flex items-center gap-1.5 pointer-events-none shadow-lg z-10">
                <Satellite className="w-4 h-4 text-amber-400" />
                <span>Google Satellite Hybrid • {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</span>
              </div>

              {/* Loading Indicator */}
              {(geocoding || !mapReady) && (
                <div className="absolute top-3 right-3 px-3.5 py-1.5 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl text-xs font-bold text-amber-800 shadow-lg flex items-center gap-1.5 pointer-events-none z-10">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                  <span>{mapReady ? 'Resolving Address...' : 'Loading Google Maps Satellite...'}</span>
                </div>
              )}

              {/* Interactive Selected Location Floating Confirmation Card (User Requirement: Confirm this location & Back navigation) */}
              <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-md bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-2xl border border-emerald-300 flex flex-col gap-2 z-20 animate-in slide-in-from-bottom-2">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl shrink-0 mt-0.5">
                    <MapPin className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Selected Location
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-xs truncate mt-0.5">
                      {facilityName || city || 'Location Pinned on Map'}
                    </h4>
                    <p className="text-[11px] text-slate-600 truncate">
                      {[streetAddress, city, district, state, pincode].filter(Boolean).join(', ') || 'Exact position pinned on Google Maps'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleApply}
                    className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:from-emerald-800 text-white font-black rounded-xl text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all ring-2 ring-emerald-500/30"
                  >
                    <Check className="w-4 h-4 text-emerald-100" />
                    <span>Confirm This Location</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Address Details & Confirmation Sidebar (3 columns on desktop) */}
          <div className="lg:col-span-3 flex flex-col justify-between overflow-y-auto space-y-3 bg-slate-50/80 p-3.5 sm:p-4 rounded-2xl border border-slate-200">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-teal-700" />
                  <span>Pinned Location Details</span>
                </span>
                <span className="text-[10px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-full border border-teal-200">
                  Live Synced
                </span>
              </div>

              {/* Selected Facility / Hospital Name from Google Maps */}
              <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-amber-800">
                    Hospital / Landmark Name
                  </span>
                  {facilityName && (
                    <span className="text-emerald-700 font-extrabold text-[10px] bg-emerald-50 px-2 py-0.2 rounded border border-emerald-200">
                      ✓ Captured
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={facilityName}
                  onChange={(e) => setFacilityName(e.target.value)}
                  placeholder="e.g. Metro Care Hospital / Home Landmark..."
                  className="w-full font-bold text-slate-900 bg-transparent outline-none text-xs placeholder:text-slate-400 placeholder:font-normal"
                />
              </div>

              {/* Fetched Details Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">PIN Code</span>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="e.g. 500001"
                    className="font-mono font-bold text-slate-900 bg-transparent w-full outline-none"
                  />
                </div>

                <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">City / Locality</span>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                    className="font-bold text-slate-900 bg-transparent w-full outline-none"
                  />
                </div>

                <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">District</span>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="District"
                    className="font-bold text-slate-900 bg-transparent w-full outline-none"
                  />
                </div>

                <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">State</span>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="State"
                    className="font-bold text-slate-900 bg-transparent w-full outline-none"
                  />
                </div>
              </div>

              {/* Exact Address / Landmark */}
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl text-xs">
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Full Street Address & Coordinates
                </span>
                <textarea
                  rows={2}
                  value={streetAddress || displayName}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  placeholder="Street address or building number..."
                  className="w-full text-xs font-medium text-slate-800 bg-transparent outline-none resize-none"
                />
                <div className="mt-1 pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>GPS: {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}</span>
                  <span>{country}</span>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="pt-3 border-t border-slate-200 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleApply}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:from-emerald-800 text-white font-black rounded-xl text-xs cursor-pointer shadow-md transition-all flex items-center justify-center gap-2 ring-2 ring-emerald-500/20"
              >
                <Check className="w-4 h-4 text-emerald-100" />
                <span>Confirm This Location</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-colors flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
                <span>Back to Registration</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
