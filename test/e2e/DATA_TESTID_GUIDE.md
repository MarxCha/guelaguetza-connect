# Guía: Agregar data-testid a Componentes

Esta guía explica cómo agregar `data-testid` a los componentes React para mejorar la resiliencia y mantenibilidad de los tests E2E.

## ¿Por qué usar data-testid?

Los `data-testid` proporcionan:

1. **Estabilidad** - No cambian cuando cambia el diseño CSS
2. **Claridad** - Identifican explícitamente elementos para testing
3. **Mantenibilidad** - Facilitan el mantenimiento de tests
4. **Separación** - Separan concerns de presentación y testing

## Cuándo usar data-testid

Usa `data-testid` cuando:

- ✅ No hay un selector semántico disponible (role, label, text)
- ✅ El elemento es dinámico y puede cambiar de texto
- ✅ Hay múltiples elementos similares que necesitas distinguir
- ✅ El elemento es crítico para tests E2E

**NO** uses `data-testid` cuando:

- ❌ Puedes usar `getByRole`, `getByLabel`, o `getByText`
- ❌ El elemento tiene un texto único y estable
- ❌ Estás duplicando funcionalidad accesible

## Nomenclatura

Usa nombres descriptivos en kebab-case:

```tsx
// ✅ Bueno
data-testid="product-card"
data-testid="add-to-cart-button"
data-testid="experience-title"
data-testid="booking-list"

// ❌ Malo
data-testid="div1"
data-testid="card"
data-testid="btn"
```

---

## Ejemplos por Componente

### 1. ExperienceCard

```tsx
// components/ExperienceCard.tsx
interface ExperienceCardProps {
  experience: Experience;
  onBook: () => void;
}

export function ExperienceCard({ experience, onBook }: ExperienceCardProps) {
  return (
    <div
      data-testid="experience-card"
      className="rounded-lg shadow-md p-4"
    >
      <img
        data-testid="experience-image"
        src={experience.imageUrl}
        alt={experience.title}
      />

      <h3 data-testid="experience-title">
        {experience.title}
      </h3>

      <p data-testid="experience-description">
        {experience.description}
      </p>

      <div data-testid="experience-price">
        ${experience.price}
      </div>

      <div data-testid="experience-rating">
        ⭐ {experience.rating} ({experience.reviewCount} reseñas)
      </div>

      <button
        data-testid="book-experience-button"
        onClick={onBook}
      >
        Reservar
      </button>
    </div>
  );
}
```

**Uso en tests:**

```typescript
// test/e2e/booking-flow.spec.ts
await page.locator('[data-testid="experience-card"]').first().click();
await expect(page.locator('[data-testid="experience-title"]'))
  .toContainText('Monte Albán');
await page.locator('[data-testid="book-experience-button"]').click();
```

---

### 2. ProductCard

```tsx
// components/ProductCard.tsx
interface ProductCardProps {
  product: Product;
  onAddToCart: () => void;
  onAddToWishlist: () => void;
}

export function ProductCard({
  product,
  onAddToCart,
  onAddToWishlist
}: ProductCardProps) {
  return (
    <div
      data-testid="product-card"
      className="product-card"
    >
      <img
        data-testid="product-image"
        src={product.imageUrl}
        alt={product.name}
      />

      <h3 data-testid="product-name">
        {product.name}
      </h3>

      <p data-testid="product-description">
        {product.description}
      </p>

      <div data-testid="product-price">
        ${product.price}
      </div>

      <div data-testid="product-stock">
        {product.stock > 0 ? `${product.stock} disponibles` : 'Agotado'}
      </div>

      <button
        data-testid="add-to-cart"
        onClick={onAddToCart}
        disabled={product.stock === 0}
      >
        Agregar al Carrito
      </button>

      <button
        data-testid="add-to-wishlist"
        onClick={onAddToWishlist}
      >
        ♥ Favoritos
      </button>
    </div>
  );
}
```

**Uso en tests:**

