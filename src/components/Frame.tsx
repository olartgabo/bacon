/** Static drawing frame with corner registration marks — see globals.css. */
export function Frame() {
  return (
    <div aria-hidden className="frame hidden md:block">
      <span className="corner corner-tl" />
      <span className="corner corner-tr" />
      <span className="corner corner-bl" />
      <span className="corner corner-br" />
    </div>
  );
}
