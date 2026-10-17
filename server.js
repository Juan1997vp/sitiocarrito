import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import { categories, demoCoupons, products as seedProducts, renderProductIllustration, storeConfig } from './catalog.js';

const app = express();
const port = Number(process.env.PORT || 3000);
const baseUrl = process.env.BASE_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`;
const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
const adminSessionSecret = process.env.ADMIN_SESSION_SECRET;
const root = path.dirname(fileURLToPath(import.meta.url));
const dataDirectory = process.env.STORE_DATA_DIR ? path.resolve(process.env.STORE_DATA_DIR) : path.join(root, '.data');
const databasePath = path.join(dataDirectory, 'store.json');
const cookieName = 'ritmo_admin';
const orderStates = ['recibido', 'pago pendiente', 'preparando', 'enviado', 'entregado', 'cancelado', 'devuelto'];
const paymentStates = ['pendiente', 'aprobado', 'rechazado', 'reembolsado'];
const attempts = new Map();
const supportAttempts = new Map();

app.disable('x-powered-by');
app.use(express.json({ limit: '30kb' }));
app.use((request, response, next) => {
    response.set('X-Content-Type-Options', 'nosniff');
    response.set('X-Frame-Options', 'DENY');
    response.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    response.set('Content-Security-Policy', "default-src 'self'; img-src 'self' https://images.unsplash.com data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'");
    next();
});

fs.mkdirSync(dataDirectory, { recursive: true });
const defaultDatabase = {
    inventory: Object.fromEntries(seedProducts.map((product) => [product.id, product.inventory])),
    products: [],
    productOverrides: {},
    orders: [],
    inventoryMovements: [],
    notifications: [],
    supportRequests: [],
    coupons: demoCoupons
};
let database = fs.existsSync(databasePath)
    ? JSON.parse(fs.readFileSync(databasePath, 'utf8'))
    : structuredClone(defaultDatabase);
database.products ||= [];
database.inventory ||= {};
let inventoryUpdated = false;
for (const product of seedProducts) {
    if (Object.hasOwn(database.inventory, product.id)) continue;
    database.inventory[product.id] = structuredClone(product.inventory);
    inventoryUpdated = true;
}
database.productOverrides ||= {};
database.orders ||= [];
database.inventoryMovements ||= [];
database.notifications ||= [];
database.supportRequests ||= [];
database.coupons ||= demoCoupons;
if (!fs.existsSync(databasePath)) fs.writeFileSync(databasePath, JSON.stringify(database, null, 2));

function saveDatabase() {
    const temporaryPath = `${databasePath}.tmp`;
    fs.writeFileSync(temporaryPath, JSON.stringify(database, null, 2));
    fs.renameSync(temporaryPath, databasePath);
}

if (inventoryUpdated) saveDatabase();

function currentProducts() {
    const seeded = seedProducts
        .filter((product) => database.productOverrides[product.id]?.deleted !== true)
        .map((product) => {
            const override = database.productOverrides[product.id] || {};
            const inventory = database.inventory[product.id] || product.inventory;
            return {
                ...product,
                ...override,
                id: product.id,
                inventory,
                stock: Object.values(inventory).reduce((sum, value) => sum + value, 0),
                image: override.image || product.image,
                images: override.images || product.images
            };
        });
    const custom = database.products
        .filter((product) => database.productOverrides[product.id]?.deleted !== true)
        .map((product) => {
            const override = database.productOverrides[product.id] || {};
            const inventory = database.inventory[product.id] || product.inventory;
            const categoryIndex = categories.indexOf(product.category);
            const generatedImage = `/assets/products/${product.id}.svg`;
            const generatedImages = Array.from(
                { length: Math.max(1, Math.min(product.colors.length, 3)) },
                (_, viewIndex) => `${generatedImage}?view=${viewIndex}`
            );
            const selectedImage = override.image || product.image;
            const images = override.images?.length
                ? override.images
                : product.images?.length ? product.images : selectedImage ? [selectedImage] : generatedImages;
            const image = selectedImage || images[0];
            return {
                ...product,
                ...override,
                image,
                images,
                fallbackImage: `/assets/products/${Math.max(0, categoryIndex) + 1}.svg`,
                inventory,
                stock: Object.values(inventory).reduce((sum, value) => sum + value, 0)
            };
        });
    return [...seeded, ...custom];
}

app.get('/assets/products/:productId.svg', (request, response, next) => {
    const product = currentProducts().find((entry) => entry.id === request.params.productId);
    if (!product) return next();
    const viewIndex = request.query.view === undefined ? 0 : Number(request.query.view);
    if (!Number.isInteger(viewIndex) || viewIndex < 0 || viewIndex >= Math.min(product.colors.length, 3)) {
        return response.status(400).type('text/plain').send('La variante de imagen no es válida.');
    }
    response.type('image/svg+xml').set('Cache-Control', 'private, no-cache')
        .send(renderProductIllustration(product, viewIndex));
});
app.use('/assets', express.static(path.join(root, 'assets'), { fallthrough: false, maxAge: '1d' }));

function validateCustomer(customer) {
    if (!customer || typeof customer !== 'object') return false;
    const fields = ['name', 'email', 'phone', 'address', 'streetNumber', 'city', 'department', 'postalCode'];
    if (fields.some((field) => typeof customer[field] !== 'string')) return false;
    const phone = customer.phone.replace(/\D/g, '');
    return customer.name.trim().length >= 3 && customer.name.trim().length <= 100
        && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim()) && customer.email.length <= 120
        && phone.length >= 7 && phone.length <= 15
        && customer.address.trim().length >= 5 && customer.address.trim().length <= 120
        && customer.streetNumber.trim().length >= 1 && customer.streetNumber.trim().length <= 30
        && customer.city.trim().length >= 2 && customer.city.trim().length <= 80
        && customer.department.trim().length >= 2 && customer.department.trim().length <= 80
        && customer.postalCode.trim().length >= 4 && customer.postalCode.trim().length <= 12;
}

function getShipping(methodId, subtotal) {
    const method = storeConfig.shippingMethods.find((entry) => entry.id === methodId);
    if (!method) return null;
    return {
        ...method,
        price: methodId === 'standard' && subtotal >= storeConfig.freeShippingThreshold ? 0 : method.price
    };
}

function computeOrder(items, couponCode, deliveryMethod) {
    if (!Array.isArray(items) || items.length < 1 || items.length > 200) return { error: 'El carrito no es válido.' };
    const productsById = new Map(currentProducts().map((product) => [product.id, product]));
    const seen = new Set();
    const snapshot = [];
    for (const item of items) {
        if (!item || typeof item.id !== 'string' || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 500) {
            return { error: 'Las cantidades del carrito no son válidas.' };
        }
        const product = productsById.get(item.id);
        if (!product || product.available === false) return { error: 'Uno de los productos ya no está disponible.' };
        const color = product.colors.find((entry) => entry.label === item.color);
        const size = product.sizes.includes(item.size) ? item.size : null;
        if (!color || !size) return { error: `La variante de ${product.name} no es válida.` };
        const variantKey = `${product.id}|${color.label}|${size}`;
        if (seen.has(variantKey)) return { error: 'El carrito contiene una variante duplicada.' };
        seen.add(variantKey);
        const stock = database.inventory[product.id]?.[`${color.label}|${size}`] ?? 0;
        if (item.quantity > stock) return { error: `Solo quedan ${stock} unidades de ${product.name} (${color.label}, talla ${size}).` };
        snapshot.push({
            id: product.id,
            sku: product.sku,
            name: product.name,
            brand: product.brand,
            seller: product.seller || 'Ritmo Sport',
            category: product.category,
            color: color.label,
            size,
            quantity: item.quantity,
            unitPrice: product.price,
            lineTotal: product.price * item.quantity,
            image: product.image
        });
    }

    const subtotal = snapshot.reduce((sum, item) => sum + item.lineTotal, 0);
    let discount = 0;
    const normalizedCoupon = typeof couponCode === 'string' ? couponCode.toUpperCase() : '';
    const coupon = normalizedCoupon && Object.hasOwn(database.coupons, normalizedCoupon) ? database.coupons[normalizedCoupon] : null;
    if (couponCode && !coupon) return { error: 'El cupón no es válido.' };
    if (coupon) {
        if (coupon.minimum && subtotal < coupon.minimum) return { error: `El cupón requiere una compra mínima de ${coupon.minimum} COP.` };
        discount = coupon.type === 'percentage' ? Math.round(subtotal * coupon.value / 100) : Math.min(coupon.value, Math.max(0, subtotal - 1));
    }
    const discountedSubtotal = subtotal - discount;
    const shipping = getShipping(deliveryMethod, discountedSubtotal);
    if (!shipping) return { error: 'El método de entrega seleccionado no es válido.' };
    const total = discountedSubtotal + shipping.price;
    return {
        items: snapshot,
        subtotal,
        discount,
        shipping,
        tax: Math.round(total * storeConfig.taxRate / (1 + storeConfig.taxRate)),
        total
    };
}

function createOrder({ items, customer, coupon, deliveryMethod, paymentMethod, paymentStatus, paymentId }) {
    if (!validateCustomer(customer)) return { error: 'Revisa los datos de contacto y entrega.' };
    const calculation = computeOrder(items, coupon, deliveryMethod);
    if (calculation.error) return calculation;
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const order = {
        id,
        number: `RS-${now.slice(2, 10).replaceAll('-', '')}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
        createdAt: now,
        updatedAt: now,
        status: paymentStatus === 'aprobado' ? 'recibido' : paymentStatus === 'pendiente' ? 'pago pendiente' : 'cancelado',
        paymentStatus,
        paymentMethod,
        paymentId: paymentId || null,
        customer: {
            name: customer.name.trim(),
            email: customer.email.trim().toLowerCase(),
            phone: customer.phone.trim()
        },
        deliveryAddress: {
            street: customer.address.trim(),
            streetNumber: customer.streetNumber.trim(),
            city: customer.city.trim(),
            department: customer.department.trim(),
            postalCode: customer.postalCode.trim(),
            country: 'Colombia'
        },
        delivery: {
            id: calculation.shipping.id,
            method: calculation.shipping.name,
            carrier: calculation.shipping.carrier,
            estimate: calculation.shipping.days,
            trackingNumber: null,
            cost: calculation.shipping.price
        },
        items: calculation.items,
        subtotal: calculation.subtotal,
        discount: calculation.discount,
        tax: calculation.tax,
        shipping: calculation.shipping.price,
        total: calculation.total,
        currency: 'COP',
        coupon: coupon ? String(coupon).toUpperCase() : null,
        inventoryReserved: paymentStatus === 'pendiente',
        demo: paymentMethod === 'simulation' || paymentMethod === 'cash',
        notifications: [{ at: now, message: `Pedido creado con estado ${paymentStatus}.` }]
    };

    if (paymentStatus === 'aprobado' || paymentStatus === 'pendiente') {
        for (const item of calculation.items) {
            const variant = `${item.color}|${item.size}`;
            database.inventory[item.id][variant] -= item.quantity;
            database.inventoryMovements.push({
                id: crypto.randomUUID(), date: now, productId: item.id, sku: item.sku,
                variant, quantity: -item.quantity, type: paymentStatus === 'pendiente' ? 'reserva' : 'venta', orderId: order.id
            });
        }
    }
    database.orders.unshift(order);
    database.notifications.unshift({ id: crypto.randomUUID(), orderId: order.id, date: now, message: `Pedido ${order.number}: ${order.status}.` });
    saveDatabase();
    return { order };
}