```typescript
// test/e2e/marketplace-flow.spec.ts
const products = page.locator('[data-testid="product-card"]');
await products.first().click();
await expect(page.locator('[data-testid="product-name"]'))
  .toBeVisible();
await page.locator('[data-testid="add-to-cart"]').click();
```

---

### 3. Navigation

```tsx
// components/Navigation.tsx
export function Navigation() {
  const { user } = useAuth();
  const { cartCount } = useCart();

  return (
    <nav data-testid="main-navigation">
      <a
        href="/#home"
        data-testid="nav-home"
      >
        Inicio
      </a>

      <a
        href="/#experiences"
        data-testid="nav-experiences"
      >
        Experiencias
      </a>

      <a
        href="/#tienda"
        data-testid="nav-tienda"
      >
        Tienda
      </a>

      {user ? (
        <>
          <button
            data-testid="cart-button"
            onClick={() => navigate('/#cart')}
          >
            🛒 Carrito
            <span data-testid="cart-count">{cartCount}</span>
          </button>

          <button data-testid="user-menu">
            {user.nombre}
          </button>

          {user.role === 'ADMIN' && (
            <a
              href="/#admin"
              data-testid="nav-admin"
            >
              Admin
            </a>
          )}
        </>
      ) : (
        <>
          <button data-testid="login-button">
            Iniciar Sesión
          </button>
          <button data-testid="register-button">
            Registrarse
          </button>
        </>
      )}
    </nav>
  );
}
```

**Uso en tests:**

```typescript
// test/e2e/booking-flow.spec.ts
await page.locator('[data-testid="nav-experiences"]').click();
await expect(page.locator('[data-testid="cart-count"]'))
  .toHaveText('2');
```

---

### 4. BookingCard

```tsx
// components/BookingCard.tsx
interface BookingCardProps {
  booking: Booking;
  onCancel: () => void;
}

export function BookingCard({ booking, onCancel }: BookingCardProps) {
  return (
    <div
      data-testid="booking-card"
      data-booking-id={booking.id}
      data-booking-status={booking.status}
    >
      <h3 data-testid="booking-experience-title">
        {booking.experience.title}
      </h3>

      <div data-testid="booking-date">
        📅 {booking.timeSlot.date}
      </div>

      <div data-testid="booking-time">
        🕒 {booking.timeSlot.startTime} - {booking.timeSlot.endTime}
      </div>

      <div data-testid="booking-guests">
        👥 {booking.guestCount} personas
      </div>

      <div data-testid="booking-total">
        💰 ${booking.totalPrice}
      </div>

      <div data-testid="booking-status">
        {getStatusBadge(booking.status)}
      </div>

      {booking.status === 'CONFIRMED' && (
        <button
          data-testid="cancel-booking"
          onClick={onCancel}
        >
          Cancelar Reserva
        </button>
      )}
    </div>
  );
}
```

**Uso en tests:**

```typescript
// test/e2e/booking-flow.spec.ts
const bookings = page.locator('[data-testid="booking-card"]');
await expect(bookings.first()).toBeVisible();
await expect(page.locator('[data-testid="booking-status"]'))
  .toContainText('Confirmada');
```

---

### 5. CartItem

```tsx
// components/CartItem.tsx
interface CartItemProps {
  item: CartItem;
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
}

export function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  return (
    <div
      data-testid="cart-item"
      data-product-id={item.productId}
    >
      <img
        data-testid="cart-item-image"
        src={item.product.imageUrl}
        alt={item.product.name}
      />

      <h4 data-testid="cart-item-name">
        {item.product.name}
      </h4>

      <div data-testid="cart-item-price">
        ${item.product.price}
      </div>

      <div data-testid="quantity-controls">
        <button
          data-testid="decrease-quantity"
          onClick={() => onUpdateQuantity(item.quantity - 1)}
          disabled={item.quantity <= 1}
        >
          -
        </button>

        <span data-testid="quantity-value">
          {item.quantity}
        </span>

        <button
          data-testid="increase-quantity"
          onClick={() => onUpdateQuantity(item.quantity + 1)}
        >
          +
        </button>
      </div>

      <div data-testid="cart-item-subtotal">
        Subtotal: ${item.product.price * item.quantity}
      </div>

      <button
        data-testid="remove-item"
        onClick={onRemove}
      >
        🗑️ Eliminar
      </button>
    </div>
  );
}
```

