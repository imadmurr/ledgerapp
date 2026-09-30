import type { SVGProps } from 'react'

/**
 * Hand-written 24px stroke icons. Inline SVG rather than an icon package: the
 * app makes no network requests at runtime, and a dozen paths do not justify a
 * dependency. Every icon inherits `currentColor`.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Base({ size = 24, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
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

export const ReceiptIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 3h14v18l-2.5-1.6L14 21l-2-1.6L10 21l-2.5-1.6L5 21z" />
    <path d="M9 8h6M9 12h6" />
  </Base>
)

export const EnvelopeIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
    <path d="m3.6 6.5 8.4 5.8 8.4-5.8" />
  </Base>
)

export const SlidersIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 21v-6M5 11V3M12 21v-9M12 8V3M19 21v-4M19 13V3" />
    <path d="M2 15h6M9 8h6M16 17h6" />
  </Base>
)

export const ChevronLeftIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="m15 18-6-6 6-6" />
  </Base>
)

export const ChevronRightIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="m9 18 6-6-6-6" />
  </Base>
)

export const XIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Base>
)

export const PlusIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
)

export const MoreIcon = (p: IconProps) => (
  <Base {...p} strokeWidth={0}>
    <circle cx="12" cy="5" r="1.6" fill="currentColor" />
    <circle cx="12" cy="12" r="1.6" fill="currentColor" />
    <circle cx="12" cy="19" r="1.6" fill="currentColor" />
  </Base>
)

export const UploadIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="m7 8 5-5 5 5M12 3v12" />
  </Base>
)

export const DownloadIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="m7 10 5 5 5-5M12 15V3" />
  </Base>
)

export const CheckIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Base>
)

export const PencilIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M16.5 3.5a2.5 2.5 0 0 1 3.5 3.5L7.5 19.5 2.5 21l1.5-5z" />
  </Base>
)

export const ArchiveIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="2.5" y="3.5" width="19" height="5" rx="1.5" />
    <path d="M20 8.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8.5" />
    <path d="M10 13h4" />
  </Base>
)

export const RestoreIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 12a9 9 0 1 0 2.6-6.4L3 8" />
    <path d="M3 3v5h5" />
  </Base>
)

export const TrendUpIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="m22 7-8.5 8.5-5-5L2 17" />
    <path d="M16 7h6v6" />
  </Base>
)

export const TrendDownIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="m22 17-8.5-8.5-5 5L2 7" />
    <path d="M16 17h6v-6" />
  </Base>
)