function tokenFor(role) {
    const expires = Date.now() + 8 * 60 * 60 * 1000;
    const payload = Buffer.from(JSON.stringify({ role, expires })).toString('base64url');
    const signature = crypto.createHmac('sha256', adminSessionSecret).update(payload).digest('base64url');
    return `${payload}.${signature}`;
}

function sessionRole(request) {
    if (!adminSessionSecret) return null;
    const token = request.get('cookie')?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
    if (!token) return null;
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return null;
    const expected = crypto.createHmac('sha256', adminSessionSecret).update(payload).digest();
    let received;
    try {
        received = Buffer.from(signature, 'base64url');
    } catch {
        return null;
    }
    if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) return null;
    try {
        const session = JSON.parse(Buffer.from(payload, 'base64url').toString());
        return session.expires > Date.now() ? session.role : null;
    } catch {
        return null;
    }
}

function requireStaff(request, response, next) {
    const role = sessionRole(request);
    if (!role) return response.status(401).json({ error: 'Inicia sesión como personal autorizado.' });
    request.staffRole = role;
    next();
}

function requireAdmin(request, response, next) {
    requireStaff(request, response, () => {
        if (request.staffRole !== 'admin') return response.status(403).json({ error: 'Esta acción requiere permisos de administración.' });
        next();
    });
}

