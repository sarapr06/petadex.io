import React, { useEffect, useState } from "react"

/**
 * Client-only code-split wrapper — keeps feature-viewer out of page entry chunks.
 * @param {import("./PetadexCatalyticDomainsPanel.jsx").default extends React.ComponentType<infer P> ? P : never} props
 */
export default function LazyPetadexCatalyticDomainsPanel(props) {
  const [Panel, setPanel] = useState(
    /** @type {React.ComponentType<any> | null} */ (null),
  )

  useEffect(() => {
    let cancelled = false
    import(
      /* webpackChunkName: "petadex-domains-panel" */
      "./PetadexCatalyticDomainsPanel.jsx"
    ).then(mod => {
      if (!cancelled) setPanel(() => mod.default)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!Panel) {
    return (
      <div className={`text-sm text-muted-foreground py-4 ${props.className || ""}`}>
        Loading Petadex catalytic domains…
      </div>
    )
  }

  return <Panel {...props} />
}
