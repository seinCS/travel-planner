import { forwardRef } from 'react'
import type { IconProps } from '../_IconBase'

const Warning = forwardRef<SVGSVGElement, IconProps>(
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
      <g transform="translate(1.66, 2.83) scale(0.1092)">
        <g className="duotone-secondary" opacity={secondaryOpacity} fill="currentColor">
          <path d="M171.107,168.058l-151.278.052c-7.369.003-13.336-3.948-16.568-9.229-3.435-5.61-4.711-13.004-1.075-19.256L77.489,10.155C81.119,3.913,86.917.293,93.402.019c5.875-.248,13.908,1.864,17.464,7.976l76.693,131.819c3.325,5.715,2.184,13.241-.877,18.538-2.605,4.508-8.123,9.704-15.574,9.707ZM103.864,103.918l4.642-50.786c.737-8.067-6.506-12.414-13.883-12.267-6.192.123-13.94,3.731-13.304,11.184l4.431,51.93c.431,5.055,4.205,7.587,8.9,7.617,4.969.031,8.736-2.455,9.214-7.677ZM108.263,133.664c0-7.376-5.979-13.355-13.355-13.355s-13.355,5.979-13.355,13.355,5.979,13.355,13.355,13.355,13.355-5.979,13.355-13.355Z"/>
        </g>
        <g className="duotone-primary" fill="currentColor">
          <path d="M103.864,103.918c-.477,5.222-4.245,7.708-9.214,7.677-4.695-.029-8.469-2.562-8.9-7.617l-4.431-51.93c-.636-7.453,7.112-11.061,13.304-11.184,7.377-.147,14.62,4.201,13.883,12.267l-4.642,50.786Z"/>
<circle cx="94.909" cy="133.664" r="13.355"/>
        </g>
      </g>
    </svg>
  )
)

Warning.displayName = 'Warning'
export { Warning }
