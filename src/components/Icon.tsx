import type { SVGProps } from 'react'

/**
 * Hand-written 24px stroke icons. Inline SVG rather than an icon package: the
 * app makes no network requests at runtime, and a dozen paths do not justify a
 * dependency. Every icon inherits `currentColor`.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number; filled?: boolean }

/** `filled` is consumed by the tab-bar icons; it must not reach the DOM. */
function Base({ size = 24, filled: _filled, children, ...rest }: IconProps) {
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

export const ReceiptIcon = ({ filled, ...p }: IconProps) =>
  filled ? (
    <Base {...p} strokeWidth={0}>
      {/* Outer shape with the two rules punched out as holes. */}
      <path
        fillRule="evenodd"
        fill="currentColor"
        d="M5 3h14v18l-2.5-1.6L14 21l-2-1.6L10 21l-2.5-1.6L5 21z
           M8.9 7.15h6.2v1.7H8.9z
           M8.9 11.15h6.2v1.7H8.9z"
      />
    </Base>
  ) : (
    <Base {...p}>
      <path d="M5 3h14v18l-2.5-1.6L14 21l-2-1.6L10 21l-2.5-1.6L5 21z" />
      <path d="M9 8h6M9 12h6" />
    </Base>
  )

export const EnvelopeIcon = ({ filled, ...p }: IconProps) =>
  filled ? (
    <Base {...p} strokeWidth={0}>
      {/* Solid envelope with the flap cut out of it. */}
      <path
        fillRule="evenodd"
        fill="currentColor"
        d="M5.5 4.5h13A2.5 2.5 0 0 1 21 7v10a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17V7a2.5 2.5 0 0 1 2.5-2.5z
           M4.1 6.6 12 12.05 19.9 6.6v1.85L12 13.9 4.1 8.45z"
      />
    </Base>
  ) : (
    <Base {...p}>
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <path d="m3.6 6.5 8.4 5.8 8.4-5.8" />
    </Base>
  )

export const SlidersIcon = ({ filled, ...p }: IconProps) => (
  <Base {...p}>
    <path d="M5 21v-6M5 11V3M12 21v-9M12 8V3M19 21v-4M19 13V3" />
    {filled ? (
      /* Solid knobs read as the selected state without a second glyph. */
      <>
        <circle cx="5" cy="13" r="2.6" fill="currentColor" strokeWidth={0} />
        <circle cx="12" cy="10" r="2.6" fill="currentColor" strokeWidth={0} />
        <circle cx="19" cy="15" r="2.6" fill="currentColor" strokeWidth={0} />
      </>
    ) : (
      <path d="M2 13h6M9 10h6M16 15h6" />
    )}
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

export const AlertIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3.6 1.8 20.4h20.4z" />
    <path d="M12 10v4.2M12 17.6v.01" />
  </Base>
)

export const InfoIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9.2" />
    <path d="M12 11v5.5M12 7.6v.01" />
  </Base>
)

export const SparkIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 2.8 13.9 9l6.2 1.9-6.2 1.9L12 19l-1.9-6.2L3.9 10.9 10.1 9z" />
    <path d="M19 3v3M20.5 4.5h-3" />
  </Base>
)

export const TargetIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.8" />
    <circle cx="12" cy="12" r="4.8" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
  </Base>
)

export const TrashIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 6.5h16M9.5 6.5V4.2h5v2.3" />
    <path d="M6.2 6.5 7 20a1.6 1.6 0 0 0 1.6 1.5h6.8A1.6 1.6 0 0 0 17 20l.8-13.5" />
  </Base>
)
