import { currency, dateTimeFormat } from "../utils";

function Ticket({ sale, onClose, closeLabel = "Nueva venta" }) {
  const { ticket } = sale;

  return (
    <div className="ticket-backdrop" role="dialog" aria-modal="true" aria-label="Ticket de venta">
      <div className="ticket">
        <header className="ticket-header">
          <strong>{ticket.storeName}</strong>
          <span>{dateTimeFormat.format(new Date(ticket.timestamp))}</span>
          <span className="ticket-id">Folio {ticket.saleId.slice(-8).toUpperCase()}</span>
        </header>

        <p className="ticket-customer">Cliente: {ticket.customerName}</p>

        <table className="ticket-items">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cant.</th>
              <th>Importe</th>
            </tr>
          </thead>
          <tbody>
            {ticket.items.map((item, i) => (
              <tr key={i}>
                <td>
                  {item.name}
                  <span className="ticket-unit">{currency.format(item.unitPrice)} c/u</span>
                </td>
                <td>{item.qty}</td>
                <td>{currency.format(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="ticket-totals">
          <div>
            <dt>Subtotal</dt>
            <dd>{currency.format(ticket.subtotal)}</dd>
          </div>
          <div>
            <dt>Descuento</dt>
            <dd>
              {sale.discountPercent > 0
                ? `${sale.discountPercent}% (−${currency.format(sale.discountAmount)})`
                : "Sin descuento"}
            </dd>
          </div>
          <div className="ticket-total">
            <dt>Total</dt>
            <dd>{currency.format(ticket.total)}</dd>
          </div>
          <div>
            <dt>Pago</dt>
            <dd>{ticket.paymentMethod}</dd>
          </div>
        </dl>

        <p className="ticket-thanks">¡Gracias por tu compra!</p>

        <div className="ticket-actions">
          <button type="button" onClick={() => window.print()}>
            Imprimir
          </button>
          <button type="button" className="ticket-primary" onClick={onClose}>
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Ticket;
