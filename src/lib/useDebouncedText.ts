import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Inline-editable field backed straight by Dexie: local text while the user
 * types, committed 400ms after they stop. There is no Save button anywhere in
 * the Plan tab, so this is the whole write path.
 *
 * An external change is adopted only while the user is not mid-edit, otherwise
 * a live query round trip would yank characters out from under them.
 */
export function useDebouncedText(
  external: string,
  commit: (text: string) => void,
  delayMs = 400,
): [string, (value: string) => void, () => void] {
  const [text, setText] = useState(external)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const dirty = useRef(false)
  const commitRef = useRef(commit)

  useEffect(() => {
    commitRef.current = commit
  })

  useEffect(() => {
    if (!dirty.current) setText(external)
  }, [external])

  useEffect(() => () => clearTimeout(timer.current), [])

  const onChange = useCallback(
    (value: string) => {
      dirty.current = true
      setText(value)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        dirty.current = false
        commitRef.current(value)
      }, delayMs)
    },
    [delayMs],
  )

  /** Commit immediately — on blur, or when the field is about to unmount. */
  const flush = useCallback(() => {
    if (!dirty.current) return
    clearTimeout(timer.current)
    dirty.current = false
    commitRef.current(text)
  }, [text])

  return [text, onChange, flush]
}
