/** A field only bots fill in. It is hidden from sight and from assistive technology. */
export function Honeypot(): React.JSX.Element {
  return (
    <div aria-hidden="true" className="sr-only">
      <label>
        Website
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  )
}
