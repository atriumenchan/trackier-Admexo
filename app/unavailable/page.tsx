export const metadata = { title: "Unavailable" };

export default function UnavailablePage() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="surface-card max-w-md p-6 text-center">
        <p className="font-display text-2xl text-ink">Offer unavailable</p>
        <p className="mt-2 text-sm text-muted">This offer is not taking traffic right now.</p>
      </div>
    </main>
  );
}
