import { forwardRef } from 'react'
import type { IconProps } from '../_IconBase'

const Collapse = forwardRef<SVGSVGElement, IconProps>(
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
      <g transform="translate(1.87, 5.67) scale(0.1518)">
        <g className="duotone-secondary" opacity={secondaryOpacity} fill="currentColor">
          
        </g>
        <g className="duotone-primary" fill="currentColor">
          <path d="M67.35,36.776l-40.553,40.468c-5.996,5.983-14.367,7.724-21.068,2.387-6.141-4.891-8.162-15.228-1.973-21.46L57.472,4.088c5.043-5.077,13.905-5.66,19.099-.418l53.721,54.209c5.608,5.659,4.893,14.562.006,20.099-5.002,5.669-13.507,6.769-20.156,1.799l-42.793-43.001Z"/>
        </g>
      </g>
    </svg>
  )
)

Collapse.displayName = 'Collapse'
export { Collapse }
