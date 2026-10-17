const currency = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);
const states = ['recibido', 'pago pendiente', 'preparando', 'enviado', 'entregado', 'cancelado', 'devuelto'];
const payments = ['pendiente', 'aprobado', 'rechazado', 'reembolsado'];
let role = null;

async function api(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
    });
    const result = response.status === 204 ? {} : await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'No se pudo completar la acción.');
    return result;
}

function showMessage(text, target = 'global-message') {
    document.getElementById(target).textContent = text;
}

async function checkSession() {
    try {
        const session = await api('/api/admin/session');
        role = session.role;
        document.getElementById('login-panel').hidden = true;
        document.getElementById('dashboard').hidden = false;
        document.getElementById('logout-button').hidden = false;
        document.getElementById('role-badge').textContent = session.role;
        document.getElementById('create-product-form').closest('details').hidden = session.role !== 'admin';
        document.getElementById('coupon-form').hidden = session.role !== 'admin';
        await refreshDashboard();
    } catch {
        document.getElementById('login-panel').hidden = false;
        document.getElementById('dashboard').hidden = true;
        document.getElementById('logout-button').hidden = true;
    }
}

async function refreshDashboard() {
    try {
        const query = new URLSearchParams();
        for (const key of ['from', 'to', 'status']) {
            const value = document.getElementById(`report-${key}`).value;
            if (value) query.set(key, value);
        }
        const [overview, orders, catalog, coupons, support, movements] = await Promise.all([
            api(`/api/admin/overview?${query}`),
            api('/api/admin/orders'),
            api('/api/admin/products'),
            api('/api/admin/coupons'),
            api('/api/admin/support'),
            api('/api/admin/inventory/movements')
        ]);
        document.getElementById('metric-gross').textContent = currency.format(overview.sales.gross);
        document.getElementById('metric-net').textContent = currency.format(overview.sales.net);
        document.getElementById('metric-discounts').textContent = currency.format(overview.sales.discounts);
        document.getElementById('metric-shipping').textContent = currency.format(overview.sales.shipping);
        document.getElementById('metric-orders').textContent = overview.sales.orders;
        document.getElementById('metric-units').textContent = overview.sales.units;
        renderOrders(orders.orders);
        renderProducts(catalog.products);
        renderCoupons(coupons.coupons);
        renderSupport(support.requests);
        renderMovements(movements.movements);
        document.getElementById('best-sellers').innerHTML = overview.bestSellers.length
            ? `<div class="best-seller-list">${overview.bestSellers.map((item) => `<article>${escapeHTML(item.name)} · <strong>${item.units} uds.</strong></article>`).join('')}</div>`
            : '<p class="empty-state">Aún no hay ventas aprobadas en esta demostración.</p>';
        document.getElementById('low-stock').innerHTML = overview.lowStock.length
            ? `<div class="low-stock-list">${overview.lowStock.map((item) => `<article>${escapeHTML(item.name)} <strong>${item.stock} uds.</strong><small> · ${escapeHTML(item.sku)} · ${escapeHTML(item.variant)}</small></article>`).join('')}</div>`
            : '<p class="empty-state">No hay alertas de bajo stock demo.</p>';
    } catch (error) {
        showMessage(error.message);
    }
}

function renderOrders(orders) {
    const container = document.getElementById('orders-table');
    container.innerHTML = orders.length
        ? `<table><thead><tr><th>Pedido / fecha</th><th>Cliente</th><th>Artículos</th><th>Total</th><th>Estado</th><th>Pago</th><th>Seguimiento</th><th>Guardar</th></tr></thead><tbody>${orders.map((order) => `<tr data-order-row="${escapeHTML(order.id)}">
            <td><strong>${escapeHTML(order.number)}</strong><br><small>${new Date(order.createdAt).toLocaleString('es-CO')}</small></td>
            <td>${escapeHTML(order.customer.name)}<br><small>${escapeHTML(order.customer.email)}</small></td>
            <td><div class="order-items">${order.items.map((item) => `${escapeHTML(item.name)} × ${item.quantity} · ${escapeHTML(item.color)} / ${escapeHTML(item.size)}`).join('<br>')}</div></td>
            <td>${currency.format(order.total)}</td>
            <td><select data-field="status">${states.map((state) => `<option ${state === order.status ? 'selected' : ''}>${state}</option>`).join('')}</select></td>
            <td><select data-field="paymentStatus">${payments.map((state) => `<option ${state === order.paymentStatus ? 'selected' : ''}>${state}</option>`).join('')}</select></td>
            <td><input data-field="trackingNumber" maxlength="80" value="${escapeHTML(order.delivery.trackingNumber || '')}" placeholder="Guía"></td>
            <td><button type="button" data-save-order="${escapeHTML(order.id)}">Guardar</button></td>
        </tr>`).join('')}</tbody></table>`
        : '<p class="empty-state">No hay pedidos demo todavía. Los pedidos creados en la tienda aparecerán aquí.</p>';
}

