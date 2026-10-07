import './Segmented.css'

/**
 * The iOS segmented control: a tinted track with the selected segment raised
 * out of it. Three screens grew their own copy of this before it was worth
 * extracting — the Log tab's Categories/Entries, the appearance picker, and
 * now the Envelopes split.
 *
 * `wide` fills the row, which is right when the options are the whole point
 * of the screen below; without it the control is only as wide as its labels.
 */
export default function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  wide = false,
}: {
  options: { id: T; label: string }[]
  value: T
  onChange: (id: T) => void
  /** Names the group for a screen reader — "View", "Appearance". */
  label: string
  wide?: boolean
}) {
  return (
    <div className={`segmented${wide ? ' segmented--wide' : ''}`} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={`segmented__btn${option.id === value ? ' segmented__btn--on' : ''}`}
          aria-pressed={option.id === value}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
