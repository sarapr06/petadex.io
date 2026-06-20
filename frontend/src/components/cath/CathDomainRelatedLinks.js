import React from "react"
import { Link } from "gatsby"

/**
 * @param {{ component?: number|null }} props.domain
 */
const CathDomainRelatedLinks = ({ domain }) => {
  if (domain?.component == null) return null

  return (
    <div className="mt-4 mb-2 flex flex-wrap gap-2 text-sm">
      <Link
        to={`/atlas`}
        className="inline-flex items-center rounded-lg border border-input bg-background px-3 py-1.5 font-medium text-accent hover:bg-muted/50 hover:text-accent-hover transition-colors"
      >
        Open family atlas
      </Link>
      <Link
        to={`/enzymes?component=${domain.component}`}
        className="inline-flex items-center rounded-lg border border-input bg-background px-3 py-1.5 font-medium text-accent hover:bg-muted/50 hover:text-accent-hover transition-colors"
      >
        Browse enzymes (component {domain.component})
      </Link>
    </div>
  )
}

export default CathDomainRelatedLinks
