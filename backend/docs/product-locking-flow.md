# Flujo de Optimistic Locking - Diagramas

## Diagrama 1: Flujo de Checkout con Optimistic Locking

```mermaid
sequenceDiagram
    participant U1 as Usuario A
    participant U2 as Usuario B
    participant API as API Routes
    participant SVC as MarketplaceService
    participant LOCK as updateProductWithLocking
    participant DB as PostgreSQL

    Note over U1,U2: Ambos usuarios tienen el producto en su carrito<br/>Stock actual: 1 unidad

    U1->>API: POST /checkout (Thread A)
    U2->>API: POST /checkout (Thread B)

    par Ejecución paralela
        API->>SVC: createOrder(user1, data)
        activate SVC
        SVC->>DB: BEGIN TRANSACTION
        SVC->>DB: SELECT * FROM Product WHERE id = 'prod-123'
        DB-->>SVC: { id, version: 5, stock: 1 }

        Note over SVC: Validar stock >= 1 ✓

        SVC->>DB: INSERT INTO Order (status: PENDING_PAYMENT)
        SVC->>LOCK: updateProductWithLocking(prod-123, version: 5)
        activate LOCK
        LOCK->>DB: UPDATE Product SET stock=0, version=6<br/>WHERE id='prod-123' AND version=5
        DB-->>LOCK: count: 1 (éxito)
        LOCK-->>SVC: Product actualizado
        deactivate LOCK

        SVC->>DB: COMMIT TRANSACTION
        SVC-->>API: Orders creados
        API-->>U1: 201 Created ✓
        deactivate SVC
    and
        API->>SVC: createOrder(user2, data)
        activate SVC
        SVC->>DB: BEGIN TRANSACTION
        SVC->>DB: SELECT * FROM Product WHERE id = 'prod-123'
        DB-->>SVC: { id, version: 5, stock: 1 } (dato stale)

        Note over SVC: Validar stock >= 1 ✓ (stale)

        SVC->>DB: INSERT INTO Order (status: PENDING_PAYMENT)
        SVC->>LOCK: updateProductWithLocking(prod-123, version: 5)
        activate LOCK
        LOCK->>DB: UPDATE Product SET stock=-1, version=6<br/>WHERE id='prod-123' AND version=5
        DB-->>LOCK: count: 0 (version ya no existe)
        LOCK-->>SVC: ConcurrencyError ⚠️
        deactivate LOCK

        Note over SVC: withRetry captura el error
        SVC->>SVC: Esperar 100ms (retry 1/3)
        SVC->>DB: ROLLBACK TRANSACTION

        SVC->>DB: BEGIN TRANSACTION (retry)
        SVC->>DB: SELECT * FROM Product WHERE id = 'prod-123'
        DB-->>SVC: { id, version: 6, stock: 0 } (actualizado)

        Note over SVC: Validar stock >= 1 ✗
        SVC-->>API: AppError("Stock insuficiente")
        SVC->>DB: ROLLBACK TRANSACTION
        API-->>U2: 400 Bad Request ✗
        deactivate SVC
    end

    Note over DB: Estado final:<br/>Product { version: 6, stock: 0 }<br/>1 orden creada
```

## Diagrama 2: Comparación ANTES vs DESPUÉS

### ANTES (Sin Optimistic Locking)

```mermaid
graph TD
    A[Thread A: Leer stock=1] --> B[Thread A: Validar stock ✓]
    C[Thread B: Leer stock=1] --> D[Thread B: Validar stock ✓]

    B --> E[Thread A: UPDATE stock=0]
    D --> F[Thread B: UPDATE stock=-1]

    E --> G[Stock final: -1]
    F --> G

    G --> H[❌ OVERSELLING]

    style H fill:#f66,stroke:#333,stroke-width:4px
```

### DESPUÉS (Con Optimistic Locking)

```mermaid
graph TD
    A[Thread A: Leer v5, stock=1] --> B[Thread A: Validar stock ✓]
    C[Thread B: Leer v5, stock=1] --> D[Thread B: Validar stock ✓]

    B --> E[Thread A: UPDATE WHERE v=5]
    D --> F[Thread B: UPDATE WHERE v=5]

    E --> G[Thread A: count=1 ✓<br/>stock=0, version=6]
    F --> H[Thread B: count=0 ✗<br/>ConcurrencyError]

    H --> I[Retry: Leer v6, stock=0]
    I --> J[Validar stock ✗]
    J --> K[AppError: Stock insuficiente]

    G --> L[Stock final: 0]
    K --> L

    L --> M[✅ SIN OVERSELLING]

    style M fill:#6f6,stroke:#333,stroke-width:4px
```

## Diagrama 3: Reintentos con Backoff Exponencial

```mermaid
sequenceDiagram
    participant Client
    participant withRetry
    participant Operation
    participant DB

    Client->>withRetry: Ejecutar operación

    loop Hasta 3 intentos
        withRetry->>Operation: Intento N
        Operation->>DB: UPDATE con versión

        alt Éxito
            DB-->>Operation: count: 1
            Operation-->>withRetry: Resultado
            withRetry-->>Client: ✓ Éxito
        else Conflicto
            DB-->>Operation: count: 0
            Operation-->>withRetry: ConcurrencyError

            alt No es último intento
                Note over withRetry: Esperar delay * 2^(N-1)
                withRetry->>withRetry: sleep(100ms * 2^N)
            else Último intento
                withRetry-->>Client: ✗ ConcurrencyError final
            end
        end
    end
```

## Diagrama 4: Arquitectura de Capas

