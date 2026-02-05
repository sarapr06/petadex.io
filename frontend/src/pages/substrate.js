import React, { useState, useEffect, useMemo } from "react";
import { Link } from "gatsby";
import "../styles/home.css";
import SiteHeader from "../components/SiteHeader";
import Seo from "../components/seo";
import config from "../config";
import { useScrollHeader } from "../hooks/useScrollHeader";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
  ScatterChart, Scatter, Cell, ZAxis
} from "recharts";

const mediaColors = {
  "BHET12.5": "#2E86AB",
  "BHET25": "#A23B72",
  "BHET50": "#F18F01",
};

const mediaLabels = {
  "BHET12.5": "BHET 12.5 mM",
  "BHET25": "BHET 25 mM",
  "BHET50": "BHET 50 mM",
};

const allSubstrates = ["BHET12.5", "BHET25", "BHET50"];

// Transform per-gene media data into Recharts line chart format
const transformForChart = (mediaData) => {
  const grouped = {};
  Object.entries(mediaData).forEach(([media, points]) => {
    points.forEach(point => {
      const tp = point.timepoint;
      if (!grouped[tp]) {
        grouped[tp] = { timepoint: tp };
      }
      if (grouped[tp][media] !== undefined) {
        grouped[tp][media] = (grouped[tp][media] + point.average_readout) / 2;
      } else {
        grouped[tp][media] = point.average_readout;
      }
    });
  });
  return Object.values(grouped).sort((a, b) => a.timepoint - b.timepoint);
};

// --- Custom Scatter Tooltip ---
const ScatterTooltipContent = ({ active, payload, xKey, yKey }) => {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div style={{
      backgroundColor: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      padding: "0.75rem 1rem",
      boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
      fontSize: "0.825rem",
      maxWidth: "260px",
    }}>
      <div style={{ fontWeight: "700", color: "#1f2937", marginBottom: "0.3rem", fontFamily: "monospace" }}>
        {data.gene}
      </div>
      {data.nickname && (
        <div style={{ color: "#6b7280", marginBottom: "0.3rem", fontSize: "0.75rem" }}>
          {data.nickname}
        </div>
      )}
      <div style={{ color: mediaColors[xKey], marginBottom: "0.15rem" }}>
        {mediaLabels[xKey]}: <strong>{data.x?.toFixed(4)}</strong>
      </div>
      <div style={{ color: mediaColors[yKey] }}>
        {mediaLabels[yKey]}: <strong>{data.y?.toFixed(4)}</strong>
      </div>
      <div style={{ color: "#9ca3af", marginTop: "0.3rem", fontSize: "0.7rem", fontStyle: "italic" }}>
        Click to jump to gene card
      </div>
    </div>
  );
};

// --- VS Hero Banner ---
const SubstrateHero = ({ heroStats, activeSubstrates }) => {
  const substrates = [...activeSubstrates];
  const isVsMode = substrates.length === 2;

  if (substrates.length === 0) return null;

  return (
    <div style={{
      display: "flex",
      alignItems: "stretch",
      marginBottom: "2rem",
      borderRadius: "12px",
      overflow: "hidden",
      border: "1px solid #e5e7eb",
      boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
      position: "relative",
    }}>
      {substrates.map((substrate, i) => {
        const stats = heroStats[substrate];
        const color = mediaColors[substrate];

        return (
          <React.Fragment key={substrate}>
            {/* VS divider */}
            {isVsMode && i === 1 && (
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "0",
                position: "relative",
                zIndex: 2,
              }}>
                <div style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "50%",
                  backgroundColor: "#1f2937",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "900",
                  fontSize: "0.9rem",
                  letterSpacing: "0.08em",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
                  position: "absolute",
                }}>
                  VS
                </div>
              </div>
            )}

            {/* Non-VS divider for 3+ substrates */}
            {!isVsMode && i > 0 && (
              <div style={{ width: "1px", backgroundColor: "#e5e7eb" }} />
            )}

            <div style={{
              flex: "1",
              padding: "1.75rem 2rem",
              background: `linear-gradient(135deg, ${color}0A 0%, ${color}18 100%)`,
              borderLeft: `4px solid ${color}`,
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "1.25rem",
              }}>
                <div style={{
                  width: "14px",
                  height: "14px",
                  borderRadius: "50%",
                  backgroundColor: color,
                  boxShadow: `0 0 8px ${color}66`,
                }} />
                <span style={{
                  fontSize: "1.3rem",
                  fontWeight: "800",
                  color: "#1f2937",
                }}>
                  {mediaLabels[substrate]}
                </span>
              </div>

              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
              }}>
                <div>
                  <div style={{
                    fontSize: "0.65rem", fontWeight: "700", color: "#9ca3af",
                    textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.2rem"
                  }}>Genes Tested</div>
                  <div style={{ fontSize: "1.75rem", fontWeight: "800", color }}>
                    {stats?.geneCount || 0}
                  </div>
                </div>
                <div>
                  <div style={{
                    fontSize: "0.65rem", fontWeight: "700", color: "#9ca3af",
                    textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.2rem"
                  }}>Mean Activity</div>
                  <div style={{ fontSize: "1.75rem", fontWeight: "800", color }}>
                    {stats?.meanActivity?.toFixed(4) || "—"}
                  </div>
                </div>
                <div>
                  <div style={{
                    fontSize: "0.65rem", fontWeight: "700", color: "#9ca3af",
                    textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.2rem"
                  }}>Top Performer</div>
                  <div style={{
                    fontSize: "1.05rem", fontWeight: "700", color: "#1f2937",
                    fontFamily: "monospace",
                  }}>
                    {stats?.topGene || "—"}
                  </div>
                </div>
                <div>
                  <div style={{
                    fontSize: "0.65rem", fontWeight: "700", color: "#9ca3af",
                    textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.2rem"
                  }}>Peak Timepoint</div>
                  <div style={{ fontSize: "1.05rem", fontWeight: "700", color: "#1f2937" }}>
                    {stats?.peakTimepoint != null ? `${stats.peakTimepoint}h` : "—"}
                  </div>
                </div>
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

