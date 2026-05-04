import React from "react"
import { Link } from "gatsby"

/**
 * @param {{ component?: number|null }} props.domain
 */
const CathDomainRelatedLinks = ({ domain }) => {
  if (domain?.component == null) return null

  return (
    <div className="mt-6 flex flex-wrap gap-4 text-sm">
      <Link
        to={`/atlas`}
        className="font-medium text-accent hover:text-accent-hover underline underline-offset-4"
      >
        Open family atlas
      </Link>
      <Link
        to={`/enzymes?component=${domain.component}`}
        className="font-medium text-accent hover:text-accent-hover underline underline-offset-4"
      >
        Browse enzymes (component {domain.component})
      </Link>
    </div>
  )
}

export default CathDomainRelatedLinks
