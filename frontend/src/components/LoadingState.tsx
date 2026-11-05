export function LoadingState({
  label = "Loading evidence…",
}: {
  label?: string;
}) {
  return (
    <p className="state" role="status">
      {label}
    </p>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="state state-error" role="alert">
      <strong>Evidence unavailable</strong>
      <span>{message}</span>
    </div>
  );
}
