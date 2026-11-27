"use client";

export default function WorkspaceError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="panel" role="alert">
      <h1 className="mb-2 text-xl font-semibold">OpenAsset could not load this page</h1>
      <p className="mb-4">Try again. If the problem continues, check that the database is running.</p>
      <button type="button" className="button" onClick={reset}>Try again</button>
    </div>
  );
}
