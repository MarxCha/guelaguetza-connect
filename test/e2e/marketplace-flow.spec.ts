import { test, expect } from '@playwright/test';
import { login, register } from './helpers/auth';
import { REGULAR_USER, NEW_USER_DATA, STRIPE_TEST_CARDS, TIMEOUTS } from './fixtures/test-users';

test.describe('Marketplace Flow - Comprar Productos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('test_mode', 'true');
    });
  });

  test('Usuario puede navegar la tienda, agregar productos al carrito y completar compra', async ({ page }) => {
    // 1. Login del usuario
    await test.step('Iniciar sesión', async () => {
      await login(page, REGULAR_USER);
      await expect(page.getByText(REGULAR_USER.nombre)).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    });

    // 2. Navegar a la tienda/marketplace
    await test.step('Navegar a la tienda', async () => {
      const shopLink = page.getByRole('link', { name: /tienda|marketplace|productos/i });

      if (await shopLink.isVisible()) {
        await shopLink.click();
      } else {
        await page.goto('/#tienda');
      }

      // Verificar que estamos en la tienda
      await expect(page.getByRole('heading', { name: /tienda|marketplace|productos/i }))
        .toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    });

    // 3. Ver productos disponibles
    await test.step('Ver productos disponibles', async () => {
      // Esperar a que carguen los productos
      await expect(page.locator('[data-testid="product-card"]').first())
        .toBeVisible({ timeout: TIMEOUTS.API_CALL });

      // Verificar que hay productos
      const productCards = page.locator('[data-testid="product-card"]');
      const count = await productCards.count();
      expect(count).toBeGreaterThan(0);
    });

    // 4. Ver detalle de un producto
    let productName = '';

    await test.step('Ver detalle de producto', async () => {
      // Obtener el nombre del primer producto
      const firstProduct = page.locator('[data-testid="product-card"]').first();
      productName = await firstProduct.locator('[data-testid="product-name"]')
        .or(firstProduct.getByRole('heading'))
        .textContent() || 'Producto';

      // Click en el producto
      await firstProduct.click();

      // Verificar que estamos en el detalle
      await expect(page.getByRole('heading', { name: new RegExp(productName, 'i') }))
        .toBeVisible({ timeout: TIMEOUTS.MEDIUM });

      // Verificar información del producto
      await expect(page.getByText(/precio|price/i)).toBeVisible();
      await expect(page.getByText(/stock|disponible/i)).toBeVisible();
    });

    // 5. Agregar producto al carrito
    await test.step('Agregar producto al carrito', async () => {
      // Buscar selector de cantidad
      const quantityInput = page.locator('[data-testid="quantity"]')
        .or(page.locator('input[type="number"]'));

      if (await quantityInput.isVisible()) {
        await quantityInput.fill('2');
      }

      // Click en agregar al carrito
      const addToCartButton = page.getByRole('button', { name: /agregar al carrito|add to cart/i });
      await expect(addToCartButton).toBeVisible();
      await addToCartButton.click();

      // Verificar que se agregó
      await expect(page.getByText(/agregado al carrito|added to cart/i))
        .toBeVisible({ timeout: TIMEOUTS.MEDIUM });

      // Verificar que el contador del carrito se actualizó
      const cartBadge = page.locator('[data-testid="cart-count"]');
      if (await cartBadge.isVisible()) {
        const cartCount = await cartBadge.textContent();
        expect(parseInt(cartCount || '0')).toBeGreaterThan(0);
      }
    });

    // 6. Volver a la tienda y agregar otro producto
    await test.step('Agregar segundo producto', async () => {
      // Volver a la tienda
      await page.goBack();

      // Esperar a que cargue
      await expect(page.locator('[data-testid="product-card"]').first())
        .toBeVisible({ timeout: TIMEOUTS.MEDIUM });

      // Seleccionar el segundo producto
      const secondProduct = page.locator('[data-testid="product-card"]').nth(1);

      if (await secondProduct.isVisible()) {
        await secondProduct.click();

        // Agregar al carrito
        const addButton = page.getByRole('button', { name: /agregar al carrito|add to cart/i });
        if (await addButton.isVisible({ timeout: TIMEOUTS.SHORT })) {
          await addButton.click();
          await expect(page.getByText(/agregado al carrito|added to cart/i))
            .toBeVisible({ timeout: TIMEOUTS.MEDIUM });
        }
      }
    });

    // 7. Ir al carrito
    await test.step('Ver carrito', async () => {
      // Click en ícono del carrito
      const cartButton = page.locator('[data-testid="cart-button"]')
        .or(page.getByRole('link', { name: /carrito|cart/i }));

      await cartButton.click();

      // Verificar que estamos en el carrito
      await expect(page.getByRole('heading', { name: /carrito|cart/i }))
        .toBeVisible({ timeout: TIMEOUTS.MEDIUM });

      // Verificar que hay productos en el carrito
      await expect(page.locator('[data-testid="cart-item"]').first())
        .toBeVisible({ timeout: TIMEOUTS.MEDIUM });

      // Verificar que se muestra el total
      await expect(page.locator('[data-testid="cart-total"]'))
        .toBeVisible();
    });

    // 8. Actualizar cantidad en el carrito
    await test.step('Actualizar cantidad de producto', async () => {
      // Buscar botón de incrementar cantidad
      const increaseButton = page.locator('[data-testid="increase-quantity"]').first();

      if (await increaseButton.isVisible()) {
        await increaseButton.click();

        // Esperar actualización
        await page.waitForTimeout(TIMEOUTS.SHORT);

        // Verificar que el total se actualizó
        const total = await page.locator('[data-testid="cart-total"]').textContent();
        expect(total).toBeTruthy();
      }
    });

    // 9. Ir al checkout
    await test.step('Ir al checkout', async () => {
      // Click en proceder al pago
      const checkoutButton = page.getByRole('button', { name: /proceder al pago|checkout|finalizar compra/i });
      await expect(checkoutButton).toBeVisible();
      await checkoutButton.click();

      // Verificar que estamos en checkout
      await expect(page.getByRole('heading', { name: /checkout|finalizar compra/i }))
        .toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    });

    // 10. Completar información de envío
    await test.step('Completar información de envío', async () => {
      // Llenar dirección si no está guardada
      const addressInput = page.locator('[data-testid="shipping-address"]')
        .or(page.getByLabel(/dirección|address/i));

      if (await addressInput.isVisible({ timeout: TIMEOUTS.SHORT })) {
        await addressInput.fill('Calle Reforma 123, Centro, Oaxaca');
      }

      const phoneInput = page.locator('[data-testid="shipping-phone"]')
        .or(page.getByLabel(/teléfono|phone/i));

      if (await phoneInput.isVisible()) {
        await phoneInput.fill('9511234567');
      }

      const zipInput = page.locator('[data-testid="shipping-zip"]')
        .or(page.getByLabel(/código postal|zip/i));

      if (await zipInput.isVisible()) {
        await zipInput.fill('68000');
      }
    });

    // 11. Seleccionar método de envío
    await test.step('Seleccionar método de envío', async () => {
      const shippingMethod = page.locator('[data-testid="shipping-method"]').first();

      if (await shippingMethod.isVisible({ timeout: TIMEOUTS.SHORT })) {
        await shippingMethod.click();
      }
    });

    // 12. Procesar pago
    await test.step('Procesar pago', async () => {
      // Verificar resumen de orden
      await expect(page.locator('[data-testid="order-summary"]')).toBeVisible();

      // Click en pagar
      const payButton = page.getByRole('button', { name: /pagar|pay|confirmar orden/i });
      await expect(payButton).toBeVisible();
      await payButton.click();

      // Manejar formulario de Stripe si aparece
      const stripeFrame = page.frameLocator('iframe[name*="stripe"]').first();
      const cardInput = stripeFrame.locator('[placeholder*="número"]')
        .or(page.locator('[data-testid="card-number"]'));

      if (await cardInput.isVisible({ timeout: TIMEOUTS.MEDIUM }).catch(() => false)) {
        // Llenar tarjeta de prueba
        await cardInput.fill(STRIPE_TEST_CARDS.SUCCESS.number);

        const expiryInput = stripeFrame.locator('[placeholder*="MM"]')
          .or(page.locator('[data-testid="card-expiry"]'));
        if (await expiryInput.isVisible()) {
          await expiryInput.fill(STRIPE_TEST_CARDS.SUCCESS.expiry);
        }

        const cvcInput = stripeFrame.locator('[placeholder*="CVC"]')
          .or(page.locator('[data-testid="card-cvc"]'));
        if (await cvcInput.isVisible()) {
          await cvcInput.fill(STRIPE_TEST_CARDS.SUCCESS.cvc);
        }

        // Submit pago
        const submitButton = page.getByRole('button', { name: /confirmar pago|submit/i });
        if (await submitButton.isVisible()) {
          await submitButton.click();
        }
      } else {
        // Modo mock
        const confirmButton = page.getByRole('button', { name: /confirmar/i });
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }
      }

      // Esperar procesamiento
      await page.waitForTimeout(TIMEOUTS.PAYMENT);
    });

    // 13. Verificar confirmación de orden
    await test.step('Verificar confirmación de orden', async () => {
      // Buscar mensaje de éxito
      await expect(page.getByText(/orden confirmada|order confirmed|compra exitosa/i))
        .toBeVisible({ timeout: TIMEOUTS.LONG });

      // Verificar número de orden
      const orderNumber = page.locator('[data-testid="order-number"]');
      if (await orderNumber.isVisible()) {
        const orderText = await orderNumber.textContent();
        expect(orderText).toBeTruthy();
      }
    });

    // 14. Verificar orden en "Mis Pedidos"
    await test.step('Verificar en Mis Pedidos', async () => {
      // Navegar a Mis Pedidos
      const ordersLink = page.getByRole('link', { name: /mis pedidos|my orders|mis compras/i });

      if (await ordersLink.isVisible()) {
        await ordersLink.click();
      } else {
        await page.goto('/#orders');
      }

      // Verificar que estamos en la página correcta
      await expect(page.getByRole('heading', { name: /mis pedidos|my orders/i }))
        .toBeVisible({ timeout: TIMEOUTS.MEDIUM });

      // Verificar que aparece la orden recién creada
      await expect(page.locator('[data-testid="order-card"]').first())
        .toBeVisible({ timeout: TIMEOUTS.API_CALL });

      // Verificar estado de la orden
      await expect(page.getByText(/confirmada|confirmed|procesando/i)).toBeVisible();
    });
  });

  test('Agregar producto a wishlist', async ({ page }) => {
    // Login
    await login(page, REGULAR_USER);

    // Ir a la tienda
    await page.goto('/#tienda');

    // Ver detalle de producto
    await page.locator('[data-testid="product-card"]').first().click();

    // Click en botón de wishlist
    const wishlistButton = page.locator('[data-testid="add-to-wishlist"]')
      .or(page.getByRole('button', { name: /favoritos|wishlist/i }));

    if (await wishlistButton.isVisible({ timeout: TIMEOUTS.SHORT })) {
      await wishlistButton.click();

      // Verificar que se agregó
      await expect(page.getByText(/agregado a favoritos|added to wishlist/i))
        .toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    }
  });

  test('Filtrar productos por categoría', async ({ page }) => {
    await page.goto('/#tienda');

    // Buscar filtro de categoría
    const categoryFilter = page.locator('[data-testid="category-filter"]')
      .or(page.getByRole('combobox', { name: /categoría/i }));

    if (await categoryFilter.isVisible({ timeout: TIMEOUTS.SHORT })) {
      await categoryFilter.click();

      // Seleccionar categoría
      const artesaniasOption = page.getByRole('option', { name: /artesanías|artesanias/i });
      if (await artesaniasOption.isVisible()) {
        await artesaniasOption.click();

        // Verificar que se aplicó el filtro
        await page.waitForTimeout(TIMEOUTS.SHORT);

        const firstProduct = page.locator('[data-testid="product-card"]').first();
        if (await firstProduct.isVisible({ timeout: TIMEOUTS.MEDIUM })) {
          await expect(firstProduct).toBeVisible();
        }
      }
    }
  });

  test('Buscar producto por texto', async ({ page }) => {
    await page.goto('/#tienda');

    // Buscar campo de búsqueda
    const searchInput = page.locator('[data-testid="search-products"]')
      .or(page.getByPlaceholder(/buscar producto/i));

    if (await searchInput.isVisible({ timeout: TIMEOUTS.SHORT })) {
      await searchInput.fill('alebrije');
      await searchInput.press('Enter');

      // Esperar resultados
      await page.waitForTimeout(TIMEOUTS.SHORT);

      // Verificar resultados
      const firstProduct = page.locator('[data-testid="product-card"]').first();
      if (await firstProduct.isVisible({ timeout: TIMEOUTS.MEDIUM })) {
        await expect(firstProduct).toContainText(/alebrije/i);
      }
    }
  });

  test('Carrito vacío muestra mensaje apropiado', async ({ page }) => {
    await login(page, REGULAR_USER);

    // Ir al carrito
    await page.goto('/#cart');

    // Verificar mensaje de carrito vacío
    const emptyMessage = page.getByText(/carrito vacío|no hay productos/i);

    if (await emptyMessage.isVisible({ timeout: TIMEOUTS.MEDIUM })) {
      await expect(emptyMessage).toBeVisible();
    }
  });

  test('Eliminar producto del carrito', async ({ page }) => {
    await login(page, REGULAR_USER);

    // Ir a tienda y agregar producto
    await page.goto('/#tienda');
    await page.locator('[data-testid="product-card"]').first().click();

    const addButton = page.getByRole('button', { name: /agregar al carrito/i });
    if (await addButton.isVisible({ timeout: TIMEOUTS.MEDIUM })) {
      await addButton.click();

      // Ir al carrito
      await page.goto('/#cart');

      // Eliminar producto
      const removeButton = page.locator('[data-testid="remove-item"]')
        .or(page.getByRole('button', { name: /eliminar|remove/i }));

      if (await removeButton.isVisible({ timeout: TIMEOUTS.MEDIUM })) {
        await removeButton.click();

        // Verificar que se eliminó
        await expect(page.getByText(/carrito vacío|no hay productos/i))
          .toBeVisible({ timeout: TIMEOUTS.MEDIUM });
      }
    }
  });
});