function renderProducts(products) {
    document.getElementById('products-table').innerHTML = `<table><thead><tr><th>SKU / producto</th><th>Precio COP</th><th>Visible</th><th>Variante</th><th>Ajustar stock</th><th>Acciones</th></tr></thead><tbody>${products.map((product) => {
        const variantOptions = product.colors.flatMap((color) => product.sizes.map((size) =>
            `<option value="${escapeHTML(color.label)}|${escapeHTML(size)}">${escapeHTML(color.label)} · ${escapeHTML(size)} (${product.inventory[`${color.label}|${size}`] ?? 0})</option>`
        )).join('');
        return `<tr data-product-row="${escapeHTML(product.id)}">
            <td><strong>${escapeHTML(product.name)}</strong><br><small>${escapeHTML(product.sku)} · ${escapeHTML(product.category)} · stock ${product.stock}</small></td>
            <td><input data-field="price" type="number" min="100" max="100000000" step="100" value="${product.price}" ${role === 'admin' ? '' : 'disabled'}></td>
            <td>${product.available ? 'Sí' : 'Oculto'}</td>
            <td><select data-field="variant">${variantOptions}</select></td>
            <td><form data-stock-form="${escapeHTML(product.id)}"><input name="quantity" type="number" min="-1000" max="1000" required placeholder="+/- unidades"><input name="reason" maxlength="120" placeholder="Motivo"><button type="submit">Ajustar</button></form></td>
            <td>${role === 'admin' ? `<button type="button" data-save-product="${escapeHTML(product.id)}">Precio</button> <button type="button" data-hide-product="${escapeHTML(product.id)}">${product.available ? 'Ocultar' : 'Mostrar'}</button>` : 'Solo admin'}</td>
        </tr>`;
    }).join('')}</tbody></table>`;
}

function renderCoupons(coupons) {
    const entries = Object.entries(coupons);
    document.getElementById('coupons-list').innerHTML = entries.length
        ? `<div class="coupon-list">${entries.map(([code, coupon]) => `<div><span><strong>${escapeHTML(code)}</strong> · ${escapeHTML(coupon.label)}${coupon.minimum ? ` · mínimo ${currency.format(coupon.minimum)}` : ''}</span>${role === 'admin' ? `<button type="button" data-delete-coupon="${escapeHTML(code)}">Eliminar</button>` : ''}</div>`).join('')}</div>`
        : '<p class="empty-state">No hay cupones configurados.</p>';
}

function renderSupport(requests) {
    document.getElementById('support-table').innerHTML = requests.length
        ? `<table><thead><tr><th>Fecha</th><th>Contacto</th><th>Motivo / mensaje</th><th>Estado</th><th>Guardar</th></tr></thead><tbody>${requests.map((entry) => `<tr data-support-row="${escapeHTML(entry.id)}">
            <td>${new Date(entry.date).toLocaleString('es-CO')}</td>
            <td>${escapeHTML(entry.name)}<br><a href="mailto:${escapeHTML(entry.email)}">${escapeHTML(entry.email)}</a></td>
            <td><strong>${escapeHTML(entry.topic)}</strong><br>${escapeHTML(entry.message)}</td>
            <td><select data-support-status>${['nuevo', 'en progreso', 'resuelto'].map((status) => `<option ${entry.status === status ? 'selected' : ''}>${status}</option>`).join('')}</select></td>
            <td><button type="button" data-save-support="${escapeHTML(entry.id)}">Guardar</button></td>
        </tr>`).join('')}</tbody></table>`
        : '<p class="empty-state">Aún no hay solicitudes de soporte.</p>';
}

function renderMovements(movements) {
    document.getElementById('inventory-movements').innerHTML = movements.length
        ? `<table><thead><tr><th>Fecha</th><th>Producto / SKU</th><th>Variante</th><th>Movimiento</th><th>Cantidad</th><th>Motivo / pedido</th></tr></thead><tbody>${movements.map((entry) => `<tr><td>${new Date(entry.date).toLocaleString('es-CO')}</td><td>${escapeHTML(entry.productName)}<br><small>${escapeHTML(entry.sku)}</small></td><td>${escapeHTML(entry.variant)}</td><td>${escapeHTML(entry.type)}</td><td>${entry.quantity > 0 ? '+' : ''}${entry.quantity}</td><td>${escapeHTML(entry.reason || entry.orderId || '—')}</td></tr>`).join('')}</tbody></table>`
        : '<p class="empty-state">Todavía no hay movimientos registrados.</p>';
}

document.getElementById('login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const username = formData.get('username');
    const password = formData.get('password');
    try {
        await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ username, password }) });
        showMessage('', 'login-message');
        await checkSession();
    } catch (error) {
        showMessage(error.message, 'login-message');
    }
});

document.getElementById('logout-button').addEventListener('click', async () => {
    try {
        await api('/api/admin/logout', { method: 'POST' });
        await checkSession();
    } catch (error) {
        showMessage(error.message);
    }
});
document.getElementById('refresh-button').addEventListener('click', refreshDashboard);
window.setInterval(() => {
    const editingDashboardField = document.activeElement?.matches('#dashboard input, #dashboard select, #dashboard textarea');
    if (role && !document.hidden && !editingDashboardField) void refreshDashboard();
}, 15000);
document.addEventListener('visibilitychange', () => {
    if (role && !document.hidden) void refreshDashboard();
});
for (const id of ['report-from', 'report-to', 'report-status']) {
    document.getElementById(id).addEventListener('change', refreshDashboard);
}

