// JavaScript para la página Feriados

// Crear fecha desde string YYYY-MM-DD sin problemas de zona horaria
function crearFechaDesdeString(fechaString) {
    if (!fechaString) return null;
    if (typeof fechaString === 'string' && /^\d{4}-\d{2}-\d{2}/.test(fechaString)) {
        const partes = fechaString.split('T')[0].split('-');
        const year = parseInt(partes[0], 10);
        const month = parseInt(partes[1], 10) - 1;
        const day = parseInt(partes[2], 10);
        return new Date(year, month, day);
    }
    return new Date(fechaString);
}

// Formatear fecha para mostrar (sin problemas de zona horaria - Argentina)
function formatearFechaMostrar(fechaString) {
    if (!fechaString) return '';
    
    // Si viene en formato YYYY-MM-DD, parsear directamente sin crear Date
    if (typeof fechaString === 'string' && /^\d{4}-\d{2}-\d{2}/.test(fechaString)) {
        const partes = fechaString.split('T')[0].split('-');
        const year = partes[0];
        const month = partes[1];
        const day = partes[2];
        return `${day}-${month}-${year}`;
    }
    
    // Si viene en otro formato, crear fecha local (Argentina)
    const fecha = crearFechaDesdeString(fechaString);
    if (!fecha || isNaN(fecha.getTime())) return '';
    
    const day = String(fecha.getDate()).padStart(2, '0');
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const year = fecha.getFullYear();
    return `${day}-${month}-${year}`;
}

