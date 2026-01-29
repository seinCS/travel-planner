import { forwardRef } from 'react'
import type { IconProps } from '../_IconBase'

const Plus = forwardRef<SVGSVGElement, IconProps>(
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
      <g transform="translate(-0.27, -0.01) scale(0.115)">
        <g className="duotone-secondary" opacity={secondaryOpacity} fill="currentColor">
          
        </g>
        <g className="duotone-primary" fill="currentColor">
          <path d="M123.19,25.33c4.2,1.68,5.6,6.24,6.3,10.38l.48,46.63,46.05.24c4.88.42,8.2,2.22,9.95,5.39,9.86,9.54,12.09,24.49,1.02,34.08-1.62,5.18-5.49,6.01-10.32,6.98l-46.86.54-.27,46.12c-.74,4.55-1.61,8.83-6.52,10.35-3.91,5.2-10.17,7.89-16.54,8.04-6.3.15-12.74-3.19-17.63-8.16-3.67-1.45-5.58-4.73-5.72-9.84l-.45-46.15c-14.74-.53-29.69-.79-44.88-.76-5.56-.21-9.47-2.19-11.72-5.95-9.99-9.88-10.69-23.97-.14-34.45,1.62-4.25,6.73-5.54,10.92-6.22l45.36-.29c.59-14.61.83-29.43.72-44.47.09-5.72,2.05-9.7,5.88-11.94,9.65-10.13,23.93-11.18,34.39-.52h0Z"/>
        </g>
      </g>
    </svg>
  )
)

Plus.displayName = 'Plus'
export { Plus }
