import AcceptInvitationForm from "./AcceptInvitationForm";

// Server component: only unwraps the token from the URL. The token is
// validated server-side in the action when the form is submitted.
export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div style={{ maxWidth: "420px", margin: "6rem auto", padding: "0 1.5rem" }}>
        <div className="detail-section-card" style={{ padding: "2rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.3rem", marginBottom: "0.5rem" }}>Invitation link incomplete</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            This page needs the full invitation link from your pharmacy admin.
          </p>
        </div>
      </div>
    );
  }

  return <AcceptInvitationForm token={token} />;
}
