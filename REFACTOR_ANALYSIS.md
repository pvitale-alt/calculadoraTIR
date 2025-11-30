# Análisis de Refactorización - Calculadora TIR

## Archivos Analizados

### 1. `calculadoraStorage.js` (~915 líneas, 14 funciones)
**Responsabilidades actuales:**
- Guardar/cargar calculadoras desde BD
- Actualizar CER de valuación
- Actualizar coeficientes CER
- Refrescar tabla de cupones
- Gestión de modales

**Problema:** Mezcla múltiples responsabilidades (persistencia, cálculos CER, UI)

**Refactorización sugerida:**
- **Mantener en `calculadoraStorage.js`:** Solo funciones de guardar/cargar calculadoras y modales
- **Crear `calculadoraCER.js`:** Mover funciones relacionadas con CER:
  - `obtenerCERParaFecha()`
  - `actualizarCERValuacion()`
  - `actualizarCoeficientesCER()`
  - `actualizarVisibilidadCoeficientesCER()`
  - `refrescarTablaCupones()` (o mover a `core.js`)

### 2. `core.js` (~720 líneas, 16 funciones)
**Responsabilidades actuales:**
- Renderizado de tabla de cupones
- Agregar/eliminar cupones
- Actualizar cupones
- Recalcular dependencias (intervalos, CER, dayCountFactor)
- Gestión de estado de cupones

**Problema:** Mezcla renderizado con lógica de cálculo

**Refactorización sugerida:**
- **Mantener en `core.js`:** Solo renderizado y gestión básica de estado
- **Crear `cupones/recalculos.js`:** Mover funciones de recálculo:
  - `recalcularDependencias()`
  - `recalcularInicioIntervalo()`
  - `recalcularFinalIntervalo()`
  - `recalcularValorCERInicio()`
  - `recalcularValorCERFinal()`
  - `recalcularDayCountFactor()`

### 3. `autocompletado.js` (~516 líneas, 4 funciones)
**Estado:** Bien estructurado, funciones claras y enfocadas
**Acción:** No requiere refactorización mayor

## Archivos Pequeños a Revisar

### `calculadora/cupones/calculos.js`, `fechas.js`, `validaciones.js`
**Revisar:** Verificar si están siendo utilizados o si su funcionalidad fue movida a otros archivos

## Plan de Refactorización Recomendado

### Fase 1: Separar lógica CER
1. Crear `calculadoraCER.js` en `public/js/calculadora/`
2. Mover funciones relacionadas con CER desde `calculadoraStorage.js`
3. Actualizar imports/referencias

### Fase 2: Separar recálculos de cupones
1. Crear `calculadora/cupones/recalculos.js`
2. Mover funciones de recálculo desde `core.js`
3. Mantener `core.js` enfocado en renderizado

### Fase 3: Limpieza
1. Revisar archivos no utilizados (`calculos.js`, `fechas.js`, `validaciones.js`)
2. Eliminar código duplicado
3. Actualizar documentación

## Beneficios Esperados

1. **Mejor mantenibilidad:** Cada archivo tiene una responsabilidad clara
2. **Facilidad de testing:** Funciones más pequeñas y enfocadas
3. **Reutilización:** Funciones de CER pueden ser usadas en otros contextos
4. **Legibilidad:** Archivos más pequeños y fáciles de entender

## Notas

- Los archivos actuales funcionan correctamente
- La refactorización es opcional pero recomendada para escalabilidad
- Se puede hacer de forma incremental sin romper funcionalidad existente