```mermaid
graph TB
    subgraph "Frontend"
        UI[Componente Checkout]
    end

    subgraph "API Layer"
        ROUTE[marketplace.ts<br/>• Autenticación<br/>• Manejo 409]
    end

    subgraph "Service Layer"
        SVC[MarketplaceService<br/>• Lógica de negocio<br/>• Validaciones]
    end

    subgraph "Locking Layer"
        RETRY[withRetry<br/>• Reintentos automáticos<br/>• Backoff exponencial]
        UPDATE[updateProductWithLocking<br/>• Verificación de versión<br/>• Actualización atómica]
    end

    subgraph "Data Layer"
        TX[Prisma Transaction<br/>• Atomicidad<br/>• Rollback]
        DB[(PostgreSQL<br/>Product.version)]
    end

    UI -->|POST /checkout| ROUTE
    ROUTE -->|createOrder()| SVC
    SVC -->|Wrapped in| RETRY
    RETRY -->|Calls| UPDATE
    UPDATE -->|Uses| TX
    TX -->|SQL| DB

    DB -.->|ConcurrencyError| UPDATE
    UPDATE -.->|Retry| RETRY
    RETRY -.->|Success/Fail| SVC
    SVC -.->|201/409/400| ROUTE
    ROUTE -.->|Response| UI

    style DB fill:#e1f5ff,stroke:#007acc
    style UPDATE fill:#fff3cd,stroke:#ffc107
    style RETRY fill:#d4edda,stroke:#28a745
```

## Diagrama 5: Estado de Producto Durante Checkouts Concurrentes

```mermaid
stateDiagram-v2
    [*] --> Initial: Product<br/>version: 5<br/>stock: 1

    Initial --> A_Reading: Thread A lee
    Initial --> B_Reading: Thread B lee

    A_Reading --> A_Updating: Thread A actualiza<br/>WHERE version=5
    B_Reading --> B_Waiting: Thread B espera

    A_Updating --> Updated: Product<br/>version: 6<br/>stock: 0

    Updated --> B_Retry: Thread B reintenta<br/>lee version=6, stock=0

    B_Retry --> B_Failed: Validación falla<br/>stock < quantity

    B_Failed --> [*]: Stock insuficiente<br/>1 orden creada
    Updated --> [*]: Checkout A exitoso

    note right of Updated
        Versión incrementada
        Stock decrementado
        Solo 1 actualización exitosa
    end note
```

## Diagrama 6: Cleanup de Órdenes Fallidas

```mermaid
flowchart TD
    START[Cron Job cada 30 min] --> QUERY[Buscar órdenes<br/>status: PAYMENT_FAILED<br/>createdAt < 30 min]

    QUERY --> CHECK{¿Órdenes<br/>encontradas?}

    CHECK -->|No| END[Fin]
    CHECK -->|Sí| GROUP[Agrupar items<br/>por productId]

    GROUP --> TX[Iniciar transacción<br/>con withRetry]

    TX --> LOOP{Para cada<br/>producto}

    LOOP --> READ[Leer product.version]
    READ --> UPDATE[updateProductWithLocking<br/>stock += quantity<br/>version++]

    UPDATE -->|Éxito| NEXT{¿Más<br/>productos?}
    UPDATE -->|ConcurrencyError| RETRY[Retry con backoff]
    RETRY --> READ

    NEXT -->|Sí| LOOP
    NEXT -->|No| CANCEL[Marcar órdenes<br/>como CANCELLED]

    CANCEL --> COMMIT[COMMIT transaction]
    COMMIT --> LOG[Log resultados<br/>cleaned: N órdenes]
    LOG --> END

    style UPDATE fill:#fff3cd
    style RETRY fill:#f8d7da
    style COMMIT fill:#d4edda
```

## Diagrama 7: Flujo de Decisión en updateProductWithLocking

```mermaid
flowchart TD
    START([updateProductWithLocking]) --> INPUT[Input:<br/>productId<br/>currentVersion<br/>data]

    INPUT --> UPDATE[Ejecutar updateMany<br/>WHERE id AND version=current]

    UPDATE --> RESULT{result.count}

    RESULT -->|count = 0| THROW[❌ Lanza ConcurrencyError<br/>'Producto modificado por<br/>otro usuario']

    RESULT -->|count = 1| FETCH[Fetch producto actualizado<br/>con nueva versión]

    FETCH --> RETURN[✅ Retorna producto]

    THROW --> CATCH[Capturado por withRetry]
    RETURN --> SUCCESS([Fin exitoso])
    CATCH --> DECIDE{¿Más<br/>reintentos?}

    DECIDE -->|Sí| WAIT[Esperar delay<br/>exponencial]
    DECIDE -->|No| FAIL([Fin con error])

    WAIT --> START

    style THROW fill:#f8d7da
    style RETURN fill:#d4edda
    style CATCH fill:#fff3cd
```

## Notas de Implementación

### Claves del Éxito:

1. **updateMany con WHERE version:** Es la clave del optimistic locking
2. **withRetry:** Maneja conflictos transitorios automáticamente
3. **Transacciones:** Garantizan atomicidad de todo el checkout
4. **Backoff exponencial:** Evita thundering herd problem

### Ventajas sobre Pessimistic Locking:

- ✅ No requiere locks explícitos en la BD
- ✅ Mejor performance en baja contención
- ✅ Más simple de implementar
- ✅ No hay deadlocks
- ✅ Compatible con réplicas de BD

### Desventajas:

- ⚠️ Puede requerir múltiples intentos en alta contención
- ⚠️ Agrega complejidad en la capa de servicio
- ⚠️ Requiere manejo de ConcurrencyError en frontend

---

**Visualizaciones generadas:** 2025-01-25
**Herramienta:** Mermaid.js
**Para renderizar:** GitHub, GitLab, o https://mermaid.live
