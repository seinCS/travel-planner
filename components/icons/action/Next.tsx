import { forwardRef } from 'react'
import type { IconProps } from '../_IconBase'

const Next = forwardRef<SVGSVGElement, IconProps>(
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
      <g transform="translate(5.79, 1.86) scale(0.154)">
        <g className="duotone-secondary" opacity={secondaryOpacity} fill="currentColor">
          
        </g>
        <g className="duotone-primary" fill="currentColor">
          <path d="M26.776,126.355c-6.536,6.585-14.924,7.64-21.717,1.827-6.194-5.3-6.996-15.314-.686-21.66l40.292-40.52L3.538,24.513C-2.578,18.343-.012,7.953,5.53,3.438,12.617-2.335,20.974-.368,27.136,5.853l50.238,50.727c5.838,5.895,3.702,15.068-1.566,20.375l-49.032,49.4Z"/>
        </g>
      </g>
    </svg>
  )
)

Next.displayName = 'Next'
export { Next }
