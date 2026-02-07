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
  ScatterChart, Scatter, ZAxis, ErrorBar
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

const timepointColors = {
  "all": "#6b7280",
  24: "#10b981",
  48: "#3b82f6",
  72: "#8b5cf6",
  96: "#f59e0b",
  120: "#ef4444",
};

const benchmarkEnzymes = {
  "WP_054022242.1": "IsPETase",
  "WP_054022242.1_M1": "Fast-PETase",
};

const diamondPoints = (cx, cy, r) =>
  `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`;

// Transform per-gene media data into Recharts line chart format
const transformForChart = (mediaData) => {
  const grouped = {};
  Object.entries(mediaData).forEach(([media, points]) => {
    const stddevKey = `${media}_stddev`;
    points.forEach(point => {
      const tp = point.timepoint;
      if (!grouped[tp]) {
        grouped[tp] = { timepoint: tp };
      }
      if (grouped[tp][media] !== undefined) {
        // Running average for multiple points at same timepoint
        if (!grouped[tp]._counts) grouped[tp]._counts = {};
        if (!grouped[tp]._counts[media]) grouped[tp]._counts[media] = 1;

        const prevCount = grouped[tp]._counts[media];
        const newCount = prevCount + 1;

        grouped[tp][media] = (grouped[tp][media] * prevCount + point.average_readout) / newCount;

        // Pooled stddev approximation
        const prevStddev = grouped[tp][stddevKey] || 0;
        const newStddev = point.stddev_readout || 0;
        grouped[tp][stddevKey] = Math.sqrt((prevStddev * prevStddev + newStddev * newStddev) / 2);

        grouped[tp]._counts[media] = newCount;
      } else {
        grouped[tp][media] = point.average_readout;
        grouped[tp][stddevKey] = point.stddev_readout || 0;
      }
    });
  });
  return Object.values(grouped)
    .map(({ _counts, ...rest }) => rest)
    .sort((a, b) => a.timepoint - b.timepoint);
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

// --- Timepoint Toggle Chips ---
const TimepointToggle = ({ availableTimepoints, activeTimepoint, onSelect }) => {
  if (availableTimepoints.length === 0) return null;

  return (
    <div style={{
      display: "flex",
      gap: "0.5rem",
      marginBottom: "2rem",
      flexWrap: "wrap",
      alignItems: "center",
    }}>
      <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#6b7280" }}>
        Timepoint:
      </span>
      {/* "All" option for averaged data */}
      <button
        onClick={() => onSelect(null)}
        style={{
          padding: "0.4rem 0.9rem",
          borderRadius: "16px",
          border: `2px solid ${timepointColors["all"]}`,
          backgroundColor: activeTimepoint === null ? timepointColors["all"] : "transparent",
          color: activeTimepoint === null ? "#fff" : timepointColors["all"],
          fontWeight: "600",
          fontSize: "0.75rem",
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={e => {
          if (activeTimepoint !== null) {
            e.currentTarget.style.backgroundColor = `${timepointColors["all"]}15`;
          }
        }}
        onMouseLeave={e => {
          if (activeTimepoint !== null) {
            e.currentTarget.style.backgroundColor = "transparent";
          }
        }}
      >
        All (avg)
      </button>
      {availableTimepoints.map(tp => {
        const isActive = activeTimepoint === tp;
        const color = timepointColors[tp] || "#6b7280";
        return (
          <button
            key={tp}
            onClick={() => onSelect(tp)}
            style={{
              padding: "0.4rem 0.9rem",
              borderRadius: "16px",
              border: `2px solid ${color}`,
              backgroundColor: isActive ? color : "transparent",
              color: isActive ? "#fff" : color,
              fontWeight: "600",
              fontSize: "0.75rem",
              cursor: "pointer",
              transition: "all 0.2s ease",
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
            {tp}h
          </button>
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
  onDotClick, highlightedGene,
  activeTimepoint,
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
    <div
      id="substrate-scatter"
      style={{
      backgroundColor: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: "12px",
      padding: "1.5rem",
      marginBottom: "2rem",
      boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
      position: "relative",
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
            {activeTimepoint !== null && (
              <span style={{
                marginLeft: "0.75rem",
                fontSize: "0.85rem",
                fontWeight: "600",
                color: timepointColors[activeTimepoint] || "#6b7280",
                backgroundColor: `${timepointColors[activeTimepoint] || "#6b7280"}15`,
                padding: "0.2rem 0.6rem",
                borderRadius: "12px",
              }}>
                @ {activeTimepoint}h
              </span>
            )}
          </h2>
          <p style={{ fontSize: "0.825rem", color: "#6b7280", margin: "0.25rem 0 0" }}>
            Each dot is one gene — dots above the diagonal prefer the Y-axis substrate
            {activeTimepoint === null ? " (averaged across all timepoints)" : ""}
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
            shape={(props) => {
              const { cx, cy, payload } = props;
              const prefersX = payload.x > payload.y;
              const color = prefersX ? mediaColors[scatterXAxis] : mediaColors[scatterYAxis];
              const isHighlighted = highlightedGene && payload.gene === highlightedGene;
              const benchmarkLabel = benchmarkEnzymes[payload.accession];

              const pulseRing = (
                <>
                  <circle cx={cx} cy={cy} r={14} fill="none" stroke={color} strokeWidth={2}>
                    <animate attributeName="r" from="8" to="18" dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.8" to="0" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                </>
              );

              const label = benchmarkLabel ? (
                <text x={cx + 14} y={cy + 4} fontSize="11" fontWeight="700" fill="#1f2937">
                  {benchmarkLabel}
                </text>
              ) : null;

              if (benchmarkLabel && isHighlighted) {
                return (
                  <g>
                    {pulseRing}
                    <polygon points={diamondPoints(cx, cy, 9)} fill={color} stroke="#fff" strokeWidth={2.5} />
                    {label}
                  </g>
                );
              }

              if (benchmarkLabel) {
                return (
                  <g>
                    <polygon points={diamondPoints(cx, cy, 8)} fill={color} stroke="#1f2937" strokeWidth={2} />
                    {label}
                  </g>
                );
              }

              if (isHighlighted) {
                return (
                  <g>
                    {pulseRing}
                    <circle cx={cx} cy={cy} r={7} fill={color} stroke="#fff" strokeWidth={2.5} />
                  </g>
                );
              }

              return (
                <circle cx={cx} cy={cy} r={5} fill={color} fillOpacity={0.65}
                  stroke={color} strokeWidth={1.5} strokeOpacity={0.9} />
              );
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>

      {/* Highlighted gene info card */}
      {highlightedGene && (() => {
        const gene = scatterData.find(d => d.gene === highlightedGene);
        if (!gene) return null;
        return (
          <div style={{
            position: "absolute",
            top: "4.5rem",
            right: "2rem",
            backgroundColor: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "0.75rem 1rem",
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            fontSize: "0.825rem",
            maxWidth: "260px",
            zIndex: 10,
            opacity: 0,
            animation: "highlightFadeIn 0.3s ease forwards",
          }}>
            <style>{`@keyframes highlightFadeIn { to { opacity: 1; } }`}</style>
            <div style={{ fontWeight: "700", color: "#1f2937", marginBottom: "0.3rem", fontFamily: "monospace" }}>
              {gene.gene}
            </div>
            {gene.nickname && (
              <div style={{ color: "#6b7280", marginBottom: "0.3rem", fontSize: "0.75rem" }}>
                {gene.nickname}
              </div>
            )}
            <div style={{ color: mediaColors[scatterXAxis], marginBottom: "0.15rem" }}>
              {mediaLabels[scatterXAxis]}: <strong>{gene.x?.toFixed(4)}</strong>
            </div>
            <div style={{ color: mediaColors[scatterYAxis] }}>
              {mediaLabels[scatterYAxis]}: <strong>{gene.y?.toFixed(4)}</strong>
            </div>
          </div>
        );
      })()}

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
        <span style={{ color: "#e5e7eb" }}>|</span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <svg width="12" height="12" viewBox="0 0 12 12" style={{ display: "inline-block" }}>
            <polygon points="6,1 11,6 6,11 1,6" fill="#1f2937" stroke="#1f2937" strokeWidth="1" />
          </svg>
          Benchmark
        </span>
      </div>
    </div>
  );
};

// --- Gene Substrate Card ---
const GeneSubstrateCard = ({ gene, geneData, isExpanded, onToggle, onScrollToScatter }) => {
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

          <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
            {benchmarkEnzymes[accession] && (
              <span style={{
                padding: "0.2rem 0.55rem",
                backgroundColor: "#1f2937",
                color: "white",
                borderRadius: "4px",
                fontSize: "0.7rem",
                fontWeight: "700",
              }}>Benchmark</span>
            )}
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

            <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
              {accession && (
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
              )}
              <button
                onClick={onScrollToScatter}
                style={{
                  color: "#6b7280", background: "none", border: "none",
                  cursor: "pointer", fontSize: "0.9rem", fontWeight: "500",
                  padding: 0, borderBottom: "2px solid transparent",
                  transition: "border-color 0.2s, color 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#6b7280"; e.currentTarget.style.color = "#1f2937"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.color = "#6b7280"; }}
              >
                &larr; Back to scatter plot
              </button>
            </div>

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
                        formatter={(value, name, props) => {
                          const stddevKey = `${name}_stddev`;
                          const stddev = props.payload?.[stddevKey];
                          if (stddev && stddev > 0) {
                            return [`${value?.toFixed(4)} ± ${stddev.toFixed(4)}`, name];
                          }
                          return [value?.toFixed(4), name];
                        }}
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
                        >
                          <ErrorBar
                            dataKey={`${media}_stddev`}
                            width={4}
                            strokeWidth={1.5}
                            stroke={mediaColors[media] || "#059669"}
                            opacity={0.7}
                          />
                        </Line>
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
                    // Calculate pooled standard deviation
                    const stddevs = points.map(p => p.stddev_readout || 0).filter(s => s > 0);
                    const avgStddev = stddevs.length > 0
                      ? Math.sqrt(stddevs.reduce((sum, s) => sum + s * s, 0) / stddevs.length)
                      : 0;

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
                          Avg: <strong>{avg.toFixed(4)}</strong> {avgStddev > 0 && <span style={{ color: "#6b7280" }}>± {avgStddev.toFixed(4)}</span>}
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
  const [highlightedGene, setHighlightedGene] = useState(null);
  const [activeTimepoint, setActiveTimepoint] = useState(null); // null = "All (avg)"

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

  // Extract available timepoints from raw data
  const availableTimepoints = useMemo(() => {
    const tps = new Set(rawData.map(r => r.timepoint_hours));
    return [...tps].sort((a, b) => a - b);
  }, [rawData]);

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
        stddev_readout: row.stddev_readout ? parseFloat(row.stddev_readout) : 0,
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

  // Compute scatter data: per-gene value for each axis substrate
  // If activeTimepoint is null, average across all timepoints; otherwise use specific timepoint
  const scatterData = useMemo(() => {
    return Object.entries(geneGroups)
      .map(([gene, data]) => {
        const xMedia = data.mediaData[scatterXAxis];
        const yMedia = data.mediaData[scatterYAxis];
        if (!xMedia || !yMedia) return null;

        let xVal, yVal;

        if (activeTimepoint === null) {
          // Average across all timepoints
          xVal = xMedia.reduce((s, p) => s + p.average_readout, 0) / xMedia.length;
          yVal = yMedia.reduce((s, p) => s + p.average_readout, 0) / yMedia.length;
        } else {
          // Use specific timepoint
          const xPoint = xMedia.find(p => p.timepoint === activeTimepoint);
          const yPoint = yMedia.find(p => p.timepoint === activeTimepoint);
          if (!xPoint || !yPoint) return null;
          xVal = xPoint.average_readout;
          yVal = yPoint.average_readout;
        }

        if (isNaN(xVal) || isNaN(yVal)) return null;

        return { gene, nickname: data.nickname, accession: data.accession, x: xVal, y: yVal };
      })
      .filter(Boolean);
  }, [geneGroups, scatterXAxis, scatterYAxis, activeTimepoint]);

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

  const handleScrollToScatter = (gene) => {
    setHighlightedGene(gene);
    const el = document.getElementById("substrate-scatter");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => setHighlightedGene(null), 3000);
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

        {/* Timepoint Toggle Chips */}
        <TimepointToggle
          availableTimepoints={availableTimepoints}
          activeTimepoint={activeTimepoint}
          onSelect={setActiveTimepoint}
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
                highlightedGene={highlightedGene}
                activeTimepoint={activeTimepoint}
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
                  {activeTimepoint !== null && ` at ${activeTimepoint}h`}
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
                onScrollToScatter={() => handleScrollToScatter(gene)}
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