**Uso en tests:**

```typescript
// test/e2e/marketplace-flow.spec.ts
await page.locator('[data-testid="increase-quantity"]').first().click();
await expect(page.locator('[data-testid="quantity-value"]'))
  .toHaveText('3');
await page.locator('[data-testid="remove-item"]').click();
```

---

### 6. AdminUserRow

```tsx
// components/admin/UserRow.tsx
interface UserRowProps {
  user: User;
  onBan: () => void;
  onUnban: () => void;
  onChangeRole: (role: Role) => void;
}

export function UserRow({ user, onBan, onUnban, onChangeRole }: UserRowProps) {
  return (
    <tr
      data-testid="user-row"
      data-user-id={user.id}
      data-user-role={user.role}
    >
      <td data-testid="user-email">{user.email}</td>
      <td data-testid="user-name">{user.nombre} {user.apellido}</td>
      <td data-testid="user-role">{user.role}</td>

      <td>
        {user.banned ? (
          <span data-testid="banned-badge" className="badge-banned">
            Baneado
          </span>
        ) : (
          <span data-testid="active-badge" className="badge-active">
            Activo
          </span>
        )}
      </td>

      <td>
        <button
          data-testid="user-actions"
          onClick={() => setMenuOpen(true)}
        >
          ⋮
        </button>

        {menuOpen && (
          <div data-testid="user-actions-menu">
            {!user.banned ? (
              <button
                data-testid="ban-user"
                onClick={onBan}
              >
                Banear Usuario
              </button>
            ) : (
              <button
                data-testid="unban-user"
                onClick={onUnban}
              >
                Desbanear Usuario
              </button>
            )}

            <select
              data-testid="change-role"
              onChange={(e) => onChangeRole(e.target.value as Role)}
              value={user.role}
            >
              <option value="USER">Usuario</option>
              <option value="GUIDE">Guía</option>
              <option value="SELLER">Vendedor</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
        )}
      </td>
    </tr>
  );
}
```

**Uso en tests:**

```typescript
// test/e2e/admin-flow.spec.ts
const userRow = page.locator('[data-testid="user-row"]').first();
await userRow.locator('[data-testid="user-actions"]').click();
await page.locator('[data-testid="ban-user"]').click();
await expect(page.locator('[data-testid="banned-badge"]')).toBeVisible();
```

---

### 7. Formularios

```tsx
// components/CheckoutForm.tsx
export function CheckoutForm({ onSubmit }: CheckoutFormProps) {
  return (
    <form data-testid="checkout-form" onSubmit={onSubmit}>
      <h2>Información de Envío</h2>

      <input
        data-testid="shipping-name"
        type="text"
        aria-label="Nombre completo"
        placeholder="Nombre completo"
      />

      <input
        data-testid="shipping-address"
        type="text"
        aria-label="Dirección"
        placeholder="Dirección"
      />

      <input
        data-testid="shipping-city"
        type="text"
        aria-label="Ciudad"
        placeholder="Ciudad"
      />

      <input
        data-testid="shipping-zip"
        type="text"
        aria-label="Código postal"
        placeholder="Código postal"
      />

      <input
        data-testid="shipping-phone"
        type="tel"
        aria-label="Teléfono"
        placeholder="Teléfono"
      />

      <div data-testid="order-summary">
        <h3>Resumen de Orden</h3>
        <div data-testid="order-subtotal">Subtotal: ${subtotal}</div>
        <div data-testid="order-shipping">Envío: ${shipping}</div>
        <div data-testid="order-total">Total: ${total}</div>
      </div>

      <button
        data-testid="submit-order"
        type="submit"
      >
        Confirmar Orden
      </button>
    </form>
  );
}
```

