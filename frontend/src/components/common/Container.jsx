import React from "react"

const Container = ({ children, size = "default", className = "" }) => {
  const sizes = {
    sm: "max-w-2xl",
    default: "max-w-6xl",
    wide: "max-w-[1400px]",
    full: "max-w-none",
  }

  return (
    <div className={`mx-auto w-full px-4 md:px-8 ${sizes[size]} ${className}`}>
      {children}
    </div>
  )
}

export default Container
