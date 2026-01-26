# Guía de Uso: LazyImage Component

Componente de React para carga diferida (lazy loading) de imágenes con optimización de rendimiento y UX mejorada.

## Características

- Lazy loading nativo con IntersectionObserver API
- Placeholders mientras carga
- Fallback en caso de error
- Transiciones suaves con blur effect
- Variantes predefinidas (Avatar, Product, Hero, Grid)
- Soporte para dark mode
- Totalmente tipado con TypeScript

## Instalación

El componente está listo para usar. Solo importa desde `@/components/ui/LazyImage`:

```tsx
import { LazyImage, LazyAvatar, LazyProductImage } from '@/components/ui/LazyImage';
```

## Componentes Disponibles

### 1. LazyImage (Base)

Componente base con todas las funcionalidades.

```tsx
<LazyImage
  src="https://cdn.example.com/image.jpg"
  alt="Descripción de la imagen"
  className="w-full h-auto"
  placeholderSrc="data:image/svg+xml,..."
  fallbackSrc="/error-fallback.jpg"
  threshold={0.1}
  rootMargin="50px"
  onLoad={() => console.log('Imagen cargada')}
  onError={() => console.log('Error al cargar')}
  blur={true}
/>
```

#### Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `src` | string | - | URL de la imagen (requerido) |
| `alt` | string | - | Texto alternativo (requerido) |
| `placeholderSrc` | string | SVG placeholder | Imagen mientras carga |
| `fallbackSrc` | string | SVG error | Imagen en caso de error |
| `threshold` | number | 0.1 | Threshold para IntersectionObserver |
| `rootMargin` | string | '50px' | Margen para pre-cargar |
| `onLoad` | function | - | Callback cuando carga exitosamente |
| `onError` | function | - | Callback cuando falla |
| `className` | string | '' | Clases CSS para la imagen |
| `wrapperClassName` | string | '' | Clases CSS para el wrapper |
| `blur` | boolean | true | Activar efecto blur mientras carga |

### 2. LazyAvatar

Componente optimizado para imágenes de perfil circulares.

```tsx
<LazyAvatar
  src="https://cdn.example.com/avatar.jpg"
  alt="Juan Pérez"
  size="md"
/>
```

#### Sizes

- `sm`: 32x32px (w-8 h-8)
- `md`: 48x48px (w-12 h-12) - default
- `lg`: 64x64px (w-16 h-16)
- `xl`: 96x96px (w-24 h-24)

#### Ejemplo con inicial

```tsx
<LazyAvatar
  src="https://cdn.example.com/avatar.jpg"
  alt="María González"
  size="lg"
/>
// Muestra "M" como placeholder si no hay imagen
```

### 3. LazyProductImage

Componente para imágenes de productos con aspect ratio fijo.

```tsx
<LazyProductImage
  src="https://cdn.example.com/product.jpg"
  alt="Artesanía Oaxaqueña"
  aspectRatio="4/3"
/>
```

#### Aspect Ratios

- `1/1`: Cuadrado (Instagram-style)
- `4/3`: Landscape clásico
- `16/9`: Widescreen
- `3/4`: Portrait

### 4. LazyHeroImage

Componente para banners/heroes con overlay opcional.

```tsx
<LazyHeroImage
  src="https://cdn.example.com/hero.jpg"
  alt="Guelaguetza Festival"
  overlay={true}
  overlayOpacity={0.5}
>
  <div className="text-white text-center">
    <h1 className="text-4xl font-bold">Bienvenidos a Oaxaca</h1>
    <p className="text-xl">Descubre la cultura viva</p>
  </div>
</LazyHeroImage>
```

### 5. LazyImageGrid

Componente para grids de imágenes con skeleton loading.

```tsx
<LazyImageGrid
  images={[
    { id: '1', src: 'https://cdn.example.com/1.jpg', alt: 'Imagen 1' },
    { id: '2', src: 'https://cdn.example.com/2.jpg', alt: 'Imagen 2' },
    { id: '3', src: 'https://cdn.example.com/3.jpg', alt: 'Imagen 3' },
  ]}
  columns={3}
  gap={4}
  aspectRatio="1/1"
/>
```

## Ejemplos de Uso Real

### Galería de Productos

```tsx
import { LazyProductImage } from '@/components/ui/LazyImage';

function ProductGallery({ products }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {products.map((product) => (
        <div key={product.id} className="bg-white rounded-lg shadow overflow-hidden">
          <LazyProductImage
            src={product.imageUrl}
            alt={product.name}
            aspectRatio="1/1"
          />
          <div className="p-4">
            <h3 className="font-semibold">{product.name}</h3>
            <p className="text-gray-600">${product.price}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Perfil de Usuario

```tsx
import { LazyAvatar } from '@/components/ui/LazyImage';

function UserProfile({ user }) {
  return (
    <div className="flex items-center space-x-4">
      <LazyAvatar
        src={user.avatarUrl}
        alt={user.name}
        size="lg"
      />
      <div>
        <h2 className="text-xl font-bold">{user.name}</h2>
        <p className="text-gray-600">{user.bio}</p>
      </div>
    </div>
  );
}
```

### Hero con Overlay

```tsx
import { LazyHeroImage } from '@/components/ui/LazyImage';

