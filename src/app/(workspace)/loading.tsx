export default function WorkspaceLoading() {
  return (
    <div className="grid gap-5 animate-pulse">
      <div className="h-64 rounded-3xl border border-white/10 bg-white/[0.05]" />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-28 rounded-3xl border border-white/10 bg-white/[0.05]"
          />
        ))}
      </div>
    </div>
  );
}
