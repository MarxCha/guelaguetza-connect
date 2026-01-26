import { describe, it, expect, beforeEach } from 'vitest';
import { getTestApp, getTestPrisma, generateAuthToken } from './setup.js';
import { testUsers, TEST_PASSWORD } from './fixtures/users.js';
import {
  testSellerProfile,
  testProducts,
  getTestProduct,
  createShippingAddress,
} from './fixtures/products.js';

/**
 * E2E Test: Flujo completo de compra de productos
 *
 * User Journey:
 * 1. Login como usuario
 * 2. Navegar a tienda
 * 3. Buscar productos
 * 4. Agregar al carrito (múltiples productos)
 * 5. Ver carrito
 * 6. Proceder al checkout
 * 7. Verificar orden creada
 */
describe('E2E: Marketplace Flow - Comprar productos', () => {
  const app = getTestApp();
  const prisma = getTestPrisma();

  let userId: string;
  let sellerId: string;
  let sellerProfileId: string;
  let product1Id: string;
  let product2Id: string;
  let product3Id: string;

  beforeEach(async () => {
    // Seed: Crear usuario comprador
    const buyer = await prisma.user.create({
      data: testUsers.regularUser,
    });
    userId = buyer.id;

    // Seed: Crear vendedor
    const seller = await prisma.user.create({
      data: testUsers.sellerUser,
    });
    sellerId = seller.id;

    // Seed: Crear perfil de vendedor
    const sellerProfile = await prisma.sellerProfile.create({
      data: testSellerProfile,
    });
    sellerProfileId = sellerProfile.id;

    // Seed: Crear productos
    const product1 = await prisma.product.create({
      data: testProducts.alebrije,
    });
    product1Id = product1.id;

    const product2 = await prisma.product.create({
      data: testProducts.mezcal,
    });
    product2Id = product2.id;

    const product3 = await prisma.product.create({
      data: testProducts.textil,
    });
    product3Id = product3.id;
  });

  it('Usuario puede completar el flujo de compra exitosamente', async () => {
    // PASO 1: Login
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: testUsers.regularUser.email,
        password: TEST_PASSWORD,
      },
    });

    expect(loginResponse.statusCode).toBe(200);
    const loginBody = JSON.parse(loginResponse.body);
    expect(loginBody).toHaveProperty('token');

    const token = loginBody.token;

    // PASO 2: Listar productos (navegar a tienda)
    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/marketplace/products',
    });

    expect(listResponse.statusCode).toBe(200);
    const listBody = JSON.parse(listResponse.body);
    expect(listBody.products).toBeInstanceOf(Array);
    expect(listBody.products.length).toBeGreaterThan(0);
    expect(listBody).toHaveProperty('pagination');

    // PASO 3: Buscar productos por categoría
    const searchResponse = await app.inject({
      method: 'GET',
      url: '/api/marketplace/products?category=ARTESANIA',
    });

    expect(searchResponse.statusCode).toBe(200);
    const searchBody = JSON.parse(searchResponse.body);
    expect(searchBody.products).toBeInstanceOf(Array);
    expect(searchBody.products.every((p: any) => p.category === 'ARTESANIA')).toBe(true);

    // PASO 4a: Ver detalle del producto 1
    const detailResponse1 = await app.inject({
      method: 'GET',
      url: `/api/marketplace/products/${product1Id}`,
    });

    expect(detailResponse1.statusCode).toBe(200);
    const detailBody1 = JSON.parse(detailResponse1.body);
    expect(detailBody1).toHaveProperty('id', product1Id);
    expect(detailBody1).toHaveProperty('name', testProducts.alebrije.name);
    expect(detailBody1).toHaveProperty('price');
    expect(detailBody1).toHaveProperty('stock');
    expect(detailBody1.seller).toHaveProperty('businessName');

    // PASO 4b: Agregar producto 1 al carrito
    const addToCart1Response = await app.inject({
      method: 'POST',
      url: '/api/marketplace/cart/items',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        productId: product1Id,
        quantity: 2,
      },
    });

    expect(addToCart1Response.statusCode).toBe(201);
    const cart1Body = JSON.parse(addToCart1Response.body);
    expect(cart1Body).toHaveProperty('items');
    expect(cart1Body.items.length).toBe(1);
    expect(cart1Body.items[0].quantity).toBe(2);

    // PASO 4c: Agregar producto 2 al carrito
    const addToCart2Response = await app.inject({
      method: 'POST',
      url: '/api/marketplace/cart/items',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        productId: product2Id,
        quantity: 1,
      },
    });

    expect(addToCart2Response.statusCode).toBe(201);

    // PASO 4d: Agregar producto 3 al carrito
    const addToCart3Response = await app.inject({
      method: 'POST',
      url: '/api/marketplace/cart/items',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        productId: product3Id,
        quantity: 1,
      },
    });

    expect(addToCart3Response.statusCode).toBe(201);

    // PASO 5: Ver carrito completo
    const cartResponse = await app.inject({
      method: 'GET',
      url: '/api/marketplace/cart',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(cartResponse.statusCode).toBe(200);
    const cartBody = JSON.parse(cartResponse.body);
    expect(cartBody.items).toBeInstanceOf(Array);
    expect(cartBody.items.length).toBe(3);

    // Verificar cantidades y productos
    const item1 = cartBody.items.find((i: any) => i.productId === product1Id);
    expect(item1).toBeDefined();
    expect(item1.quantity).toBe(2);
    expect(item1.product).toHaveProperty('name');

    // Calcular total esperado
    const expectedTotal = (850 * 2) + 450 + 1200; // alebrije*2 + mezcal + textil
    const actualTotal = cartBody.items.reduce(
      (sum: number, item: any) => sum + Number(item.product.price) * item.quantity,
      0
    );
    expect(actualTotal).toBe(expectedTotal);

    // PASO 6: Actualizar cantidad de un producto
    const cartItem = cartBody.items[0];
    const updateResponse = await app.inject({
      method: 'PUT',
      url: `/api/marketplace/cart/items/${cartItem.id}`,
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        quantity: 3,
      },
    });

    expect(updateResponse.statusCode).toBe(200);
    const updateBody = JSON.parse(updateResponse.body);
    const updatedItem = updateBody.items.find((i: any) => i.id === cartItem.id);
    expect(updatedItem.quantity).toBe(3);

    // PASO 7: Proceder al checkout
    const shippingAddress = createShippingAddress();
    const checkoutResponse = await app.inject({
      method: 'POST',
      url: '/api/marketplace/checkout',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        shippingAddress,
      },
    });

    expect(checkoutResponse.statusCode).toBe(201);
    const checkoutBody = JSON.parse(checkoutResponse.body);
    expect(checkoutBody).toBeInstanceOf(Array);
    expect(checkoutBody.length).toBeGreaterThan(0);

    // Verificar orden creada
    const order = checkoutBody[0];
    expect(order).toHaveProperty('id');
    expect(order).toHaveProperty('status', 'PENDING_PAYMENT');
    expect(order).toHaveProperty('total');
    expect(order).toHaveProperty('shippingAddress');
    expect(order.shippingAddress).toEqual(shippingAddress);

    const orderId = order.id;

    // PASO 8: Verificar que orden aparece en "Mis Órdenes"
    const myOrdersResponse = await app.inject({
      method: 'GET',
      url: '/api/marketplace/orders',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(myOrdersResponse.statusCode).toBe(200);
    const myOrdersBody = JSON.parse(myOrdersResponse.body);
    expect(myOrdersBody.orders).toBeInstanceOf(Array);
    expect(myOrdersBody.orders.length).toBeGreaterThan(0);

    const myOrder = myOrdersBody.orders.find((o: any) => o.id === orderId);
    expect(myOrder).toBeDefined();
    expect(myOrder).toHaveProperty('status', 'PENDING_PAYMENT');

    // PASO 9: Ver detalle de la orden
    const orderDetailResponse = await app.inject({
      method: 'GET',
      url: `/api/marketplace/orders/${orderId}`,
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(orderDetailResponse.statusCode).toBe(200);
    const orderDetailBody = JSON.parse(orderDetailResponse.body);
    expect(orderDetailBody).toHaveProperty('id', orderId);
    expect(orderDetailBody.items).toBeInstanceOf(Array);
    expect(orderDetailBody.items.length).toBeGreaterThan(0);

    // PASO 10: Verificar que el carrito se vació después del checkout
    const emptyCartResponse = await app.inject({
      method: 'GET',
      url: '/api/marketplace/cart',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(emptyCartResponse.statusCode).toBe(200);
    const emptyCartBody = JSON.parse(emptyCartResponse.body);
    expect(emptyCartBody.items.length).toBe(0);
  });

  it('No permite agregar producto sin stock al carrito', async () => {
    // Crear producto sin stock
    const soldOut = await prisma.product.create({
      data: testProducts.soldOut,
    });

    const token = generateAuthToken(userId);

    const response = await app.inject({
      method: 'POST',
      url: '/api/marketplace/cart/items',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        productId: soldOut.id,
        quantity: 1,
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('error');
    expect(body.error).toContain('stock');
  });

  it('No permite agregar cantidad mayor al stock disponible', async () => {
    const token = generateAuthToken(userId);

    const response = await app.inject({
      method: 'POST',
      url: '/api/marketplace/cart/items',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        productId: product1Id, // stock: 5
        quantity: 10,
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('error');
    expect(body.error).toContain('stock');
  });

  it('Usuario puede eliminar producto del carrito', async () => {
    const token = generateAuthToken(userId);

    // Agregar producto
    const addResponse = await app.inject({
      method: 'POST',
      url: '/api/marketplace/cart/items',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        productId: product1Id,
        quantity: 1,
      },
    });

    const cart = JSON.parse(addResponse.body);
    const itemId = cart.items[0].id;

    // Eliminar producto
    const removeResponse = await app.inject({
      method: 'DELETE',
      url: `/api/marketplace/cart/items/${itemId}`,
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(removeResponse.statusCode).toBe(200);
    const updatedCart = JSON.parse(removeResponse.body);
    expect(updatedCart.items.length).toBe(0);
  });

  it('Usuario puede limpiar todo el carrito', async () => {
    const token = generateAuthToken(userId);

    // Agregar varios productos
    await app.inject({
      method: 'POST',
      url: '/api/marketplace/cart/items',
      headers: { authorization: `Bearer ${token}` },
      payload: { productId: product1Id, quantity: 1 },
    });

    await app.inject({
      method: 'POST',
      url: '/api/marketplace/cart/items',
      headers: { authorization: `Bearer ${token}` },
      payload: { productId: product2Id, quantity: 1 },
    });

    // Limpiar carrito
    const clearResponse = await app.inject({
      method: 'DELETE',
      url: '/api/marketplace/cart',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(clearResponse.statusCode).toBe(200);

    // Verificar que está vacío
    const cartResponse = await app.inject({
      method: 'GET',
      url: '/api/marketplace/cart',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    const cart = JSON.parse(cartResponse.body);
    expect(cart.items.length).toBe(0);
  });

  it('Requiere autenticación para acceder al carrito', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/marketplace/cart',
    });

    expect(response.statusCode).toBe(401);
  });

  it('Filtra productos por múltiples criterios', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/marketplace/products?category=ARTESANIA&status=ACTIVE',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.products.every(
      (p: any) => p.category === 'ARTESANIA' && p.status === 'ACTIVE'
    )).toBe(true);
  });
});
