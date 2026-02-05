import React, { useEffect, useRef, useState } from "react";
import config from "../config";
import "maplibre-gl/dist/maplibre-gl.css";

const MetadataMap = () => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    async function fetchLocations() {
      try {
        const res = await fetch(`${config.apiUrl}/gene-details/locations`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const { locations: locs, stats: serverStats } = await res.json();
        setLocations(locs);
        setStats({
          totalSamples: parseInt(serverStats.total_samples),
          countries: parseInt(serverStats.total_countries),
          continents: parseInt(serverStats.total_continents),
          biomes: parseInt(serverStats.total_biomes),
        });
      } catch (err) {
        setError(err.toString());
      } finally {
        setLoading(false);
      }
    }
    fetchLocations();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || loading || error || !locations.length) return;
    if (mapRef.current) return;

    const maplibregl = require("maplibre-gl");

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: [0, 20],
      zoom: 1.5,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      const geojson = {
        type: "FeatureCollection",
        features: locations.map(loc => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [loc.longitude, loc.latitude],
          },
          properties: {
            accession: loc.accession,
            country: loc.country || "Unknown",
            continent: loc.continent || "Unknown",
            biome: loc.biome || "Unknown",
            organism: loc.organism || "Unknown",
            elevation: loc.elevation,
            location_name: loc.location_name || "",
          },
        })),
      };

      map.addSource("locations", { type: "geojson", data: geojson });

      map.addLayer({
        id: "location-circles",
        type: "circle",
        source: "locations",
        paint: {
          "circle-radius": 6,
          "circle-color": "#3b82f6",
          "circle-opacity": 0.7,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#1d4ed8",
        },
      });

      map.on("click", "location-circles", (e) => {
        const feature = e.features[0];
        const props = feature.properties;
        const coords = feature.geometry.coordinates.slice();

        // Wrap longitude for repeated world copies
        while (Math.abs(e.lngLat.lng - coords[0]) > 180) {
          coords[0] += e.lngLat.lng > coords[0] ? 360 : -360;
        }

        const elevationLine = props.elevation
          ? `<p style="margin:0.25rem 0;"><strong>Elevation:</strong> ${props.elevation}m</p>`
          : "";

        const popupHTML = `
          <div style="font-size:0.85rem;max-width:260px;line-height:1.5;">
            <h4 style="margin:0 0 0.5rem;font-size:0.95rem;">
              <a href="/sequence/${props.accession}"
                 style="color:#2563eb;text-decoration:none;font-family:SFMono-Regular,Menlo,Monaco,monospace;">
                ${props.accession}
              </a>
            </h4>
            <p style="margin:0.25rem 0;"><strong>Country:</strong> ${props.country}</p>
            <p style="margin:0.25rem 0;"><strong>Continent:</strong> ${props.continent}</p>
            <p style="margin:0.25rem 0;"><strong>Biome:</strong> ${props.biome}</p>
            <p style="margin:0.25rem 0;"><strong>Organism:</strong> ${props.organism}</p>
            ${elevationLine}
          </div>
        `;

        new maplibregl.Popup({ offset: 10 })
          .setLngLat(coords)
          .setHTML(popupHTML)
          .addTo(map);
      });

      map.on("mouseenter", "location-circles", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "location-circles", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [loading, error, locations]);

  if (loading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
        Loading location data...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: "2rem",
        textAlign: "center",
        color: "#dc2626",
        backgroundColor: "#fef2f2",
        borderRadius: "8px",
        border: "1px solid #fecaca",
      }}>
        Error loading location data: {error}
      </div>
    );
  }

  if (!locations.length) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
        No location data available.
      </div>
    );
  }

  return (
    <div>
      {stats && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
          padding: "1rem",
          backgroundColor: "#f8fafc",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
        }}>
          <div>
            <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "0.25rem" }}>
              Total Samples
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: "600", color: "#2c3e50" }}>
              {stats.totalSamples.toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "0.25rem" }}>
              Countries
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: "600", color: "#2c3e50" }}>
              {stats.countries.toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "0.25rem" }}>
              Continents
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: "600", color: "#2c3e50" }}>
              {stats.continents.toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "0.25rem" }}>
              Biomes
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: "600", color: "#2c3e50" }}>
              {stats.biomes.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      <div
        ref={mapContainerRef}
        style={{
          width: "100%",
          height: "600px",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
        }}
      />
    </div>
  );
};

export default MetadataMap;
