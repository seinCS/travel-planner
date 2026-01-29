import { forwardRef } from 'react'
import type { IconProps } from '../_IconBase'

const Transit = forwardRef<SVGSVGElement, IconProps>(
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
      {/* Secondary - train track */}
      <g className="duotone-secondary" opacity={secondaryOpacity}>
        <path d="M4 19l2 2" />
        <path d="M18 19l2 2" />
      </g>
      {/* Primary - train body */}
      <g className="duotone-primary">
        <rect x="6" y="3" width="12" height="14" rx="2" />
        <path d="M6 11h12" />
        <path d="M12 3v8" />
        <circle cx="8" cy="15" r="1" />
        <circle cx="16" cy="15" r="1" />
      </g>
    </svg>
  )
)

Transit.displayName = 'Transit'
export { Transit }
