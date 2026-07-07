import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function HikeMap({ lat, lng, label }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Custom SVG Icon matching Monokai Blue and Deep palette
    const customIcon = L.divIcon({
      html: `
        <div style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#78dce8" stroke="#19181a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 32px; height: 32px; filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.45));">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3" fill="#19181a"/>
          </svg>
        </div>
      `,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });

    // Initialize map if it doesn't exist
    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        center: [lat, lng],
        zoom: 13,
        zoomControl: true,
        scrollWheelZoom: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapRef.current);

      markerRef.current = L.marker([lat, lng], { icon: customIcon })
        .addTo(mapRef.current)
        .bindPopup(`<b style="color: #221f22;">${label} Trailhead</b>`)
        .openPopup();
    } else {
      // Re-center map and update marker position
      mapRef.current.setView([lat, lng], 13);
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
        markerRef.current.setIcon(customIcon);
        markerRef.current.setPopupContent(`<b style="color: #221f22;">${label} Trailhead</b>`).openPopup();
      }
    }

    // Handle invalidating size after component mount to avoid rendering glitches
    const timer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 150);

    return () => {
      clearTimeout(timer);
    };
  }, [lat, lng, label]);

  // Clean up Leaflet on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full rounded-xl border border-monokai-hover overflow-hidden shadow-inner z-0"
    />
  );
}
