import React from "react"

export const Tooltip = ({ interactionData, containerWidth }) => {
  if (!interactionData) return null

  const { xPos, yPos, name, evalue, x, y, size } = interactionData
  const flipLeft = containerWidth && xPos > containerWidth - 240

  return (
    <div
      className="absolute pointer-events-none bg-background border border-border shadow-md rounded-lg max-w-[200px] p-2.5 -translate-y-1/2 text-xs z-10"
      style={
        flipLeft
          ? { right: containerWidth - xPos, top: yPos, marginRight: 35 }
          : { left: xPos, top: yPos, marginLeft: 35 }
      }
    >
      <b className="block text-sm font-semibold text-foreground mb-2">{name}</b>
      {[
        ["Identity", `${x?.toFixed(1)}%`],
        ["Coverage", `${y?.toFixed(1)}%`],
        ["E-value", evalue?.toExponential(1)],
        ["Bitscore", size],
      ].map(([label, value]) => (
        <div
          key={label}
          className="flex justify-between gap-8 leading-5 text-muted-foreground"
        >
          <span>{label}</span>
          <b className="text-foreground font-semibold">{value}</b>
        </div>
      ))}
    </div>
  )
}
