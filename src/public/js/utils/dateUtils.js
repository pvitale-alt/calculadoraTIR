/**
 * Utilidades compartidas para manejo de fechas
 * Usado por todas las calculadoras y módulos
 */

/**
 * Convertir DD/MM/AAAA a YYYY-MM-DD
 */
function convertirFechaDDMMAAAAaYYYYMMDD(fechaDDMMAAAA) {
    if (!fechaDDMMAAAA) return '';
    // Aceptar tanto DD-MM-AAAA como DD/MM/AAAA
    const partes = fechaDDMMAAAA.split(/[-\/]/);
    if (partes.length !== 3) return '';
    const dia = partes[0].padStart(2, '0');
    const mes = partes[1].padStart(2, '0');
    const año = partes[2];
    return `${año}-${mes}-${dia}`;
}

/**
 * Convertir YYYY-MM-DD a DD/MM/AAAA o DD-MM-AAAA
 * @param {string} fechaYYYYMMDD - Fecha en formato YYYY-MM-DD
 * @param {string} separador - Separador a usar ('/' por defecto, '-' para CER)
 */
function convertirFechaYYYYMMDDaDDMMAAAA(fechaYYYYMMDD, separador = '/') {
    if (!fechaYYYYMMDD) return '';
    // Formato esperado: YYYY-MM-DD
    if (typeof fechaYYYYMMDD === 'string' && /^\d{4}-\d{2}-\d{2}/.test(fechaYYYYMMDD)) {
        const partes = fechaYYYYMMDD.split('T')[0].split('-');
        return `${partes[2]}${separador}${partes[1]}${separador}${partes[0]}`;
    }
    return fechaYYYYMMDD;
}

/**
 * Convertir YYYY-MM-DD a DD/MM (solo día y mes)
 */
function convertirFechaYYYYMMDDaDDMM(fechaYYYYMMDD) {
    if (!fechaYYYYMMDD) return '';
    if (typeof fechaYYYYMMDD === 'string' && /^\d{4}-\d{2}-\d{2}/.test(fechaYYYYMMDD)) {
        const partes = fechaYYYYMMDD.split('T')[0].split('-');
        return `${partes[2]}/${partes[1]}`;
    }
    return '';
}

/**
 * Formatear fecha para input date (YYYY-MM-DD)
 * Maneja correctamente las fechas sin problemas de zona horaria
 */
function formatearFechaInput(fecha) {
    if (!fecha) return '';
    
    // Si es un string en formato DD/MM/AAAA, convertir a YYYY-MM-DD
    if (typeof fecha === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) {
        return convertirFechaDDMMAAAAaYYYYMMDD(fecha);
    }
    
    // Si es un string en formato YYYY-MM-DD, devolverlo directamente
    if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return fecha;
    }
    
    // Si es un objeto Date, formatearlo correctamente
    const d = new Date(fecha);
    // Usar UTC para evitar problemas de zona horaria
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Crear fecha desde string YYYY-MM-DD sin problemas de zona horaria
 */
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

/**
 * Validar formato de fecha DD/MM/AAAA o DD-MM-AAAA (acepta ambos)
 */
function validarFechaDDMMAAAA(fecha) {
    if (!fecha) return false;
    // Aceptar tanto DD-MM-AAAA como DD/MM/AAAA
    const regex = /^(\d{2})[-\/](\d{2})[-\/](\d{4})$/;
    const match = fecha.match(regex);
    if (!match) return false;
    
    const dia = parseInt(match[1], 10);
    const mes = parseInt(match[2], 10);
    const año = parseInt(match[3], 10);
    
    // Validar rangos
    if (mes < 1 || mes > 12) return false;
    if (dia < 1 || dia > 31) return false;
    if (año < 1900 || año > 2100) return false;
    
    // Validar día según mes
    const diasPorMes = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    // Año bisiesto
    if (mes === 2 && ((año % 4 === 0 && año % 100 !== 0) || año % 400 === 0)) {
        if (dia > 29) return false;
    } else {
        if (dia > diasPorMes[mes - 1]) return false;
    }
    
    return true;
}

/**
 * Agregar meses a una fecha
 */
function agregarMeses(fecha, meses) {
    const nuevaFecha = new Date(fecha);
    nuevaFecha.setMonth(nuevaFecha.getMonth() + meses);
    return nuevaFecha;
}

/**
 * Combinar DD/MM con año de fecha de emisión para obtener fecha completa
 */
function combinarFechaPagoConEmision(fechaPagoDDMM, fechaEmision) {
    if (!fechaPagoDDMM || !fechaEmision) return null;
    
    // Validar formato DD/MM
    if (!/^\d{2}\/\d{2}$/.test(fechaPagoDDMM)) {
        return null;
    }
    
    // Convertir fecha de emisión a Date si es string
    const fechaEmisionDate = crearFechaDesdeString(fechaEmision);
    if (!fechaEmisionDate) return null;
    
    const añoEmision = fechaEmisionDate.getFullYear();
    const partes = fechaPagoDDMM.split('/');
    const dia = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10) - 1; // Los meses en JS son 0-11
    
    // Crear fecha con el año de emisión
    let fechaCompleta = new Date(añoEmision, mes, dia);
    
    // Si la fecha de pago es anterior a la fecha de emisión, usar el año siguiente
    if (fechaCompleta < fechaEmisionDate) {
        fechaCompleta = new Date(añoEmision + 1, mes, dia);
    }
    
    return fechaCompleta;
}

/**
 * Formatear fecha para mostrar (DD/MM/AAAA)
 */
function formatearFechaMostrar(fechaString) {
    if (!fechaString) return '';
    const fecha = crearFechaDesdeString(fechaString);
    if (!fecha || isNaN(fecha.getTime())) return '';
    return convertirFechaYYYYMMDDaDDMMAAAA(formatearFechaInput(fecha));
}