function verifyWebhookSignature(request) {
    if (!webhookSecret) return false;
    const signature = request.get('x-signature') || '';
    const requestId = request.get('x-request-id') || '';
    const dataId = String(request.query['data.id'] || request.body?.data?.id || '').toLowerCase();
    const parts = Object.fromEntries(signature.split(',').map((part) => part.trim().split('=')));
    if (!parts.ts || !parts.v1 || !requestId || !dataId) return false;
    const manifest = `id:${dataId};request-id:${requestId};ts:${parts.ts};`;
    const expected = crypto.createHmac('sha256', webhookSecret).update(manifest).digest();
    const received = Buffer.from(parts.v1, 'hex');
    return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

app.get(['/', '/index.html'], (request, response) => response.sendFile(path.join(root, 'index.html')));
app.get('/styles.css', (request, response) => response.sendFile(path.join(root, 'styles.css')));
app.get('/admin.css', (request, response) => response.sendFile(path.join(root, 'admin.css')));
app.get('/script.js', (request, response) => response.sendFile(path.join(root, 'script.js')));
app.get('/catalog.js', (request, response) => response.sendFile(path.join(root, 'catalog.js')));
app.get('/admin', (request, response) => response.sendFile(path.join(root, 'admin.html')));
app.get('/admin.js', (request, response) => response.sendFile(path.join(root, 'admin.js')));
app.get('/api/health', (request, response) => response.json({ ok: true, paymentMode: accessToken ? 'mercadopago-configured' : 'simulation' }));
app.get('/api/config', (request, response) => response.json({
    currency: storeConfig.currency,
    taxRate: storeConfig.taxRate,
    shippingFee: storeConfig.shippingFee,
    freeShippingThreshold: storeConfig.freeShippingThreshold,
    shippingMethods: storeConfig.shippingMethods,
    coupons: database.coupons,
    mercadoPagoReady: Boolean(accessToken),
    googleOAuthReady: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_DOMAIN)
}));
app.get('/api/catalog', (request, response) => response.json({ products: currentProducts(), demo: true }));
app.post('/api/support', (request, response) => {
    const recentRequests = supportAttempts.get(request.ip) || [];
    const remainingRequests = recentRequests.filter((timestamp) => timestamp > Date.now() - 60 * 60 * 1000);
    if (remainingRequests.length >= 5) return response.status(429).json({ error: 'Se alcanzó el límite de consultas de demostración. Inténtalo más tarde.' });
    const { name, email, topic, message } = request.body || {};
    if (typeof name !== 'string' || name.trim().length < 2 || name.length > 100
        || typeof email !== 'string' || email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        || typeof topic !== 'string' || topic.length > 80
        || typeof message !== 'string' || message.trim().length < 10 || message.length > 1000) {
        return response.status(400).json({ error: 'Revisa el nombre, correo, motivo y mensaje.' });
    }
    const requestRecord = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        topic: topic.trim(),
        message: message.trim(),
        status: 'nuevo'
    };
    database.supportRequests.unshift(requestRecord);
    supportAttempts.set(request.ip, [...remainingRequests, Date.now()]);
    saveDatabase();
    response.status(201).json({ message: 'Consulta guardada en la demo. No se envió un correo.', requestId: requestRecord.id });
});

