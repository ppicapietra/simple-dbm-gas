# Mejoras de Concurrencia en DBM Library

## Problema Identificado

El `LockService.getScriptLock()` en Google Apps Script **NO es suficiente** para evitar problemas de concurrencia en operaciones de eliminación y actualización. El problema específico es:

### Escenario Problemático
1. **Script A** obtiene el número de fila (ej: fila 5) basándose en datos leídos
2. **Script B** elimina la fila 3, haciendo que todas las filas se muevan hacia arriba
3. **Script A** intenta eliminar la fila 5, pero ahora esa fila contiene datos diferentes

### Por qué LockService no es suficiente
- `LockService` solo previene que múltiples ejecuciones del mismo script se ejecuten simultáneamente
- **NO resuelve** las condiciones de carrera donde los números de fila cambian entre la identificación y la ejecución
- El lock se obtiene **después** de leer los datos, permitiendo que otros scripts modifiquen la hoja en ese intervalo

## Solución Implementada

### 1. Validación de Filas con Hash
Se implementó un sistema de validación que:
- Calcula un hash único para cada fila identificada
- Antes de ejecutar la operación, re-verifica que la fila actual coincida con la identificada originalmente
- Solo ejecuta la operación en filas que pasan la validación

### 2. Reordenamiento del Lock
- **ANTES**: Leer datos → Obtener lock → Ejecutar operación
- **DESPUÉS**: Obtener lock → Leer datos → Validar filas → Ejecutar operación

### 3. Manejo de Errores Mejorado
- Logs de advertencia cuando las filas han cambiado
- Continuación de la operación con las filas válidas restantes
- Manejo graceful de filas que ya no existen

## Cambios Específicos

### Método `delete()`
```javascript
// ANTES: Problema de condición de carrera
const rowsToDelete = data.map((row, index) => {
    // ... identificar filas
    return matches ? index + 2 : null;
});

// DESPUÉS: Validación con hash
const rowsToDeleteWithData = data.map((row, index) => {
    // ... identificar filas
    return matches ? { 
        index: index + 2,
        data: row,
        hash: Dbm.calculateRowHash(fieldNames, row)
    } : null;
});

// Validación antes de eliminar
for (const rowInfo of rowsToDeleteWithData) {
    const currentRowData = sheet.getRange(rowInfo.index, 1, 1, fieldNames.length).getDisplayValues()[0];
    const currentRowHash = Dbm.calculateRowHash(fieldNames, currentRowData);
    
    if (currentRowHash === rowInfo.hash) {
        validatedRowsToDelete.push(rowInfo.index);
    } else {
        logger(`Row ${rowInfo.index} has changed since identification, skipping deletion`, 'warning');
    }
}
```

### Método `update()`
Implementa la misma lógica de validación para operaciones de actualización.

## Beneficios

1. **Seguridad**: Evita modificar filas incorrectas
2. **Robustez**: Maneja cambios concurrentes de manera graceful
3. **Transparencia**: Logs informativos sobre filas omitidas
4. **Consistencia**: Mantiene la integridad de los datos

## Consideraciones de Rendimiento

- **Overhead mínimo**: La validación de hash es muy rápida
- **Operaciones adicionales**: Una lectura adicional por fila a validar
- **Beneficio neto**: Mayor que el costo, especialmente en entornos concurrentes

## Uso Recomendado

Para máxima seguridad en entornos de alta concurrencia:

```javascript
// Usar con filtros específicos para minimizar filas a procesar
dbm.where('status', '=', 'pending')
   .where('user_id', '=', userId)
   .delete(true);

// El sistema automáticamente validará cada fila antes de eliminarla
```

## Monitoreo

Revisar los logs para identificar patrones de concurrencia:
- `Row X has changed since identification, skipping deletion`
- `Row X no longer exists or is inaccessible, skipping deletion`

Estos mensajes indican actividad concurrente y ayudan a optimizar la estrategia de filtrado. 