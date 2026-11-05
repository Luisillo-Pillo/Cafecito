import connection from "../assets/illustrations/connection.svg";
import customers from "../assets/illustrations/customers.svg";
import emptyCart from "../assets/illustrations/empty-cart.svg";
import error from "../assets/illustrations/error.svg";
import loading from "../assets/illustrations/loading.svg";
import menu from "../assets/illustrations/menu.svg";
import receipt from "../assets/illustrations/receipt.svg";
import search from "../assets/illustrations/search.svg";
import "./StateMessage.css";

const ILLUSTRATIONS = {
  connection,
  customers,
  "empty-cart": emptyCart,
  error,
  loading,
  menu,
  receipt,
  search,
};

function StateMessage({ illustration, title, children, action, compact = false }) {
  return (
    <div
      className={"state-message" + (compact ? " is-compact" : "")}
      role={illustration === "loading" ? "status" : undefined}
    >
      <img src={ILLUSTRATIONS[illustration]} alt="" className="state-message-art" />
      <strong className="state-message-title">{title}</strong>
      {children && <p className="state-message-text">{children}</p>}
      {action && (
        <button type="button" className="state-message-action" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}

export function LoadError({ error, subject, onRetry, compact = false }) {
  return (
    <StateMessage
      illustration={error?.status === 0 ? "connection" : "error"}
      title={`No pudimos cargar ${subject}`}
      action={{ label: "Reintentar", onClick: onRetry }}
      compact={compact}
    >
      {error?.message}
    </StateMessage>
  );
}

export default StateMessage;
