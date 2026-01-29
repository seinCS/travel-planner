import { forwardRef } from 'react'
import type { IconProps } from '../_IconBase'

const Footprints = forwardRef<SVGSVGElement, IconProps>(
  ({ size = 24, className, secondaryOpacity = 0.4, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Secondary - back footprint */}
      <g className="duotone-secondary" opacity={secondaryOpacity}>
        <path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z" />
        <path d="M7.5 16h-3" />
      </g>
      {/* Primary - front footprint */}
      <g className="duotone-primary">
        <path d="M20 21v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6-1.87 0-2.5 1.8-2.5 3.5 0 3.11 2 5.66 2 8.68V21a2 2 0 1 0 4 0Z" />
        <path d="M16.5 21h3" />
      </g>
    </svg>
  )
)

Footprints.displayName = 'Footprints'
export { Footprints }
