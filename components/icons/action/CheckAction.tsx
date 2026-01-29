import { forwardRef } from 'react'
import type { IconProps } from '../_IconBase'

const CheckAction = forwardRef<SVGSVGElement, IconProps>(
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
      <g transform="translate(1.73, 2.02) scale(0.1106)">
        <g className="duotone-secondary" opacity={secondaryOpacity} fill="currentColor">
          <path d="M1.03,87.136l3.45,5.882,47.486,46.268c9.099,8.865,22.633,4.707,30.351-3.726l84.23-92.025c.509,1.763,1.251,3.851,2.224,5.87,17.853,37.075,8.318,80.441-23.074,106.577-35.01,29.149-85.94,27.069-118.401-5.125C10.24,133.942.157,110.918,1.03,87.136Z"/>
<path d="M136.004,13.386l-71.331,79.296-27.64-27.353c-9.753-9.652-24.139-8.913-33.07,1.042C10.407,39.977,29.604,18.453,52.294,8.25c28.87-12.982,58.766-10.176,83.71,5.136Z"/>
        </g>
        <g className="duotone-primary" fill="currentColor">
          <path d="M166.547,43.535l-84.23,92.025c-7.719,8.433-21.253,12.592-30.351,3.726L4.48,93.019l-3.45-5.882c-2.021-7.183-1.081-14.468,2.932-20.766,8.931-9.955,23.317-10.694,33.07-1.042l27.64,27.353L136.004,13.386c2.402-2.671,6.314-5.954,9.381-8.66,7.913-6.982,20.063-5.529,27.037,1.534,6.797,6.883,8.809,18.48,2.489,26.952-2.654,3.557-5.603,7.308-8.364,10.324Z"/>
        </g>
      </g>
    </svg>
  )
)

CheckAction.displayName = 'CheckAction'
export { CheckAction }
