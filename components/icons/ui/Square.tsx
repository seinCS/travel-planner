import { forwardRef } from 'react'
import type { IconProps } from '../_IconBase'

const Square = forwardRef<SVGSVGElement, IconProps>(
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
      <g transform="translate(1.51, 1.5) scale(0.0874)">
        <g className="duotone-secondary" opacity={secondaryOpacity} fill="currentColor">
          
        </g>
        <g className="duotone-primary" fill="currentColor">
          <path d="M240.033,195.569c.004,25.886-21.334,44.7-45.95,44.703l-147.935.019C20.95,240.295-.011,220.477,0,194.969L.063,44.024C.073,21.174,18.851.151,42.097.131L197.08,0c23.791-.02,42.924,20.504,42.928,44.183l.025,151.386ZM211.004,195.602l.078-147.452c.006-10.704-6.785-19.277-18.08-19.268l-147.868.121c-8.925.007-16.149,8.505-16.144,17.008l.085,149.033c.005,8.625,8.768,16.067,17.057,16.062l148.829-.085c8.307-.005,14.549-7.465,16.043-15.419Z"/>
        </g>
      </g>
    </svg>
  )
)

Square.displayName = 'Square'
export { Square }