app.post('/api/orders', (request, response) => {
    const { items, customer, coupon, deliveryMethod, paymentMethod, simulationStatus } = request.body || {};
    if (!['simulation', 'cash'].includes(paymentMethod)) return response.status(400).json({ error: 'El método de pago no es válido para la simulación.' });
    if (paymentMethod === 'simulation' && !['approved', 'rejected', 'pending'].includes(simulationStatus)) {
        return response.status(400).json({ error: 'Selecciona un resultado de pago válido.' });
    }
    const paymentStatus = paymentMethod === 'cash' || simulationStatus === 'pending'
        ? 'pendiente'
        : simulationStatus === 'rejected' ? 'rechazado' : 'aprobado';
    const created = createOrder({ items, customer, coupon, deliveryMethod, paymentMethod, paymentStatus });
    if (created.error) return response.status(400).json({ error: created.error });
    response.status(201).json({
        order: {
            ...created.order,
            message: paymentStatus === 'aprobado'
                ? 'Pago aprobado en la simulación; no se realizó ningún cobro.'
                : paymentStatus === 'rechazado'
                    ? 'Pago rechazado en la simulación; no se descontó inventario.'
                    : 'Pedido registrado como pendiente; el inventario quedó reservado temporalmente.'
        },
        products: currentProducts()
    });
});

app.get('/api/orders/:id', (request, response) => {
    const email = String(request.query.email || '').trim().toLowerCase();
    const order = database.orders.find((entry) => entry.id === request.params.id && entry.customer.email === email);
    if (!order) return response.status(404).json({ error: 'No encontramos el pedido con esos datos.' });
    response.json({ order });
});

app.post('/api/orders/:id/cancel', (request, response) => {
    const order = database.orders.find((entry) => entry.id === request.params.id && entry.customer.email === String(request.body?.email || '').trim().toLowerCase());
    if (!order) return response.status(404).json({ error: 'No encontramos el pedido con esos datos.' });
    if (order.status !== 'pago pendiente' || order.paymentStatus !== 'pendiente') {
        return response.status(409).json({ error: 'El pedido ya no se puede cancelar automáticamente; contacta a soporte.' });
    }
    releaseOrderInventory(order, 'cancelación de cliente');
    order.status = 'cancelado';
    order.paymentStatus = 'rechazado';
    order.updatedAt = new Date().toISOString();
    saveDatabase();
    response.json({ order });
});

app.post('/api/create-preference', async (request, response) => {
    if (!accessToken) return response.status(503).json({ error: 'Mercado Pago no está habilitado. Configura MERCADOPAGO_ACCESS_TOKEN en el servidor.' });
    const { items, customer, coupon, deliveryMethod } = request.body || {};
    if (!validateCustomer(customer)) return response.status(400).json({ error: 'Revisa los datos de contacto y entrega.' });
    const calculation = computeOrder(items, coupon, deliveryMethod);
    if (calculation.error) return response.status(400).json({ error: calculation.error });
    const order = createOrder({ items, customer, coupon, deliveryMethod, paymentMethod: 'mercadopago', paymentStatus: 'pendiente' });
    if (order.error) return response.status(400).json({ error: order.error });
    try {
        const preference = new Preference(new MercadoPagoConfig({ accessToken }));
        let undistributedDiscount = calculation.discount;
        const mpItems = calculation.items.flatMap((item, index) => {
            const itemDiscount = index === calculation.items.length - 1
                ? undistributedDiscount
                : Math.floor(calculation.discount * item.lineTotal / calculation.subtotal);
            undistributedDiscount -= itemDiscount;
            const discountedTotal = item.lineTotal - itemDiscount;
            const baseUnitPrice = Math.floor(discountedTotal / item.quantity);
            const higherPricedUnits = discountedTotal % item.quantity;
            const title = `${item.brand} ${item.name} · ${item.color} · talla ${item.size}${itemDiscount ? ` · cupón ${coupon}` : ''}`;
            const lines = [];
            if (item.quantity > higherPricedUnits) lines.push({
                id: `${item.id}:${item.color}:${item.size}`,
                title,
                quantity: item.quantity - higherPricedUnits,
                unit_price: baseUnitPrice,
                currency_id: 'COP'
            });
            if (higherPricedUnits) lines.push({
                id: `${item.id}:${item.color}:${item.size}`,
                title,
                quantity: higherPricedUnits,
                unit_price: baseUnitPrice + 1,
                currency_id: 'COP'
            });
            return lines;
        });
        if (calculation.shipping.price) mpItems.push({ id: 'shipping', title: calculation.shipping.name, quantity: 1, unit_price: calculation.shipping.price, currency_id: 'COP' });
        const result = await preference.create({
            body: {
                items: mpItems,
                payer: { name: customer.name.trim(), email: customer.email.trim() },
                shipments: {
                    receiver_address: {
                        street_name: customer.address.trim(),
                        street_number: customer.streetNumber.trim(),
                        city_name: customer.city.trim(),
                        state_name: customer.department.trim(),
                        zip_code: customer.postalCode.trim(),
                        country_name: 'Colombia'
                    }
                },
                external_reference: order.order.id,
                back_urls: {
                    success: `${baseUrl}/?payment=success`,
                    failure: `${baseUrl}/?payment=failure`,
                    pending: `${baseUrl}/?payment=pending`
                },
                auto_return: 'approved',
                ...(webhookSecret ? { notification_url: `${baseUrl}/api/mercadopago/webhook` } : {})
            }
        });
        order.order.paymentId = result.id;
        saveDatabase();
        response.json({ initPoint: result.init_point, sandboxInitPoint: result.sandbox_init_point, orderId: order.order.id, order: order.order });
    } catch (error) {
        releaseOrderInventory(order.order, 'fallo al crear preferencia');
        order.order.status = 'cancelado';
        order.order.paymentStatus = 'rechazado';
        saveDatabase();
        console.error('Mercado Pago preference error:', error.message);
        response.status(502).json({ error: 'Mercado Pago no pudo iniciar el pago. Inténtalo de nuevo.' });
    }
});

