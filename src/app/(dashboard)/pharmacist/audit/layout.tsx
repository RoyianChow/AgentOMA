/**
 * Audit section layout. The `@modal` parallel-route slot renders the record
 * dialog as an overlay on top of the table when a row is opened via soft
 * navigation; it renders nothing (default.tsx) otherwise.
 */
export default function AuditLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
