/**
 * Centralized Icon System
 *
 * All icons used in the application are defined here for consistency.
 * Uses custom duotone icons.
 */

import {
  UtensilsCrossed,
  Coffee,
  Camera,
  ShoppingBag,
  Building2,
  MapPin,
  Image,
  FileText,
  Link,
  Map,
  Calendar,
  Plus,
  Plane,
  Hotel,
  X,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Star,
  Trash2,
  Check,
  Luggage,
  BedDouble,
  ImageIcon,
  Sparkles,
  Phone,
  Globe,
  Lightbulb,
  ExternalLink,
  Users,
  Share2,
  ArrowRight,
  Upload,
  Github,
  Footprints,
  Transit,
  type IconComponent,
} from '@/components/icons'

// Alias for backward compat
export type LucideIcon = IconComponent

// ============================================================================
// Category Icons - 장소 카테고리별 아이콘
// ============================================================================

export const CATEGORY_ICONS: Record<string, IconComponent> = {
  restaurant: UtensilsCrossed,
  cafe: Coffee,
  attraction: Camera,
  shopping: ShoppingBag,
  accommodation: Building2,
  transport: Plane,
  other: MapPin,
} as const

// ============================================================================
// Tab Icons - 탭/네비게이션 아이콘
// ============================================================================

export const TAB_ICONS = {
  image: Image,
  text: FileText,
  url: Link,
  map: Map,
  list: MapPin,
  itinerary: Calendar,
  add: Plus,
} as const

// ============================================================================
// Action Icons - 액션/버튼 아이콘
// ============================================================================

export const ACTION_ICONS = {
  close: X,
  expand: ChevronDown,
  collapse: ChevronUp,
  next: ChevronRight,
  star: Star,
  delete: Trash2,
  check: Check,
  plus: Plus,
} as const

// ============================================================================
// Travel Icons - 여행 관련 아이콘
// ============================================================================

export const TRAVEL_ICONS = {
  plane: Plane,
  hotel: Hotel,
  checkin: Hotel,
  checkout: Luggage,
  stay: BedDouble,
  location: MapPin,
} as const

// ============================================================================
// Feature Icons - 특징/기능 아이콘
// ============================================================================

export const FEATURE_ICONS = {
  screenshot: Camera,
  ai: Sparkles,
  mapView: Map,
  gallery: ImageIcon,
} as const

// ============================================================================
// Re-export individual icons for direct import
// ============================================================================

export {
  UtensilsCrossed,
  Coffee,
  Camera,
  ShoppingBag,
  Building2,
  MapPin,
  Image,
  FileText,
  Link,
  Map,
  Calendar,
  Plus,
  Plane,
  Hotel,
  X,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Star,
  Trash2,
  Check,
  Luggage,
  BedDouble,
  ImageIcon,
  Sparkles,
  Phone,
  Globe,
  Lightbulb,
  ExternalLink,
  Users,
  Share2,
  ArrowRight,
  Upload,
  Github,
  Footprints,
  Transit,
}