app.post('/api/mercadopago/webhook', async (request, response) => {
    if (!accessToken || !webhookSecret) return response.status(503).send('Webhook no configurado.');
    if (!verifyWebhookSignature(request)) return response.status(401).send('Firma inválida.');
    const paymentId = String(request.query['data.id'] || request.body?.data?.id || '');
    try {
        const payment = new Payment(new MercadoPagoConfig({ accessToken }));
        const result = await payment.get({ id: paymentId });
        const order = database.orders.find((entry) => entry.id === result.external_reference);
        if (order) {
            const updateError = updatePaymentStatus(order, result.status);
            if (updateError) {
                console.error('Mercado Pago payment inventory conflict:', updateError);
                return response.status(409).send('Payment status needs manual review.');
            }
        }
        response.sendStatus(200);
    } catch (error) {
        console.error('Mercado Pago webhook lookup error:', error.message);
        response.sendStatus(500);
    }
});

app.post('/api/admin/login', (request, response) => {
    const ip = request.ip;
    const attempt = attempts.get(ip) || { count: 0, until: 0 };
    if (attempt.until > Date.now()) return response.status(429).json({ error: 'Demasiados intentos. Espera unos minutos y vuelve a intentar.' });
    const { username, password } = request.body || {};
    if (!adminSessionSecret || !process.env.ADMIN_PASSWORD) return response.status(503).json({ error: 'Configura ADMIN_PASSWORD y ADMIN_SESSION_SECRET en el servidor.' });
    const staffPassword = process.env.STAFF_PASSWORD;
    const adminUsername = process.env.ADMIN_USERNAME;
    const matchesSecret = (candidate, expected) => typeof candidate === 'string' && typeof expected === 'string'
        && crypto.timingSafeEqual(crypto.createHash('sha256').update(candidate).digest(), crypto.createHash('sha256').update(expected).digest());
    const adminUsernameMatches = !adminUsername || username === adminUsername;
    const role = adminUsernameMatches && matchesSecret(password, process.env.ADMIN_PASSWORD)
        ? 'admin'
        : staffPassword && matchesSecret(password, staffPassword) ? 'staff' : null;
    if (!role) {
        attempt.count += 1;
        if (attempt.count >= 5) {
            attempt.count = 0;
            attempt.until = Date.now() + 5 * 60 * 1000;
        }
        attempts.set(ip, attempt);
        return response.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }
    attempts.delete(ip);
    response.cookie(cookieName, tokenFor(role), {
        httpOnly: true,
        secure: baseUrl.startsWith('https://'),
        sameSite: 'strict',
        path: '/',
        maxAge: 8 * 60 * 60 * 1000
    });
    response.json({ role });
});
app.post('/api/admin/logout', requireStaff, (request, response) => {
    response.clearCookie(cookieName, { httpOnly: true, sameSite: 'strict', path: '/' });
    response.sendStatus(204);
});
app.get('/api/admin/session', requireStaff, (request, response) => response.json({ role: request.staffRole }));

