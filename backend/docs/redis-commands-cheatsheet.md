# Redis Commands Cheat Sheet

Guía rápida de comandos útiles de Redis para desarrollo y debugging.

## 🔌 Conexión

```bash
# Conectar a Redis local
redis-cli

# Conectar a servidor remoto
redis-cli -h hostname -p 6379 -a password

# Conectar con URL
redis-cli -u redis://user:password@hostname:6379

# Probar conexión
redis-cli ping
# Respuesta: PONG
```

## 🔑 Operaciones básicas con claves

### Ver claves

```bash
# Todas las claves
KEYS *

# Claves con patrón específico
KEYS guelaguetza:*
KEYS guelaguetza:user:*
KEYS guelaguetza:experience:*:detail

# Contar claves
DBSIZE

# Obtener clave aleatoria
RANDOMKEY
```

### Obtener valores

```bash
# Obtener valor
GET guelaguetza:badges:all

# Obtener múltiples valores
MGET key1 key2 key3

# Obtener tipo de clave
TYPE guelaguetza:badges:all
# Respuesta: string | list | set | zset | hash
```

### Verificar existencia

```bash
# Verificar si existe
EXISTS guelaguetza:user:123:badges
# Respuesta: 1 (existe) | 0 (no existe)

# Verificar múltiples claves
EXISTS key1 key2 key3
# Respuesta: número de claves que existen
```

### TTL (Time To Live)

```bash
# Ver TTL en segundos
TTL guelaguetza:badges:all
# Respuesta: segundos restantes | -1 (sin TTL) | -2 (no existe)

# Ver TTL en milisegundos
PTTL guelaguetza:badges:all

# Establecer TTL a clave existente
EXPIRE guelaguetza:badges:all 3600

# Remover TTL (hacer persistente)
PERSIST guelaguetza:badges:all

# Ver cuando expira (timestamp Unix)
EXPIRETIME guelaguetza:badges:all
```

### Eliminar claves

```bash
# Eliminar una clave
DEL guelaguetza:badges:all

# Eliminar múltiples claves
DEL key1 key2 key3

# Eliminar con patrón (ojo: puede ser lento)
redis-cli KEYS "guelaguetza:user:*" | xargs redis-cli DEL

# Eliminar todo (⚠️ CUIDADO)
FLUSHDB     # DB actual
FLUSHALL    # Todas las DBs
```

### Renombrar claves

```bash
# Renombrar clave
RENAME old_key new_key

# Renombrar solo si no existe
RENAMENX old_key new_key
```

## 📊 Información y estadísticas

### Info del servidor

```bash
# Información general
INFO

# Secciones específicas
INFO server
INFO memory
INFO stats
INFO replication
INFO cpu
INFO persistence

# Estadísticas de clientes
CLIENT LIST
CLIENT INFO
```

### Memoria

```bash
# Uso de memoria
INFO memory

# Memoria de una clave específica
MEMORY USAGE guelaguetza:badges:all

# Estadísticas de memoria
MEMORY STATS

# Forzar garbage collection
MEMORY PURGE
```

### Estadísticas

```bash
# Comandos ejecutados
INFO stats

# Ver comandos más usados
INFO commandstats

# Latencia
LATENCY DOCTOR
LATENCY GRAPH
```

## 🔍 Debugging y monitoreo

### Monitor en tiempo real

```bash
# Ver todos los comandos en tiempo real
MONITOR

# Filtrar por patrón (en otra terminal)
redis-cli MONITOR | grep "user:123"
```

### Slowlog

```bash
# Ver comandos lentos
SLOWLOG GET 10

# Longitud del slowlog
SLOWLOG LEN

# Limpiar slowlog
SLOWLOG RESET
```

### Debugging

```bash
# Ver valor en formato legible
GET guelaguetza:badges:all | jq .

# Ver claves con tamaño
redis-cli --bigkeys

# Escanear por patrón (más eficiente que KEYS)
SCAN 0 MATCH guelaguetza:user:* COUNT 100
```

## 🔧 Configuración

