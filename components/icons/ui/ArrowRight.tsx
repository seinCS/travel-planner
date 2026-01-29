import { forwardRef } from 'react'
import type { IconProps } from '../_IconBase'

const ArrowRight = forwardRef<SVGSVGElement, IconProps>(
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
      <g transform="translate(1.13, 1.19) scale(0.0808)">
        <g className="duotone-secondary" opacity={secondaryOpacity} fill="currentColor">
          
        </g>
        <g className="duotone-primary" fill="currentColor">
          <path d="M160.046,192.466l38.286-39.6-175.123-.145c-10.237-.008-17.411-8.498-18.042-17.391-.644-9.086,5.659-19.881,16.336-19.901l176.904-.328-37.646-38.821c-7.327-7.555-7.185-19.347-.378-26.539,7.168-7.573,19.707-8.138,27.33-.38l67.806,69.009c9.052,9.213,8.846,21.887-.194,31.104l-67.256,68.58c-7.476,7.623-18.901,8.037-26.722,1.015-7.002-6.288-8.9-18.745-1.302-26.604Z"/>
        </g>
      </g>
    </svg>
  )
)

ArrowRight.displayName = 'ArrowRight'
export { ArrowRight }