app.get('/api/admin/overview', requireStaff, (request, response) => {
    const from = request.query.from ? new Date(String(request.query.from)) : null;
    const to = request.query.to ? new Date(`${request.query.to}T23:59:59.999Z`) : null;
    const orders = database.orders.filter((order) => {
        const date = new Date(order.createdAt);
        return (!from || date >= from) && (!to || date <= to)
            && (!request.query.status || order.status === request.query.status);
    });
    const paidOrders = orders.filter((order) => order.paymentStatus === 'aprobado');
    const inventory = currentProducts().map((product) => ({ id: product.id, name: product.name, sku: product.sku, stock: product.stock }));
    const lowStock = currentProducts().flatMap((product) => Object.entries(product.inventory)
        .filter(([, stock]) => stock > 0 && stock <= 5)
        .map(([variant, stock]) => ({ id: product.id, name: product.name, sku: product.sku, variant, stock })));
    const bestSellers = new Map();
    for (const order of paidOrders) for (const item of order.items) bestSellers.set(item.name, (bestSellers.get(item.name) || 0) + item.quantity);
    response.json({
        demo: true,
        sales: {
            gross: paidOrders.filter((order) => order.paymentStatus === 'aprobado').reduce((sum, order) => sum + order.subtotal, 0),
            net: paidOrders.filter((order) => order.paymentStatus === 'aprobado').reduce((sum, order) => sum + order.subtotal - order.discount, 0),
            discounts: paidOrders.reduce((sum, order) => sum + order.discount, 0),
            shipping: paidOrders.reduce((sum, order) => sum + order.shipping, 0),
            orders: paidOrders.length,
            units: paidOrders.reduce((sum, order) => sum + order.items.reduce((items, item) => items + item.quantity, 0), 0)
        },
        bestSellers: [...bestSellers.entries()].map(([name, units]) => ({ name, units })).sort((a, b) => b.units - a.units).slice(0, 10),
        lowStock,
        inventory
    });
});
app.get('/api/admin/orders', requireStaff, (request, response) => response.json({ orders: database.orders }));
app.get('/api/admin/inventory/movements', requireStaff, (request, response) => {
    const movements = database.inventoryMovements.slice(-100).reverse().map((movement) => ({
        ...movement,
        productName: currentProducts().find((product) => product.id === movement.productId)?.name || movement.sku
    }));
    response.json({ movements });
});
app.get('/api/admin/support', requireStaff, (request, response) => response.json({ requests: database.supportRequests }));
app.patch('/api/admin/support/:id', requireStaff, (request, response) => {
    const { status } = request.body || {};
    const supportRequest = database.supportRequests.find((entry) => entry.id === request.params.id);
    if (!supportRequest) return response.status(404).json({ error: 'Consulta no encontrada.' });
    if (!['nuevo', 'en progreso', 'resuelto'].includes(status)) return response.status(400).json({ error: 'Estado de soporte no válido.' });
    supportRequest.status = status;
    supportRequest.updatedAt = new Date().toISOString();
    saveDatabase();
    response.json({ request: supportRequest });
});
app.patch('/api/admin/orders/:id', requireStaff, (request, response) => {
    const { status, paymentStatus, trackingNumber } = request.body || {};
    const order = database.orders.find((entry) => entry.id === request.params.id);
    if (!order) return response.status(404).json({ error: 'Pedido no encontrado.' });
    if (status && !orderStates.includes(status)) return response.status(400).json({ error: 'Estado de pedido no válido.' });
    if (paymentStatus && !paymentStates.includes(paymentStatus)) return response.status(400).json({ error: 'Estado de pago no válido.' });
    if (paymentStatus && paymentStatus !== order.paymentStatus) {
        const error = updatePaymentStatus(order, paymentStatus);
        if (error) return response.status(409).json({ error });
    }
    if (status) {
        if (status === 'cancelado' && order.inventoryReserved && order.paymentStatus === 'pendiente') {
            releaseOrderInventory(order, 'cancelación administrativa');
            order.paymentStatus = 'rechazado';
        }
        order.status = status;
    }
    if (typeof trackingNumber === 'string' && trackingNumber.length <= 80) order.delivery.trackingNumber = trackingNumber.trim() || null;
    order.updatedAt = new Date().toISOString();
    saveDatabase();
    response.json({ order });
});

