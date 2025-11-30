// JavaScript para la página CER
// Utiliza utilidades compartidas de dateUtils.js y formUtils.js
// Las funciones compartidas deben estar cargadas antes de este archivo

// Wrapper para formatear fecha con guiones (formato CER)
// Usa la función compartida de dateUtils.js
function formatearFechaMostrarCER(fechaString) {
    return formatearFechaMostrar(fechaString, '-');
}

// Wrapper para formatear número con 4 decimales (formato CER)
// Usa la función compartida de formUtils.js
function formatearNumeroCER(numero) {
    return formatearNumero(numero, 4);
}

// Calcular rangos de fechas faltantes (CORREGIDO - verificación precisa)
function calcularRangosFaltantes(fechaDesde, fechaHasta, fechasExistentes) {
    const rangos = [];
    
    // Parsear fechas sin problemas de zona horaria
    const desde = crearFechaDesdeString(fechaDesde);
    const hasta = crearFechaDesdeString(fechaHasta);
    
    if (!desde || !hasta || desde > hasta) {
        return [];
    }
    
    // Calcular días totales del rango
    const diasTotales = Math.ceil((hasta - desde) / (1000 * 60 * 60 * 24)) + 1;
    
    // Filtrar solo las fechas que están dentro del rango
    const fechasEnRango = new Set();
    fechasExistentes.forEach(fecha => {
        const fechaDate = crearFechaDesdeString(fecha);
        if (fechaDate && fechaDate >= desde && fechaDate <= hasta) {
            fechasEnRango.add(fecha);
        }
    });
    
    const fechasExistentesCount = fechasEnRango.size;
    
    // Si hay menos fechas existentes que días del rango, definitivamente faltan datos
    if (fechasExistentesCount < diasTotales) {
        // Para rangos cortos (menos de 30 días), verificar día por día
        if (diasTotales <= 30) {
            // Verificar si faltan fechas en el rango
            let fechaActual = new Date(desde);
            let faltanFechas = false;
            let inicioRangoFaltante = null;
            
            while (fechaActual <= hasta) {
                const fechaStr = formatearFechaInput(fechaActual);
                
                if (!fechasEnRango.has(fechaStr)) {
                    // Iniciar un nuevo rango faltante
                    if (!inicioRangoFaltante) {
                        inicioRangoFaltante = fechaStr;
                    }
                    faltanFechas = true;
                } else {
                    // Si había un rango faltante, cerrarlo
                    if (inicioRangoFaltante) {
                        const fechaAnterior = new Date(fechaActual);
                        fechaAnterior.setDate(fechaAnterior.getDate() - 1);
                        rangos.push({ 
                            desde: inicioRangoFaltante, 
                            hasta: formatearFechaInput(fechaAnterior) 
                        });
                        inicioRangoFaltante = null;
                    }
                }
                
                fechaActual.setDate(fechaActual.getDate() + 1);
            }
            
            // Si quedó un rango abierto, cerrarlo
            if (inicioRangoFaltante) {
                rangos.push({ 
                    desde: inicioRangoFaltante, 
                    hasta: formatearFechaInput(hasta) 
                });
            }
            
            // Si no se encontraron rangos pero faltan fechas, agregar el rango completo
            if (faltanFechas && rangos.length === 0) {
                rangos.push({ 
                    desde: formatearFechaInput(desde), 
                    hasta: formatearFechaInput(hasta) 
                });
            }
        } else {
            // Para rangos largos, verificar por año
            const añoInicio = desde.getFullYear();
            const añoFin = hasta.getFullYear();
            
            for (let año = añoInicio; año <= añoFin; año++) {
                const inicioAño = año === añoInicio ? desde : new Date(año, 0, 1);
                const finAño = año === añoFin ? hasta : new Date(año, 11, 31);
                
                // Verificar inicio, medio y fin del año
                const inicioStr = formatearFechaInput(inicioAño);
                const finStr = formatearFechaInput(finAño);
                const medioAño = new Date(año, 5, 15);
                const medioStr = formatearFechaInput(medioAño);
                
                // Si falta alguna fecha clave, agregar el año completo
                if (!fechasEnRango.has(inicioStr) || !fechasEnRango.has(finStr) || !fechasEnRango.has(medioStr)) {
                    rangos.push({ desde: inicioStr, hasta: finStr });
                }
            }
        }
    }
    
    return rangos;
}

