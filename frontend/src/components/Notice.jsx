function Notice({ type = "error", children }) {
  return (
    <p className={`notice notice-${type}`} role={type === "error" ? "alert" : "status"}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        {type === "error" ? (
          <path d="M12 7v6M12 16.5v.5" />
        ) : (
          <path d="M7.5 12.5l3 3 6-6.5" />
        )}
      </svg>
      <span>{children}</span>
    </p>
  );
}

export default Notice;
