import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── Fix for Leaflet default marker icons ──
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapComponent = ({ center, zoom = 15, markers = [] }) => {
    const mapRef = useRef(null);

    // ── Initialize or update map when center/zoom changes ──
    useEffect(() => {
        if (!mapRef.current) {
            // Create the map
            mapRef.current = L.map('map-container').setView([center.lat, center.lng], zoom);

            // Add OpenStreetMap tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            }).addTo(mapRef.current);
        } else {
            // Update view if center changes
            mapRef.current.setView([center.lat, center.lng], zoom);
        }

        // ── Cleanup on unmount ──
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [center, zoom]);

    // ── Update markers when `markers` array changes ──
    useEffect(() => {
        if (!mapRef.current) return;

        // Remove all existing markers (keep the tile layer)
        mapRef.current.eachLayer((layer) => {
            if (layer instanceof L.Marker) {
                mapRef.current.removeLayer(layer);
            }
        });

        // Add new markers
        markers.forEach((m) => {
            L.marker([m.lat, m.lng])
                .addTo(mapRef.current)
                .bindPopup(m.popup || 'Agent location');
        });
    }, [markers]);

    return (
        <div
            id="map-container"
            style={{
                width: '100%',
                height: '400px',
                borderRadius: '0.5rem',
                zIndex: 1,
            }}
        />
    );
};

export default MapComponent;