// Shared line-chart component for enzyme activity / intensity timeseries.
// Used by SynthesizedGenePanel (sequence detail page) and the substrate comparison page.
import React, { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, ErrorBar,
} from "recharts";

export const mediaColors = {
  "BHET12.5": "#2E86AB",
  "BHET25":   "#A23B72",
  "BHET50":   "#F18F01",
  default:    "#059669",
};

export const mediaLabels = {
  "BHET12.5": "BHET 12.5 mM",
  "BHET25":   "BHET 25 mM",
  "BHET50":   "BHET 50 mM",
};

// Transform flat plate rows into Recharts data format.
// Input:  Array<{ timepoint_hours, media, average_readout, stddev_readout? }>
// Output: Array<{ timepoint, [media]: value, [media_stddev]: value, ... }>
function transformToChartData(rows) {
  const grouped = {};
  for (const row of rows) {
    const tp = parseFloat(row.timepoint_hours);
    const media = row.media || "Unknown";
    const stddevKey = `${media}_stddev`;
    if (!grouped[tp]) grouped[tp] = { timepoint: tp };

    if (grouped[tp][media] !== undefined) {
      if (!grouped[tp]._counts) grouped[tp]._counts = {};
      if (!grouped[tp]._counts[media]) grouped[tp]._counts[media] = 1;
      const prev = grouped[tp]._counts[media];
      const next = prev + 1;
      grouped[tp][media] = (grouped[tp][media] * prev + parseFloat(row.average_readout)) / next;
      const prevSd = grouped[tp][stddevKey] || 0;
      const newSd  = row.stddev_readout ? parseFloat(row.stddev_readout) : 0;
      grouped[tp][stddevKey] = Math.sqrt((prevSd * prevSd + newSd * newSd) / 2);
      grouped[tp]._counts[media] = next;
    } else {
      grouped[tp][media] = parseFloat(row.average_readout);
      grouped[tp][stddevKey] = row.stddev_readout ? parseFloat(row.stddev_readout) : 0;
    }
  }
  return Object.values(grouped)
    .map(({ _counts, ...rest }) => rest)
    .sort((a, b) => a.timepoint - b.timepoint);
}

/**
 * ActivityLineChart
 *
 * @param {Array}  data   Flat array of plate rows:
 *                        { timepoint_hours, media, average_readout, stddev_readout? }
 * @param {number} height Chart height in px (default 300)
 */
export default function ActivityLineChart({ data, height = 300 }) {
  const { chartData, mediaTypes } = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return { chartData: [], mediaTypes: [] };
    const types = [...new Set(data.map(r => r.media).filter(Boolean))];
    return { chartData: transformToChartData(data), mediaTypes: types };
  }, [data]);

  if (chartData.length === 0) return null;

  return (
    <div className="bg-surface rounded-lg p-4 -mb-8">
      <ResponsiveContainer width="100%" height={height}>
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
            contentStyle={{ backgroundColor: "#fff", border: "1px solid #86efac", borderRadius: "4px", fontSize: "0.875rem" }}
            formatter={(value, name, props) => {
              const stddev = props.payload?.[`${name}_stddev`];
              if (stddev && stddev > 0) return [`${value?.toFixed(4)} ± ${stddev.toFixed(4)}`, name];
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
              stroke={mediaColors[media] || mediaColors.default}
              strokeWidth={2.5}
              dot={{ fill: mediaColors[media] || mediaColors.default, r: 5 }}
              activeDot={{ r: 7 }}
              name={media}
            >
              <ErrorBar
                dataKey={`${media}_stddev`}
                width={4}
                strokeWidth={1.5}
                stroke={mediaColors[media] || mediaColors.default}
                opacity={0.7}
              />
            </Line>
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
