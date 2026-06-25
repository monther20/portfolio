/**
 * loading.tsx — Next.js route-level loading UI.
 * Two white panels split from the centre and slide off screen after 1.6 s,
 * revealing the page beneath. No text, no decorations — just the tear.
 */
export default function Loading() {
  return (
    <>
      <div className="torn-panel torn-top torn-auto" />
      <div className="torn-panel torn-bottom torn-auto" />
    </>
  );
}