// Formatear fecha para input (YYYY-MM-DD) sin problemas de zona horaria
function formatearFechaInput(fecha) {
    if (!fecha) return '';
    if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return fecha;
    }
    const d = crearFechaDesdeString(fecha);
    if (!d || isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Calcular rangos de fechas faltantes para feriados (OPTIMIZADO - no recorre día por día)
function calcularRangosFaltantesFeriados(fechaDesde, fechaHasta, fechasExistentes) {
    const rangos = [];
    
    // Parsear fechas sin problemas de zona horaria
    const desde = crearFechaDesdeString(fechaDesde);
    const hasta = crearFechaDesdeString(fechaHasta);
    
    if (!desde || !hasta || desde > hasta) {
        return [];
    }
    
    // Calcular rangos por año (la API de feriados requiere particionar por año)
    const añoInicio = desde.getFullYear();
    const añoFin = hasta.getFullYear();
    
    for (let año = añoInicio; año <= añoFin; año++) {
        const inicioAño = año === añoInicio ? desde : new Date(año, 0, 1);
        const finAño = año === añoFin ? hasta : new Date(año, 11, 31);
        
        // Verificación rápida: verificar solo algunas fechas clave del año
        // (inicio, medio del año, fin) en lugar de recorrer día por día
        const inicioStr = formatearFechaInput(inicioAño);
        const finStr = formatearFechaInput(finAño);
        const medioAño = new Date(año, 5, 15); // 15 de junio
        const medioStr = formatearFechaInput(medioAño);
        
        // Si alguna de las fechas clave no existe, agregar el año
        if (!fechasExistentes.has(inicioStr) || 
            !fechasExistentes.has(finStr) || 
            !fechasExistentes.has(medioStr)) {
            rangos.push({ año: año });
        }
    }
    
    return rangos;
}

// Funciones de conversión y validación están en dateUtils.js
// Wrappers para mantener compatibilidad con formato Feriados (guiones)
function convertirFechaYYYYMMDDaDDMMAAAA_FERIADOS(fechaYYYYMMDD) {
    return convertirFechaYYYYMMDDaDDMMAAAA(fechaYYYYMMDD, '-');
}

// Usar función compartida con guiones para máscara
function aplicarMascaraFechaFERIADOS(input) {
    // Llamar directamente a la función de formUtils.js
    if (typeof aplicarMascaraFecha === 'function') {
        aplicarMascaraFecha(input, '-');
    }
}

// Cargar datos de Feriados desde la API
async function cargarFeriados() {
    try {
        const fechaDesdeDDMMAAAA = document.getElementById('fechaDesdeFeriados')?.value;
        const fechaHastaDDMMAAAA = document.getElementById('fechaHastaFeriados')?.value;
        const btnCargar = document.getElementById('btnCargarFeriados');
        
        if (!fechaDesdeDDMMAAAA || !fechaHastaDDMMAAAA) {
            showError('Por favor seleccione un rango de fechas');
            return;
        }
        
        // Validar formato
        if (!validarFechaDDMMAAAA(fechaDesdeDDMMAAAA) || !validarFechaDDMMAAAA(fechaHastaDDMMAAAA)) {
            showError('Formato de fecha inválido. Use DD-MM-AAAA');
            return;
        }
        
        // Convertir DD/MM/AAAA a YYYY-MM-DD para la API
        const fechaDesde = convertirFechaDDMMAAAAaYYYYMMDD(fechaDesdeDDMMAAAA);
        const fechaHasta = convertirFechaDDMMAAAAaYYYYMMDD(fechaHastaDDMMAAAA);
        
        const desdeDate = crearFechaDesdeString(fechaDesde);
        const hastaDate = crearFechaDesdeString(fechaHasta);
        
        if (!desdeDate || !hastaDate || desdeDate > hastaDate) {
            showError('La fecha "Desde" debe ser anterior a la fecha "Hasta"');
            return;
        }
        
        // Mostrar indicador de carga
        const textoOriginal = btnCargar.innerHTML;
        btnCargar.disabled = true;
        btnCargar.innerHTML = '<span>Cargando...</span>';
        
        // NO ocultar la tabla - mantenerla visible
        const tableContainer = document.getElementById('feriadosTableContainer');
        const emptyState = document.getElementById('feriadosEmptyState');
        const tbody = document.getElementById('feriadosTableBody');
        const tieneDatosEnTabla = tbody && tbody.querySelectorAll('tr').length > 0;
        
        try {
            // Llamado directo a la API (sin verificar fechas existentes)
            btnCargar.innerHTML = '<span>Cargando desde API...</span>';
            
            // Calcular años del rango
            const desdeDate = crearFechaDesdeString(fechaDesde);
            const hastaDate = crearFechaDesdeString(fechaHasta);
            const añoInicio = desdeDate.getFullYear();
            const añoFin = hastaDate.getFullYear();
            
            // Consultar API para cada año en paralelo
            const promesas = [];
            for (let año = añoInicio; año <= añoFin; año++) {
                promesas.push(
                    fetch(`/api/feriados/${año}`)
                        .then(res => res.json())
                        .then(result => result.success && result.datos ? result.datos : [])
                        .catch(error => {
                            console.error(`Error al cargar año ${año}:`, error);
                            return [];
                        })
                );
            }
            
            btnCargar.innerHTML = `<span>Cargando ${añoFin - añoInicio + 1} año(s)...</span>`;
            
            const resultados = await Promise.all(promesas);
            const todosLosDatos = resultados.flat();
            
            // Filtrar solo los datos dentro del rango
            const datosEnRango = todosLosDatos.filter(item => {
                const fechaItem = crearFechaDesdeString(item.fecha);
                return fechaItem >= desdeDate && fechaItem <= hastaDate;
            });
            
            if (datosEnRango.length === 0) {
                showError('No se pudieron obtener datos de la API');
                btnCargar.disabled = false;
                btnCargar.innerHTML = textoOriginal;
                return;
            }
            
            // Guardar todos los datos (sobreescribir si existen)
            btnCargar.innerHTML = '<span>Guardando en BD...</span>';
            
            const responseGuardar = await fetch('/api/feriados/guardar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ datos: datosEnRango })
            });
            
            const resultGuardar = await responseGuardar.json();
            if (resultGuardar.success) {
                // Cargar datos desde BD para mostrar en tabla
                btnCargar.innerHTML = '<span>Cargando tabla...</span>';
                const responseBD = await fetch(`/api/feriados/bd?desde=${fechaDesde}&hasta=${fechaHasta}`);
                const resultBD = await responseBD.json();
                
                if (resultBD.success && resultBD.datos && resultBD.datos.length > 0) {
                    generarTablaFeriados(resultBD.datos, false);
                    tableContainer.style.display = 'block';
                    emptyState.style.display = 'none';
                    showSuccess(`Se guardaron ${resultGuardar.actualizados} feriados`);
                } else {
                    tableContainer.style.display = 'none';
                    emptyState.style.display = 'block';
                }
            } else {
                showError('Error al guardar datos: ' + (resultGuardar.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error al cargar feriados:', error);
            showError('Error al cargar datos: ' + error.message);
        } finally {
            // Restaurar botón
            btnCargar.disabled = false;
            btnCargar.innerHTML = textoOriginal;
        }
        
    } catch (error) {
        console.error('Error en cargarFeriados:', error);
        showError('Error al cargar feriados: ' + error.message);
    }
}

// Abrir modal de intervalos
function abrirModalIntervalosFeriados() {
    const modal = document.getElementById('modalIntervalosFeriados');
    if (modal) {
        modal.style.display = 'flex';
        
        // Inicializar fechas si no tienen valor
        const fechaDesdeInput = document.getElementById('fechaDesdeFeriados');
        const fechaHastaInput = document.getElementById('fechaHastaFeriados');
        
        if (fechaDesdeInput && !fechaDesdeInput.value) {
            const hoy = new Date();
            const dia15 = new Date(hoy.getFullYear(), hoy.getMonth(), 15);
            fechaDesdeInput.value = convertirFechaYYYYMMDDaDDMMAAAA_FERIADOS(formatearFechaInput(dia15));
        }
        
        if (fechaHastaInput && !fechaHastaInput.value) {
            const hoy = new Date();
            const dia15Siguiente = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 15);
            fechaHastaInput.value = convertirFechaYYYYMMDDaDDMMAAAA_FERIADOS(formatearFechaInput(dia15Siguiente));
        }
    }
}

// Cerrar modal de intervalos
function cerrarModalIntervalosFeriados() {
    const modal = document.getElementById('modalIntervalosFeriados');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Confirmar y cargar Feriados
async function confirmarCargarFeriados() {
    cerrarModalIntervalosFeriados();
    const btnCargar = document.getElementById('btnConfirmarCargarFeriados');
    if (btnCargar) {
        btnCargar.disabled = true;
        btnCargar.innerHTML = 'Cargando...';
    }
    try {
        await cargarFeriados();
        // Refrescar la página después de cargar
        window.location.reload();
    } catch (error) {
        console.error('Error al cargar Feriados:', error);
        if (btnCargar) {
            btnCargar.disabled = false;
            btnCargar.innerHTML = 'Cargar';
        }
    }
}

// Limpiar filtro Feriados
function limpiarFiltroFeriados() {
    const buscarDesdeInput = document.getElementById('buscarDesdeFeriados');
    const buscarHastaInput = document.getElementById('buscarHastaFeriados');
    
    if (buscarDesdeInput) buscarDesdeInput.value = '';
    if (buscarHastaInput) buscarHastaInput.value = '';
    
    // Mostrar todos los registros
    const tbody = document.getElementById('feriadosTableBody');
    if (tbody) {
        const filas = tbody.querySelectorAll('tr');
        filas.forEach(fila => {
            fila.style.display = '';
        });
    }
}

// Buscar Feriados por intervalo (consulta directa a BD)
async function filtrarFeriadosPorIntervalo() {
    console.log('🔍 filtrarFeriadosPorIntervalo - INICIO');
    
    const buscarDesdeInput = document.getElementById('buscarDesdeFeriados');
    const buscarHastaInput = document.getElementById('buscarHastaFeriados');
    
    if (!buscarDesdeInput || !buscarHastaInput) {
        console.error('❌ filtrarFeriadosPorIntervalo - Inputs no encontrados');
        return;
    }
    
    const fechaDesdeStr = buscarDesdeInput.value.trim();
    const fechaHastaStr = buscarHastaInput.value.trim();
    
    console.log('📅 filtrarFeriadosPorIntervalo - Fechas ingresadas:', {
        fechaDesde: fechaDesdeStr,
        fechaHasta: fechaHastaStr
    });
    
    // Validar que ambas fechas estén presentes
    if (!fechaDesdeStr || !fechaHastaStr) {
        showError('Por favor complete ambas fechas');
        return;
    }
    
    // Validar formato
    if (!validarFechaDDMMAAAA(fechaDesdeStr) || !validarFechaDDMMAAAA(fechaHastaStr)) {
        showError('Formato de fecha inválido. Use DD-MM-AAAA');
        return;
    }
    
    // Convertir a YYYY-MM-DD para la API
    const fechaDesdeYYYYMMDD = convertirFechaDDMMAAAAaYYYYMMDD(fechaDesdeStr);
    const fechaHastaYYYYMMDD = convertirFechaDDMMAAAAaYYYYMMDD(fechaHastaStr);
    
    console.log('📅 filtrarFeriadosPorIntervalo - Fechas convertidas a YYYY-MM-DD:', {
        fechaDesdeYYYYMMDD,
        fechaHastaYYYYMMDD
    });
    
    // Validar que fechaDesde <= fechaHasta
    if (fechaDesdeYYYYMMDD > fechaHastaYYYYMMDD) {
        showError('La fecha "Desde" debe ser anterior a la fecha "Hasta"');
        return;
    }
    
    // Mostrar la tabla
    const tableContainer = document.getElementById('feriadosTableContainer');
    if (tableContainer) {
        tableContainer.style.display = 'block';
    }
    
    const tbody = document.getElementById('feriadosTableBody');
    if (!tbody) {
        console.error('❌ filtrarFeriadosPorIntervalo - tbody no encontrado');
        return;
    }
    
    // Mostrar indicador de carga
    tbody.innerHTML = '<tr><td colspan="2" style="text-align: center; padding: 20px;">Buscando...</td></tr>';
    
    try {
        // Consultar directamente a la BD
        console.log(`🔍 Consultando BD: /api/feriados/bd?desde=${fechaDesdeYYYYMMDD}&hasta=${fechaHastaYYYYMMDD}`);
        const response = await fetch(`/api/feriados/bd?desde=${fechaDesdeYYYYMMDD}&hasta=${fechaHastaYYYYMMDD}`);
        
        // Verificar si la respuesta es exitosa
        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ Error en respuesta:', errorData);
            tbody.innerHTML = '<tr><td colspan="2" style="text-align: center; padding: 20px; color: red;">Error al buscar datos</td></tr>';
            showError(errorData.error || `Error ${response.status}: ${response.statusText}`);
            return;
        }
        
        const result = await response.json();
        
        console.log('📊 Resultado de BD:', {
            success: result.success,
            totalDatos: result.datos ? result.datos.length : 0,
            error: result.error
        });
        
        if (!result.success) {
            tbody.innerHTML = '<tr><td colspan="2" style="text-align: center; padding: 20px; color: red;">Error al buscar datos</td></tr>';
            showError(result.error || 'Error desconocido al buscar datos');
            return;
        }
        
        if (result.datos && result.datos.length > 0) {
            // Generar tabla con los resultados
            generarTablaFeriados(result.datos, false);
            console.log(`✅ filtrarFeriadosPorIntervalo - Se encontraron ${result.datos.length} registros`);
        } else {
            tbody.innerHTML = '<tr><td colspan="2" style="text-align: center; padding: 20px;">No se encontraron registros en el rango especificado</td></tr>';
            console.log('⚠️ filtrarFeriadosPorIntervalo - No se encontraron registros');
        }
    } catch (error) {
        console.error('❌ filtrarFeriadosPorIntervalo - Error:', error);
        tbody.innerHTML = '<tr><td colspan="2" style="text-align: center; padding: 20px; color: red;">Error al buscar datos</td></tr>';
        showError('Error al buscar datos: ' + error.message);
    }
}

// Inicializar inputs de fecha con formato DD/MM/AAAA
document.addEventListener('DOMContentLoaded', () => {
    const fechaDesdeInput = document.getElementById('fechaDesdeFeriados');
    const fechaHastaInput = document.getElementById('fechaHastaFeriados');
    
    // Aplicar máscara a los inputs
    if (fechaDesdeInput) {
        aplicarMascaraFechaFERIADOS(fechaDesdeInput);
    }
    
    if (fechaHastaInput) {
        aplicarMascaraFechaFERIADOS(fechaHastaInput);
    }
    
    // Cerrar modal al hacer clic fuera
    const modal = document.getElementById('modalIntervalosFeriados');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                cerrarModalIntervalosFeriados();
            }
        });
    }
    
    // Aplicar máscara a los inputs del buscador
    const buscarDesdeInput = document.getElementById('buscarDesdeFeriados');
    const buscarHastaInput = document.getElementById('buscarHastaFeriados');
    
    if (buscarDesdeInput) {
        aplicarMascaraFechaFERIADOS(buscarDesdeInput);
    }
    
    if (buscarHastaInput) {
        aplicarMascaraFechaFERIADOS(buscarHastaInput);
    }
});