app.get('/api/admin/products', requireStaff, (request, response) => response.json({ products: currentProducts() }));
app.post('/api/admin/products', requireAdmin, (request, response) => {
    const { name, category, brand, gender, price, colors, sizes, description, sku, initialStock = 0, image } = request.body || {};
    if (typeof name !== 'string' || name.trim().length < 2 || name.length > 100
        || !categories.includes(category) || typeof brand !== 'string' || brand.trim().length < 2 || brand.length > 60
        || !['Hombre', 'Mujer', 'Unisex'].includes(gender)
        || !Number.isInteger(price) || price < 100 || price > 100000000
        || !Number.isInteger(initialStock) || initialStock < 0 || initialStock > 500
        || typeof sku !== 'string' || !/^[A-Z0-9-]{4,32}$/.test(sku)
        || currentProducts().some((product) => product.sku === sku)
        || !Array.isArray(colors) || colors.length < 1 || colors.length > 8
        || !Array.isArray(sizes) || sizes.length < 1 || sizes.length > 16
        || [...colors, ...sizes].some((value) => typeof value !== 'string' || value.trim().length < 1 || value.length > 30)
        || (image !== undefined && image !== '' && (typeof image !== 'string' || !image.startsWith('https://images.unsplash.com/')))) {
        return response.status(400).json({ error: 'Revisa el nombre, categoría, marca, género, SKU, precio, colores y tallas.' });
    }
    const id = `custom-${crypto.randomUUID()}`;
    const colorOptions = colors.map((label, index) => ({ label, hex: ['#252925', '#f3f3ef', '#b9e75b', '#4775b5'][index % 4] }));
    const inventory = Object.fromEntries(colorOptions.flatMap((color) => sizes.map((size) => [`${color.label}|${size}`, initialStock])));
    const categoryImage = seedProducts.find((product) => product.category === category)?.image || '';
    const productImage = image || categoryImage;
    const product = {
        id, name: name.trim(), description: String(description || '').slice(0, 600),
        brand: brand.trim(), category, gender, sku, price, regularPrice: price,
        isOnSale: false, discount: 0, colors: colorOptions, sizes,
        rating: 0, reviewCount: 0, isNew: true, available: true,
        image: productImage, images: productImage ? [productImage] : [], inventory,
        stock: Object.values(inventory).reduce((sum, value) => sum + value, 0)
    };
    database.products.push(product);
    database.inventory[id] = inventory;
    saveDatabase();
    response.status(201).json({ product });
});
app.patch('/api/admin/products/:id', requireAdmin, (request, response) => {
    const existing = currentProducts().find((product) => product.id === request.params.id);
    if (!existing) return response.status(404).json({ error: 'Producto no encontrado.' });
    const { price, available, name } = request.body || {};
    if (price !== undefined && (!Number.isInteger(price) || price < 100 || price > 100000000)) return response.status(400).json({ error: 'Precio no válido.' });
    if (name !== undefined && (typeof name !== 'string' || name.trim().length < 2 || name.length > 100)) return response.status(400).json({ error: 'Nombre no válido.' });
    const previous = database.productOverrides[existing.id] || {};
    database.productOverrides[existing.id] = {
        ...previous,
        ...(price !== undefined ? { price, regularPrice: price, isOnSale: false, discount: 0 } : {}),
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(available !== undefined ? { available: Boolean(available) } : {})
    };
    saveDatabase();
    response.json({ product: currentProducts().find((product) => product.id === existing.id) });
});
app.delete('/api/admin/products/:id', requireAdmin, (request, response) => {
    const existing = currentProducts().find((product) => product.id === request.params.id);
    if (!existing) return response.status(404).json({ error: 'Producto no encontrado.' });
    if (database.products.some((product) => product.id === existing.id)) {
        database.products = database.products.filter((product) => product.id !== existing.id);
    } else {
        database.productOverrides[existing.id] = { ...(database.productOverrides[existing.id] || {}), available: false };
    }
    saveDatabase();
    response.json({ success: true, message: 'Producto ocultado. Los datos históricos de pedidos se conservan.' });
});
app.post('/api/admin/inventory/:id/adjust', requireStaff, (request, response) => {
    const { color, size, quantity, reason } = request.body || {};
    const product = currentProducts().find((entry) => entry.id === request.params.id);
    if (!product) return response.status(404).json({ error: 'Producto no encontrado.' });
    if (typeof color !== 'string' || !product.colors.some((entry) => entry.label === color) || !product.sizes.includes(size)
        || !Number.isInteger(quantity) || quantity === 0 || Math.abs(quantity) > 1000) {
        return response.status(400).json({ error: 'Ajuste de inventario no válido.' });
    }
    const variant = `${color}|${size}`;
    const current = database.inventory[product.id][variant] || 0;
    if (current + quantity < 0) return response.status(409).json({ error: 'El inventario no puede quedar en negativo.' });
    database.inventory[product.id][variant] = current + quantity;
    database.inventoryMovements.push({
        id: crypto.randomUUID(), date: new Date().toISOString(), productId: product.id, sku: product.sku,
        variant, quantity, type: quantity > 0 ? 'entrada/ajuste' : 'salida/ajuste',
        reason: String(reason || 'Ajuste de inventario').slice(0, 120)
    });
    saveDatabase();
    response.json({ product: currentProducts().find((entry) => entry.id === product.id) });
});
app.get('/api/admin/reports.csv', requireStaff, (request, response) => {
    const from = request.query.from ? new Date(String(request.query.from)) : null;
    const to = request.query.to ? new Date(`${request.query.to}T23:59:59.999Z`) : null;
    const orders = database.orders.filter((order) => {
        const date = new Date(order.createdAt);
        return (!from || date >= from) && (!to || date <= to)
            && (!request.query.status || order.status === request.query.status);
    });
    const quote = (value) => {
        const text = String(value ?? '');
        const safeText = /^[\u0000-\u0020]*[=+\-@]/.test(text) ? `'${text}` : text;
        return `"${safeText.replaceAll('"', '""')}"`;
    };
    const rows = [
        ['Pedido', 'Fecha', 'Estado', 'Pago', 'Cliente', 'Correo', 'Subtotal COP', 'Descuento COP', 'Envío COP', 'Total COP', 'Unidades'],
        ...orders.map((order) => [
            order.number, order.createdAt, order.status, order.paymentStatus, order.customer.name, order.customer.email,
            order.subtotal, order.discount, order.shipping, order.total,
            order.items.reduce((sum, item) => sum + item.quantity, 0)
        ])
    ];
    response.type('text/csv; charset=utf-8');
    response.set('Content-Disposition', 'attachment; filename="ritmo-sport-reporte-demo.csv"');
    response.send(`\uFEFF${rows.map((row) => row.map(quote).join(',')).join('\r\n')}`);
});
app.get('/api/admin/coupons', requireStaff, (request, response) => response.json({ coupons: database.coupons }));
app.post('/api/admin/coupons', requireAdmin, (request, response) => {
    const { code, type, value, minimum } = request.body || {};
    const normalizedCode = typeof code === 'string' ? code.trim().toUpperCase() : '';
    if (!/^[A-Z0-9_-]{3,24}$/.test(normalizedCode)
        || !['fixed', 'percentage'].includes(type)
        || !Number.isInteger(value) || value < 1 || (type === 'percentage' && value > 80)
        || (minimum !== undefined && (!Number.isInteger(minimum) || minimum < 0))) {
        return response.status(400).json({ error: 'Código, tipo, valor o compra mínima no válidos.' });
    }
    database.coupons[normalizedCode] = {
        type, value, ...(minimum ? { minimum } : {}),
        label: type === 'percentage' ? `${value}% de descuento` : `${value.toLocaleString('es-CO')} COP de descuento`
    };
    saveDatabase();
    response.status(201).json({ code: normalizedCode, coupon: database.coupons[normalizedCode] });
});
app.delete('/api/admin/coupons/:code', requireAdmin, (request, response) => {
    const code = request.params.code.toUpperCase();
    if (!database.coupons[code]) return response.status(404).json({ error: 'Cupón no encontrado.' });
    delete database.coupons[code];
    saveDatabase();
    response.sendStatus(204);
});