---

## Patrones Comunes

### Listas

```tsx
<div data-testid="product-list">
  {products.map(product => (
    <ProductCard
      key={product.id}
      data-testid="product-card"
      product={product}
    />
  ))}
</div>
```

### Modales

```tsx
<div
  data-testid="confirm-modal"
  role="dialog"
  aria-labelledby="modal-title"
>
  <h2 id="modal-title" data-testid="modal-title">
    Confirmar Acción
  </h2>

  <p data-testid="modal-message">
    ¿Estás seguro?
  </p>

  <button data-testid="modal-cancel">
    Cancelar
  </button>

  <button data-testid="modal-confirm">
    Confirmar
  </button>
</div>
```

### Estados de Carga

```tsx
{loading ? (
  <div data-testid="loading-spinner">
    Cargando...
  </div>
) : error ? (
  <div data-testid="error-message">
    {error}
  </div>
) : (
  <div data-testid="content">
    {content}
  </div>
)}
```

### Filtros

```tsx
<div data-testid="filters">
  <select data-testid="category-filter">
    <option value="">Todas las categorías</option>
    <option value="TOUR">Tours</option>
    <option value="TALLER">Talleres</option>
  </select>

  <input
    data-testid="search-input"
    type="text"
    placeholder="Buscar..."
  />

  <button data-testid="apply-filters">
    Aplicar
  </button>

  <button data-testid="clear-filters">
    Limpiar
  </button>
</div>
```

---

## Checklist de Componentes

Componentes que necesitan `data-testid`:

### Navegación
- [ ] Navigation (nav-home, nav-experiences, nav-tienda, etc.)
- [ ] CartButton (cart-button, cart-count)
- [ ] UserMenu (user-menu, login-button, register-button)

### Experiencias
- [ ] ExperienceCard (experience-card, experience-title, book-button)
- [ ] ExperiencesList (experiences-list)
- [ ] ExperienceDetail (experience-detail, date-selector, time-slot)
- [ ] BookingCard (booking-card, booking-status, cancel-button)

### Marketplace
- [ ] ProductCard (product-card, product-name, add-to-cart)
- [ ] ProductsList (products-list)
- [ ] CartItem (cart-item, quantity-controls, remove-item)
- [ ] CheckoutForm (checkout-form, shipping-*, order-summary)
- [ ] OrderCard (order-card, order-status)

### Admin
- [ ] AdminDashboard (admin-stats, admin-chart)
- [ ] UserRow (user-row, user-actions, ban-user, banned-badge)
- [ ] UsersList (users-list, search-users)
- [ ] ReportsTable (reports-list)

### Comunes
- [ ] SearchInput (search-input)
- [ ] FilterPanel (category-filter, price-filter)
- [ ] Modal (confirm-modal, modal-title, modal-confirm)
- [ ] Toast/Notifications (toast-message)
- [ ] LoadingSpinner (loading-spinner)
- [ ] ErrorMessage (error-message)

---

## Prioridad de Implementación

### Alta Prioridad (Flujos Críticos)
1. ✅ ExperienceCard
2. ✅ ProductCard
3. ✅ Navigation
4. ✅ BookingCard
5. ✅ CartItem
6. ✅ AdminUserRow

### Media Prioridad
7. CheckoutForm
8. ExperienceDetail
9. AdminDashboard
10. OrderCard

### Baja Prioridad
11. Modales
12. Filtros
13. Componentes auxiliares

---

## Tips Finales

1. **Combina con Accesibilidad**: Siempre usa `aria-label` junto con `data-testid`
2. **No Abuses**: Solo agrega donde sea necesario
3. **Mantén Consistencia**: Usa la misma convención en todo el proyecto
4. **Documenta**: Agrega comentarios para IDs no obvios
5. **Revisa Tests**: Actualiza los tests cuando agregues data-testid

---

¡Con estos `data-testid` implementados, tus tests E2E serán mucho más estables y mantenibles! 🎉
