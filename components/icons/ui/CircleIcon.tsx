import { forwardRef } from 'react'
import type { IconProps } from '../_IconBase'

const CircleIcon = forwardRef<SVGSVGElement, IconProps>(
  ({ size = 24, className, secondaryOpacity = 0.4, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      className={className}
      {...props}
    >
      <g className="duotone-secondary" opacity={secondaryOpacity} fill="currentColor">
        
      </g>
      <g className="duotone-primary" fill="currentColor">
        <circle cx="12" cy="12" r="4" fill="currentColor"/>
      </g>
    </svg>
  )
)

CircleIcon.displayName = 'CircleIcon'
export { CircleIcon }
