import { categories as defaultCategories, demoCoupons, products as demoProducts, storeConfig } from './catalog.js';

const keys = {
    cart: 'ritmo-cart-v1',
    favorites: 'ritmo-favorites-v1',
    orders: 'ritmo-orders-v1',
    user: 'ritmo-user-v1',
    users: 'ritmo-users-v1',
    customer: 'ritmo-customer-v1',
    coupon: 'ritmo-coupon-v1',
    notifications: 'ritmo-notifications-v1'
};
const currency = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const readStore = (key, fallback) => {
    try {
        const value = JSON.parse(localStorage.getItem(key));
        return value ?? fallback;
    } catch {
        return fallback;
    }
};
const writeStore = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);

let products = demoProducts;
let activeProduct = null;
let selectedDetailImage = 0;
let accountMode = 'login';
let activeProductCollection = null;
let deliveryOptions = storeConfig.shippingMethods;
let couponCatalog = { ...demoCoupons };
let activeCoupon = readStore(keys.coupon, null);
let cart = readStore(keys.cart, []);
let favorites = readStore(keys.favorites, []);
let catalogRefreshInProgress = false;

const byId = (id) => document.getElementById(id);
const productById = (id) => products.find((product) => product.id === id);
const isPhotoFile = (image) => typeof image === 'string' && /\.(?:avif|gif|jpe?g|png|webp)(?:[?#]|$)/i.test(image);
const uniqueProducts = (items) => {
    const seenIds = new Set();
    const seenPhotos = new Set();
    return items.flatMap((product) => {
        if (!product || typeof product.id !== 'string' || seenIds.has(product.id)) return [];
        const images = [...new Set([...(product.images || []), product.image].filter(isPhotoFile))];
        if (!images.length) return [];
        const image = images.includes(product.image) ? product.image : images[0];
        const photoPath = image.split(/[?#]/, 1)[0];
        if (seenPhotos.has(photoPath)) return [];
        seenIds.add(product.id);
        seenPhotos.add(photoPath);
        return [{ ...product, image, images }];
    });
};
const cartKey = (id, color, size) => `${id}|${color}|${size}`;
const splitCartKey = (key) => {
    const [id, color, ...sizeParts] = key.split('|');
    return { id, color, size: sizeParts.join('|') || 'Única' };
};
const normalized = (text) => String(text ?? '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function getStock(product, color, size) {
    if (!product) return 0;
    return Number(product.inventory?.[`${color}|${size}`] ?? product.stock ?? 0);
}

function getCartSummary() {
    const validItems = cart.filter((item) => productById(item.id));
    const subtotal = validItems.reduce((sum, item) => sum + productById(item.id).price * item.quantity, 0);
    let discount = 0;
    if (activeCoupon && couponCatalog[activeCoupon]) {
        const coupon = couponCatalog[activeCoupon];
        if (!coupon.minimum || subtotal >= coupon.minimum) {
            discount = coupon.type === 'percentage' ? Math.round(subtotal * coupon.value / 100) : Math.min(coupon.value, Math.max(0, subtotal - 1));
        }
    }
    const discountedSubtotal = Math.max(0, subtotal - discount);
    const deliveryId = byId('delivery-method')?.value || 'standard';
    const method = deliveryOptions.find((entry) => entry.id === deliveryId) || deliveryOptions[0];
    const shipping = discountedSubtotal === 0 || (method.id === 'standard' && discountedSubtotal >= storeConfig.freeShippingThreshold) ? 0 : method.price;
    const total = discountedSubtotal + shipping;
    return {
        items: validItems,
        quantity: validItems.reduce((sum, item) => sum + item.quantity, 0),
        subtotal, discount, shipping, total,
        tax: Math.round(total * storeConfig.taxRate / (1 + storeConfig.taxRate))
    };
}

function productCard(product) {
    const firstColor = product.colors[0];
    const firstSize = product.sizes[0];
    const stock = getStock(product, firstColor.label, firstSize);
    const saved = favorites.includes(product.id);
    const rating = product.rating.toFixed(1);
    return `<article class="product-card" data-product="${escapeHTML(product.id)}">
        <button class="favorite-button ${saved ? 'is-favorite' : ''}" type="button" data-favorite="${escapeHTML(product.id)}" aria-label="${saved ? 'Quitar de favoritos' : 'Guardar en favoritos'}" aria-pressed="${saved}">${saved ? '♥' : '♡'}</button>
        <button class="product-image-wrap" type="button" data-detail="${escapeHTML(product.id)}" aria-label="Ver ${escapeHTML(product.name)}">
            <img src="${escapeHTML(product.image)}" alt="${escapeHTML(product.name)}" loading="lazy">
            ${product.isNew ? '<span class="new-badge">NUEVO</span>' : ''}
            ${product.isOnSale ? `<span class="sale-badge">-${product.discount}%</span>` : ''}
            <span class="product-category">${escapeHTML(product.category)}</span>
        </button>
        <div class="product-info"><p class="product-meta">${escapeHTML(product.brand)} <span>·</span> vendedor demo ${escapeHTML(product.seller || 'Ritmo Sport')} <span>·</span> ${escapeHTML(product.gender)}</p>
            <button class="product-name" type="button" data-detail="${escapeHTML(product.id)}">${escapeHTML(product.name)}</button>
            <p class="product-rating"><span aria-label="${rating} de 5 estrellas">★ ${rating}</span> <small>(${product.reviewCount} reseñas demo)</small></p>
            <div class="product-colors">${product.colors.map((color) => `<span class="color-dot" title="${escapeHTML(color.label)}" style="--swatch:${escapeHTML(color.hex)}"></span>`).join('')}</div>
            <div class="product-buy"><span>${product.isOnSale ? `<del>${currency.format(product.regularPrice)}</del>` : ''}<strong>${currency.format(product.price)}</strong><small class="${stock < 4 ? 'stock-low' : ''}">${stock ? `${stock} disponibles en ${escapeHTML(firstColor.label)} / ${escapeHTML(firstSize)}` : 'Consulta disponibilidad'}</small></span>
            <button class="add-button" type="button" data-add="${escapeHTML(product.id)}" aria-label="Agregar ${escapeHTML(product.name)} al carrito" ${stock < 1 ? 'disabled' : ''}>+</button></div>
        </div>
    </article>`;
}

function filteredProducts() {
    const query = normalized(byId('search').value.trim());
    const category = byId('category-filter').value;
    const gender = byId('gender-filter').value;
    const brand = byId('brand-filter').value;
    const size = byId('size-filter').value;
    const color = byId('color-filter').value;
    const availability = byId('availability-filter').value;
    const rating = Number(byId('rating-filter').value);
    const maxPrice = Number(byId('price-filter').value);
    const sort = byId('sort-filter').value;
    const filtered = uniqueProducts(products).filter((product) => {
        const searchable = normalized(`${product.name} ${product.brand} ${product.category} ${product.sku} ${product.description}`);
        const productStock = Object.values(product.inventory || {}).reduce((sum, count) => sum + count, 0);
        return product.available !== false
            && (activeProductCollection === 'offers' ? product.isOnSale : activeProductCollection === 'new' ? product.isNew : true)
            && (!query || searchable.includes(query))
            && (category === 'all' || product.category === category)
            && (gender === 'all' || product.gender === gender)
            && (brand === 'all' || product.brand === brand)
            && (size === 'all' || product.sizes.includes(size))
            && (color === 'all' || product.colors.some((entry) => entry.label === color))
            && (availability === 'all' || (availability === 'in-stock' ? productStock > 3 : productStock > 0 && productStock <= 3))
            && product.rating >= rating
            && product.price <= maxPrice;
    });
    const orders = {
        'price-asc': (a, b) => a.price - b.price,
        'price-desc': (a, b) => b.price - a.price,
        newest: (a, b) => Number(b.isNew) - Number(a.isNew) || b.id.localeCompare(a.id),
        rating: (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount,
        popular: (a, b) => b.reviewCount - a.reviewCount
    };
    return filtered.sort(orders[sort] || orders.popular);
}

function renderCatalog() {
    const visible = filteredProducts();
    const container = byId('catalog-products');
    const genderFilter = byId('gender-filter').value;
    const selectedCategory = byId('category-filter').value;
    const groups = selectedCategory !== 'all'
        ? [{ name: selectedCategory, id: `categoria-${normalized(selectedCategory).replace(/\s+/g, '-')}`, products: visible }]
        : (genderFilter === 'all'
            ? ['Hombre', 'Mujer', 'Unisex'].filter((gender) => visible.some((product) => product.gender === gender))
            : [genderFilter]).map((gender) => ({
                name: gender,
                id: gender.toLocaleLowerCase('es'),
                products: visible.filter((product) => product.gender === gender)
            }));
    container.innerHTML = visible.length ? groups.map(({ name, id, products: group }) => {
        return `<section class="catalog-gender-group" id="${id}" aria-label="Productos ${escapeHTML(name)}">
            <div class="gender-heading"><h3>${escapeHTML(name)}<span class="lime-dot">.</span></h3><span>${group.length} productos</span></div>
            <div class="product-grid">${group.length ? group.map(productCard).join('') : '<p class="no-results">No hay productos con estos filtros.</p>'}</div>
        </section>`;
    }).join('') : '<p class="no-results">No encontramos productos con esta combinación. Prueba otra categoría, talla o color.</p>';
    byId('product-count').textContent = `${visible.length} productos`;
    byId('result-summary').textContent = `${visible.length} resultados · precios, existencias y reseñas de demostración`;
    byId('catalog-selection').textContent = activeProductCollection
        ? `Mostrando: ${activeProductCollection === 'offers' ? 'Ofertas' : 'Novedades'}${selectedCategory !== 'all' ? ` · ${selectedCategory}` : ''}`
        : selectedCategory === 'all' ? 'Mostrando todas las categorías' : `Categoría: ${selectedCategory}`;
    renderCategories();
    renderCategoryGenderLinks();
}

function renderHighlighted() {
    const catalog = uniqueProducts(products).filter((product) => product.available !== false);
    byId('sale-summary').textContent = `${catalog.filter((product) => product.isOnSale).length} productos con descuento en el catálogo.`;
    byId('new-summary').textContent = `${catalog.filter((product) => product.isNew).length} productos nuevos en el catálogo.`;
}

function renderFavorites() {
    byId('favorite-count').textContent = favorites.length;
    const saved = uniqueProducts(favorites.map(productById).filter(Boolean));
    byId('favorites-products').innerHTML = saved.length
        ? saved.map(productCard).join('')
        : '<p class="no-results">Aún no guardas productos. Toca el corazón de cualquier artículo para tenerlo a mano.</p>';
}

function renderCategories() {
    const allProducts = uniqueProducts(products).filter((product) => product.available !== false);
    const selectedCategory = byId('category-filter').value;
    const availableCategories = defaultCategories.filter((category) => allProducts.some((product) => product.category === category));
    byId('category-shortcuts').innerHTML = `<button class="category-chip category-chip-all" type="button" data-category="all" aria-pressed="${selectedCategory === 'all'}"><img class="category-chip-photo" src="/assets/products/camiseta-mujer-blanca-equipment.png" alt="" loading="lazy"><span>${allProducts.length} productos</span><strong>Todas</strong><i aria-hidden="true">↗</i></button>${availableCategories.map((category, index) => {
        const count = allProducts.filter((product) => product.category === category).length;
        const image = allProducts.find((product) => product.category === category)?.image;
        return `<button class="category-chip" type="button" data-category="${escapeHTML(category)}" aria-pressed="${selectedCategory === category}"><img class="category-chip-photo" src="${escapeHTML(image)}" alt="" loading="lazy"><span>${String(index + 1).padStart(2, '0')} · ${count} productos</span><strong>${escapeHTML(category)}</strong><i aria-hidden="true">↗</i></button>`;
    }
    ).join('')}`;
}

function renderCategoryGenderLinks() {
    const allProducts = uniqueProducts(products).filter((product) => product.available !== false);
    const categoriesWithGenderOptions = ['Pantalonetas', 'Camisetas', 'Gorras']
        .filter((category) => allProducts.some((product) => product.category === category));
    byId('category-gender-links').innerHTML = categoriesWithGenderOptions.map((category) => {
        const genders = ['Hombre', 'Mujer', 'Unisex'].filter((gender) =>
            allProducts.some((product) => product.category === category && product.gender === gender)
        );
        return `<div class="category-gender-group"><strong>${escapeHTML(category)}</strong><div>${genders.map((gender) => {
            const count = allProducts.filter((product) => product.category === category && product.gender === gender).length;
            return `<button type="button" data-category="${escapeHTML(category)}" data-gender="${escapeHTML(gender)}">${escapeHTML(gender)}<span>${count} productos ↗</span></button>`;
        }).join('')}</div></div>`;
    }).join('');
}

function renderFilters() {
    const availableProducts = uniqueProducts(products).filter((product) => product.available !== false);
    const unique = (items) => [...new Set(items)].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
    const fill = (id, values, label, requestedValue, getLabel = (value) => value) => {
        const select = byId(id);
        const selectedValue = values.includes(requestedValue) ? requestedValue : 'all';
        select.innerHTML = `<option value="all">${label}</option>${values.map((value) =>
            `<option value="${escapeHTML(value)}">${escapeHTML(getLabel(value))}</option>`
        ).join('')}`;
        select.value = selectedValue;
        return selectedValue;
    };
    const categoryCounts = new Map(defaultCategories.map((category) =>
        [category, availableProducts.filter((product) => product.category === category).length]
    ));
    const categoryOptions = defaultCategories.filter((category) => categoryCounts.get(category) > 0);
    const category = fill('category-filter', categoryOptions, 'Todas', byId('category-filter').value, (value) =>
        `${value} (${categoryCounts.get(value)})`
    );
    const categoryProducts = availableProducts.filter((product) => category === 'all' || product.category === category);
    const genderOptions = unique(categoryProducts.map((product) => product.gender));
    const genderCounts = new Map(genderOptions.map((gender) =>
        [gender, categoryProducts.filter((product) => product.gender === gender).length]
    ));
    const gender = fill('gender-filter', genderOptions, 'Todos', byId('gender-filter').value, (value) =>
        `${value} (${genderCounts.get(value)})`
    );
    const genderProducts = categoryProducts.filter((product) => gender === 'all' || product.gender === gender);
    const brandOptions = unique(genderProducts.map((product) => product.brand));
    const brand = fill('brand-filter', brandOptions, 'Todas las marcas', byId('brand-filter').value);
    const variantProducts = genderProducts.filter((product) => brand === 'all' || product.brand === brand);
    fill('size-filter', unique(variantProducts.flatMap((product) => product.sizes)), 'Todas', byId('size-filter').value);
    fill('color-filter', unique(variantProducts.flatMap((product) => product.colors.map((color) => color.label))), 'Todos', byId('color-filter').value);
}

function renderDeliveryMethods() {
    byId('delivery-method').innerHTML = deliveryOptions.map((method) =>
        `<option value="${escapeHTML(method.id)}">${escapeHTML(method.name)} · ${method.price ? currency.format(method.price) : 'Gratis'} · ${escapeHTML(method.days)}</option>`
    ).join('');
}

function renderCart() {
    cart = cart.filter((item) => productById(item.id) && Number.isInteger(item.quantity) && item.quantity > 0);
    writeStore(keys.cart, cart);
    const summary = getCartSummary();
    byId('cart-count').textContent = summary.quantity;
    byId('cart-summary').textContent = `${summary.quantity} ${summary.quantity === 1 ? 'artículo' : 'artículos'}`;
    byId('cart-subtotal').textContent = currency.format(summary.subtotal);
    byId('cart-discount').textContent = `-${currency.format(summary.discount)}`;
    byId('cart-tax').textContent = currency.format(summary.tax);
    byId('shipping-cost').textContent = summary.shipping ? currency.format(summary.shipping) : summary.subtotal ? 'Gratis' : currency.format(0);
    byId('cart-total').textContent = currency.format(summary.total);
    byId('checkout-button').disabled = summary.quantity === 0;
    byId('simulation-button').disabled = summary.quantity === 0;
    byId('shipping-note').textContent = summary.subtotal >= storeConfig.freeShippingThreshold && byId('delivery-method').value === 'standard'
        ? '¡Tu pedido tiene envío estándar gratis!'
        : summary.quantity ? 'Tiempos de entrega de demostración; confirma cobertura antes de operar.' : '';
    const itemsMarkup = summary.items.length ? summary.items.map((item) => {
        const product = productById(item.id);
        const stock = getStock(product, item.color, item.size);
        return `<li class="cart-item"><img src="${escapeHTML(product.image)}" alt=""><span class="cart-item-info"><strong>${escapeHTML(product.name)}</strong><small>${escapeHTML(product.color)} · Talla ${escapeHTML(item.size)} · ${currency.format(product.price)}</small><span class="quantity-control"><button type="button" data-quantity="${escapeHTML(item.key)}" data-delta="-1" aria-label="Quitar una unidad">−</button><span>${item.quantity}</span><button type="button" data-quantity="${escapeHTML(item.key)}" data-delta="1" aria-label="Agregar una unidad" ${item.quantity >= stock ? 'disabled' : ''}>+</button><small>Máx. ${stock} unidades disponibles</small></span></span><button class="remove-button" type="button" data-remove="${escapeHTML(item.key)}" aria-label="Eliminar ${escapeHTML(product.name)} del carrito">×</button></li>`;
    }).join('') : '<li class="empty-cart">Tu carrito está vacío. Encuentra algo que te mueva.</li>';
    byId('cart-items').innerHTML = itemsMarkup;
    byId('quick-cart-items').innerHTML = itemsMarkup;
    byId('quick-cart-summary').textContent = `${summary.quantity} ${summary.quantity === 1 ? 'artículo' : 'artículos'}`;
    byId('quick-cart-total').textContent = currency.format(summary.total);
    byId('continue-checkout').disabled = summary.quantity === 0;
    if (activeCoupon) byId('coupon-message').textContent = `Cupón ${activeCoupon} aplicado: ${couponCatalog[activeCoupon]?.label || 'descuento demo'}.`;
}

function openQuickCart() {
    if (byId('product-dialog').open) byId('product-dialog').close();
    renderCart();
    byId('cart-dialog').showModal();
}

function addToCart(product, color = product.colors[0].label, size = product.sizes[0]) {
    const key = cartKey(product.id, color, size);
    const item = cart.find((entry) => entry.key === key);
    const stock = getStock(product, color, size);
    if (!stock || (item?.quantity || 0) >= stock) {
        showMessage('checkout-message', `No hay más unidades disponibles de ${product.name} en ${color}, talla ${size}.`);
        return false;
    }
    if (item) item.quantity += 1;
    else cart.push({ key, id: product.id, color, size, quantity: 1 });
    renderCart();
    return true;
}

function renderDetail(product) {
    activeProduct = product;
    selectedDetailImage = 0;
    const gallery = product.images?.length ? product.images : [product.image];
    byId('detail-image').src = gallery[0];
    byId('detail-image').alt = product.name;
    byId('detail-thumbnails').innerHTML = gallery.map((image, index) =>
        `<button type="button" data-image-index="${index}" class="${index === 0 ? 'is-active' : ''}" aria-label="Ver ${escapeHTML(product.colors[index]?.label || `imagen ${index + 1}`)}"><img src="${escapeHTML(image)}" alt=""></button>`
    ).join('');
    byId('detail-thumbnails').hidden = gallery.length < 2;
    byId('detail-meta').textContent = `${product.brand} · Vendedor demo: ${product.seller || 'Ritmo Sport'} · ${product.category} · ${product.gender}`;
    byId('detail-name').textContent = product.name;
    byId('detail-rating').innerHTML = `<span class="rating-stars">★ ${product.rating.toFixed(1)}</span> <small>${product.reviewCount} reseñas de ejemplo, no verificadas</small>`;
    byId('detail-description').textContent = product.description;
    byId('detail-sku').textContent = `SKU ${product.sku} · Existencias de demostración`;
    byId('detail-price').innerHTML = `${product.isOnSale ? `<del>${currency.format(product.regularPrice)}</del>` : ''}<strong>${currency.format(product.price)}</strong>${product.isOnSale ? `<span>-${product.discount}%</span>` : ''}`;
    byId('detail-color').innerHTML = product.colors.map((color) => `<option value="${escapeHTML(color.label)}">${escapeHTML(color.label)}</option>`).join('');
    byId('detail-size').innerHTML = product.sizes.map((size) => `<option value="${escapeHTML(size)}">${escapeHTML(size)}</option>`).join('');
    byId('detail-stock').textContent = `${getStock(product, product.colors[0].label, product.sizes[0])} unidades disponibles`;
    byId('detail-favorite').textContent = favorites.includes(product.id) ? '♥ Guardado en favoritos' : '♡ Guardar en favoritos';
    byId('related-products').innerHTML = products.filter((entry) => entry.category === product.category && entry.id !== product.id).slice(0, 2).map(productCard).join('');
    syncDetailVariant();
    byId('product-dialog').showModal();
}

function syncDetailVariant() {
    if (!activeProduct) return;
    activeProduct.images = activeProduct.images?.length
        ? activeProduct.images
        : [activeProduct.image];
    const color = byId('detail-color').value;
    const colorIndex = activeProduct.colors.findIndex((entry) => entry.label === color);
    const galleryIndex = Math.min(Math.max(colorIndex, 0), activeProduct.images.length - 1);
    selectedDetailImage = galleryIndex;
    byId('detail-image').src = activeProduct.images[galleryIndex];
    byId('detail-thumbnails').querySelectorAll('button').forEach((button, index) =>
        button.classList.toggle('is-active', index === galleryIndex)
    );
    byId('detail-stock').textContent = `${getStock(activeProduct, color, byId('detail-size').value)} unidades disponibles`;
}

function toggleFavorite(id) {
    favorites = favorites.includes(id) ? favorites.filter((favorite) => favorite !== id) : [...favorites, id];
    writeStore(keys.favorites, favorites);
    renderCatalog();
    renderHighlighted();
    renderFavorites();
    if (activeProduct?.id === id) byId('detail-favorite').textContent = favorites.includes(id) ? '♥ Guardado en favoritos' : '♡ Guardar en favoritos';
}

function showMessage(id, text) {
    byId(id).textContent = text;
}

async function fetchJSON(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'No fue posible completar la solicitud.');
    return data;
}

async function loadServerState() {
    try {
        const [catalogResponse, config] = await Promise.all([
            fetchJSON('/api/catalog'),
            fetchJSON('/api/config')
        ]);
        products = uniqueProducts(catalogResponse.products);
        deliveryOptions = config.shippingMethods;
        couponCatalog = config.coupons || couponCatalog;
        renderFilters();
        renderDeliveryMethods();
        renderHighlighted();
        renderCatalog();
        renderCart();
        byId('payment-method').value = config.mercadoPagoReady ? 'mercadopago' : 'simulation';
        byId('payment-method').querySelector('option[value="mercadopago"]').disabled = !config.mercadoPagoReady;
        byId('payment-method').dispatchEvent(new Event('change'));
        if (!config.googleOAuthReady) byId('google-login').title = 'Requiere Google OAuth Client ID y dominio configurados';
    } catch (error) {
        showMessage('checkout-message', `No se pudo conectar con la tienda: ${error.message}`);
    }
}

async function refreshServerCatalog() {
    if (document.hidden || catalogRefreshInProgress) return;
    catalogRefreshInProgress = true;
    try {
        const catalogResponse = await fetchJSON('/api/catalog');
        products = uniqueProducts(catalogResponse.products);
        renderFilters();
        renderHighlighted();
        renderCatalog();
        renderFavorites();
        renderCart();
        if (activeProduct) {
            const latestProduct = productById(activeProduct.id);
            if (!latestProduct) {
                byId('product-dialog').close();
                activeProduct = null;
            } else {
                activeProduct = latestProduct;
                if (byId('product-dialog').open) syncDetailVariant();
            }
        }
    } catch (error) {
        showMessage('checkout-message', `No se pudo actualizar el inventario: ${error.message}`);
    } finally {
        catalogRefreshInProgress = false;
    }
}

function clearFilters() {
    for (const id of ['search', 'category-filter', 'gender-filter', 'brand-filter', 'size-filter', 'color-filter', 'availability-filter', 'rating-filter', 'sort-filter']) {
        const field = byId(id);
        field.value = id === 'sort-filter' ? 'popular' : id === 'rating-filter' ? '0' : 'all';
    }
    activeProductCollection = null;
    byId('price-filter').value = '600000';
    byId('price-value').textContent = currency.format(600000);
    renderFilters();
    renderCatalog();
}

function selectCategory(category, gender = 'all') {
    byId('category-filter').value = defaultCategories.includes(category) ? category : 'all';
    byId('gender-filter').value = ['Hombre', 'Mujer', 'Unisex'].includes(gender) ? gender : 'all';
    activeProductCollection = null;
    renderFilters();
    renderCatalog();
    byId('catalogo').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function selectProductCollection(collection) {
    activeProductCollection = collection;
    byId('category-filter').value = 'all';
    renderFilters();
    renderCatalog();
    byId('catalogo').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function initializeCustomerDetails() {
    const customer = readStore(keys.customer, {});
    for (const [name, value] of Object.entries(customer)) {
        const field = byId('checkout-form').elements.namedItem(name);
        if (field && typeof value === 'string') field.value = value;
    }
}

async function placeOrder(simulationStatus = 'approved') {
    const form = byId('checkout-form');
    if (!form.reportValidity()) return;
    const customer = Object.fromEntries(new FormData(form).entries());
    if (cart.some((item) => item.quantity > getStock(productById(item.id), item.color, item.size))) {
        showMessage('checkout-message', 'Actualizamos las existencias; revisa las cantidades de tu carrito.');
        return;
    }
    const total = getCartSummary().total;
    const paymentMethod = byId('payment-method').value;
    const confirmText = paymentMethod === 'simulation'
        ? `Total demo: ${currency.format(total)}. Simular pago ${simulationStatus.toUpperCase()} (no se realizará ningún cobro). ¿Continuar?`
        : paymentMethod === 'cash'
            ? `Total demo: ${currency.format(total)}. El pedido quedará pendiente, sin pago real. ¿Confirmar?`
            : `Se abrirá Mercado Pago para continuar el pago de ${currency.format(total)}. ¿Continuar?`;
    if (!window.confirm(confirmText)) return;

    const button = byId('checkout-button');
    button.disabled = true;
    showMessage('checkout-message', 'Validando existencias y creando el pedido...');
    try {
        if (byId('remember-details').checked) {
            const { paymentMethod: ignoredPaymentMethod, deliveryMethod: ignoredDeliveryMethod, ...personalDetails } = customer;
            writeStore(keys.customer, personalDetails);
        }
        if (paymentMethod === 'mercadopago') {
            const result = await fetchJSON('/api/create-preference', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: cart.map((item) => ({ id: item.id, color: item.color, size: item.size, quantity: item.quantity })),
                    customer,
                    deliveryMethod: customer.deliveryMethod,
                    coupon: activeCoupon
                })
            });
            if (result.order) writeStore(keys.orders, [result.order, ...readStore(keys.orders, [])]);
            window.location.assign(result.initPoint || result.sandboxInitPoint);
            return;
        }

        const result = await fetchJSON('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items: cart,
                customer,
                coupon: activeCoupon,
                paymentMethod,
                simulationStatus,
                deliveryMethod: customer.deliveryMethod
            })
        });
        const previousOrders = readStore(keys.orders, []);
        writeStore(keys.orders, [result.order, ...previousOrders]);
        if (result.products) products = result.products;
        byId('order-result').hidden = false;
        byId('order-result').innerHTML = `<strong>Pedido ${escapeHTML(result.order.number)} · ${escapeHTML(result.order.paymentStatus)}</strong><p>${escapeHTML(result.order.message)}</p><p>Total: ${currency.format(result.order.total)}. ${escapeHTML(result.order.delivery.estimate)}</p>`;
        cart = [];
        activeCoupon = null;
        writeStore(keys.cart, cart);
        writeStore(keys.coupon, null);
        renderHighlighted();
        renderCatalog();
        renderFavorites();
        renderCart();
        showMessage('checkout-message', 'Pedido de demostración guardado correctamente.');
        byId('order-result').scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (error) {
        showMessage('checkout-message', error.message);
        try {
            const latest = await fetchJSON('/api/catalog');
            products = latest.products;
            renderCatalog();
            renderHighlighted();
            renderFavorites();
            renderCart();
        } catch {
            // Keep the checkout error visible if the catalog refresh also fails.
        }
    } finally {
        button.disabled = getCartSummary().quantity === 0;
    }
}

async function hashPassword(password, salt = crypto.randomUUID()) {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const digest = await crypto.subtle.deriveBits({
        name: 'PBKDF2',
        salt: new TextEncoder().encode(salt),
        iterations: 150000,
        hash: 'SHA-256'
    }, key, 256);
    return {
        salt,
        hash: [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
    };
}

async function renderAccount() {
    const current = readStore(keys.user, null);
    byId('account-auth').hidden = Boolean(current);
    byId('account-profile').hidden = !current;
    if (!current) return;
    byId('profile-name').textContent = current.name || '¡Hola!';
    byId('profile-email').textContent = current.email;
    let orders = readStore(keys.orders, []).filter((order) => normalized(order.customer?.email) === normalized(current.email));
    const notifications = readStore(keys.notifications, []);
    const changed = [];
    orders = await Promise.all(orders.map(async (order) => {
        try {
            const result = await fetchJSON(`/api/orders/${encodeURIComponent(order.id)}?email=${encodeURIComponent(current.email)}`);
            if (result.order.status !== order.status || result.order.paymentStatus !== order.paymentStatus) changed.push(`Pedido ${order.number}: ${result.order.status}, pago ${result.order.paymentStatus}.`);
            return { ...order, ...result.order };
        } catch {
            return order;
        }
    }));
    const allOrders = readStore(keys.orders, []);
    writeStore(keys.orders, [...orders, ...allOrders.filter((order) => !orders.some((saved) => saved.id === order.id))]);
    if (changed.length) writeStore(keys.notifications, [...changed, ...notifications].slice(0, 20));
    const recentNotifications = readStore(keys.notifications, []);
    const notificationMarkup = recentNotifications.length
        ? `<div class="account-notifications"><strong>Novedades</strong>${recentNotifications.slice(0, 3).map((entry) => `<p>${escapeHTML(entry)}</p>`).join('')}</div>`
        : '';
    const ordersMarkup = orders.length
        ? `<h3>Historial de pedidos demo</h3>${orders.map((order) => {
            const items = order.items.map((item) => `${escapeHTML(item.name)} × ${item.quantity} · ${escapeHTML(item.color)} / ${escapeHTML(item.size)}`).join('<br>');
            const address = order.deliveryAddress;
            const tracking = order.delivery?.trackingNumber ? ` · Guía ${escapeHTML(order.delivery.trackingNumber)}` : '';
            const requestLabel = order.status === 'pago pendiente' ? 'Cancelar pedido pendiente' : 'Solicitar cambio / devolución';
            return `<article class="account-order"><strong>${escapeHTML(order.number)} · ${escapeHTML(order.status)}</strong><span>${currency.format(order.total)} · ${new Date(order.createdAt).toLocaleDateString('es-CO')}</span><span>${escapeHTML(order.delivery?.method || '')}${tracking}</span><details><summary>Ver artículos y dirección</summary><p>${items}</p><p>${escapeHTML(address?.street || '')} ${escapeHTML(address?.streetNumber || '')}, ${escapeHTML(address?.city || '')}</p></details><button type="button" data-receipt="${escapeHTML(order.id)}">Descargar comprobante demo</button><button type="button" data-order-request="${escapeHTML(order.id)}">${requestLabel}</button></article>`;
        }).join('')}`
        : '<p>Aún no tienes pedidos guardados en este navegador.</p>';
    byId('account-order-list').innerHTML = notificationMarkup + ordersMarkup;
}

async function setAccountTab(tab) {
    accountMode = tab;
    document.querySelectorAll('[data-account-tab]').forEach((button) => button.classList.toggle('is-active', button.dataset.accountTab === tab));
    const nameField = byId('account-form').elements.namedItem('name');
    nameField.required = tab === 'register';
    nameField.closest('label').hidden = tab !== 'register';
    const password = byId('account-form').elements.namedItem('password');
    password.autocomplete = tab === 'register' ? 'new-password' : 'current-password';
}

document.addEventListener('click', async (event) => {
    const detailButton = event.target.closest('[data-detail]');
    const addButton = event.target.closest('[data-add]');
    const favoriteButton = event.target.closest('[data-favorite]');
    const categoryButton = event.target.closest('[data-category]');
    const genderCategoryButton = event.target.closest('[data-gender]');
    const collectionButton = event.target.closest('[data-highlight]');
    const quantityButton = event.target.closest('[data-quantity]');
    const removeButton = event.target.closest('[data-remove]');
    const closeButton = event.target.closest('[data-close-dialog]');
    const thumbnail = event.target.closest('[data-image-index]');
    const accountTab = event.target.closest('[data-account-tab]');
    const orderRequest = event.target.closest('[data-order-request]');
    const receiptButton = event.target.closest('[data-receipt]');
    if (detailButton) {
        const product = productById(detailButton.dataset.detail);
        if (product) renderDetail(product);
    } else if (addButton) {
        const product = productById(addButton.dataset.add);
        if (product && addToCart(product)) {
            addButton.classList.add('added');
            window.setTimeout(() => addButton.classList.remove('added'), 450);
            openQuickCart();
        }
    } else if (favoriteButton) {
        toggleFavorite(favoriteButton.dataset.favorite);
    } else if (genderCategoryButton) {
        selectCategory(genderCategoryButton.dataset.category, genderCategoryButton.dataset.gender);
    } else if (categoryButton) {
        selectCategory(categoryButton.dataset.category);
    } else if (collectionButton) {
        selectProductCollection(collectionButton.dataset.highlight);
    } else if (quantityButton) {
        const item = cart.find((entry) => entry.key === quantityButton.dataset.quantity);
        const delta = Number(quantityButton.dataset.delta);
        if (item && (delta < 0 || item.quantity < getStock(productById(item.id), item.color, item.size))) {
            item.quantity += delta;
            cart = cart.filter((entry) => entry.quantity > 0);
            renderCart();
        }
    } else if (removeButton) {
        cart = cart.filter((item) => item.key !== removeButton.dataset.remove);
        renderCart();
    } else if (closeButton) {
        closeButton.closest('dialog').close();
    } else if (thumbnail) {
        selectedDetailImage = Number(thumbnail.dataset.imageIndex);
        byId('detail-color').value = activeProduct.colors[selectedDetailImage]?.label || byId('detail-color').value;
        syncDetailVariant();
    } else if (accountTab) {
        setAccountTab(accountTab.dataset.accountTab);
    } else if (receiptButton) {
        const order = readStore(keys.orders, []).find((entry) => entry.id === receiptButton.dataset.receipt);
        if (!order) return;
        const lines = [
            'RITMO SPORT · COMPROBANTE DE DEMOSTRACIÓN',
            `Pedido: ${order.number}`,
            `Fecha: ${order.createdAt}`,
            `Estado: ${order.status} / pago ${order.paymentStatus}`,
            ...order.items.map((item) => `${item.name} (${item.color}, ${item.size}) x${item.quantity} · ${currency.format(item.lineTotal)}`),
            `Subtotal: ${currency.format(order.subtotal)}`,
            `Descuento demo: ${currency.format(order.discount)}`,
            `Envío demo: ${currency.format(order.shipping)}`,
            `Total demo: ${currency.format(order.total)}`,
            'Comprobante ficticio: no representa una venta ni pago real.'
        ];
        const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/plain;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `${order.number}-comprobante-demo.txt`;
        link.click();
        URL.revokeObjectURL(url);
    } else if (orderRequest) {
        const orders = readStore(keys.orders, []);
        const order = orders.find((entry) => entry.id === orderRequest.dataset.orderRequest);
        if (!order) return;
        if (order.status === 'pago pendiente' && window.confirm(`¿Solicitar la cancelación del pedido ${order.number}?`)) {
            try {
                const result = await fetchJSON(`/api/orders/${encodeURIComponent(order.id)}/cancel`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: order.customer.email })
                });
                writeStore(keys.orders, orders.map((entry) => entry.id === order.id ? { ...entry, ...result.order } : entry));
                writeStore(keys.notifications, [`Pedido ${order.number}: cancelado.`, ...readStore(keys.notifications, [])].slice(0, 20));
                await renderAccount();
            } catch (error) {
                showMessage('account-message', error.message);
            }
        } else if (order.status !== 'pago pendiente') {
            window.location.href = `mailto:soporte@ritmosport.example?subject=${encodeURIComponent(`Solicitud pedido ${order.number}`)}`;
        }
    }
});