// formatearFechaInput está disponible en dateUtils.js

// Cargar datos de CER desde la API
async function cargarCER() {
    try {
        const fechaDesdeDDMMAAAA = document.getElementById('fechaDesdeCER')?.value;
        const fechaHastaDDMMAAAA = document.getElementById('fechaHastaCER')?.value;
        const btnCargar = document.getElementById('btnCargarCER');
        
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
        
        // Mostrar la tabla
        const tableContainer = document.getElementById('cerTableContainer');
        const tbody = document.getElementById('cerTableBody');
        
        try {
            // Llamado directo a la API (sin verificar fechas existentes)
            btnCargar.innerHTML = '<span>Cargando desde API...</span>';
            
            const response = await fetch(`/api/cer?desde=${fechaDesde}&hasta=${fechaHasta}`);
            const result = await response.json();
            
            if (!result.success || !result.datos || result.datos.length === 0) {
                showError('No se pudieron obtener datos de la API');
                btnCargar.disabled = false;
                btnCargar.innerHTML = textoOriginal;
                return;
            }
            
            // Guardar todos los datos (sobreescribir si existen)
            btnCargar.innerHTML = '<span>Guardando en BD...</span>';
            
            const responseGuardar = await fetch('/api/cer/guardar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ datos: result.datos })
            });
            
            const resultGuardar = await responseGuardar.json();
            if (resultGuardar.success) {
                // Cargar datos desde BD para mostrar en tabla
                btnCargar.innerHTML = '<span>Cargando tabla...</span>';
                const responseBD = await fetch(`/api/cer/bd?desde=${fechaDesde}&hasta=${fechaHasta}`);
                const resultBD = await responseBD.json();
                
                if (resultBD.success && resultBD.datos && resultBD.datos.length > 0) {
                    generarTablaCER(resultBD.datos, false);
                    tableContainer.style.display = 'block';
                    emptyState.style.display = 'none';
                    showSuccess(`Se guardaron ${resultGuardar.actualizados} registros de CER`);
                } else {
                    tableContainer.style.display = 'none';
                    emptyState.style.display = 'block';
                }
            } else {
                showError('Error al guardar datos: ' + (resultGuardar.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error al cargar CER:', error);
            showError('Error al cargar datos: ' + error.message);
        } finally {
            // Restaurar botón
            btnCargar.disabled = false;
            btnCargar.innerHTML = textoOriginal;
        }
        
    } catch (error) {
        console.error('Error en cargarCER:', error);
        showError('Error al cargar CER: ' + error.message);
    }
}

// Obtener fechas que ya están en la tabla
function obtenerFechasEnTablaCER() {
    const tbody = document.getElementById('cerTableBody');
    const fechas = new Set();
    
    if (tbody) {
        const filas = tbody.querySelectorAll('tr');
        filas.forEach(fila => {
            const celdaFecha = fila.querySelector('td:first-child');
            if (celdaFecha) {
                // Convertir formato DD-MM-YYYY o DD/MM/YYYY a YYYY-MM-DD
                const textoFecha = celdaFecha.textContent.trim();
                const partes = textoFecha.split(/[-\/]/);
                if (partes.length === 3) {
                    const fechaNormalizada = `${partes[2]}-${partes[1]}-${partes[0]}`;
                    fechas.add(fechaNormalizada);
                }
            }
        });
    }
    
    return fechas;
}

// Agregar fila nueva a la tabla (manteniendo orden descendente)
function agregarFilaCER(item, tbody) {
    const row = document.createElement('tr');
    
    // Extraer fecha (formato YYYY-MM-DD)
    let fecha = item.fecha;
    if (!fecha) {
        console.warn('Item sin fecha:', item);
        return null;
    }
    if (typeof fecha === 'string' && fecha.includes('T')) {
        fecha = fecha.split('T')[0];
    }
    
    // Extraer valor CER
    const valor = item.valor;
    if (valor === null || valor === undefined) {
        console.warn('Item sin valor:', item);
        return null;
    }
    
    row.innerHTML = `
        <td style="width: 120px !important; max-width: 120px !important; text-align: center !important;">${formatearFechaMostrarCER(fecha)}</td>
        <td style="text-align: center !important; width: 120px !important; max-width: 120px !important;">${formatearNumeroCER(valor)}</td>
    `;
    
    // Insertar en orden descendente (más reciente primero)
    const filas = Array.from(tbody.querySelectorAll('tr'));
    let insertado = false;
    
    for (let i = 0; i < filas.length; i++) {
            const celdaFecha = filas[i].querySelector('td:first-child');
            if (celdaFecha) {
                const textoFecha = celdaFecha.textContent.trim();
                const partes = textoFecha.split(/[-\/]/);
                if (partes.length === 3) {
                    const fechaFila = new Date(`${partes[2]}-${partes[1]}-${partes[0]}`);
                    const fechaNueva = new Date(fecha);
                    
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

// Generar tabla de CER (solo si está vacía) o agregar solo nuevos registros (OPTIMIZADO)
// Variable global para almacenar datos filtrados de CER
window.cerDatosFiltrados = [];

function generarTablaCER(datos, soloNuevos = false) {
    const tbody = document.getElementById('cerTableBody');
    if (!tbody) return 0;
    
    // Almacenar datos filtrados globalmente
    if (!soloNuevos) {
        window.cerDatosFiltrados = datos;
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
        
        // Agregar todas las filas de una vez (más eficiente)
        datosOrdenados.forEach(item => {
            let fecha = item.fecha;
            if (!fecha) return;
            if (typeof fecha === 'string' && fecha.includes('T')) {
                fecha = fecha.split('T')[0];
            }
            
            const valor = item.valor;
            if (valor === null || valor === undefined) return;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="width: 120px !important; max-width: 120px !important; text-align: center !important;">${formatearFechaMostrarCER(fecha)}</td>
                <td style="text-align: center !important; width: 120px !important; max-width: 120px !important;">${formatearNumeroCER(valor)}</td>
            `;
            tbody.appendChild(row);
        });
        
        return datosOrdenados.length;
    } else {
        // Solo agregar nuevos registros (ya filtrados, no verificar duplicados)
        // Ordenar datos por fecha (descendente)
        const datosOrdenados = [...datos].sort((a, b) => {
            const fechaA = crearFechaDesdeString(a.fecha);
            const fechaB = crearFechaDesdeString(b.fecha);
            return fechaB - fechaA;
        });
        
        // Agregar filas directamente (sin verificar duplicados - ya están filtrados)
        datosOrdenados.forEach(item => {
            agregarFilaCER(item, tbody);
        });
        
        return datosOrdenados.length;
    }
}

// convertirFechaDDMMAAAAaYYYYMMDD está disponible en dateUtils.js
// validarFechaDDMMAAAA está disponible en dateUtils.js
// crearFechaDesdeString está disponible en dateUtils.js

// Wrapper para usar función compartida con guiones (formato CER)
function convertirFechaYYYYMMDDaDDMMAAAA_CER(fechaYYYYMMDD) {
    return convertirFechaYYYYMMDDaDDMMAAAA(fechaYYYYMMDD, '-');
}

// aplicarMascaraFecha está disponible en formUtils.js con soporte para separador

// Abrir modal de intervalos
function abrirModalIntervalosCER() {
    const modal = document.getElementById('modalIntervalosCER');
    if (modal) {
        modal.style.display = 'flex';
        
        // Inicializar fechas con fecha de hoy por defecto
        const fechaDesdeInput = document.getElementById('fechaDesdeCER');
        const fechaHastaInput = document.getElementById('fechaHastaCER');
        
        // Establecer fecha de hoy por defecto
        const hoy = new Date();
        const fechaHoyStr = convertirFechaYYYYMMDDaDDMMAAAA_CER(formatearFechaInput(hoy));
        
        if (fechaDesdeInput) {
            fechaDesdeInput.value = fechaHoyStr;
        }
        
        if (fechaHastaInput) {
            fechaHastaInput.value = fechaHoyStr;
        }
    }
}

// Cerrar modal de intervalos
function cerrarModalIntervalosCER() {
    const modal = document.getElementById('modalIntervalosCER');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Confirmar y cargar CER
async function confirmarCargarCER() {
    cerrarModalIntervalosCER();
    const btnCargar = document.getElementById('btnConfirmarCargarCER');
    if (btnCargar) {
        btnCargar.disabled = true;
        btnCargar.innerHTML = 'Cargando...';
    }
    try {
        await cargarCER();
        // Refrescar la página después de cargar
        window.location.reload();
    } catch (error) {
        console.error('Error al cargar CER:', error);
        if (btnCargar) {
            btnCargar.disabled = false;
            btnCargar.innerHTML = 'Cargar';
        }
    }
}

// Limpiar filtro CER
function limpiarFiltroCER() {
    const buscarDesdeInput = document.getElementById('buscarDesdeCER');
    const buscarHastaInput = document.getElementById('buscarHastaCER');
    
    if (buscarDesdeInput) buscarDesdeInput.value = '';
    if (buscarHastaInput) buscarHastaInput.value = '';
    
    // Mostrar todos los registros
    const tbody = document.getElementById('cerTableBody');
    if (tbody) {
        const filas = tbody.querySelectorAll('tr');
        filas.forEach(fila => {
            fila.style.display = '';
        });
    }
}

// Buscar CER por intervalo (consulta directa a BD)
async function filtrarCERPorIntervalo() {
    console.log('🔍 filtrarCERPorIntervalo - INICIO');
    
    const buscarDesdeInput = document.getElementById('buscarDesdeCER');
    const buscarHastaInput = document.getElementById('buscarHastaCER');
    
    if (!buscarDesdeInput || !buscarHastaInput) {
        console.error('❌ filtrarCERPorIntervalo - Inputs no encontrados');
        return;
    }
    
    const fechaDesdeStr = buscarDesdeInput.value.trim();
    const fechaHastaStr = buscarHastaInput.value.trim();
    
    console.log('📅 filtrarCERPorIntervalo - Fechas ingresadas:', {
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
    
    console.log('📅 filtrarCERPorIntervalo - Fechas convertidas a YYYY-MM-DD:', {
        fechaDesdeYYYYMMDD,
        fechaHastaYYYYMMDD
    });
    
    // Validar que fechaDesde <= fechaHasta
    if (fechaDesdeYYYYMMDD > fechaHastaYYYYMMDD) {
        showError('La fecha "Desde" debe ser anterior a la fecha "Hasta"');
        return;
    }
    
    // Mostrar la tabla
    const tableContainer = document.getElementById('cerTableContainer');
    if (tableContainer) {
        tableContainer.style.display = 'block';
    }
    
    const tbody = document.getElementById('cerTableBody');
    if (!tbody) {
        console.error('❌ filtrarCERPorIntervalo - tbody no encontrado');
        return;
    }
    
    // Mostrar indicador de carga
    tbody.innerHTML = '<tr><td colspan="2" style="text-align: center; padding: 20px;">Buscando...</td></tr>';
    
    try {
        // Consultar directamente a la BD
        console.log(`🔍 Consultando BD: /api/cer/bd?desde=${fechaDesdeYYYYMMDD}&hasta=${fechaHastaYYYYMMDD}`);
        const response = await fetch(`/api/cer/bd?desde=${fechaDesdeYYYYMMDD}&hasta=${fechaHastaYYYYMMDD}`);
        const result = await response.json();
        
        console.log('📊 Resultado de BD:', {
            success: result.success,
            totalDatos: result.datos ? result.datos.length : 0
        });
        
        if (result.success && result.datos && result.datos.length > 0) {
            // Generar tabla con los resultados
            generarTablaCER(result.datos, false);
            console.log(`✅ filtrarCERPorIntervalo - Se encontraron ${result.datos.length} registros`);
            // Mostrar botón de exportar CSV
            mostrarBotonExportarCSV('cer');
        } else {
            tbody.innerHTML = '<tr><td colspan="2" style="text-align: center; padding: 20px;">No se encontraron registros en el rango especificado</td></tr>';
            console.log('⚠️ filtrarCERPorIntervalo - No se encontraron registros');
            // Ocultar botón de exportar CSV
            ocultarBotonExportarCSV('cer');
        }
    } catch (error) {
        console.error('❌ filtrarCERPorIntervalo - Error:', error);
        tbody.innerHTML = '<tr><td colspan="2" style="text-align: center; padding: 20px; color: red;">Error al buscar datos</td></tr>';
        showError('Error al buscar datos: ' + error.message);
    }
}

// Variable global para el tipo de variable actual (cer, badlar, tamar)
window.tipoVariableActual = 'cer';

// Función para mostrar botón de exportar CSV
function mostrarBotonExportarCSV(tipo) {
    window.tipoVariableActual = tipo;
    const container = document.getElementById(`btnExportarCSV${tipo.toUpperCase()}Container`);
    if (container) {
        container.style.display = 'block';
    }
}

// Función para ocultar botón de exportar CSV
function ocultarBotonExportarCSV(tipo) {
    const container = document.getElementById(`btnExportarCSV${tipo.toUpperCase()}Container`);
    if (container) {
        container.style.display = 'none';
    }
}

// Función para abrir modal de exportar CSV
function abrirModalExportarCSV(tipo) {
    window.tipoVariableActual = tipo;
    const modal = document.getElementById('modalExportarCSV');
    const input = document.getElementById('formatoExportarCSV');
    if (modal && input) {
        // Autocompletar con FECHA;VALOR si está vacío
        if (!input.value || input.value.trim() === '') {
            input.value = 'FECHA;VALOR';
        }
        modal.style.display = 'flex';
        input.focus();
        // Seleccionar todo el texto para facilitar edición
        input.select();
    }
}

// Función para cerrar modal de exportar CSV
function cerrarModalExportarCSV() {
    const modal = document.getElementById('modalExportarCSV');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Función para formatear fecha a DD/MM/AAAA (para exportación CSV)
// Usa la función compartida de dateUtils.js
function formatearFechaExportar(fecha) {
    if (!fecha) return '';
    let fechaStr = fecha;
    if (typeof fecha === 'string' && fecha.includes('T')) {
        fechaStr = fecha.split('T')[0];
    }
    // Usar función compartida con separador '/' para exportación
    return convertirFechaYYYYMMDDaDDMMAAAA(fechaStr, '/');
}

// Función para formatear valor con coma como separador decimal
function formatearValorExportar(valor) {
    if (valor === null || valor === undefined) return '';
    const valorNum = typeof valor === 'number' ? valor : parseFloat(valor);
    if (isNaN(valorNum)) return '';
    // Convertir a string y reemplazar punto por coma
    // Mantener todos los decimales que tenga el número
    return valorNum.toString().replace('.', ',');
}

// Función para exportar CSV
function exportarCSV() {
    const tipo = window.tipoVariableActual || 'cer';
    const formatoInput = document.getElementById('formatoExportarCSV');
    if (!formatoInput || !formatoInput.value.trim()) {
        showError('Por favor ingrese un formato de exportación');
        return;
    }
    
    const formato = formatoInput.value.trim();
    let datos = [];
    
    // Obtener datos según el tipo
    if (tipo === 'cer') {
        datos = window.cerDatosFiltrados || [];
    } else if (tipo === 'badlar') {
        datos = window.badlarDatosFiltrados || [];
    } else if (tipo === 'tamar') {
        datos = window.tamarDatosFiltrados || [];
    }
    
    if (datos.length === 0) {
        showError('No hay datos para exportar');
        return;
    }
    
    // Generar contenido CSV
    const lineas = [];
    datos.forEach(item => {
        let fecha = item.fecha;
        let valor = item.valor;
        
        // Formatear fecha
        const fechaFormateada = formatearFechaExportar(fecha);
        // Formatear valor
        const valorFormateado = formatearValorExportar(valor);
        
        // Reemplazar FECHA y VALOR en el formato
        let linea = formato;
        linea = linea.replace(/FECHA/g, fechaFormateada);
        linea = linea.replace(/VALOR/g, valorFormateado);
        
        lineas.push(linea);
    });
    
    // Crear contenido CSV
    const contenidoCSV = lineas.join('\n');
    
    // Crear blob y descargar
    const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${tipo}_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Cerrar modal
    cerrarModalExportarCSV();
    showSuccess(`CSV exportado exitosamente (${datos.length} registros)`);
}

// Inicializar inputs de fecha con formato DD/MM/AAAA
document.addEventListener('DOMContentLoaded', () => {
    const fechaDesdeInput = document.getElementById('fechaDesdeCER');
    const fechaHastaInput = document.getElementById('fechaHastaCER');
    
    // Aplicar máscara a los inputs (usando separador '-' para CER)
    if (fechaDesdeInput) {
        aplicarMascaraFecha(fechaDesdeInput, '-');
    }
    
    if (fechaHastaInput) {
        aplicarMascaraFecha(fechaHastaInput, '-');
    }
    
    // Cerrar modal al hacer clic fuera
    const modal = document.getElementById('modalIntervalosCER');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                cerrarModalIntervalosCER();
            }
        });
    }
    
    // Aplicar máscara a los inputs del buscador
    const buscarDesdeInput = document.getElementById('buscarDesdeCER');
    const buscarHastaInput = document.getElementById('buscarHastaCER');
    
    if (buscarDesdeInput) {
        aplicarMascaraFecha(buscarDesdeInput, '-');
    }
    
    if (buscarHastaInput) {
        aplicarMascaraFecha(buscarHastaInput, '-');
    }
});

// Cambiar página de CER
async function cambiarPaginaCER(nuevaPagina) {
    if (nuevaPagina < 1 || (window.cerTotalPaginas && nuevaPagina > window.cerTotalPaginas)) {
        return;
    }
    
    try {
        // Mostrar indicador de carga
        const tbody = document.getElementById('cerTableBody');
        tbody.innerHTML = '<tr><td colspan="2" style="text-align: center; padding: 20px;">Cargando...</td></tr>';
        
        // Obtener datos paginados desde BD
        const response = await fetch(`/api/cer/bd?pagina=${nuevaPagina}&porPagina=${window.cerPorPagina || 50}`);
        const result = await response.json();
        
        if (result.success && result.datos) {
            // Actualizar variables globales
            window.cerPaginaActual = result.pagina;
            window.cerTotalPaginas = result.totalPaginas;
            window.cerTotal = result.total;
            
            // Generar tabla con nuevos datos
            generarTablaCER(result.datos);
            
            // Actualizar controles de paginación (recargar página para actualizar botones)
            window.location.href = `/cer?pagina=${nuevaPagina}`;
        } else {
            throw new Error(result.error || 'Error al cargar datos');
        }
    } catch (error) {
        console.error('Error al cambiar página:', error);
        showError('Error al cargar página: ' + error.message);
    }
}