document.getElementById('orders-table').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-save-order]');
    if (!button) return;
    const row = button.closest('[data-order-row]');
    const body = Object.fromEntries([...row.querySelectorAll('[data-field]')].map((field) => [field.dataset.field, field.value]));
    try {
        await api(`/api/admin/orders/${encodeURIComponent(button.dataset.saveOrder)}`, { method: 'PATCH', body: JSON.stringify(body) });
        showMessage('Pedido actualizado.');
        await refreshDashboard();
    } catch (error) {
        showMessage(error.message);
    }
});

document.getElementById('products-table').addEventListener('click', async (event) => {
    const save = event.target.closest('[data-save-product]');
    const hide = event.target.closest('[data-hide-product]');
    if (!save && !hide) return;
    const id = save ? save.dataset.saveProduct : hide.dataset.hideProduct;
    const row = (save || hide).closest('[data-product-row]');
    try {
        if (hide) {
            const productName = row.querySelector('td strong').textContent;
            const hiding = hide.textContent === 'Ocultar';
            if (!window.confirm(`¿${hiding ? 'Ocultar' : 'Mostrar'} “${productName}”? Los pedidos históricos se conservarán.`)) return;
            await api(`/api/admin/products/${encodeURIComponent(id)}`, {
                method: 'PATCH',
                body: JSON.stringify({ available: !hiding })
            });
        } else {
            await api(`/api/admin/products/${encodeURIComponent(id)}`, {
                method: 'PATCH',
                body: JSON.stringify({ price: Number(row.querySelector('[data-field="price"]').value) })
            });
        }
        showMessage('Producto actualizado.');
        await refreshDashboard();
    } catch (error) {
        showMessage(error.message);
    }
});

document.getElementById('products-table').addEventListener('submit', async (event) => {
    const form = event.target.closest('[data-stock-form]');
    if (!form) return;
    event.preventDefault();
    const row = form.closest('[data-product-row]');
    const [color, size] = row.querySelector('[data-field="variant"]').value.split('|');
    const data = new FormData(form);
    try {
        await api(`/api/admin/inventory/${encodeURIComponent(form.dataset.stockForm)}/adjust`, {
            method: 'POST',
            body: JSON.stringify({ color, size, quantity: Number(data.get('quantity')), reason: data.get('reason') })
        });
        showMessage('Movimiento de inventario registrado.');
        await refreshDashboard();
    } catch (error) {
        showMessage(error.message);
    }
});

document.getElementById('create-product-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
        await api('/api/admin/products', {
            method: 'POST',
            body: JSON.stringify({
                ...data,
                price: Number(data.price),
                initialStock: Number(data.initialStock),
                colors: String(data.colors).split(',').map((value) => value.trim()).filter(Boolean),
                sizes: String(data.sizes).split(',').map((value) => value.trim()).filter(Boolean)
            })
        });
        form.reset();
        showMessage('Producto demo creado.');
        await refreshDashboard();
    } catch (error) {
        showMessage(error.message);
    }
});

document.getElementById('coupon-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
        await api('/api/admin/coupons', {
            method: 'POST',
            body: JSON.stringify({ ...data, value: Number(data.value), minimum: Number(data.minimum) })
        });
        form.reset();
        showMessage('Cupón demo guardado.');
        await refreshDashboard();
    } catch (error) {
        showMessage(error.message);
    }
});

document.getElementById('coupons-list').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-delete-coupon]');
    if (!button || !window.confirm(`¿Eliminar el cupón demo ${button.dataset.deleteCoupon}?`)) return;
    try {
        await api(`/api/admin/coupons/${encodeURIComponent(button.dataset.deleteCoupon)}`, { method: 'DELETE' });
        showMessage('Cupón eliminado.');
        await refreshDashboard();
    } catch (error) {
        showMessage(error.message);
    }
});

document.getElementById('support-table').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-save-support]');
    if (!button) return;
    const row = button.closest('[data-support-row]');
    try {
        await api(`/api/admin/support/${encodeURIComponent(button.dataset.saveSupport)}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: row.querySelector('[data-support-status]').value })
        });
        showMessage('Solicitud de soporte actualizada.');
        await refreshDashboard();
    } catch (error) {
        showMessage(error.message);
    }
});

document.getElementById('export-report').addEventListener('click', async () => {
    const query = new URLSearchParams();
    for (const key of ['from', 'to', 'status']) {
        const value = document.getElementById(`report-${key}`).value;
        if (value) query.set(key, value);
    }
    try {
        const response = await fetch(`/api/admin/reports.csv?${query}`);
        if (!response.ok) {
            const result = await response.json().catch(() => ({}));
            throw new Error(result.error || 'No se pudo exportar el reporte.');
        }
        const url = URL.createObjectURL(await response.blob());
        const link = document.createElement('a');
        link.href = url;
        link.download = 'ritmo-sport-reporte-demo.csv';
        link.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        showMessage(error.message);
    }
});

checkSession();