// Obtener fechas que ya están en la tabla
function obtenerFechasEnTablaFeriados() {
    const tbody = document.getElementById('feriadosTableBody');
    const fechas = new Set();
    
    if (tbody) {
        const filas = tbody.querySelectorAll('tr');
        filas.forEach(fila => {
            const celdaFecha = fila.querySelector('td:first-child');
            if (celdaFecha) {
                // Convertir formato DD/MM/YYYY a YYYY-MM-DD
                const textoFecha = celdaFecha.textContent.trim();
                const partes = textoFecha.split('/');
                if (partes.length === 3) {
                    const fechaNormalizada = `${partes[2]}-${partes[1]}-${partes[0]}`;
                    fechas.add(fechaNormalizada);
                }
            }
        });
    }
    
    return fechas;
}

// Agregar fila nueva a la tabla (manteniendo orden ascendente)
function agregarFilaFeriados(item, tbody) {
    const row = document.createElement('tr');
    
    // Extraer fecha (formato YYYY-MM-DD)
    let fecha = item.fecha || item.date || item;
    if (typeof fecha === 'string' && fecha.includes('T')) {
        fecha = fecha.split('T')[0];
    }
    
    // Extraer nombre
    const nombre = item.nombre || '';
    
    row.innerHTML = `
        <td style="width: 120px !important; max-width: 120px !important; min-width: 120px !important; text-align: center !important;">${formatearFechaMostrar(fecha)}</td>
        <td style="text-align: center !important; white-space: normal !important; word-wrap: break-word !important;">${nombre}</td>
    `;
    
    // Insertar en orden ascendente
    const filas = Array.from(tbody.querySelectorAll('tr'));
    let insertado = false;
    
    for (let i = 0; i < filas.length; i++) {
        const celdaFecha = filas[i].querySelector('td:first-child');
        if (celdaFecha) {
            const textoFecha = celdaFecha.textContent.trim();
            const partes = textoFecha.split('/');
            if (partes.length === 3) {
                const fechaFila = new Date(`${partes[2]}-${partes[1]}-${partes[0]}`);
                const fechaNueva = new Date(fecha);
                
                // Orden descendente: insertar si la fecha nueva es mayor (más reciente)
                if (fechaNueva > fechaFila) {
                    tbody.insertBefore(row, filas[i]);
                    insertado = true;
                    break;
                }
            }
        }
    }
    
    if (!insertado) {
        tbody.appendChild(row);
    }
    
    return row;
}

