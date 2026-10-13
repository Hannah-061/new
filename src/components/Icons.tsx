import type { SVGProps } from 'react'

// 描邊式的簡單線條圖示，一律不使用表情符號。裝飾用，對輔助工具隱藏。
type IconProps = { size?: number } & Omit<SVGProps<SVGSVGElement>, 'width' | 'height'>

function Icon({ size = 20, strokeWidth = 2, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const MaskIcon = (p: IconProps) => (
  <Icon strokeWidth={1.7} {...p}>
    <path d="M2.5 9.5c0-1.7 1.3-3 3-3h13c1.7 0 3 1.3 3 3v1.5c0 3-2.2 5.5-5.2 5.5-1.9 0-3-.9-4.3-2.3-1.3 1.4-2.4 2.3-4.3 2.3-3 0-5.2-2.5-5.2-5.5z" />
    <circle cx="8" cy="11" r="1.3" />
    <circle cx="16" cy="11" r="1.3" />
  </Icon>
)
export const ArrowRightIcon = (p: IconProps) => (
  <Icon strokeWidth={2.2} {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icon>
)
export const ArrowUpIcon = (p: IconProps) => (
  <Icon strokeWidth={2.4} {...p}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </Icon>
)
export const ArrowDownIcon = (p: IconProps) => (
  <Icon strokeWidth={2.4} {...p}>
    <path d="M12 5v14M6 13l6 6 6-6" />
  </Icon>
)
export const ChevronDownIcon = (p: IconProps) => (
  <Icon strokeWidth={2.2} {...p}>
    <path d="M6 9l6 6 6-6" />
  </Icon>
)
export const ChevronUpIcon = (p: IconProps) => (
  <Icon strokeWidth={2.2} {...p}>
    <path d="M6 15l6-6 6 6" />
  </Icon>
)
export const ExitIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
  </Icon>
)
export const CloseIcon = (p: IconProps) => (
  <Icon strokeWidth={2.2} {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
)
export const ClockIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
)
export const RetryIcon = (p: IconProps) => (
  <Icon strokeWidth={2.2} {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" />
  </Icon>
)
export const AlertIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v5M12 16.5v.01" />
  </Icon>
)