// --- Substrate Toggle Chips ---
const SubstrateToggle = ({ activeSubstrates, onToggle }) => (
  <div style={{
    display: "flex",
    gap: "0.75rem",
    marginBottom: "2rem",
    flexWrap: "wrap",
    alignItems: "center",
  }}>
    <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#6b7280" }}>
      Substrates:
    </span>
    {allSubstrates.map(substrate => {
      const isActive = activeSubstrates.has(substrate);
      const color = mediaColors[substrate];
      return (
        <button
          key={substrate}
          onClick={() => onToggle(substrate)}
          style={{
            padding: "0.45rem 1.1rem",
            borderRadius: "20px",
            border: `2px solid ${color}`,
            backgroundColor: isActive ? color : "transparent",
            color: isActive ? "#fff" : color,
            fontWeight: "700",
            fontSize: "0.8rem",
            cursor: "pointer",
            transition: "all 0.2s ease",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
          onMouseEnter={e => {
            if (!isActive) {
              e.currentTarget.style.backgroundColor = `${color}15`;
            }
          }}
          onMouseLeave={e => {
            if (!isActive) {
              e.currentTarget.style.backgroundColor = "transparent";
            }
          }}
        >
          <span style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: isActive ? "#fff" : color,
            display: "inline-block",
          }} />
          {mediaLabels[substrate]}
        </button>
      );
    })}
  </div>
);

