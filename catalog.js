const catalogSeeds = {
    Zapatos: {
        brands: ['Ritmo', 'Pace', 'Vértice', 'Nómada', 'Pulso'],
        names: ['Tenis Impulso', 'Runner Altura', 'Training Vector', 'Urban Pace', 'Sprint Flow', 'Court Motion', 'Trail Norte', 'Tenis Horizonte', 'Runner Cumbre', 'Training Base'],
        prices: [289900, 359900, 319900, 249900, 329900, 299900, 389900, 279900, 419900, 269900],
        sizes: ['36', '37', '38', '39', '40', '41', '42', '43', '44']
    },
    Pantalonetas: {
        brands: ['Ritmo', 'Pace', 'Pulso', 'Vértice', 'Nómada'],
        names: ['Pantaloneta Tempo', 'Short Sprint', 'Pantaloneta Flex', 'Short Core', 'Pantaloneta Move', 'Short Trail', 'Pantaloneta Aero', 'Short Training', 'Pantaloneta Flux', 'Short Ligero'],
        prices: [119900, 99900, 139900, 109900, 129900, 149900, 114900, 104900, 134900, 94900],
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL']
    },
    Camisetas: {
        brands: ['Ritmo', 'Pace', 'Vértice', 'Pulso', 'Nómada'],
        names: ['Camiseta Ritmo Dry', 'Camiseta Pace Air', 'Camiseta Vector', 'Camiseta Pulso', 'Camiseta Esencial', 'Camiseta Sprint', 'Camiseta Norte', 'Camiseta Flow', 'Camiseta Base', 'Camiseta Tempo'],
        prices: [89900, 109900, 99900, 84900, 79900, 119900, 94900, 104900, 74900, 114900],
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL']
    },
    Accesorios: {
        brands: ['Ritmo', 'Pace', 'Pulso', 'Nómada', 'Vértice'],
        names: ['Botella Hidra 750', 'Guantes Grip', 'Toalla Micro Dry', 'Banda Resistencia', 'Termo Ruta', 'Cinturón Runner', 'Medias Motion x3', 'Rodillera Activa', 'Morral Training', 'Luz de Seguridad'],
        prices: [69900, 79900, 49900, 39900, 89900, 64900, 45900, 54900, 189900, 35900],
        sizes: ['Única']
    },
    Gorras: {
        brands: ['Ritmo', 'Pace', 'Vértice', 'Pulso', 'Nómada'],
        names: ['Gorra Ritmo Classic', 'Gorra Pace Run', 'Gorra Vector 5 Paneles', 'Gorra Pulso Flex', 'Gorra Esencial', 'Gorra Trail Norte', 'Gorra Aero', 'Gorra Urban Move', 'Gorra Tempo', 'Gorra Horizonte'],
        prices: [69900, 79900, 89900, 74900, 59900, 84900, 79900, 69900, 64900, 94900],
        sizes: ['S', 'M', 'L', 'Única']
    }
};

const genders = ['Hombre', 'Mujer', 'Unisex'];
const sellers = ['Ritmo Sport', 'Pace Colombia', 'Norte Running', 'Vértice Active'];
const colors = ['Negro', 'Blanco', 'Verde lima', 'Azul'];
const colorHex = {
    Negro: '#242724',
    Blanco: '#f5f5f1',
    'Verde lima': '#b9e75b',
    Azul: '#4775b5'
};

export const categories = Object.keys(catalogSeeds);
export const categoryData = categories.map((name) => [name]);

const illustrationColors = {
    Negro: '#252b27',
    Blanco: '#f1f0e8',
    'Verde lima': '#b9e75b',
    Azul: '#4775b5'
};

function escapeXml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'
    })[character]);
}

