import { forwardRef } from 'react'
import type { IconProps } from '../_IconBase'

const Expand = forwardRef<SVGSVGElement, IconProps>(
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
      <g transform="translate(1.8, 5.71) scale(0.1517)">
        <g className="duotone-secondary" opacity={secondaryOpacity} fill="currentColor">
          
        </g>
        <g className="duotone-primary" fill="currentColor">
          <path d="M130.087,25.494l-53.499,53.85c-5.191,5.225-13.985,4.569-18.926-.404L3.909,24.836C-1.977,18.911-.797,9.259,4.658,4.19c6.297-5.852,15.199-5.507,21.331.648l41.281,41.431L109.316,4.38c5.958-5.936,14.952-5.662,20.632-.247,5.7,5.434,6.478,14.98.138,21.361Z"/>
        </g>
      </g>
    </svg>
  )
)

Expand.displayName = 'Expand'
export { Expand }
