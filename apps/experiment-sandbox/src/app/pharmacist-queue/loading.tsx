export default function PharmacistQueueLoading() {
  return (
    <section className="card queue-page" aria-labelledby="queue-loading-title">
      <h1 id="queue-loading-title">Synthetic pharmacist queue</h1>
      <p role="status" aria-live="polite">
        Loading the read-only synthetic administrative queue.
      </p>
    </section>
  );
}