function LandingHero() {
  return (
    <LazyHeroImage
      src="https://cdn.guelaguetzaconnect.com/hero-oaxaca.jpg"
      alt="Guelaguetza Festival 2024"
      overlay={true}
      overlayOpacity={0.4}
    >
      <div className="text-white text-center space-y-4">
        <h1 className="text-5xl md:text-6xl font-bold">
          Vive la Guelaguetza
        </h1>
        <p className="text-xl md:text-2xl">
          Conecta con la cultura de Oaxaca
        </p>
        <button className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-lg text-lg font-semibold">
          Explorar Eventos
        </button>
      </div>
    </LazyHeroImage>
  );
}
```

### Grid de Eventos

```tsx
import { LazyImageGrid } from '@/components/ui/LazyImage';

function EventsGrid({ events }) {
  const images = events.map(event => ({
    id: event.id,
    src: event.imageUrl,
    alt: event.title,
  }));

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Próximos Eventos</h2>
      <LazyImageGrid
        images={images}
        columns={3}
        gap={6}
        aspectRatio="16/9"
      />
    </div>
  );
}
```

## Integración con CDN

El componente funciona perfectamente con URLs del CDN:

```tsx
// Después de subir una imagen al CDN
const uploadedImage = await fetch('/api/upload/image', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
  body: formData,
});

const { data } = await uploadedImage.json();

// Usar la URL del CDN
<LazyImage
  src={data.url}
  alt="Mi imagen subida"
/>

// Si se generó thumbnail
<LazyAvatar
  src={data.thumbnailUrl || data.url}
  alt="Avatar del usuario"
/>
```

## Optimización de Rendimiento

### Pre-carga Inteligente

El componente usa `rootMargin="50px"` por defecto, lo que significa que comenzará a cargar la imagen 50px antes de que entre en el viewport.

```tsx
// Cargar más temprano para conexiones lentas
<LazyImage
  src={imageUrl}
  alt="Imagen"
  rootMargin="200px"
/>

// Cargar solo cuando sea visible (ahorro de datos)
<LazyImage
  src={imageUrl}
  alt="Imagen"
  rootMargin="0px"
/>
```

### Threshold

Controla qué porcentaje de la imagen debe ser visible antes de cargar:

```tsx
// Cargar cuando 50% sea visible
<LazyImage
  src={imageUrl}
  alt="Imagen"
  threshold={0.5}
/>

// Cargar inmediatamente al ser 1% visible
<LazyImage
  src={imageUrl}
  alt="Imagen"
  threshold={0.01}
/>
```

## Fallback para Navegadores Antiguos

Si el navegador no soporta IntersectionObserver, el componente automáticamente carga la imagen de manera normal.

## Accesibilidad

- Siempre incluye un `alt` descriptivo
- El componente usa `loading="lazy"` nativo como fallback
- Mantiene semántica HTML correcta con `<img>`

## Dark Mode

Los placeholders y estados de error se adaptan automáticamente:

```tsx
// El fondo cambia automáticamente
<LazyImage
  src={imageUrl}
  alt="Imagen"
  className="rounded-lg"
/>
```

## Best Practices

### 1. Usa el componente correcto

```tsx
// ❌ No uses LazyImage para todo
<LazyImage src={avatar} alt="..." className="w-12 h-12 rounded-full" />

// ✅ Usa la variante específica
<LazyAvatar src={avatar} alt="..." size="md" />
```

### 2. Siempre proporciona alt text

```tsx
// ❌ Mal
<LazyImage src={imageUrl} alt="" />

// ✅ Bien
<LazyImage src={imageUrl} alt="Artesanía de barro negro de Oaxaca" />
```

### 3. Usa thumbnails del CDN

```tsx
// ❌ Cargar imagen completa para thumbnails
<LazyAvatar src={fullImageUrl} alt="..." size="sm" />

// ✅ Usar thumbnail generado
<LazyAvatar src={thumbnailUrl} alt="..." size="sm" />
```

### 4. Maneja errores

```tsx
<LazyImage
  src={imageUrl}
  alt="Producto"
  onError={() => {
    // Log error, mostrar toast, etc.
    console.error('Failed to load image:', imageUrl);
  }}
  fallbackSrc="/default-product.jpg"
/>
```

## Testing

```tsx
import { render, screen } from '@testing-library/react';
import { LazyImage } from '@/components/ui/LazyImage';

test('renders LazyImage with correct alt text', () => {
  render(
    <LazyImage
      src="https://example.com/image.jpg"
      alt="Test image"
    />
  );

  const image = screen.getByAltText('Test image');
  expect(image).toBeInTheDocument();
});

test('shows loading state initially', () => {
  render(
    <LazyImage
      src="https://example.com/image.jpg"
      alt="Test image"
    />
  );

  // Buscar el spinner de carga
  const spinner = screen.getByRole('img', { name: /test image/i });
  expect(spinner).toHaveClass('opacity-50');
});
```

## Migración desde `<img>` regular

```tsx
// Antes
<img
  src={imageUrl}
  alt="Mi imagen"
  className="w-full h-auto"
/>

// Después
<LazyImage
  src={imageUrl}
  alt="Mi imagen"
  className="w-full h-auto"
/>
```

Es un drop-in replacement con beneficios adicionales.

## Troubleshooting

### La imagen no se carga

1. Verifica que la URL sea correcta
2. Verifica CORS headers del CDN
3. Revisa la consola para errores de red

### El placeholder no se muestra

1. Verifica que `placeholderSrc` sea un data URI o URL válida
2. Usa SVG inline para placeholders instantáneos

### El blur no funciona

1. Verifica que Tailwind CSS esté configurado
2. Asegúrate de tener las clases `blur-sm`, `blur-0` disponibles

## Referencias

- [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- [Native Lazy Loading](https://web.dev/browser-level-image-lazy-loading/)
- [Image Optimization Best Practices](https://web.dev/fast/#optimize-your-images)
