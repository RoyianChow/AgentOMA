// The @modal parallel-route slot renders nothing when no record is open.
// (Next.js requires a default for a slot that isn't matched on the initial /
// hard navigation to the audit page.)
export default function ModalDefault() {
  return null;
}