app.use((request, response) => response.status(404).json({ error: 'Ruta no encontrada.' }));

function releaseOrderInventory(order, reason) {
    if (!order.inventoryReserved) return;
    const now = new Date().toISOString();
    for (const item of order.items) {
        const variant = `${item.color}|${item.size}`;
        if (!database.inventory[item.id]) continue;
        database.inventory[item.id][variant] = (database.inventory[item.id][variant] || 0) + item.quantity;
        database.inventoryMovements.push({
            id: crypto.randomUUID(), date: now, productId: item.id, sku: item.sku,
            variant, quantity: item.quantity, type: 'liberación', orderId: order.id, reason
        });
    }
    order.inventoryReserved = false;
}

function updatePaymentStatus(order, paymentStatus) {
    const mappedStatus = paymentStatus === 'approved' ? 'aprobado'
        : paymentStatus === 'refunded' ? 'reembolsado'
            : paymentStatus === 'rejected' || paymentStatus === 'cancelled' ? 'rechazado'
                : paymentStatus === 'aprobado' || paymentStatus === 'reembolsado' || paymentStatus === 'rechazado' ? paymentStatus : 'pendiente';
    if (order.paymentStatus === 'reembolsado' && mappedStatus !== 'reembolsado') return 'Un pago reembolsado no puede cambiar a otro estado.';
    if (order.paymentStatus === 'aprobado' && !['aprobado', 'reembolsado'].includes(mappedStatus)) return 'Un pago aprobado no puede volver a pendiente ni rechazado.';
    if (mappedStatus === 'reembolsado' && order.paymentStatus !== 'aprobado') return 'Solo se puede reembolsar un pago aprobado.';
    if (mappedStatus === 'pendiente' && order.paymentStatus === 'rechazado') {
        for (const item of order.items) {
            const variant = `${item.color}|${item.size}`;
            if ((database.inventory[item.id]?.[variant] ?? 0) < item.quantity) return `No hay inventario suficiente para reabrir ${item.name}.`;
        }
        for (const item of order.items) {
            const variant = `${item.color}|${item.size}`;
            database.inventory[item.id][variant] -= item.quantity;
            database.inventoryMovements.push({
                id: crypto.randomUUID(), date: new Date().toISOString(), productId: item.id,
                sku: item.sku, variant, quantity: -item.quantity, type: 'reserva', orderId: order.id
            });
        }
        order.inventoryReserved = true;
    }
    if (mappedStatus === 'aprobado' && !order.inventoryReserved && order.paymentStatus !== 'aprobado') {
        for (const item of order.items) {
            const variant = `${item.color}|${item.size}`;
            if ((database.inventory[item.id]?.[variant] ?? 0) < item.quantity) return `No hay inventario suficiente para aprobar ${item.name}.`;
        }
        for (const item of order.items) {
            const variant = `${item.color}|${item.size}`;
            database.inventory[item.id][variant] -= item.quantity;
            database.inventoryMovements.push({
                id: crypto.randomUUID(), date: new Date().toISOString(), productId: item.id,
                sku: item.sku, variant, quantity: -item.quantity, type: 'venta', orderId: order.id
            });
        }
    }
    if (mappedStatus === 'rechazado' && order.inventoryReserved) releaseOrderInventory(order, 'pago rechazado');
    order.paymentStatus = mappedStatus;
    if (mappedStatus === 'aprobado') order.inventoryReserved = false;
    order.status = mappedStatus === 'aprobado' ? 'recibido' : mappedStatus === 'pendiente' ? 'pago pendiente' : mappedStatus === 'reembolsado' ? 'devuelto' : 'cancelado';
    order.updatedAt = new Date().toISOString();
    order.notifications.push({ at: order.updatedAt, message: `Pago actualizado: ${mappedStatus}.` });
    database.notifications.unshift({ id: crypto.randomUUID(), orderId: order.id, date: order.updatedAt, message: `Pedido ${order.number}: pago ${mappedStatus}.` });
    saveDatabase();
    return null;
}

app.listen(port, () => {
    console.info(`Ritmo Sport disponible en ${baseUrl}`);
    if (!accessToken) console.info('Pagos simulados activos. Mercado Pago está deshabilitado.');
    if (!process.env.ADMIN_PASSWORD || !adminSessionSecret) console.info('Panel de administración deshabilitado hasta configurar ADMIN_PASSWORD y ADMIN_SESSION_SECRET.');
});
