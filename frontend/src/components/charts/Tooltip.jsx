import React from "react"

import * as styles from "./tooltip.module.css"

export const Tooltip = ({ interactionData }) => {
  if (!interactionData) {
    return null
  }

  const { xPos, yPos, name, evalue, x, y, size } = interactionData

  return (
    <div className={styles.tooltip} style={{ left: xPos, top: yPos }}>
      <b className={styles.title}>{name}</b>
      <div className={styles.row}>
        <span>Identity</span>
        <b>{x?.toFixed(1)}%</b>
      </div>
      <div className={styles.row}>
        <span>Coverage</span>
        <b>{y?.toFixed(1)}%</b>
      </div>
      <div className={styles.row}>
        <span>E-value</span>
        <b>{evalue?.toExponential(1)}</b>
      </div>
      <div className={styles.row}>
        <span>Bitscore</span>
        <b>{size}</b>
      </div>
    </div>
  )
}