### Ver configuración

```bash
# Toda la configuración
CONFIG GET *

# Parámetro específico
CONFIG GET maxmemory
CONFIG GET maxmemory-policy
CONFIG GET save
```

### Modificar configuración

```bash
# Cambiar configuración en runtime
CONFIG SET maxmemory 100mb
CONFIG SET maxmemory-policy allkeys-lru

# Hacer persistente (guardar en redis.conf)
CONFIG REWRITE
```

### Políticas de eviction

```bash
# Ver política actual
CONFIG GET maxmemory-policy

# Políticas disponibles:
# - noeviction: retornar error cuando memoria llena
# - allkeys-lru: eliminar claves menos usadas (LRU)
# - volatile-lru: LRU solo en claves con TTL
# - allkeys-random: eliminar claves aleatorias
# - volatile-random: aleatorio solo con TTL
# - volatile-ttl: eliminar claves con menor TTL

# Establecer política
CONFIG SET maxmemory-policy allkeys-lru
```

## 💾 Persistencia

### RDB (snapshot)

```bash
# Guardar snapshot ahora
SAVE      # Bloqueante
BGSAVE    # Background (no bloqueante)

# Ver último save
LASTSAVE

# Configurar auto-save
CONFIG SET save "900 1 300 10 60 10000"
# 900s si 1+ cambios, 300s si 10+ cambios, 60s si 10000+ cambios
```

### AOF (append-only file)

```bash
# Verificar si AOF está habilitado
CONFIG GET appendonly

# Habilitar AOF
CONFIG SET appendonly yes

# Reescribir AOF (compactar)
BGREWRITEAOF
```

## 🧹 Mantenimiento

### Limpieza

```bash
# Limpiar claves expiradas
KEYS guelaguetza:* | while read key; do
  TTL=$(redis-cli TTL "$key")
  if [ "$TTL" -eq -2 ]; then
    echo "Deleting expired key: $key"
    redis-cli DEL "$key"
  fi
done

# Optimizar memoria
MEMORY PURGE

# Defragmentar
MEMORY DEFRAG
```

### Benchmark

```bash
# Test de performance
redis-benchmark -q -n 100000

# Test específico
redis-benchmark -t set,get -n 100000 -q

# Con pipeline
redis-benchmark -t set,get -n 100000 -q -P 16
```

## 📈 Análisis de uso

### Ver claves más grandes

```bash
redis-cli --bigkeys

# Con más detalle
redis-cli --bigkeys --bigkeys-report
```

### Escanear base de datos

```bash
# Escanear por patrón (no bloqueante)
redis-cli --scan --pattern 'guelaguetza:user:*'

# Contar por patrón
redis-cli --scan --pattern 'guelaguetza:user:*' | wc -l

# Exportar claves
redis-cli --scan --pattern 'guelaguetza:*' > keys.txt
```

### Análisis de memoria por tipo

```bash
# Script para analizar memoria
redis-cli --scan --pattern 'guelaguetza:*' | while read key; do
  type=$(redis-cli TYPE "$key")
  size=$(redis-cli MEMORY USAGE "$key")
  echo "$type,$key,$size"
done | sort -t, -k3 -n -r | head -20
```

## 🔐 Seguridad

### Autenticación

```bash
# Establecer password
CONFIG SET requirepass your_password

# Autenticarse
AUTH your_password

# Remover password
CONFIG SET requirepass ""
```

### ACL (Access Control Lists)

```bash
# Ver usuarios
ACL LIST

# Ver usuario actual
ACL WHOAMI

# Crear usuario
ACL SETUSER alice on >password ~guelaguetza:* +get +set

# Eliminar usuario
ACL DELUSER alice
```

## 🚀 Comandos útiles para desarrollo

### Verificar cache de Guelaguetza

