/** Explains the * mark on machine-translated dishes; Google's terms ask for its attribution next to its translations. */
export function MachineNote({ note, google }: { note: string; google: boolean }) {
  return (
    <p className="m-0 mt-6 text-[14px] text-muted">
      {note}
      {google ? (
        <>
          {" · "}
          <a href="https://translate.google.com" lang="en" className="text-muted">Powered by Google Translate</a>
        </>
      ) : null}
    </p>
  );
}
