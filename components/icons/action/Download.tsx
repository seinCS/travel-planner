import { forwardRef } from 'react'
import type { IconProps } from '../_IconBase'

const Download = forwardRef<SVGSVGElement, IconProps>(
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
      <g transform="translate(1.62, 1.63) scale(0.1188)">
        <g className="duotone-secondary" opacity={secondaryOpacity} fill="currentColor">
          <path d="M168.239,116.328c2.928-.016,6.389,2.678,6.388,6.001l-.011,38.106c-.002,8.01-6.411,15.174-14.846,15.173l-145.576-.017c-7.73,0-14.096-7.208-14.112-14.526L0,124.001c-.01-4.35,2.646-7.602,7.104-7.617l12.179-.041c2.468-.008,6.193,2.353,6.214,5.39l.194,27.839,123.209.011.213-26.637c.027-3.365,2.493-6.531,6.06-6.55l13.066-.069Z"/>
        </g>
        <g className="duotone-primary" fill="currentColor">
          <path d="M77.051,0l20.992-.013c4.6-.003,9.219,3.474,9.228,8.718l.113,62.734,23.827.115c2.34.011,5.46,1.644,6.364,3.283,1.031,1.869,1.046,6.191-.467,7.865L93.444,130.914c-3.387,3.748-8.461,3.393-11.663-.157L38.606,82.892c-1.412-1.566-1.696-5.421-1.069-7.167.584-1.626,3.396-4.186,5.29-4.201l25.359-.205-.116-61.713C68.06,4.171,71.56,0,77.05,0Z"/>
        </g>
      </g>
    </svg>
  )
)

Download.displayName = 'Download'
export { Download }
