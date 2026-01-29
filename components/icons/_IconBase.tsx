import { type SVGProps, type ForwardRefExoticComponent, type RefAttributes } from 'react'

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number | string
  secondaryOpacity?: number
}

export type IconComponent = ForwardRefExoticComponent<
  IconProps & RefAttributes<SVGSVGElement>
>