for (const id of ['search', 'category-filter', 'gender-filter', 'brand-filter', 'size-filter', 'color-filter', 'availability-filter', 'rating-filter', 'price-filter', 'sort-filter']) {
    byId(id).addEventListener(id === 'search' || id === 'price-filter' ? 'input' : 'change', () => {
        if (id === 'price-filter') byId('price-value').textContent = currency.format(Number(byId('price-filter').value));
        if (id === 'category-filter') activeProductCollection = null;
        if (['category-filter', 'gender-filter', 'brand-filter'].includes(id)) renderFilters();
        renderCatalog();
    });
}
byId('clear-filters').addEventListener('click', clearFilters);
byId('delivery-method').addEventListener('change', renderCart);
byId('apply-coupon').addEventListener('click', () => {
    const code = byId('coupon-code').value.trim().toUpperCase();
    let feedback = '';
    if (!couponCatalog[code]) {
        activeCoupon = null;
        writeStore(keys.coupon, null);
        feedback = 'Cupón no válido. Prueba RITMO10 o BIENVENIDA (demo).';
    } else if (couponCatalog[code].minimum && getCartSummary().subtotal < couponCatalog[code].minimum) {
        feedback = `Este cupón requiere una compra mínima de ${currency.format(couponCatalog[code].minimum)}.`;
    } else {
        activeCoupon = code;
        writeStore(keys.coupon, code);
    }
    renderCart();
    if (feedback) byId('coupon-message').textContent = feedback;
});
byId('checkout-form').addEventListener('submit', (event) => {
    event.preventDefault();
    placeOrder(byId('simulation-outcome').value);
});
byId('simulation-button').addEventListener('click', () => placeOrder('rejected'));
byId('payment-method').addEventListener('change', () => {
    const isSimulation = byId('payment-method').value === 'simulation';
    byId('simulation-outcome-field').hidden = !isSimulation;
    byId('simulation-button').hidden = !isSimulation;
});
byId('detail-color').addEventListener('change', () => {
    syncDetailVariant();
});
byId('detail-size').addEventListener('change', () => {
    const stock = getStock(activeProduct, byId('detail-color').value, byId('detail-size').value);
    byId('detail-stock').textContent = `${stock} unidades disponibles`;
});
byId('detail-add').addEventListener('click', () => {
    if (addToCart(activeProduct, byId('detail-color').value, byId('detail-size').value)) {
        byId('product-dialog').close();
        openQuickCart();
    }
});
byId('detail-favorite').addEventListener('click', () => toggleFavorite(activeProduct.id));
byId('account-open').addEventListener('click', () => {
    void renderAccount();
    byId('account-dialog').showModal();
});
byId('cart-open').addEventListener('click', openQuickCart);
byId('continue-checkout').addEventListener('click', () => {
    byId('cart-dialog').close();
    byId('checkout-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
    byId('checkout-form').querySelector('input').focus({ preventScroll: true });
});
byId('account-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email')).trim().toLowerCase();
    const password = String(formData.get('password'));
    const users = readStore(keys.users, []);
    if (accountMode === 'register') {
        if (users.some((user) => user.email === email)) {
            showMessage('account-message', 'Ya existe una cuenta demo con este correo.');
            return;
        }
        const credential = await hashPassword(password);
        users.push({ email, name: String(formData.get('name')).trim(), ...credential });
        writeStore(keys.users, users);
    }
    const user = users.find((entry) => entry.email === email);
    if (accountMode === 'login') {
        if (!user || !user.salt || !user.hash || (await hashPassword(password, user.salt)).hash !== user.hash) {
            showMessage('account-message', 'No encontramos una cuenta demo con esos datos. Puedes crear una cuenta.');
            return;
        }
    }
    writeStore(keys.user, { email, name: user.name });
    byId('account-message').textContent = '';
    renderAccount();
});
byId('account-logout').addEventListener('click', () => {
    localStorage.removeItem(keys.user);
    void renderAccount();
});
byId('account-orders').addEventListener('click', () => byId('account-order-list').scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
byId('forgot-password').addEventListener('click', () => showMessage('account-message', 'Recuperación de contraseña informativa: configura un servicio de correo y autenticación antes de publicar.'));
byId('google-login').addEventListener('click', () => showMessage('account-message', 'Google OAuth no está configurado. Añade OAuth Client ID y dominio autorizado en el proveedor antes de habilitar el inicio de sesión real.'));
byId('contact-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
        const result = await fetchJSON('/api/support', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        byId('contact-status').textContent = result.message;
        form.reset();
    } catch (error) {
        byId('contact-status').textContent = error.message;
    }
});
byId('product-dialog').addEventListener('click', (event) => {
    if (event.target === byId('product-dialog')) byId('product-dialog').close();
});
byId('account-dialog').addEventListener('click', (event) => {
    if (event.target === byId('account-dialog')) byId('account-dialog').close();
});
document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        byId('search').focus();
        byId('catalogo').scrollIntoView({ behavior: 'smooth' });
    }
});
document.addEventListener('error', (event) => {
    if (event.target instanceof HTMLImageElement) {
        const image = event.target;
        image.hidden = true;
        const card = image.closest('.product-card');
        if (card) card.hidden = true;
        const detailDialog = image.closest('#product-dialog');
        if (detailDialog?.open) detailDialog.close();
    }
}, true);

renderCategories();
renderFilters();
renderDeliveryMethods();
renderHighlighted();
renderCatalog();
renderCart();
renderFavorites();
initializeCustomerDetails();
setAccountTab('login');
const returnedPayment = new URLSearchParams(window.location.search).get('payment');
if (returnedPayment) {
    byId('order-result').hidden = false;
    byId('order-result').textContent = returnedPayment === 'success'
        ? 'Regresaste de Mercado Pago. La confirmación final del pago depende de la notificación del proveedor.'
        : returnedPayment === 'pending'
            ? 'El pago está pendiente. El proveedor actualizará el estado.'
            : 'El pago no se completó. Tu carrito sigue disponible.';
}
byId('payment-method').dispatchEvent(new Event('change'));
loadServerState();
window.setInterval(() => void refreshServerCatalog(), 15000);
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void refreshServerCatalog();
});