// Generar tabla de Feriados (solo si está vacía) o agregar solo nuevos registros (OPTIMIZADO)
function generarTablaFeriados(datos, soloNuevos = false) {
    console.log('📊 generarTablaFeriados - INICIO', {
        totalDatos: datos ? datos.length : 0,
        soloNuevos
    });
    
    const tbody = document.getElementById('feriadosTableBody');
    if (!tbody) {
        console.error('❌ generarTablaFeriados - tbody no encontrado');
        return 0;
    }
    
    if (!soloNuevos) {
        // Si no es solo nuevos, limpiar y regenerar toda la tabla
        tbody.innerHTML = '';
        
        // Ordenar datos por fecha (descendente - más reciente primero)
        const datosOrdenados = [...datos].sort((a, b) => {
            const fechaA = crearFechaDesdeString(a.fecha);
            const fechaB = crearFechaDesdeString(b.fecha);
            return fechaB - fechaA; // Orden descendente
        });
        
        console.log(`📊 generarTablaFeriados - Datos ordenados: ${datosOrdenados.length} registros`);
        
        // Agregar todas las filas de una vez (más eficiente)
        datosOrdenados.forEach((item, index) => {
            let fecha = item.fecha || item.date || item;
            if (typeof fecha === 'string' && fecha.includes('T')) {
                fecha = fecha.split('T')[0];
            }
            
            const nombre = item.nombre || '';
            const fechaFormateada = formatearFechaMostrar(fecha);
            
            if (index < 5) { // Log solo los primeros 5 para no saturar
                console.log(`📊 generarTablaFeriados - Item ${index + 1}: fecha="${fecha}", fechaFormateada="${fechaFormateada}", nombre="${nombre}"`);
            }
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="width: 120px !important; max-width: 120px !important; min-width: 120px !important; text-align: center !important;">${fechaFormateada}</td>
                <td style="text-align: center !important; white-space: normal !important; word-wrap: break-word !important;">${nombre}</td>
            `;
            tbody.appendChild(row);
        });
        
        console.log(`✅ generarTablaFeriados - Tabla generada con ${datosOrdenados.length} filas`);
        
        return datosOrdenados.length;
    } else {
        // Solo agregar nuevos registros (ya filtrados, no verificar duplicados)
        // Ordenar datos por fecha (ascendente)
        const datosOrdenados = [...datos].sort((a, b) => {
            const fechaA = crearFechaDesdeString(a.fecha);
            const fechaB = crearFechaDesdeString(b.fecha);
            return fechaA - fechaB;
        });
        
        // Agregar filas directamente (sin verificar duplicados - ya están filtrados)
        datosOrdenados.forEach(item => {
            agregarFilaFeriados(item, tbody);
        });
        
        return datosOrdenados.length;
    }
}

// Cambiar página de Feriados
async function cambiarPaginaFeriados(nuevaPagina) {
    if (nuevaPagina < 1 || (window.feriadosTotalPaginas && nuevaPagina > window.feriadosTotalPaginas)) {
        return;
    }
    
    try {
        // Mostrar indicador de carga
        const tbody = document.getElementById('feriadosTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="2" style="text-align: center; padding: 20px;">Cargando...</td></tr>';
        }
        
        // Obtener datos paginados desde BD (sin parámetros de fecha)
        const response = await fetch(`/api/feriados/bd?pagina=${nuevaPagina}&porPagina=${window.feriadosPorPagina || 50}`);
        const result = await response.json();
        
        if (result.success && result.datos) {
            // Actualizar variables globales
            window.feriadosPaginaActual = result.pagina;
            window.feriadosTotalPaginas = result.totalPaginas;
            window.feriadosTotal = result.total;
            
            // Generar tabla con nuevos datos
            generarTablaFeriados(result.datos, false);
            
            // Actualizar controles de paginación (recargar página para actualizar botones)
            window.location.href = `/feriados?pagina=${nuevaPagina}`;
        } else {
            throw new Error(result.error || 'Error al cargar datos');
        }
    } catch (error) {
        console.error('Error al cambiar página:', error);
        showError('Error al cargar página: ' + error.message);
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Establecer fechas por defecto: día 15 del mes actual hasta día 15 del mes siguiente
    const hoy = new Date();
    const dia15Actual = new Date(hoy.getFullYear(), hoy.getMonth(), 15);
    const dia15Siguiente = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 15);
    
    const fechaDesdeInput = document.getElementById('fechaDesdeFeriados');
    const fechaHastaInput = document.getElementById('fechaHastaFeriados');
    
    if (fechaDesdeInput && !fechaDesdeInput.value) {
        fechaDesdeInput.value = formatearFechaInput(dia15Actual);
    }
    
    if (fechaHastaInput && !fechaHastaInput.value) {
        fechaHastaInput.value = formatearFechaInput(dia15Siguiente);
    }
});

// Abrir modal de nuevo feriado
function abrirModalNuevoFeriado() {
    const modal = document.getElementById('modalNuevoFeriado');
    if (modal) {
        modal.style.display = 'flex';
        
        // Limpiar campos
        const fechaInput = document.getElementById('nuevoFeriadoFecha');
        const nombreInput = document.getElementById('nuevoFeriadoNombre');
        if (fechaInput) fechaInput.value = '';
        if (nombreInput) nombreInput.value = '';
    }
}

// Cerrar modal de nuevo feriado
function cerrarModalNuevoFeriado() {
    const modal = document.getElementById('modalNuevoFeriado');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Guardar nuevo feriado
async function guardarNuevoFeriado() {
    const fechaInput = document.getElementById('nuevoFeriadoFecha');
    const nombreInput = document.getElementById('nuevoFeriadoNombre');
    const btnGuardar = document.getElementById('btnGuardarNuevoFeriado');
    
    if (!fechaInput || !nombreInput || !btnGuardar) {
        showError('Error: No se encontraron los campos del formulario');
        return;
    }
    
    const fecha = fechaInput.value.trim();
    const nombre = nombreInput.value.trim();
    
    // Validar campos
    if (!fecha) {
        showError('Por favor, ingrese una fecha');
        fechaInput.focus();
        return;
    }
    
    if (!nombre) {
        showError('Por favor, ingrese un nombre para el feriado');
        nombreInput.focus();
        return;
    }
    
    // Validar formato de fecha (DD-MM-AAAA o DD/MM/AAAA)
    if (!validarFechaDDMMAAAA(fecha)) {
        showError('Por favor, ingrese una fecha válida en formato DD-MM-AAAA');
        fechaInput.focus();
        return;
    }
    
    // Convertir fecha a YYYY-MM-DD para el backend
    const fechaYYYYMMDD = convertirFechaDDMMAAAAaYYYYMMDD(fecha);
    if (!fechaYYYYMMDD) {
        showError('Error al convertir la fecha. Por favor, verifique el formato.');
        fechaInput.focus();
        return;
    }
    
    // Deshabilitar botón mientras se guarda
    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando...';
    
    try {
        const response = await fetch('/api/feriados/nuevo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fecha: fechaYYYYMMDD,
                nombre: nombre,
                tipo: '' // Tipo vacío por defecto
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess('Feriado guardado exitosamente');
            cerrarModalNuevoFeriado();
            
            // Recargar la página para mostrar el nuevo feriado
            window.location.reload();
        } else {
            showError(result.error || 'Error al guardar el feriado');
        }
    } catch (error) {
        console.error('Error al guardar feriado:', error);
        showError('Error al guardar el feriado: ' + error.message);
    } finally {
        // Rehabilitar botón
        btnGuardar.disabled = false;
        btnGuardar.textContent = 'Guardar';
    }
}

// Función para mostrar mensaje de éxito
function showSuccess(message) {
    // Crear o actualizar mensaje de éxito
    let successDiv = document.getElementById('successMessage');
    if (!successDiv) {
        successDiv = document.createElement('div');
        successDiv.id = 'successMessage';
        successDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #1e8e3e; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.2); z-index: 10001; max-width: 400px;';
        document.body.appendChild(successDiv);
    }
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    
    // Ocultar después de 3 segundos
    setTimeout(() => {
        successDiv.style.display = 'none';
    }, 3000);
}

// Función para mostrar mensaje de error (si no existe)
if (typeof showError === 'undefined') {
    function showError(message) {
        // Crear o actualizar mensaje de error
        let errorDiv = document.getElementById('errorMessage');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'errorMessage';
            errorDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #d93025; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.2); z-index: 10001; max-width: 400px;';
            document.body.appendChild(errorDiv);
        }
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        // Ocultar después de 5 segundos
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

