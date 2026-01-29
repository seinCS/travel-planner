import { forwardRef } from 'react'
import type { IconProps } from '../_IconBase'

const Send = forwardRef<SVGSVGElement, IconProps>(
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
      <g transform="translate(1.53, 1.56) scale(0.1098)">
        <g className="duotone-secondary" opacity={secondaryOpacity} fill="currentColor">
          <path d="M112.18,70.7c2.19,3.09,6.19,5.72,9.86,6.03l-44.93,54c-1.29,1.55-1.95,3.58-1.89,5.24-4.36-8.16-9.74-13.86-17.89-17.06,1.02-1.24,2.34-2.82,3.86-4.12l50.99-44.09Z"/>
<path d="M122.04,76.73c-3.68-.32-7.67-2.95-9.86-6.03,4.16-3.6,29.74-29.15,33.92-27.08,1.01.5,1.1,3.64.32,4.55l-24.38,28.56h0Z"/>
        </g>
        <g className="duotone-primary" fill="currentColor">
          <path d="M163.18,74.05c-3.48,5.77-5.2,11.97-7.68,17.67-6.39,14.69-13.51,29.25-18.34,44.46-4.78,8.82-8.35,17.82-12.07,26.7l-9.71,23.14c-1.06,2.51-4.18,4.67-6.68,4.61-1.88-.05-5.31-1.92-6.45-4.04l-27.03-50.61c-.06-1.66.6-3.69,1.89-5.24l44.93-54,24.38-28.56c.78-.91.69-4.05-.32-4.55-4.18-2.07-29.75,23.48-33.92,27.08l-50.99,44.09c-1.51,1.31-2.84,2.89-3.86,4.12L4.79,99.26C2.04,98.22-.1,94.76,0,92.42c.1-2.36,1.64-5.39,4.35-6.71L180.03.76c2.74-1.32,6.17-.52,7.9.96,1.89,1.62,2.91,5.25,1.84,7.86l-26.59,64.48h0Z"/>
        </g>
      </g>
    </svg>
  )
)

Send.displayName = 'Send'
export { Send }
