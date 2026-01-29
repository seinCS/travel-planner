import { forwardRef } from 'react'
import type { IconProps } from '../_IconBase'

const Transport = forwardRef<SVGSVGElement, IconProps>(
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
      <g transform="translate(1.8, 1.5) scale(0.1336)">
        <g className="duotone-secondary" opacity={secondaryOpacity} fill="currentColor">
          <path d="M6.52,71.781c2.399,6.199,5.978,9.348,11.668,10.445-7.932,19.49-1.041,40.79,16.785,51.544,30.801,18.58,73.972-1.379,85.465-38.518,7.41-23.944-3.808-35.373,3.651-36.903,2.009-.412,4.192,1.105,4.839,3.485,5.963,21.908,1.054,44.239-12.847,62.064-17.236,22.1-44.813,33.254-72.439,27.269C18.794,145.784,1.192,124.688.444,99.32c-.29-9.835,1.702-19.134,6.076-27.539Z"/>
        </g>
        <g className="duotone-primary" fill="currentColor">
          <path d="M72.812,62.821l-24.259,8.322c-9.751,3.345-20.109,2.929-30.519,2.703-2.37-.051-3.289-4.398-4.197-5.891L0,45.2c13.573-10.174,18.112.424,32.664,6.214L113.137,19.002c12.068-4.861,24.472-5.024,36.06.892,1.433.732,3.048,3.539,3.14,4.999.361,5.706-11.747,10.837-17.108,13.009l-29.144,11.807-22.552,53.656c-3.822,3.029-8.667,4.906-14.582,5.821l3.862-46.365Z"/>
<path d="M57.52,34.137L27.08,5.994c4.549-3.421,8.995-4.701,14.377-5.994l44.717,21.889-28.653,12.248Z"/>
        </g>
      </g>
    </svg>
  )
)

Transport.displayName = 'Transport'
export { Transport }