export function renderProductIllustration(product, variantIndex = 0) {
    const seed = [...String(product.id)].reduce((value, character) => (value * 31 + character.charCodeAt(0)) >>> 0, 7);
    const selectedVariant = product.colors?.[variantIndex % Math.max(1, product.colors.length)];
    const color = selectedVariant?.hex;
    const accent = typeof color === 'string' && /^#[\da-f]{6}$/i.test(color) ? color : '#b9e75b';
    const secondary = ['#4775b5', '#e38b67', '#d6c078', '#8fa798'][seed % 4];
    const accessoryName = String(product.name).toLocaleLowerCase('es');
    let item;

    if (product.category === 'Zapatos') {
        item = `<path d="M137 478q54-12 83-95l35-105q13-39 48-34l96 47q31 16 47 56l37 88 82 28q46 16 63 54 10 20-12 37-45 36-126 41l-307 4q-58 0-84-26-22-24 3-62z" fill="#f2f1e9" stroke="#303b34" stroke-width="12"/><path d="M137 531q84 21 170 5l175-20 155 35q29 10 13 40-25 45-137 57l-286 12q-81 2-123-30-27-21-7-66z" fill="${accent}" stroke="#303b34" stroke-width="11"/><path d="M267 282l99 58m-117-12 102 59m-118-11 101 57" fill="none" stroke="${secondary}" stroke-width="12" stroke-linecap="round"/><path d="M210 425q83 37 190 19" fill="none" stroke="#aab3a7" stroke-width="9"/>`;
    } else if (product.category === 'Pantalonetas') {
        item = `<path d="M237 178q123 30 246 0l-8 170 41 218q-54 28-131 31l-25-111-25 111q-77-3-131-31l41-218z" fill="${accent}" stroke="#303b34" stroke-width="12"/><path d="M237 178q123 30 246 0l-8 75q-115 27-230 0z" fill="${secondary}" stroke="#303b34" stroke-width="10"/><path d="M360 253v201m-116-110-26 218q49 19 109 21m149-239 26 218q-49 19-109 21" fill="none" stroke="#f2f1e9" stroke-width="9" stroke-linecap="round"/><path d="M343 219v41m34-41v41" fill="none" stroke="#f2f1e9" stroke-width="8" stroke-linecap="round"/>`;
    } else if (product.category === 'Camisetas') {
        item = `<path d="M245 174l108 48 108-48 115 71-62 116-69-36 42 282q-125 40-268 0l42-282-69 36-62-116z" fill="${accent}" stroke="#303b34" stroke-width="12"/><path d="M245 174l108 48 108-48-37 99h-142z" fill="${secondary}" stroke="#303b34" stroke-width="9"/><path d="M353 274v315m-60-223h120" fill="none" stroke="#f2f1e9" stroke-width="9" opacity=".85"/><path d="M287 600q72 18 139 0" fill="none" stroke="#303b34" stroke-width="8"/>`;
    } else if (product.category === 'Gorras') {
        item = `<path d="M145 464q0-184 174-220 169-33 247 124l-37 151-376 1z" fill="${accent}" stroke="#303b34" stroke-width="12"/><path d="M145 464q177-72 377-4 88 31 114 92-153 80-359 37-118-26-132-125z" fill="${secondary}" stroke="#303b34" stroke-width="12"/><path d="M321 250v208m-105-105q89-68 176-67" fill="none" stroke="#f2f1e9" stroke-width="9"/><path d="M272 409h128" fill="none" stroke="#303b34" stroke-width="8" stroke-linecap="round"/>`;
    } else if (accessoryName.includes('botella') || accessoryName.includes('termo')) {
        item = `<path d="M287 206h146v73l38 39v227q0 67-67 67h-88q-67 0-67-67V318l38-39z" fill="${accent}" stroke="#303b34" stroke-width="12"/><path d="M287 408h184v128H287z" fill="${secondary}" stroke="#303b34" stroke-width="10"/><path d="M327 206v-43h66v43m-49-43v-35h32v35" fill="none" stroke="#303b34" stroke-width="12"/><path d="M349 292v96m35-96v96" fill="none" stroke="#f2f1e9" stroke-width="10"/>`;
    } else if (accessoryName.includes('guante')) {
        item = `<path d="M223 562q-19-28-5-67l27-79q9-27 29-22 18 4 11 32l-12 43 12-173q2-29 23-29 23 0 21 30l-3 108 17-151q4-29 26-27 23 2 18 32l-14 148 25-123q6-27 28-23 22 4 14 34l-23 128 30-68q12-24 31-12 19 11 8 35l-48 117q-23 55-82 57l-97-2z" fill="${accent}" stroke="#303b34" stroke-width="12"/><path d="M259 511q61 31 129 5" fill="none" stroke="${secondary}" stroke-width="13" stroke-linecap="round"/>`;
    } else if (accessoryName.includes('toalla')) {
        item = `<path d="M191 312q0-54 55-54h217q55 0 55 54v228q0 55-55 55H246q-55 0-55-55z" fill="${accent}" stroke="#303b34" stroke-width="12"/><path d="M251 258v337m207-337v337m-207-220h207m-207 102h207" fill="none" stroke="#f2f1e9" stroke-width="12" opacity=".9"/><path d="M249 596q-69 0-69-69V325q0-67 69-67" fill="none" stroke="${secondary}" stroke-width="14"/>`;
    } else if (accessoryName.includes('banda')) {
        item = `<path d="M203 362q0-71 72-71h171q72 0 72 71v126q0 71-72 71H275q-72 0-72-71z" fill="none" stroke="${accent}" stroke-width="52"/><path d="M256 362q0-18 19-18h171q19 0 19 18v126q0 18-19 18H275q-19 0-19-18z" fill="none" stroke="#303b34" stroke-width="11"/><path d="M230 342q-45 88 1 168m260-168q45 88-1 168" fill="none" stroke="${secondary}" stroke-width="10"/>`;
    } else if (accessoryName.includes('cintur')) {
        item = `<path d="M155 356q0-40 40-40h330q40 0 40 40v107q0 40-40 40H195q-40 0-40-40z" fill="${accent}" stroke="#303b34" stroke-width="12"/><path d="M307 365h106v88H307z" fill="${secondary}" stroke="#303b34" stroke-width="11"/><path d="M337 385v47m47-47v47M194 357v105m330-105v105" fill="none" stroke="#f2f1e9" stroke-width="9"/>`;
    } else if (accessoryName.includes('media')) {
        item = `<path d="M244 214h105v211q0 54 55 54h35v134H322q-78 0-78-77z" fill="${accent}" stroke="#303b34" stroke-width="12"/><path d="M382 214h105v211q0 54 55 54h35v134H460q-78 0-78-77z" fill="${secondary}" stroke="#303b34" stroke-width="12"/><path d="M244 274h105m33 0h105" stroke="#f2f1e9" stroke-width="16"/>`;
    } else if (accessoryName.includes('rodillera')) {
        item = `<path d="M238 224q120-42 240 0l35 150q-53 65-45 179l-16 76q-91 40-188 0l-16-76q8-114-45-179z" fill="${accent}" stroke="#303b34" stroke-width="12"/><ellipse cx="358" cy="411" rx="78" ry="97" fill="${secondary}" stroke="#303b34" stroke-width="12"/><path d="M246 253q111 32 224 0m-210 350q99 33 196 0" fill="none" stroke="#f2f1e9" stroke-width="11"/>`;
    } else if (accessoryName.includes('morral')) {
        item = `<path d="M232 301q0-82 82-82h92q82 0 82 82v261q0 52-52 52H284q-52 0-52-52z" fill="${accent}" stroke="#303b34" stroke-width="12"/><path d="M294 219v-33q0-35 35-35h62q35 0 35 35v33m-194 182h280v105q0 43-43 43H318q-43 0-43-43z" fill="${secondary}" stroke="#303b34" stroke-width="11"/><path d="M351 398v102m25-102v102" stroke="#f2f1e9" stroke-width="9"/>`;
    } else if (accessoryName.includes('luz')) {
        item = `<path d="M196 363q0-52 52-52h212q52 0 52 52v115q0 52-52 52H248q-52 0-52-52z" fill="${accent}" stroke="#303b34" stroke-width="12"/><path d="M267 357h174v127H267z" fill="#f5f0d9" stroke="#303b34" stroke-width="11"/><path d="M290 380h128m-128 39h128m-128 39h128" stroke="${secondary}" stroke-width="15" stroke-linecap="round"/><path d="M286 309v-43m136 43v-43" stroke="#303b34" stroke-width="13"/>`;
    } else {
        item = `<path d="M253 186h214v103l51 48v203q0 51-51 51H253q-51 0-51-51V337l51-48z" fill="${accent}" stroke="#303b34" stroke-width="12"/><path d="M253 289h214v304H253z" fill="${secondary}" stroke="#303b34" stroke-width="10"/><path d="M324 245h72v84h-72z" fill="#f2f1e9" stroke="#303b34" stroke-width="9"/><path d="M301 412h118v104H301z" fill="${accent}" stroke="#303b34" stroke-width="9"/>`;
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="800" viewBox="0 0 720 800" role="img" aria-label="${escapeXml(product.name)}">
<defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#f2f4ed"/><stop offset="1" stop-color="#dbe3d7"/></linearGradient><filter id="shadow" x="-.3" y="-.5" width="1.6" height="2"><feGaussianBlur stdDeviation="18"/></filter></defs>
<rect width="720" height="800" fill="url(#bg)"/><circle cx="${530 + seed % 45}" cy="${165 + seed % 28}" r="143" fill="${accent}" opacity=".28"/><path d="M0 624q188-92 374-8t346-18v202H0z" fill="#c9d4c5"/><ellipse cx="360" cy="633" rx="220" ry="36" fill="#344336" opacity=".2" filter="url(#shadow)"/>
<g stroke-linejoin="round" stroke-linecap="round">${item}</g>
<path d="M91 142h98M91 166h58" stroke="${secondary}" stroke-width="6" stroke-linecap="round"/><rect x="506" y="668" width="145" height="38" rx="19" fill="#fff" opacity=".88"/><text x="578" y="693" fill="#303b34" font-family="Arial,sans-serif" font-size="15" font-weight="700" text-anchor="middle">${escapeXml(product.sku || 'RITMO SPORT')}</text>
</svg>`;
}

const generatedProducts = categories.flatMap((category, categoryIndex) => {
    const seed = catalogSeeds[category];
    return seed.names.map((name, index) => {
        const gender = ['Pantalonetas', 'Gorras', 'Accesorios'].includes(category) ? 'Unisex' : genders[(index + categoryIndex) % genders.length];
        const regularPrice = seed.prices[index];
        const isOnSale = index % 4 === 1 || index === 8;
        const price = isOnSale ? Math.round(regularPrice * 0.85 / 100) * 100 : regularPrice;
        const sku = `RS-${category.slice(0, 3).toUpperCase()}-${String(index + 1).padStart(3, '0')}`;
        const productColors = colors.slice((index + categoryIndex) % 2, (index + categoryIndex) % 2 + 3);
        const sizes = seed.sizes;
        const productId = `${categoryIndex + 1}-${String(index + 1).padStart(2, '0')}`;
        const accessoryPhoto = category === 'Accesorios' && name === 'Botella Hidra 750'
            ? '/assets/products/accessories-bottle.jpg'
            : null;
        const image = accessoryPhoto || `/assets/products/${productId}.svg`;
        const fallbackImage = `/assets/products/${categoryIndex + 1}.svg`;
        const gallery = accessoryPhoto ? [image] : productColors.slice(0, 3).map((_, viewIndex) => `${image}?view=${viewIndex}`);
        const inventory = Object.fromEntries(productColors.flatMap((color) =>
            sizes.map((size, sizeIndex) => [`${color}|${size}`, 4 + ((index + sizeIndex + categoryIndex) % 12)])
        ));
        return {
            id: productId,
            name,
            description: `${name} ${category === 'Zapatos' ? 'diseñado para acompañar tus entrenamientos y recorridos diarios' : 'con materiales cómodos y detalles funcionales para acompañar cada movimiento'}. Colección Ritmo Sport.`,
            brand: seed.brands[index % seed.brands.length],
            seller: sellers[(index + categoryIndex) % sellers.length],
            sellerRating: Number((4.2 + ((index + categoryIndex) % 7) / 10).toFixed(1)),
            category,
            gender,
            sku,
            price,
            regularPrice,
            isOnSale,
            discount: isOnSale ? 15 : 0,
            colors: productColors.map((label) => ({ label, hex: colorHex[label] })),
            sizes,
            inventory,
            stock: Object.values(inventory).reduce((sum, count) => sum + count, 0),
            rating: Number((4.1 + ((index + categoryIndex) % 9) / 10).toFixed(1)),
            reviewCount: 12 + (index * 7 + categoryIndex * 3) % 86,
            isNew: index < 3,
            available: true,
            images: gallery,
            fallbackImage,
            image: gallery[0]
        };
    });
});

const additionalShoes = [
    { id: '1-11', name: 'Tenis Urbano Gris', color: 'Gris', hex: '#92938f', price: 289900, image: '/assets/products/zapato-adidas-gris.png' },
    { id: '1-12', name: 'Runner Azul Marino', color: 'Azul marino y verde', hex: '#263d48', price: 359900, image: '/assets/products/zapato-adidas-azul-verde.png' },
    { id: '1-13', name: 'Tenis Blanco Naranja', color: 'Blanco y naranja', hex: '#e8e3d9', price: 319900, image: '/assets/products/zapato-adidas-blanco-naranja.png' },
    { id: '1-14', name: 'Tenis Blanco Verde', color: 'Blanco y verde', hex: '#e8e8df', price: 299900, image: '/assets/products/zapato-adidas-blanco-verde.png' },
    { id: '1-15', name: 'Tenis Blanco Negro', color: 'Blanco y negro', hex: '#efeee8', price: 279900, image: '/assets/products/zapato-adidas-blanco-negro.png' },
    { id: '1-16', name: 'Tenis Urbano Negro', color: 'Negro y blanco', hex: '#292b2b', price: 289900, image: '/assets/products/zapato-adidas-negro.png' },
    { id: '1-17', name: 'Runner Celeste', color: 'Celeste', hex: '#9fc6d5', price: 329900, image: '/assets/products/zapato-adidas-celeste.png' },
    { id: '1-18', name: 'Tenis Urbano Rosa', color: 'Rosa', hex: '#d9a5a9', price: 269900, image: '/assets/products/zapato-nike-rosa.png' },
    { id: '1-19', name: 'Tenis Celeste y Blanco', color: 'Celeste y blanco', hex: '#a8cad7', price: 299900, image: '/assets/products/zapato-nike-celeste.png' },
    { id: '1-20', name: 'Tenis Blanco Azul', color: 'Blanco y azul', hex: '#e8e8df', price: 309900, image: '/assets/products/zapato-nike-blanco-azul.png' },
    { id: '1-21', name: 'Runner Negro Blanco', color: 'Negro y blanco', hex: '#292b2b', price: 349900, image: '/assets/products/zapato-nike-negro-blanco.png' },
    { id: '1-22', name: 'Runner Blanco Amarillo', color: 'Blanco y amarillo', hex: '#e8e5d8', price: 329900, image: '/assets/products/zapato-nike-amarillo.png' }
].map((shoe) => {
    const sizes = catalogSeeds.Zapatos.sizes;
    const inventory = Object.fromEntries(sizes.map((size) => [`${shoe.color}|${size}`, 4]));
    return {
        ...shoe,
        description: `${shoe.name} de demostración, con diseño deportivo para entrenamientos y uso diario.`,
        brand: 'Genérica',
        seller: 'Ritmo Sport',
        sellerRating: 4.5,
        category: 'Zapatos',
        gender: 'Unisex',
        sku: `RS-ZAP-${shoe.id.slice(2).padStart(3, '0')}`,
        regularPrice: shoe.price,
        isOnSale: false,
        discount: 0,
        colors: [{ label: shoe.color, hex: shoe.hex }],
        sizes,
        inventory,
        stock: Object.values(inventory).reduce((sum, count) => sum + count, 0),
        rating: 0,
        reviewCount: 0,
        isNew: true,
        available: true,
        images: [shoe.image],
        fallbackImage: '/assets/products/1.svg'
    };
});

const additionalShorts = [
    { id: '2-11', name: 'Pantaloneta Hombre Negra con Franjas', gender: 'Hombre', color: 'Negro', hex: '#292b2b', price: 89900, image: '/assets/products/pantaloneta-hombre-negra-rayas.png', sizes: ['S', 'M', 'L', 'XL', 'XXL'] },
    { id: '2-12', name: 'Pantaloneta Hombre Verde Oliva', gender: 'Hombre', color: 'Verde oliva', hex: '#737766', price: 99900, image: '/assets/products/pantaloneta-hombre-verde-oliva.png', sizes: ['S', 'M', 'L', 'XL', 'XXL'] },
    { id: '2-13', name: 'Pantaloneta Hombre Azul Marino', gender: 'Hombre', color: 'Azul marino', hex: '#142b4d', price: 89900, image: '/assets/products/pantaloneta-hombre-azul-marino.png', sizes: ['S', 'M', 'L', 'XL', 'XXL'] },
    { id: '2-14', name: 'Pantaloneta Mujer Running Gris', gender: 'Mujer', color: 'Gris', hex: '#55565a', price: 94900, image: '/assets/products/pantaloneta-mujer-running-gris.png', sizes: ['XS', 'S', 'M', 'L', 'XL'] },
    { id: '2-15', name: 'Pantaloneta Mujer Running Negra', gender: 'Mujer', color: 'Negro', hex: '#292b2b', price: 89900, image: '/assets/products/pantaloneta-mujer-running-negra.png', sizes: ['XS', 'S', 'M', 'L', 'XL'] },
    { id: '2-16', name: 'Pantaloneta Mujer Azul', gender: 'Mujer', color: 'Azul', hex: '#244d87', price: 99900, image: '/assets/products/pantaloneta-mujer-azul.png', sizes: ['XS', 'S', 'M', 'L', 'XL'] },
    { id: '2-17', name: 'Short Mujer de Compresión Negro', gender: 'Mujer', color: 'Negro', hex: '#242424', price: 79900, image: '/assets/products/short-mujer-compresion-negro.png', sizes: ['XS', 'S', 'M', 'L', 'XL'] },
    { id: '2-18', name: 'Pantaloneta Hombre Negra', gender: 'Hombre', color: 'Negro', hex: '#242424', price: 84900, image: '/assets/products/pantaloneta-hombre-negra.png', sizes: ['S', 'M', 'L', 'XL', 'XXL'] },
    { id: '2-19', name: 'Pantaloneta Hombre Verde', gender: 'Hombre', color: 'Verde', hex: '#08a866', price: 94900, image: '/assets/products/pantaloneta-hombre-verde.png', sizes: ['S', 'M', 'L', 'XL', 'XXL'] }
].map((shorts) => {
    const inventory = Object.fromEntries(shorts.sizes.map((size) => [`${shorts.color}|${size}`, 4]));
    return {
        ...shorts,
        description: `${shorts.name} de demostración, con diseño deportivo para entrenar y moverte cómodamente.`,
        brand: 'Genérica',
        seller: 'Ritmo Sport',
        sellerRating: 4.5,
        category: 'Pantalonetas',
        sku: `RS-PAN-${shorts.id.slice(2).padStart(3, '0')}`,
        regularPrice: shorts.price,
        isOnSale: false,
        discount: 0,
        colors: [{ label: shorts.color, hex: shorts.hex }],
        inventory,
        stock: Object.values(inventory).reduce((sum, count) => sum + count, 0),
        rating: 0,
        reviewCount: 0,
        isNew: true,
        available: true,
        images: [shorts.image],
        fallbackImage: '/assets/products/2.svg'
    };
});

const additionalMenShirts = [
    { id: '3-11', name: 'Camiseta Fútbol Blanca Azul', color: 'Blanco y azul', hex: '#e9ebeb', price: 129900, image: '/assets/products/camiseta-futbol-blanca-azul.png' },
    { id: '3-12', name: 'Camiseta Negra Básica', color: 'Negro', hex: '#252525', price: 79900, image: '/assets/products/camiseta-negra-basica.png' },
    { id: '3-13', name: 'Camiseta Fútbol Amarilla', color: 'Amarillo', hex: '#f0d51f', price: 139900, image: '/assets/products/camiseta-futbol-amarilla.png' },
    { id: '3-14', name: 'Camiseta Entrenamiento Azul Marino', color: 'Azul marino', hex: '#142142', price: 99900, image: '/assets/products/camiseta-entrenamiento-azul-marino.png' },
    { id: '3-15', name: 'Camiseta Fútbol Celeste y Blanca', color: 'Celeste y blanco', hex: '#e5eef1', price: 139900, image: '/assets/products/camiseta-futbol-celeste-blanca.png' },
    { id: '3-16', name: 'Camiseta Blanca con Franjas Negras', color: 'Blanco y negro', hex: '#eceeed', price: 109900, image: '/assets/products/camiseta-blanca-rayas-negras.png' },
    { id: '3-17', name: 'Camiseta Entrenamiento Beige', color: 'Beige', hex: '#b9b39d', price: 89900, image: '/assets/products/camiseta-entrenamiento-beige.png' },
    { id: '3-18', name: 'Camiseta Motorsport Negra', color: 'Negro y turquesa', hex: '#252528', price: 119900, image: '/assets/products/camiseta-motorsport-negra.png' },
    { id: '3-19', name: 'Camiseta Equipo Negra Turquesa', color: 'Negro y turquesa', hex: '#252528', price: 119900, image: '/assets/products/camiseta-equipo-negra-turquesa.png' },
    { id: '3-20', name: 'Camiseta Equipo Blanca Turquesa', color: 'Blanco y turquesa', hex: '#eeefed', price: 109900, image: '/assets/products/camiseta-equipo-blanca-turquesa.png' }
].map((shirt) => {
    const sizes = ['S', 'M', 'L', 'XL', 'XXL'];
    const inventory = Object.fromEntries(sizes.map((size) => [`${shirt.color}|${size}`, 4]));
    return {
        ...shirt,
        description: `${shirt.name} de demostración para hombre, con diseño deportivo para entrenar y usar a diario.`,
        brand: 'Genérica',
        seller: 'Ritmo Sport',
        sellerRating: 4.5,
        category: 'Camisetas',
        gender: 'Hombre',
        sku: `RS-CAM-${shirt.id.slice(2).padStart(3, '0')}`,
        regularPrice: shirt.price,
        isOnSale: false,
        discount: 0,
        colors: [{ label: shirt.color, hex: shirt.hex }],
        sizes,
        inventory,
        stock: Object.values(inventory).reduce((sum, count) => sum + count, 0),
        rating: 0,
        reviewCount: 0,
        isNew: true,
        available: true,
        images: [shirt.image],
        fallbackImage: '/assets/products/3.svg'
    };
});

const additionalWomenShirts = [
    { id: '3-21', name: 'Camiseta Mujer Morada', color: 'Morado', hex: '#7550ba', price: 89900, image: '/assets/products/camiseta-mujer-morada.png' },
    { id: '3-22', name: 'Camiseta Mujer Blanca', color: 'Blanco', hex: '#eeeeeb', price: 84900, image: '/assets/products/camiseta-mujer-blanca.png' },
    { id: '3-23', name: 'Camiseta Mujer Running Negra', color: 'Negro', hex: '#292929', price: 94900, image: '/assets/products/camiseta-mujer-running-negra.png' },
    { id: '3-24', name: 'Camiseta Mujer Blanca Equipment', color: 'Blanco y turquesa', hex: '#eeefeb', price: 99900, image: '/assets/products/camiseta-mujer-blanca-equipment.png' },
    { id: '3-25', name: 'Camiseta Mujer Amarilla', color: 'Amarillo', hex: '#f3bb56', price: 84900, image: '/assets/products/camiseta-mujer-amarilla.png' },
    { id: '3-26', name: 'Camiseta Mujer Beige', color: 'Beige', hex: '#a99a86', price: 89900, image: '/assets/products/camiseta-mujer-beige.png' },
    { id: '3-27', name: 'Camiseta Mujer Morada Deportiva', color: 'Morado', hex: '#613bb1', price: 89900, image: '/assets/products/camiseta-mujer-morada-deportiva.png' },
    { id: '3-28', name: 'Camiseta Mujer Rosa', color: 'Rosa', hex: '#ecc3d1', price: 89900, image: '/assets/products/camiseta-mujer-rosa.png' },
    { id: '3-29', name: 'Camiseta Mujer de Tirantes Lavanda', color: 'Lavanda', hex: '#b7a3dc', price: 79900, image: '/assets/products/camiseta-mujer-tirantes-lavanda.png' },
    { id: '3-30', name: 'Camiseta Mujer Manga Larga Blanca', color: 'Blanco', hex: '#eeeeeb', price: 109900, image: '/assets/products/camiseta-mujer-manga-larga-blanca.png' },
    { id: '3-31', name: 'Camiseta Mujer Azul Marino', color: 'Azul marino', hex: '#243f6d', price: 89900, image: '/assets/products/camiseta-mujer-azul-marino.png' },
    { id: '3-32', name: 'Camiseta Mujer Blanca Running', color: 'Blanco', hex: '#eeeeeb', price: 84900, image: '/assets/products/camiseta-mujer-blanca-running.png' },
    { id: '3-33', name: 'Camiseta Mujer Azul', color: 'Azul', hex: '#18374a', price: 89900, image: '/assets/products/camiseta-mujer-azul.png' },
    { id: '3-34', name: 'Camiseta Mujer Rosa Oscuro', color: 'Rosa oscuro', hex: '#ae4b76', price: 84900, image: '/assets/products/camiseta-mujer-rosa-oscuro.png' },
    { id: '3-35', name: 'Camiseta Mujer Morada Running', color: 'Morado', hex: '#40315f', price: 89900, image: '/assets/products/camiseta-mujer-morada-running.png' }
].map((shirt) => {
    const sizes = ['XS', 'S', 'M', 'L', 'XL'];
    const inventory = Object.fromEntries(sizes.map((size) => [`${shirt.color}|${size}`, 4]));
    return {
        ...shirt,
        description: `${shirt.name} de demostración para mujer, con diseño deportivo para entrenar y usar a diario.`,
        brand: 'Genérica',
        seller: 'Ritmo Sport',
        sellerRating: 4.5,
        category: 'Camisetas',
        gender: 'Mujer',
        sku: `RS-CAM-${shirt.id.slice(2).padStart(3, '0')}`,
        regularPrice: shirt.price,
        isOnSale: false,
        discount: 0,
        colors: [{ label: shirt.color, hex: shirt.hex }],
        sizes,
        inventory,
        stock: Object.values(inventory).reduce((sum, count) => sum + count, 0),
        rating: 0,
        reviewCount: 0,
        isNew: true,
        available: true,
        images: [shirt.image],
        fallbackImage: '/assets/products/3.svg'
    };
});

const additionalMenCaps = [
    { id: '5-11', name: 'Gorra Negra Deportiva Logo Blanco', color: 'Negro', hex: '#252525', price: 79900, image: '/assets/products/gorra-hombre-negra-logo-blanco.png' },
    { id: '5-12', name: 'Gorra Negra Deportiva con Franjas', color: 'Negro', hex: '#252525', price: 84900, image: '/assets/products/gorra-hombre-negra-rayas.png' },
    { id: '5-13', name: 'Gorra Azul Marino', color: 'Azul marino', hex: '#17264f', price: 74900, image: '/assets/products/gorra-hombre-azul-marino.png' },
    { id: '5-14', name: 'Gorra Celeste Motorsport', color: 'Celeste', hex: '#61d5df', price: 99900, image: '/assets/products/gorra-hombre-celeste.png' },
    { id: '5-15', name: 'Gorra Marrón', color: 'Marrón', hex: '#87502c', price: 74900, image: '/assets/products/gorra-hombre-marron.png' },
    { id: '5-16', name: 'Gorra Blanca Tricolor', color: 'Blanco y rojo', hex: '#ededeb', price: 89900, image: '/assets/products/gorra-hombre-blanca-tricolor.png' },
    { id: '5-17', name: 'Gorra Roja', color: 'Rojo', hex: '#d52232', price: 69900, image: '/assets/products/gorra-hombre-roja.png' },
    { id: '5-18', name: 'Gorra Verde', color: 'Verde', hex: '#0b9163', price: 79900, image: '/assets/products/gorra-hombre-verde.png' },
    { id: '5-19', name: 'Gorra Gris', color: 'Gris', hex: '#7d7c7f', price: 69900, image: '/assets/products/gorra-hombre-gris.png' },
    { id: '5-20', name: 'Gorra Verde Oliva', color: 'Verde oliva', hex: '#70705d', price: 74900, image: '/assets/products/gorra-hombre-verde-oliva.png' },
    { id: '5-21', name: 'Gorra Amarilla', color: 'Amarillo', hex: '#f2dc4e', price: 79900, image: '/assets/products/gorra-hombre-amarilla.png' },
    { id: '5-22', name: 'Gorra Blanca con Detalles Verdes', color: 'Blanco y verde', hex: '#eeeeec', price: 74900, image: '/assets/products/gorra-hombre-blanca-verde.png' },
    { id: '5-23', name: 'Gorra Verde Oscura', color: 'Verde oscuro', hex: '#174346', price: 74900, image: '/assets/products/gorra-hombre-verde-oscura.png' },
    { id: '5-24', name: 'Gorra Gris Tipo Trucker', color: 'Gris y blanco', hex: '#8d8d8d', price: 79900, image: '/assets/products/gorra-hombre-gris-malla.png' },
    { id: '5-25', name: 'Gorra Burdeos', color: 'Burdeos', hex: '#9e1239', price: 79900, image: '/assets/products/gorra-hombre-burdeos.png' },
    { id: '5-26', name: 'Gorra Beige', color: 'Beige', hex: '#c1b39b', price: 79900, image: '/assets/products/gorra-hombre-beige.png' }
].map((cap) => {
    const sizes = ['Única'];
    const inventory = Object.fromEntries(sizes.map((size) => [`${cap.color}|${size}`, 4]));
    return {
        ...cap,
        description: `${cap.name} de demostración para hombre, con ajuste cómodo para uso diario y actividades deportivas.`,
        brand: 'Genérica',
        seller: 'Ritmo Sport',
        sellerRating: 4.5,
        category: 'Gorras',
        gender: 'Hombre',
        sku: `RS-GOR-${cap.id.slice(2).padStart(3, '0')}`,
        regularPrice: cap.price,
        isOnSale: false,
        discount: 0,
        colors: [{ label: cap.color, hex: cap.hex }],
        sizes,
        inventory,
        stock: Object.values(inventory).reduce((sum, count) => sum + count, 0),
        rating: 0,
        reviewCount: 0,
        isNew: true,
        available: true,
        images: [cap.image],
        fallbackImage: '/assets/products/5.svg'
    };
});

const additionalWomenCaps = [
    { id: '5-27', name: 'Gorra Mujer Rosa', color: 'Rosa', hex: '#e53d78', price: 79900, image: '/assets/products/gorra-mujer-rosa.png' },
    { id: '5-28', name: 'Gorra Mujer Visera Negra', color: 'Negro', hex: '#252525', price: 74900, image: '/assets/products/gorra-mujer-visera-negra.png' },
    { id: '5-29', name: 'Gorra Mujer Verde Oliva', color: 'Verde oliva', hex: '#89916c', price: 79900, image: '/assets/products/gorra-mujer-verde-oliva.png' },
    { id: '5-30', name: 'Gorra Mujer Azul Denim', color: 'Azul denim', hex: '#7198b5', price: 84900, image: '/assets/products/gorra-mujer-azul-denim.png' },
    { id: '5-31', name: 'Gorra Mujer Beige', color: 'Beige', hex: '#d5d0bd', price: 79900, image: '/assets/products/gorra-mujer-beige.png' },
    { id: '5-32', name: 'Gorra Mujer Gris Oscura', color: 'Gris oscuro', hex: '#56605f', price: 74900, image: '/assets/products/gorra-mujer-gris-oscura.png' },
    { id: '5-33', name: 'Gorra Mujer Burdeos', color: 'Burdeos', hex: '#77264c', price: 84900, image: '/assets/products/gorra-mujer-burdeos.png' },
    { id: '5-34', name: 'Gorra Mujer Azul Claro', color: 'Azul claro', hex: '#8bb8d4', price: 84900, image: '/assets/products/gorra-mujer-azul-claro.png' }
].map((cap) => {
    const sizes = ['Única'];
    const inventory = Object.fromEntries(sizes.map((size) => [`${cap.color}|${size}`, 4]));
    return {
        ...cap,
        description: `${cap.name} de demostración para mujer, con ajuste cómodo para uso diario y actividades deportivas.`,
        brand: 'Genérica',
        seller: 'Ritmo Sport',
        sellerRating: 4.5,
        category: 'Gorras',
        gender: 'Mujer',
        sku: `RS-GOR-${cap.id.slice(2).padStart(3, '0')}`,
        regularPrice: cap.price,
        isOnSale: false,
        discount: 0,
        colors: [{ label: cap.color, hex: cap.hex }],
        sizes,
        inventory,
        stock: Object.values(inventory).reduce((sum, count) => sum + count, 0),
        rating: 0,
        reviewCount: 0,
        isNew: true,
        available: true,
        images: [cap.image],
        fallbackImage: '/assets/products/5.svg'
    };
});

const additionalAccessories = [
    { id: '4-11', name: 'Billetera Deportiva Marrón', color: 'Marrón', hex: '#594137', price: 69900, image: '/assets/products/billetera-deportiva-marron.png' },
    { id: '4-12', name: 'Billetera Deportiva Negra', color: 'Negro', hex: '#292929', price: 64900, image: '/assets/products/billetera-deportiva-negra.png' },
    { id: '4-13', name: 'Billetera Deportiva con Cierre', color: 'Marrón', hex: '#75504a', price: 79900, image: '/assets/products/billetera-deportiva-con-cierre.png' },
    { id: '4-14', name: 'Reloj Deportivo con Correa Marrón', color: 'Negro y marrón', hex: '#303033', price: 179900, image: '/assets/products/reloj-deportivo-correa-marron.png' },
    { id: '4-15', name: 'Reloj Deportivo Cronógrafo Negro', color: 'Negro', hex: '#292929', price: 219900, image: '/assets/products/reloj-deportivo-cronografo-negro.png' },
    { id: '4-16', name: 'Reloj Deportivo Total Black', color: 'Negro', hex: '#202020', price: 199900, image: '/assets/products/reloj-deportivo-total-black.png' },
    { id: '4-17', name: 'Reloj Deportivo Metálico', color: 'Plateado y negro', hex: '#9a9a98', price: 159900, image: '/assets/products/reloj-deportivo-metalico.png' },
    { id: '4-18', name: 'Reloj Deportivo con Correa Roja', color: 'Rojo y negro', hex: '#c62d39', price: 149900, image: '/assets/products/reloj-deportivo-correa-roja.png' },
    { id: '4-19', name: 'Pulsera Inteligente Negra', color: 'Negro', hex: '#292929', price: 189900, image: '/assets/products/pulsera-inteligente-negra.png' },
    { id: '4-20', name: 'Canguro Deportivo Gris', color: 'Gris', hex: '#55575a', price: 69900, image: '/assets/products/canguro-deportivo-gris.png' },
    { id: '4-21', name: 'Canguro Deportivo Azul Marino', color: 'Azul marino', hex: '#1c2741', price: 74900, image: '/assets/products/canguro-deportivo-azul-marino.png' },
    { id: '4-22', name: 'Canguro Deportivo Azul', color: 'Azul', hex: '#42728b', price: 74900, image: '/assets/products/canguro-deportivo-azul.png' },
    { id: '4-23', name: 'Canguro para Running Verde', color: 'Verde', hex: '#548480', price: 69900, image: '/assets/products/canguro-running-verde.png' }
].map((accessory) => {
    const sizes = ['Única'];
    const inventory = Object.fromEntries(sizes.map((size) => [`${accessory.color}|${size}`, 4]));
    return {
        ...accessory,
        description: `${accessory.name} de demostración, un complemento práctico para tus actividades deportivas y uso diario.`,
        brand: 'Genérica',
        seller: 'Ritmo Sport',
        sellerRating: 4.5,
        category: 'Accesorios',
        gender: 'Unisex',
        sku: `RS-ACC-${accessory.id.slice(2).padStart(3, '0')}`,
        regularPrice: accessory.price,
        isOnSale: false,
        discount: 0,
        colors: [{ label: accessory.color, hex: accessory.hex }],
        sizes,
        inventory,
        stock: Object.values(inventory).reduce((sum, count) => sum + count, 0),
        rating: 0,
        reviewCount: 0,
        isNew: true,
        available: true,
        images: [accessory.image],
        fallbackImage: '/assets/products/4.svg'
    };
});

const additionalBottles = [
    { id: '4-24', name: 'Botella Deportiva Negra con Asa', color: 'Negro', hex: '#292929', price: 79900, image: '/assets/products/botella-deportiva-negra-tapa-gancho.png' },
    { id: '4-25', name: 'Botella Deportiva Azul Transparente', color: 'Azul', hex: '#277cb4', price: 59900, image: '/assets/products/botella-deportiva-azul-transparente.png' },
    { id: '4-26', name: 'Botella Deportiva de Boquilla', color: 'Multicolor', hex: '#3857bd', price: 44900, image: '/assets/products/botellas-deportivas-colores.png' },
    { id: '4-27', name: 'Botella Deportiva con Tapa Abatible', color: 'Multicolor', hex: '#3399c9', price: 49900, image: '/assets/products/botella-deportiva-tapa-boquilla.png' },
    { id: '4-28', name: 'Set de Botellas Deportivas Tritan', color: 'Multicolor', hex: '#3b82c7', price: 89900, image: '/assets/products/botellas-deportivas-tritan.png' },
    { id: '4-29', name: 'Botella Deportiva Fucsia', color: 'Fucsia', hex: '#cf2387', price: 54900, image: '/assets/products/botella-deportiva-fucsia.png' },
    { id: '4-30', name: 'Termo Deportivo de Acero', color: 'Multicolor', hex: '#484078', price: 99900, image: '/assets/products/termo-deportivo-acero-colores.png' },
    { id: '4-31', name: 'Botella Deportiva Morada', color: 'Morado', hex: '#a927ba', price: 44900, image: '/assets/products/botella-deportiva-morada.png' }
].map((bottle) => {
    const sizes = ['Única'];
    const inventory = Object.fromEntries(sizes.map((size) => [`${bottle.color}|${size}`, 4]));
    return {
        ...bottle,
        description: `${bottle.name} de demostración, un complemento práctico para hidratarte durante tus actividades deportivas.`,
        brand: 'Genérica',
        seller: 'Ritmo Sport',
        sellerRating: 4.5,
        category: 'Accesorios',
        gender: 'Unisex',
        sku: `RS-ACC-${bottle.id.slice(2).padStart(3, '0')}`,
        regularPrice: bottle.price,
        isOnSale: false,
        discount: 0,
        colors: [{ label: bottle.color, hex: bottle.hex }],
        sizes,
        inventory,
        stock: Object.values(inventory).reduce((sum, count) => sum + count, 0),
        rating: 0,
        reviewCount: 0,
        isNew: true,
        available: true,
        images: [bottle.image],
        fallbackImage: '/assets/products/4.svg'
    };
});

const catalogProducts = [...generatedProducts, ...additionalShoes, ...additionalShorts, ...additionalMenShirts, ...additionalWomenShirts, ...additionalMenCaps, ...additionalWomenCaps, ...additionalAccessories, ...additionalBottles];
const productPhotos = new Set();
export const products = catalogProducts.filter((product) => {
    const photo = product.image || product.images?.[0];
    if (!photo || !/\.(?:avif|gif|jpe?g|png|webp)(?:[?#]|$)/i.test(photo) || productPhotos.has(photo)) return false;
    productPhotos.add(photo);
    return true;
});

export const storeConfig = {
    currency: 'COP',
    taxRate: 0.19,
    shippingFee: 12900,
    freeShippingThreshold: 250000,
    shippingMethods: [
        { id: 'standard', name: 'Envío estándar', carrier: 'Transportadora demo', days: '3 a 5 días hábiles', price: 12900 },
        { id: 'express', name: 'Envío express', carrier: 'Transportadora demo', days: '1 a 2 días hábiles', price: 22900 },
        { id: 'pickup', name: 'Recoger en punto', carrier: 'Punto de entrega demo', days: 'Disponible en 2 días', price: 0 }
    ]
};

export const demoCoupons = {
    RITMO10: { type: 'percentage', value: 10, label: '10% de descuento' },
    BIENVENIDA: { type: 'fixed', value: 20000, minimum: 100000, label: '$20.000 de descuento' }
};
