// JavaScript para la página TAMAR
// Utiliza utilidades compartidas de dateUtils.js y formUtils.js
// Las funciones compartidas deben estar cargadas antes de este archivo

// Wrapper para formatear fecha con guiones (formato TAMAR)
// Usa la función compartida de dateUtils.js
function formatearFechaMostrarTAMAR(fechaString) {
    return formatearFechaMostrar(fechaString, '-');
}

// Wrapper para formatear número con 4 decimales (formato TAMAR)
// Usa la función compartida de formUtils.js
function formatearNumeroTAMAR(numero) {
    return formatearNumero(numero, 4);
}

// Cargar datos de TAMAR desde la API
async function cargarTAMAR() {
    try {
        const fechaDesdeDDMMAAAA = document.getElementById('fechaDesdeTAMAR')?.value;
        const fechaHastaDDMMAAAA = document.getElementById('fechaHastaTAMAR')?.value;
        const btnCargar = document.getElementById('btnCargarTAMAR');
        
        if (!fechaDesdeDDMMAAAA || !fechaHastaDDMMAAAA) {
            showError('Por favor seleccione un rango de fechas');
            return;
        }
        
        // Validar formato
        if (!validarFechaDDMMAAAA(fechaDesdeDDMMAAAA) || !validarFechaDDMMAAAA(fechaHastaDDMMAAAA)) {
            showError('Formato de fecha inválido. Use DD-MM-AAAA');
            return;
        }
        
        // Convertir DD-MM-AAAA a YYYY-MM-DD para la API
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
        const tableContainer = document.getElementById('tamarTableContainer');
        const tbody = document.getElementById('tamarTableBody');
        
        try {
            // Llamado directo a la API
            btnCargar.innerHTML = '<span>Cargando desde API...</span>';
            
            const response = await fetch(`/api/tamar?desde=${fechaDesde}&hasta=${fechaHasta}`);
            const result = await response.json();
            
            if (!result.success || !result.datos || result.datos.length === 0) {
                showError('No se pudieron obtener datos de la API');
                btnCargar.disabled = false;
                btnCargar.innerHTML = textoOriginal;
                return;
            }
            
            // Guardar todos los datos (sobreescribir si existen)
            btnCargar.innerHTML = '<span>Guardando en BD...</span>';
            
            const responseGuardar = await fetch('/api/tamar/guardar', {
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
                const responseBD = await fetch(`/api/tamar/bd?desde=${fechaDesde}&hasta=${fechaHasta}`);
                const resultBD = await responseBD.json();
                
                if (resultBD.success && resultBD.datos && resultBD.datos.length > 0) {
                    generarTablaTAMAR(resultBD.datos, false);
                    tableContainer.style.display = 'block';
                    showSuccess(`Se guardaron ${resultGuardar.actualizados} registros de TAMAR`);
                } else {
                    tableContainer.style.display = 'none';
                }
            } else {
                showError('Error al guardar datos: ' + (resultGuardar.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error al cargar TAMAR:', error);
            showError('Error al cargar datos: ' + error.message);
        } finally {
            // Restaurar botón
            btnCargar.disabled = false;
            btnCargar.innerHTML = textoOriginal;
        }
        
    } catch (error) {
        console.error('Error en cargarTAMAR:', error);
        showError('Error al cargar TAMAR: ' + error.message);
    }
}

// Generar tabla de TAMAR
// Variable global para almacenar datos filtrados de TAMAR
window.tamarDatosFiltrados = [];

function generarTablaTAMAR(datos, soloNuevos = false) {
    const tbody = document.getElementById('tamarTableBody');
    if (!tbody) return 0;
    
    // Almacenar datos filtrados globalmente
    if (!soloNuevos) {
        window.tamarDatosFiltrados = datos;
    }
    
    if (!soloNuevos) {
        tbody.innerHTML = '';
        
        // Ordenar datos por fecha (descendente - más reciente primero)
        const datosOrdenados = [...datos].sort((a, b) => {
            const fechaA = crearFechaDesdeString(a.fecha);
            const fechaB = crearFechaDesdeString(b.fecha);
            return fechaB - fechaA;
        });
        
        // Agregar todas las filas
        let sumaValores = 0;
        let cantidadValores = 0;
        
        datosOrdenados.forEach(item => {
            let fecha = item.fecha;
            if (!fecha) return;
            if (typeof fecha === 'string' && fecha.includes('T')) {
                fecha = fecha.split('T')[0];
            }
            
            const valor = item.valor;
            if (valor === null || valor === undefined) return;
            
            sumaValores += parseFloat(valor);
            cantidadValores++;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="width: 120px !important; max-width: 120px !important; text-align: center !important;">${formatearFechaMostrarTAMAR(fecha)}</td>
                <td style="text-align: center !important; width: 120px !important; max-width: 120px !important;">${formatearNumeroTAMAR(valor)}</td>
            `;
            tbody.appendChild(row);
        });
        
        // Agregar fila de promedio al final
        if (cantidadValores > 0) {
            const promedio = sumaValores / cantidadValores;
            const rowPromedio = document.createElement('tr');
            rowPromedio.style.background = '#f8f9fa';
            rowPromedio.style.fontWeight = '600';
            rowPromedio.innerHTML = `
                <td style="font-weight: 600; color: var(--text-primary); width: 120px !important; max-width: 120px !important; text-align: center !important;">Promedio</td>
                <td style="text-align: center !important; font-weight: 600; color: var(--primary-color); width: 120px !important; max-width: 120px !important;">${formatearNumeroTAMAR(promedio)}</td>
            `;
            tbody.appendChild(rowPromedio);
            
            // Actualizar el promedio en el contenedor del botón
            const promedioDisplay = document.getElementById('promedioTAMARValor');
            if (promedioDisplay) {
                promedioDisplay.textContent = formatearNumeroTAMAR(promedio);
            }
        }
        
        return datosOrdenados.length;
    }
    
    return 0;
}

// Funciones de conversión y validación están en dateUtils.js
// Wrappers para mantener compatibilidad con formato TAMAR (guiones)
function convertirFechaYYYYMMDDaDDMMAAAA_TAMAR(fechaYYYYMMDD) {
    return convertirFechaYYYYMMDDaDDMMAAAA(fechaYYYYMMDD, '-');
}

// Usar función compartida con guiones para máscara
function aplicarMascaraFechaTAMAR(input) {
    aplicarMascaraFecha(input, '-');
}

// Abrir modal de intervalos
function abrirModalIntervalosTAMAR() {
    const modal = document.getElementById('modalIntervalosTAMAR');
    if (modal) {
        modal.style.display = 'flex';
        
        const fechaDesdeInput = document.getElementById('fechaDesdeTAMAR');
        const fechaHastaInput = document.getElementById('fechaHastaTAMAR');
        
        // Establecer fecha de hoy por defecto
        const hoy = new Date();
        const fechaHoyStr = convertirFechaYYYYMMDDaDDMMAAAA_TAMAR(formatearFechaInput(hoy));
        
        if (fechaDesdeInput) {
            fechaDesdeInput.value = fechaHoyStr;
        }
        
        if (fechaHastaInput) {
            fechaHastaInput.value = fechaHoyStr;
        }
    }
}

// Cerrar modal de intervalos
function cerrarModalIntervalosTAMAR() {
    const modal = document.getElementById('modalIntervalosTAMAR');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Confirmar y cargar TAMAR
async function confirmarCargarTAMAR() {
    cerrarModalIntervalosTAMAR();
    const btnCargar = document.getElementById('btnConfirmarCargarTAMAR');
    if (btnCargar) {
        btnCargar.disabled = true;
        btnCargar.innerHTML = 'Cargando...';
    }
    try {
        await cargarTAMAR();
        window.location.reload();
    } catch (error) {
        console.error('Error al cargar TAMAR:', error);
        if (btnCargar) {
            btnCargar.disabled = false;
            btnCargar.innerHTML = 'Cargar';
        }
    }
}

// Limpiar filtro TAMAR
function limpiarFiltroTAMAR() {
    const buscarDesdeInput = document.getElementById('buscarDesdeTAMAR');
    const buscarHastaInput = document.getElementById('buscarHastaTAMAR');
    
    if (buscarDesdeInput) buscarDesdeInput.value = '';
    if (buscarHastaInput) buscarHastaInput.value = '';
    
    const tbody = document.getElementById('tamarTableBody');
    if (tbody) {
        const filas = tbody.querySelectorAll('tr');
        filas.forEach(fila => {
            fila.style.display = '';
        });
    }
}

// Buscar TAMAR por intervalo
async function filtrarTAMARPorIntervalo() {
    const buscarDesdeInput = document.getElementById('buscarDesdeTAMAR');
    const buscarHastaInput = document.getElementById('buscarHastaTAMAR');
    
    if (!buscarDesdeInput || !buscarHastaInput) {
        return;
    }
    
    const fechaDesdeStr = buscarDesdeInput.value.trim();
    const fechaHastaStr = buscarHastaInput.value.trim();
    
    if (!fechaDesdeStr || !fechaHastaStr) {
        showError('Por favor complete ambas fechas');
        return;
    }
    
    if (!validarFechaDDMMAAAA(fechaDesdeStr) || !validarFechaDDMMAAAA(fechaHastaStr)) {
        showError('Formato de fecha inválido. Use DD-MM-AAAA');
        return;
    }
    
    const fechaDesdeYYYYMMDD = convertirFechaDDMMAAAAaYYYYMMDD(fechaDesdeStr);
    const fechaHastaYYYYMMDD = convertirFechaDDMMAAAAaYYYYMMDD(fechaHastaStr);
    
    if (fechaDesdeYYYYMMDD > fechaHastaYYYYMMDD) {
        showError('La fecha "Desde" debe ser anterior a la fecha "Hasta"');
        return;
    }
    
    const tableContainer = document.getElementById('tamarTableContainer');
    if (tableContainer) {
        tableContainer.style.display = 'block';
    }
    
    const tbody = document.getElementById('tamarTableBody');
    if (!tbody) {
        return;
    }
    
    tbody.innerHTML = '<tr><td colspan="2" style="text-align: center; padding: 20px;">Buscando...</td></tr>';
    
    try {
        const response = await fetch(`/api/tamar/bd?desde=${fechaDesdeYYYYMMDD}&hasta=${fechaHastaYYYYMMDD}`);
        const result = await response.json();
        
        if (result.success && result.datos && result.datos.length > 0) {
            generarTablaTAMAR(result.datos, false);
            // Mostrar botón de exportar CSV
            mostrarBotonExportarCSV('tamar');
        } else {
            tbody.innerHTML = '<tr><td colspan="2" style="text-align: center; padding: 20px;">No se encontraron registros en el rango especificado</td></tr>';
            // Ocultar botón de exportar CSV
            ocultarBotonExportarCSV('tamar');
        }
    } catch (error) {
        console.error('Error al buscar TAMAR:', error);
        tbody.innerHTML = '<tr><td colspan="2" style="text-align: center; padding: 20px; color: red;">Error al buscar datos</td></tr>';
        showError('Error al buscar datos: ' + error.message);
    }
}

// Funciones de exportación CSV (compartidas con cer.js y badlar.js)
// Si no están definidas, definirlas aquí
if (typeof mostrarBotonExportarCSV === 'undefined') {
    window.mostrarBotonExportarCSV = function(tipo) {
        window.tipoVariableActual = tipo;
        const container = document.getElementById(`btnExportarCSV${tipo.toUpperCase()}Container`);
        if (container) {
            container.style.display = 'block';
        }
    };
}

if (typeof ocultarBotonExportarCSV === 'undefined') {
    window.ocultarBotonExportarCSV = function(tipo) {
        const container = document.getElementById(`btnExportarCSV${tipo.toUpperCase()}Container`);
        if (container) {
            container.style.display = 'none';
        }
    };
}

if (typeof abrirModalExportarCSV === 'undefined') {
    window.abrirModalExportarCSV = function(tipo) {
        window.tipoVariableActual = tipo;
        const modal = document.getElementById('modalExportarCSV');
        const input = document.getElementById('formatoExportarCSV');
        if (modal && input) {
            if (!input.value || input.value.trim() === '') {
                input.value = 'FECHA;VALOR';
            }
            modal.style.display = 'flex';
            input.focus();
            input.select();
        }
    };
}

if (typeof cerrarModalExportarCSV === 'undefined') {
    window.cerrarModalExportarCSV = function() {
        const modal = document.getElementById('modalExportarCSV');
        if (modal) {
            modal.style.display = 'none';
        }
    };
}

if (typeof formatearFechaExportar === 'undefined') {
    // Usa la función compartida de dateUtils.js con separador '/' para exportación
    window.formatearFechaExportar = function(fecha) {
        if (!fecha) return '';
        let fechaStr = fecha;
        if (typeof fecha === 'string' && fecha.includes('T')) {
            fechaStr = fecha.split('T')[0];
        }
        return convertirFechaYYYYMMDDaDDMMAAAA(fechaStr, '/');
    };
}

if (typeof formatearValorExportar === 'undefined') {
    window.formatearValorExportar = function(valor) {
        if (valor === null || valor === undefined) return '';
        const valorNum = typeof valor === 'number' ? valor : parseFloat(valor);
        if (isNaN(valorNum)) return '';
        return valorNum.toString().replace('.', ',');
    };
}

if (typeof exportarCSV === 'undefined') {
    window.exportarCSV = function() {
        const tipo = window.tipoVariableActual || 'tamar';
        const formatoInput = document.getElementById('formatoExportarCSV');
        if (!formatoInput || !formatoInput.value.trim()) {
            showError('Por favor ingrese un formato de exportación');
            return;
        }
        
        const formato = formatoInput.value.trim();
        let datos = [];
        
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
        
        const lineas = [];
        datos.forEach(item => {
            let fecha = item.fecha;
            let valor = item.valor;
            
            const fechaFormateada = window.formatearFechaExportar(fecha);
            const valorFormateado = window.formatearValorExportar(valor);
            
            let linea = formato;
            linea = linea.replace(/FECHA/g, fechaFormateada);
            linea = linea.replace(/VALOR/g, valorFormateado);
            
            lineas.push(linea);
        });
        
        const contenidoCSV = lineas.join('\n');
        
        const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${tipo}_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        window.cerrarModalExportarCSV();
        showSuccess(`CSV exportado exitosamente (${datos.length} registros)`);
    };
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    const fechaDesdeInput = document.getElementById('fechaDesdeTAMAR');
    const fechaHastaInput = document.getElementById('fechaHastaTAMAR');
    
    if (fechaDesdeInput) {
        aplicarMascaraFechaTAMAR(fechaDesdeInput);
    }
    
    if (fechaHastaInput) {
        aplicarMascaraFechaTAMAR(fechaHastaInput);
    }
    
    // Leer parámetros de URL (prioridad sobre sessionStorage)
    const urlParams = new URLSearchParams(window.location.search);
    const fechaDesdeURL = urlParams.get('desde');
    const fechaHastaURL = urlParams.get('hasta');
    
    const buscarDesdeInput = document.getElementById('buscarDesdeTAMAR');
    const buscarHastaInput = document.getElementById('buscarHastaTAMAR');
    
    // Variables para fechas (declaradas fuera del bloque if para que estén disponibles después)
    let fechaDesde = null;
    let fechaHasta = null;
    let autoFiltrar = false;
    
    if (buscarDesdeInput && buscarHastaInput) {
        // Aplicar máscaras a los inputs de búsqueda
        aplicarMascaraFechaTAMAR(buscarDesdeInput);
        aplicarMascaraFechaTAMAR(buscarHastaInput);
        
        // Prioridad 1: Parámetros de URL
        if (fechaDesdeURL && fechaHastaURL) {
            // Las fechas vienen en formato DD-MM-AAAA desde la URL
            fechaDesde = fechaDesdeURL;
            fechaHasta = fechaHastaURL;
            autoFiltrar = true;
            
            // Limpiar parámetros de URL después de leerlos
            const nuevaURL = window.location.pathname;
            window.history.replaceState({}, document.title, nuevaURL);
        } 
        // Prioridad 2: sessionStorage
        else {
            fechaDesde = sessionStorage.getItem('tamar_fechaDesde');
            fechaHasta = sessionStorage.getItem('tamar_fechaHasta');
            autoFiltrar = sessionStorage.getItem('tamar_autoFiltrar') === 'true';
            
            if (fechaDesde && fechaHasta && autoFiltrar) {
                // Limpiar sessionStorage
                sessionStorage.removeItem('tamar_fechaDesde');
                sessionStorage.removeItem('tamar_fechaHasta');
                sessionStorage.removeItem('tamar_autoFiltrar');
            }
        }
        
        if (fechaDesde && fechaHasta && autoFiltrar) {
            buscarDesdeInput.value = fechaDesde;
            buscarHastaInput.value = fechaHasta;
            
            // Ejecutar el filtro automáticamente después de un pequeño delay
            // Aumentar el delay para asegurar que los inputs estén listos
            setTimeout(() => {
                if (typeof filtrarTAMARPorIntervalo === 'function') {
                    filtrarTAMARPorIntervalo();
                } else {
                    console.warn('[TAMAR] filtrarTAMARPorIntervalo no está disponible');
                }
            }, 500);
        }
    }
    
    const modal = document.getElementById('modalIntervalosTAMAR');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                cerrarModalIntervalosTAMAR();
            }
        });
    }
    
    // Limpiar datos filtrados si no hay auto-filtrar
    // Solo mostrar tabla cuando se hace una búsqueda explícita
    if (!fechaDesde || !fechaHasta || autoFiltrar !== true) {
        window.tamarDatosFiltrados = [];
        const tableContainer = document.getElementById('tamarTableContainer');
        if (tableContainer) {
            tableContainer.style.display = 'none';
        }
        ocultarBotonExportarCSV('tamar');
    }
    
    // Limpiar datos al salir de la página
    window.addEventListener('beforeunload', () => {
        window.tamarDatosFiltrados = [];
        sessionStorage.removeItem('tamar_fechaDesde');
        sessionStorage.removeItem('tamar_fechaHasta');
        sessionStorage.removeItem('tamar_autoFiltrar');
    });
});

// Cambiar página de TAMAR
async function cambiarPaginaTAMAR(nuevaPagina) {
    if (nuevaPagina < 1 || (window.tamarTotalPaginas && nuevaPagina > window.tamarTotalPaginas)) {
        return;
    }
    
    try {
        const tbody = document.getElementById('tamarTableBody');
        tbody.innerHTML = '<tr><td colspan="2" style="text-align: center; padding: 20px;">Cargando...</td></tr>';
        
        const response = await fetch(`/api/tamar/bd?pagina=${nuevaPagina}&porPagina=${window.tamarPorPagina || 50}`);
        const result = await response.json();
        
        if (result.success && result.datos) {
            window.tamarPaginaActual = result.pagina;
            window.tamarTotalPaginas = result.totalPaginas;
            window.tamarTotal = result.total;
            
            generarTablaTAMAR(result.datos);
            window.location.href = `/tamar?pagina=${nuevaPagina}`;
        } else {
            throw new Error(result.error || 'Error al cargar datos');
        }
    } catch (error) {
        console.error('Error al cambiar página:', error);
        showError('Error al cargar página: ' + error.message);
    }
}