// --- Scatter Plot: Substrate Preference ---
const SubstrateScatter = ({
  scatterData, activeSubstrates,
  scatterXAxis, scatterYAxis,
  onXAxisChange, onYAxisChange,
  onDotClick,
}) => {
  const substrates = [...activeSubstrates];

  const diagonalData = useMemo(() => {
    if (scatterData.length === 0) return [];
    const allVals = scatterData.flatMap(d => [d.x, d.y]).filter(v => v != null && !isNaN(v));
    if (allVals.length === 0) return [];
    const min = Math.min(...allVals);
    const max = Math.max(...allVals);
    const pad = (max - min) * 0.05 || 0.01;
    return [
      { x: min - pad, y: min - pad },
      { x: max + pad, y: max + pad },
    ];
  }, [scatterData]);

  return (
    <div style={{
      backgroundColor: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: "12px",
      padding: "1.5rem",
      marginBottom: "2rem",
      boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: "1rem",
        flexWrap: "wrap",
        gap: "1rem",
      }}>
        <div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: "#1f2937", margin: 0 }}>
            Substrate Preference
          </h2>
          <p style={{ fontSize: "0.825rem", color: "#6b7280", margin: "0.25rem 0 0" }}>
            Each dot is one gene — dots above the diagonal prefer the Y-axis substrate
          </p>
        </div>

        {substrates.length > 2 && (
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <label style={{ fontSize: "0.8rem", color: "#6b7280", display: "flex", alignItems: "center", gap: "0.3rem" }}>
              X:
              <select
                value={scatterXAxis}
                onChange={e => onXAxisChange(e.target.value)}
                style={{
                  padding: "0.3rem 0.5rem", borderRadius: "6px",
                  border: `2px solid ${mediaColors[scatterXAxis]}`,
                  fontSize: "0.8rem", fontWeight: "600",
                  color: mediaColors[scatterXAxis],
                }}
              >
                {substrates.map(s => (
                  <option key={s} value={s}>{mediaLabels[s]}</option>
                ))}
              </select>
            </label>
            <label style={{ fontSize: "0.8rem", color: "#6b7280", display: "flex", alignItems: "center", gap: "0.3rem" }}>
              Y:
              <select
                value={scatterYAxis}
                onChange={e => onYAxisChange(e.target.value)}
                style={{
                  padding: "0.3rem 0.5rem", borderRadius: "6px",
                  border: `2px solid ${mediaColors[scatterYAxis]}`,
                  fontSize: "0.8rem", fontWeight: "600",
                  color: mediaColors[scatterYAxis],
                }}
              >
                {substrates.map(s => (
                  <option key={s} value={s}>{mediaLabels[s]}</option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={420}>
        <ScatterChart margin={{ top: 10, right: 30, left: 20, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            type="number"
            dataKey="x"
            name={mediaLabels[scatterXAxis]}
            label={{
              value: `Avg Activity — ${mediaLabels[scatterXAxis]}`,
              position: "insideBottom",
              offset: -5,
              style: { fontWeight: "700", fontSize: "0.8rem", fill: mediaColors[scatterXAxis] },
            }}
            tick={{ fontSize: 11 }}
            stroke="#d1d5db"
          />
          <YAxis
            type="number"
            dataKey="y"
            name={mediaLabels[scatterYAxis]}
            label={{
              value: `Avg Activity — ${mediaLabels[scatterYAxis]}`,
              angle: -90,
              position: "center",
              dx: -30,
              style: { fontWeight: "700", fontSize: "0.8rem", fill: mediaColors[scatterYAxis] },
            }}
            tick={{ fontSize: 11 }}
            stroke="#d1d5db"
          />
          <ZAxis range={[50, 50]} />
          <Tooltip content={<ScatterTooltipContent xKey={scatterXAxis} yKey={scatterYAxis} />} />

          {/* Diagonal "equal preference" line */}
          <Scatter
            data={diagonalData}
            fill="none"
            line={{ stroke: "#9ca3af", strokeDasharray: "6 4", strokeWidth: 1.5 }}
            shape={() => null}
            legendType="none"
            isAnimationActive={false}
          />

          {/* Gene dots */}
          <Scatter
            data={scatterData}
            isAnimationActive={true}
            animationDuration={800}
            onClick={(data) => {
              if (data?.gene) onDotClick(data.gene);
            }}
            cursor="pointer"
          >
            {scatterData.map((entry, i) => {
              const prefersX = entry.x > entry.y;
              const color = prefersX ? mediaColors[scatterXAxis] : mediaColors[scatterYAxis];
              return (
                <Cell
                  key={i}
                  fill={color}
                  fillOpacity={0.65}
                  stroke={color}
                  strokeWidth={1.5}
                  strokeOpacity={0.9}
                />
              );
            })}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        gap: "1.5rem",
        marginTop: "0.5rem",
        fontSize: "0.8rem",
        color: "#6b7280",
        flexWrap: "wrap",
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <span style={{
            width: "10px", height: "10px", borderRadius: "50%",
            backgroundColor: mediaColors[scatterXAxis], display: "inline-block",
          }} />
          Prefers {mediaLabels[scatterXAxis]}
        </span>
        <span style={{ color: "#e5e7eb" }}>|</span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <span style={{
            width: "10px", height: "10px", borderRadius: "50%",
            backgroundColor: mediaColors[scatterYAxis], display: "inline-block",
          }} />
          Prefers {mediaLabels[scatterYAxis]}
        </span>
        <span style={{ color: "#e5e7eb" }}>|</span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <span style={{
            width: "20px", height: "0",
            borderTop: "2px dashed #9ca3af",
            display: "inline-block",
          }} />
          Equal preference
        </span>
      </div>
    </div>
  );
};

// --- Gene Substrate Card ---
const GeneSubstrateCard = ({ gene, geneData, isExpanded, onToggle }) => {
  const { nickname, accession, mediaData } = geneData;
  const mediaTypes = Object.keys(mediaData);
  const chartData = transformForChart(mediaData);

  return (
    <div
      id={`gene-${gene}`}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        marginBottom: "0.75rem",
        overflow: "hidden",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
      }}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          padding: "1rem 1.25rem",
          backgroundColor: "transparent",
          border: "none",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", gap: "1.5rem", alignItems: "center", flexWrap: "wrap", flex: "1" }}>
          <div>
            <span style={{
              fontSize: "0.7rem", fontWeight: "700", color: "#9ca3af",
              textTransform: "uppercase", letterSpacing: "0.06em",
            }}>Gene ID</span>
            <div style={{
              fontSize: "1.1rem", fontWeight: "700", color: "#1f2937", fontFamily: "monospace",
            }}>{gene}</div>
          </div>

          {nickname && (
            <div>
              <span style={{
                fontSize: "0.7rem", fontWeight: "700", color: "#9ca3af",
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>Nickname</span>
              <div style={{ fontSize: "1.1rem", color: "#4b5563" }}>{nickname}</div>
            </div>
          )}

          {accession && (
            <div>
              <span style={{
                fontSize: "0.7rem", fontWeight: "700", color: "#9ca3af",
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>Accession</span>
              <div style={{ fontSize: "1.1rem", color: "#4b5563", fontFamily: "monospace" }}>{accession}</div>
            </div>
          )}

          <div style={{ display: "flex", gap: "0.4rem" }}>
            {mediaTypes.map(media => (
              <span key={media} style={{
                padding: "0.2rem 0.55rem",
                backgroundColor: mediaColors[media] || "#059669",
                color: "white",
                borderRadius: "4px",
                fontSize: "0.7rem",
                fontWeight: "700",
              }}>{media}</span>
            ))}
          </div>
        </div>

        <svg
          style={{
            width: "20px", height: "20px",
            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
            flexShrink: 0, marginLeft: "1rem",
          }}
          fill="none" stroke="#6b7280" strokeWidth="2" viewBox="0 0 24 24"
        >
          <path d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div style={{ padding: "0 1.25rem 1.25rem 1.25rem" }}>
          <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "1rem" }}>

            {accession && (
              <div style={{ marginBottom: "1rem" }}>
                <Link
                  to={`/sequence/${accession}`}
                  style={{
                    color: "#2563eb", textDecoration: "none",
                    borderBottom: "2px solid transparent",
                    fontSize: "0.9rem", fontWeight: "500",
                    transition: "border-color 0.2s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "#2563eb"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "transparent"}
                >
                  View sequence details for {accession} &rarr;
                </Link>
              </div>
            )}

            {/* Chart */}
            {chartData.length > 0 && (
              <div style={{
                backgroundColor: "#f0fdf4",
                border: "1px solid #86efac",
                borderRadius: "6px",
                padding: "1rem",
              }}>
                <div style={{
                  fontSize: "0.875rem", fontWeight: "600",
                  color: "#065f46", marginBottom: "0.75rem",
                }}>
                  Activity Over Time
                </div>

                <div style={{
                  backgroundColor: "white", borderRadius: "4px",
                  padding: "1rem", marginBottom: "-2rem",
                }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="timepoint"
                        label={{ value: "Time (hours)", position: "insideBottom", offset: 0, style: { fontWeight: "bold", textAnchor: "middle" } }}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        label={{ value: "Median Pixel Intensity", angle: -90, position: "center", dx: -25, style: { fontWeight: "bold" } }}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#fff", border: "1px solid #86efac",
                          borderRadius: "4px", fontSize: "0.875rem",
                        }}
                        formatter={value => value?.toFixed(4)}
                      />
                      <Legend align="right" wrapperStyle={{ fontSize: "0.875rem", paddingTop: "10px" }} />
                      <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" strokeWidth={1} />
                      {mediaTypes.map(media => (
                        <Line
                          key={media}
                          type="monotone"
                          dataKey={media}
                          stroke={mediaColors[media] || "#059669"}
                          strokeWidth={2.5}
                          dot={{ fill: mediaColors[media] || "#059669", r: 5 }}
                          activeDot={{ r: 7 }}
                          name={media}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Per-media stats */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "1rem", backgroundColor: "#dcfce7",
                  borderRadius: "4px", padding: "0.75rem",
                }}>
                  {mediaTypes.map(media => {
                    const points = mediaData[media];
                    const values = points.map(p => p.average_readout);
                    const avg = values.reduce((s, v) => s + v, 0) / values.length;
                    const max = Math.max(...values);
                    const min = Math.min(...values);

                    return (
                      <div key={media} style={{
                        backgroundColor: "white", borderRadius: "4px",
                        padding: "0.75rem",
                        border: `2px solid ${mediaColors[media] || "#059669"}`,
                      }}>
                        <div style={{
                          fontSize: "0.75rem", fontWeight: "600",
                          color: "#065f46", marginBottom: "0.5rem",
                        }}>{media}</div>
                        <div style={{ fontSize: "0.75rem", color: "#059669", marginBottom: "0.25rem" }}>
                          Avg: <strong>{avg.toFixed(4)}</strong>
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#059669", marginBottom: "0.25rem" }}>
                          Max: <strong>{max.toFixed(4)}</strong>
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#059669" }}>
                          Min: <strong>{min.toFixed(4)}</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Main Page ---
const SubstratePage = () => {
  useScrollHeader();
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedGenes, setExpandedGenes] = useState(new Set());
  const [activeSubstrates, setActiveSubstrates] = useState(new Set(["BHET12.5", "BHET25"]));
  const [scatterXAxis, setScatterXAxis] = useState("BHET12.5");
  const [scatterYAxis, setScatterYAxis] = useState("BHET25");

  const activeMediaString = useMemo(
    () => [...activeSubstrates].sort().join(","),
    [activeSubstrates]
  );

  // Fetch data when active substrates change
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(
          `${config.apiUrl}/plate-data/substrate-comparison?media=${activeMediaString}`
        );
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setRawData(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err.toString());
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [activeMediaString]);

  // Ensure scatter axes stay valid when substrates change
  useEffect(() => {
    const subs = [...activeSubstrates];
    if (subs.length >= 2) {
      if (!activeSubstrates.has(scatterXAxis)) setScatterXAxis(subs[0]);
      if (!activeSubstrates.has(scatterYAxis)) setScatterYAxis(subs[subs.length - 1]);
    }
  }, [activeSubstrates, scatterXAxis, scatterYAxis]);

  // Group raw data by gene
  const geneGroups = useMemo(() => {
    const groups = {};
    rawData.forEach(row => {
      if (!groups[row.gene]) {
        groups[row.gene] = {
          nickname: row.nickname,
          accession: row.accession,
          mediaData: {},
        };
      }
      if (!groups[row.gene].mediaData[row.media]) {
        groups[row.gene].mediaData[row.media] = [];
      }
      groups[row.gene].mediaData[row.media].push({
        timepoint: row.timepoint_hours,
        average_readout: parseFloat(row.average_readout),
        sample_count: parseInt(row.sample_count),
      });
    });
    return groups;
  }, [rawData]);

  // Compute hero stats per substrate
  const heroStats = useMemo(() => {
    const stats = {};
    [...activeSubstrates].forEach(substrate => {
      const rows = rawData.filter(r => r.media === substrate);
      if (rows.length === 0) {
        stats[substrate] = { geneCount: 0, meanActivity: 0, topGene: null, peakTimepoint: null };
        return;
      }

      const genes = new Set(rows.map(r => r.gene));
      const meanActivity = rows.reduce((sum, r) => sum + parseFloat(r.average_readout), 0) / rows.length;

      // Top gene: highest mean readout across timepoints
      const geneAvgs = {};
      rows.forEach(r => {
        if (!geneAvgs[r.gene]) geneAvgs[r.gene] = { sum: 0, count: 0 };
        geneAvgs[r.gene].sum += parseFloat(r.average_readout);
        geneAvgs[r.gene].count += 1;
      });
      let topGene = null;
      let topAvg = -Infinity;
      Object.entries(geneAvgs).forEach(([gene, { sum, count }]) => {
        const avg = sum / count;
        if (avg > topAvg) { topAvg = avg; topGene = gene; }
      });

      // Peak timepoint: highest mean readout across all genes
      const tpAvgs = {};
      rows.forEach(r => {
        const tp = r.timepoint_hours;
        if (!tpAvgs[tp]) tpAvgs[tp] = { sum: 0, count: 0 };
        tpAvgs[tp].sum += parseFloat(r.average_readout);
        tpAvgs[tp].count += 1;
      });
      let peakTimepoint = null;
      let peakAvg = -Infinity;
      Object.entries(tpAvgs).forEach(([tp, { sum, count }]) => {
        const avg = sum / count;
        if (avg > peakAvg) { peakAvg = avg; peakTimepoint = parseFloat(tp); }
      });

      stats[substrate] = { geneCount: genes.size, meanActivity, topGene, peakTimepoint };
    });
    return stats;
  }, [rawData, activeSubstrates]);

  // Compute scatter data: per-gene average across all timepoints for each axis substrate
  const scatterData = useMemo(() => {
    return Object.entries(geneGroups)
      .map(([gene, data]) => {
        const xMedia = data.mediaData[scatterXAxis];
        const yMedia = data.mediaData[scatterYAxis];
        if (!xMedia || !yMedia) return null;

        const xAvg = xMedia.reduce((s, p) => s + p.average_readout, 0) / xMedia.length;
        const yAvg = yMedia.reduce((s, p) => s + p.average_readout, 0) / yMedia.length;

        if (isNaN(xAvg) || isNaN(yAvg)) return null;

        return { gene, nickname: data.nickname, accession: data.accession, x: xAvg, y: yAvg };
      })
      .filter(Boolean);
  }, [geneGroups, scatterXAxis, scatterYAxis]);

  const toggleSubstrate = (substrate) => {
    setActiveSubstrates(prev => {
      const next = new Set(prev);
      if (next.has(substrate)) {
        if (next.size <= 1) return prev;
        next.delete(substrate);
      } else {
        next.add(substrate);
      }
      return next;
    });
  };

  const toggleGene = (gene) => {
    setExpandedGenes(prev => {
      const next = new Set(prev);
      if (next.has(gene)) next.delete(gene);
      else next.add(gene);
      return next;
    });
  };

  const handleScatterDotClick = (gene) => {
    setExpandedGenes(prev => new Set([...prev, gene]));
    setTimeout(() => {
      const el = document.getElementById(`gene-${gene}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  const geneEntries = Object.entries(geneGroups);

  return (
    <>
      <SiteHeader />

      <main style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "2rem",
        paddingTop: "2rem",
      }}>
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{
            fontSize: "2.5rem",
            marginBottom: "0.5rem",
            color: "#2c3e50",
          }}>
            Substrate Activity Comparison
          </h1>
          <p style={{
            color: "#666",
            fontSize: "1.1rem",
            marginBottom: "1.5rem",
          }}>
            Compare enzyme activity across BHET substrates at different concentrations
          </p>
        </div>

        {/* Substrate Toggle Chips */}
        <SubstrateToggle
          activeSubstrates={activeSubstrates}
          onToggle={toggleSubstrate}
        />

        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#666", fontStyle: "italic" }}>
            Loading substrate data...
          </div>
        ) : error ? (
          <div style={{
            padding: "2rem", textAlign: "center", color: "#dc2626",
            backgroundColor: "#fef2f2", borderRadius: "8px", border: "1px solid #fecaca",
          }}>
            Error loading data: {error}
          </div>
        ) : geneEntries.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
            No substrate data available.
          </div>
        ) : (
          <>
            {/* VS Hero Banner */}
            <SubstrateHero heroStats={heroStats} activeSubstrates={activeSubstrates} />

            {/* Scatter Plot (only when 2+ substrates active) */}
            {activeSubstrates.size >= 2 && scatterXAxis !== scatterYAxis && (
              <SubstrateScatter
                scatterData={scatterData}
                activeSubstrates={activeSubstrates}
                scatterXAxis={scatterXAxis}
                scatterYAxis={scatterYAxis}
                onXAxisChange={setScatterXAxis}
                onYAxisChange={setScatterYAxis}
                onDotClick={handleScatterDotClick}
              />
            )}

            {/* Gene Cards */}
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: "1rem",
            }}>
              <div style={{ fontSize: "0.9rem", color: "#6b7280" }}>
                Showing {geneEntries.length} {geneEntries.length === 1 ? "gene" : "genes"} with substrate data
              </div>
              {scatterData.length > 0 && (
                <div style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                  {scatterData.length} genes have data for both selected substrates
                </div>
              )}
            </div>

            {geneEntries.map(([gene, geneData]) => (
              <GeneSubstrateCard
                key={gene}
                gene={gene}
                geneData={geneData}
                isExpanded={expandedGenes.has(gene)}
                onToggle={() => toggleGene(gene)}
              />
            ))}
          </>
        )}
      </main>
    </>
  );
};

export default SubstratePage;

export const Head = () => (
  <Seo
    title="Substrate Activity Comparison"
    description="Compare enzyme activity on BHET substrates at different concentrations for plastic-degrading enzymes"
  />
);
