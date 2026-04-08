import React from "react"

const ScrollableArea = ({
  children,
  className = "",
  height = "h-64",
  direction = "y",
}) => {
  const baseClasses = `w-full ${height} rounded-lg border  p-4 shadow-sm ${direction === "y" ? "overflow-y-auto" : "overflow-x-auto"}`
  const scrollbarClasses =
    "[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400"

  return (
    <div className={`${baseClasses} ${scrollbarClasses} ${className}`}>
      {children}
    </div>
  )
}

export default ScrollableArea