```bash
# Ver todas las claves del proyecto
redis-cli KEYS "guelaguetza:*"

# Ver badges cacheados
redis-cli GET "guelaguetza:badges:all" | jq .

# Ver leaderboard
redis-cli KEYS "guelaguetza:leaderboard:*"

# Ver datos de un usuario específico
redis-cli KEYS "guelaguetza:user:cuid123*"

# Ver TTL de todas las claves de un usuario
redis-cli KEYS "guelaguetza:user:cuid123*" | while read key; do
  ttl=$(redis-cli TTL "$key")
  echo "$key -> $ttl seconds"
done
```

### Invalidar cache manualmente

```bash
# Invalidar badges de un usuario
redis-cli DEL "guelaguetza:user:cuid123:badges"

# Invalidar todo el leaderboard
redis-cli KEYS "guelaguetza:leaderboard:*" | xargs redis-cli DEL

# Invalidar experiencia específica
redis-cli KEYS "guelaguetza:experience:exp123*" | xargs redis-cli DEL

# Invalidar TODO el cache (development only)
redis-cli FLUSHDB
```

### Debugging de TTL

```bash
# Ver cuándo expiran las claves
redis-cli KEYS "guelaguetza:*" | while read key; do
  ttl=$(redis-cli TTL "$key")
  if [ "$ttl" -gt 0 ]; then
    echo "$key expires in $ttl seconds"
  elif [ "$ttl" -eq -1 ]; then
    echo "$key never expires"
  fi
done | sort -t' ' -k4 -n
```

## 🎯 Comandos por caso de uso

### Al desarrollar nuevas features

```bash
# Ver qué se está cacheando
MONITOR | grep SET

# Ver hit/miss rate
INFO stats | grep keyspace

# Limpiar cache para probar
FLUSHDB
```

### Al debuggear problemas

```bash
# Ver si una clave existe
EXISTS guelaguetza:user:123:badges

# Ver contenido
GET guelaguetza:user:123:badges

# Ver cuándo expira
TTL guelaguetza:user:123:badges

# Ver memoria usada
MEMORY USAGE guelaguetza:user:123:badges
```

### Al optimizar performance

```bash
# Ver comandos lentos
SLOWLOG GET 10

# Ver uso de memoria
INFO memory

# Ver hit rate
INFO stats | grep keyspace_hits

# Benchmark
redis-benchmark -t get,set -n 100000
```

### Antes de deployar

```bash
# Verificar persistencia
CONFIG GET save
CONFIG GET appendonly

# Verificar memoria
CONFIG GET maxmemory
CONFIG GET maxmemory-policy

# Backup
BGSAVE

# Test de carga
redis-benchmark -q -n 100000
```

## 📱 Aliases útiles

Agregar a `.bashrc` o `.zshrc`:

```bash
# Conectar a Redis local
alias redis='redis-cli'

# Ver todas las claves del proyecto
alias redis-keys='redis-cli KEYS "guelaguetza:*"'

# Limpiar cache del proyecto
alias redis-flush='redis-cli KEYS "guelaguetza:*" | xargs redis-cli DEL'

# Ver stats
alias redis-stats='redis-cli INFO stats'

# Monitorear en tiempo real
alias redis-mon='redis-cli MONITOR'
```

## 🆘 Troubleshooting

### Redis no responde

```bash
# Verificar si está corriendo
redis-cli ping

# Ver logs (macOS)
tail -f /usr/local/var/log/redis.log

# Ver logs (Linux)
tail -f /var/log/redis/redis-server.log

# Reiniciar
brew services restart redis  # macOS
sudo systemctl restart redis # Linux
```

### Memoria llena

```bash
# Ver uso de memoria
INFO memory

# Ver claves grandes
redis-cli --bigkeys

# Limpiar cache
FLUSHDB

# Aumentar límite
CONFIG SET maxmemory 200mb
```

### Performance lento

```bash
# Ver comandos lentos
SLOWLOG GET 10

# Ver latencia
redis-cli --latency

# Optimizar
MEMORY PURGE
CONFIG SET maxmemory-policy allkeys-lru
```

---

## 📚 Referencias

- [Redis Commands](https://redis.io/commands/)
- [Redis CLI](https://redis.io/topics/rediscli)
- [Redis Admin](https://redis.io/topics/admin)
