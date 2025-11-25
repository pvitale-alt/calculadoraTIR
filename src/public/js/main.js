// JavaScript principal para funcionalidades comunes

// Función auxiliar para formatear números
function formatNumber(num, decimals = 2) {
    if (num === null || num === undefined || isNaN(num)) {
        return '-';
    }
    return parseFloat(num).toFixed(decimals);
}

// Función auxiliar para formatear fechas
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR');
}

// Función auxiliar para parsear fechas desde input
function parseDate(dateString) {
    if (!dateString) return null;
    return new Date(dateString);
}

// Crear fecha desde string YYYY-MM-DD sin problemas de zona horaria (Argentina)
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

// Formatear fecha para input date (YYYY-MM-DD) sin problemas de zona horaria
function formatearFechaInput(fecha) {
    if (!fecha) return '';
    
    // Si es un string en formato YYYY-MM-DD, devolverlo directamente
    if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return fecha;
    }
    
    // Si es un objeto Date, formatearlo correctamente sin conversión UTC
    const d = crearFechaDesdeString(fecha);
    if (!d || isNaN(d.getTime())) return '';
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Función para mostrar mensajes de error
function showError(message) {
    // Crear notificación temporal
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 24px;
        background: #fce8e6;
        color: #d93025;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        z-index: 10000;
        font-size: 14px;
        max-width: 400px;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Remover después de 5 segundos
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Función para mostrar mensajes de éxito
function showSuccess(message) {
    // Crear notificación temporal
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 24px;
        background: #e6f4ea;
        color: #1e8e3e;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        z-index: 10000;
        font-size: 14px;
        max-width: 400px;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Agregar estilos de animación si no existen
if (!document.getElementById('notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

// Date Picker
let datePickerState = {
    inputId: null,
    currentDate: new Date(),
    selectedDate: null,
    mostrarSelectorAnio: false,
    rangoAnioInicio: null,
    rangoAnioFin: null
};

const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const diasSemana = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];

function abrirDatePicker(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    // Cerrar otros date pickers
    document.querySelectorAll('.date-picker-popup').forEach(popup => {
        if (popup.id !== `datePicker${inputId.charAt(0).toUpperCase() + inputId.slice(1)}`) {
            popup.style.display = 'none';
        }
    });
    
    const popupId = `datePicker${inputId.charAt(0).toUpperCase() + inputId.slice(1)}`;
    let popup = document.getElementById(popupId);
    
    if (!popup) {
        popup = document.createElement('div');
        popup.id = popupId;
        popup.className = 'date-picker-popup';
        input.parentElement.appendChild(popup);
    }
    
    // Inicializar estado si no existe
    if (!datePickerState.currentDate || isNaN(datePickerState.currentDate.getTime())) {
        datePickerState.currentDate = new Date();
    }
    
    // Parsear fecha actual del input si existe
    const fechaActual = input.value;
    if (fechaActual && fechaActual.trim()) {
        const partes = fechaActual.trim().split(/[-\/]/);
        if (partes.length === 3) {
            const año = parseInt(partes[2], 10);
            const mes = parseInt(partes[1], 10) - 1;
            const dia = parseInt(partes[0], 10);
            if (!isNaN(año) && !isNaN(mes) && !isNaN(dia) && año >= 1900 && año <= 2100 && mes >= 0 && mes <= 11) {
                datePickerState.selectedDate = new Date(año, mes, dia);
                datePickerState.currentDate = new Date(datePickerState.selectedDate);
            } else {
                datePickerState.selectedDate = null;
                datePickerState.currentDate = new Date();
            }
        } else {
            datePickerState.selectedDate = null;
            datePickerState.currentDate = new Date();
        }
    } else {
        datePickerState.selectedDate = null;
        datePickerState.currentDate = new Date();
    }
    
    datePickerState.inputId = inputId;
    datePickerState.mostrarSelectorAnio = false;
    
    renderizarDatePicker(popup);
    popup.style.display = 'block';
    
    // Cerrar al hacer clic fuera (pero no cuando se hace clic dentro del popup)
    setTimeout(() => {
        document.addEventListener('click', function cerrarDatePicker(e) {
            // No cerrar si el clic es dentro del popup o en el input o en el icono
            if (!popup.contains(e.target) && !input.contains(e.target) && !e.target.closest('.date-picker-icon')) {
                // Verificar que no sea un botón dentro del popup
                if (!e.target.closest('.date-picker-nav-btn') && !e.target.closest('.date-picker-day') && !e.target.closest('.date-picker-year')) {
                    popup.style.display = 'none';
                    document.removeEventListener('click', cerrarDatePicker);
                }
            }
        });
    }, 0);
}

function renderizarDatePicker(popup) {
    if (!datePickerState.inputId || !datePickerState.currentDate) {
        return;
    }
    
    const año = datePickerState.currentDate.getFullYear();
    const mes = datePickerState.currentDate.getMonth();
    
    // Validar que año y mes sean válidos
    if (isNaN(año) || isNaN(mes) || año < 1900 || año > 2100 || mes < 0 || mes > 11) {
        console.error('Fecha inválida en datePickerState:', datePickerState.currentDate);
        datePickerState.currentDate = new Date();
        return;
    }
    
    // Si está en modo selector de año, mostrar grid de años
    if (datePickerState.mostrarSelectorAnio) {
        const añoActual = new Date().getFullYear();
        // Si no hay rango guardado, inicializar con rango centrado en el año actual
        if (datePickerState.rangoAnioInicio === null || datePickerState.rangoAnioFin === null) {
            datePickerState.rangoAnioInicio = añoActual - 10;
            datePickerState.rangoAnioFin = añoActual + 10;
        }
        const añoInicio = datePickerState.rangoAnioInicio;
        const añoFin = datePickerState.rangoAnioFin;
        
        let html = `
            <div class="date-picker-header">
                <button class="date-picker-nav-btn" onclick="event.stopPropagation(); cambiarRangoAnio(-20);">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                    </svg>
                </button>
                <div class="date-picker-month-year" style="cursor: pointer;" onclick="event.stopPropagation(); toggleSelectorAnio();">${añoInicio} - ${añoFin}</div>
                <button class="date-picker-nav-btn" onclick="event.stopPropagation(); cambiarRangoAnio(20);">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                    </svg>
                </button>
            </div>
            <div class="date-picker-years-grid">
        `;
        
        for (let a = añoInicio; a <= añoFin; a++) {
            const esAñoActual = a === año;
            const esAñoHoy = a === añoActual;
            let clases = 'date-picker-year';
            if (esAñoActual) clases += ' selected';
            if (esAñoHoy) clases += ' today';
            
            html += `<button class="${clases}" onclick="event.stopPropagation(); seleccionarAnio(${a});">${a}</button>`;
        }
        
        html += '</div>';
        popup.innerHTML = html;
        return;
    }
    
    // Primer día del mes
    const primerDia = new Date(año, mes, 1);
    const ultimoDia = new Date(año, mes + 1, 0);
    const diasMes = ultimoDia.getDate();
    const diaInicioSemana = primerDia.getDay();
    
    let html = `
        <div class="date-picker-header">
            <button class="date-picker-nav-btn" onclick="event.stopPropagation(); cambiarMesDatePicker(-1);" title="Mes anterior">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                </svg>
            </button>
            <div class="date-picker-month-year" style="cursor: pointer; display: flex; gap: 8px; align-items: center;">
                <span onclick="event.stopPropagation(); toggleSelectorAnio();" style="flex: 1; text-align: center;">${meses[mes]}</span>
                <span onclick="event.stopPropagation(); toggleSelectorAnio();" style="flex: 1; text-align: center; font-weight: 600;">${año}</span>
            </div>
            <button class="date-picker-nav-btn" onclick="event.stopPropagation(); cambiarMesDatePicker(1);" title="Mes siguiente">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                </svg>
            </button>
        </div>
        <div class="date-picker-weekdays">
            ${diasSemana.map(dia => `<div class="date-picker-weekday">${dia}</div>`).join('')}
        </div>
        <div class="date-picker-days">
    `;
    
    // Días del mes anterior
    const mesAnterior = new Date(año, mes, 0);
    const diasMesAnterior = mesAnterior.getDate();
    for (let i = diaInicioSemana - 1; i >= 0; i--) {
        const dia = diasMesAnterior - i;
        html += `<button class="date-picker-day other-month" onclick="event.stopPropagation(); seleccionarFecha(${año}, ${mes - 1}, ${dia});">${dia}</button>`;
    }
    
    // Días del mes actual
    const hoy = new Date();
    for (let dia = 1; dia <= diasMes; dia++) {
        const fecha = new Date(año, mes, dia);
        let clases = 'date-picker-day';
        
        if (fecha.toDateString() === hoy.toDateString()) {
            clases += ' today';
        }
        
        if (datePickerState.selectedDate && fecha.toDateString() === datePickerState.selectedDate.toDateString()) {
            clases += ' selected';
        }
        
        html += `<button class="${clases}" onclick="event.stopPropagation(); seleccionarFecha(${año}, ${mes}, ${dia});">${dia}</button>`;
    }
    
    // Días del mes siguiente
    const diasRestantes = 42 - (diaInicioSemana + diasMes);
    for (let dia = 1; dia <= diasRestantes; dia++) {
        html += `<button class="date-picker-day other-month" onclick="event.stopPropagation(); seleccionarFecha(${año}, ${mes + 1}, ${dia});">${dia}</button>`;
    }
    
    html += '</div>';
    popup.innerHTML = html;
}

function cambiarMesDatePicker(delta) {
    if (!datePickerState.inputId) return;
    
    const nuevaFecha = new Date(datePickerState.currentDate);
    nuevaFecha.setMonth(nuevaFecha.getMonth() + delta);
    datePickerState.currentDate = nuevaFecha;
    
    // Asegurar que no estemos en modo selector de año
    datePickerState.mostrarSelectorAnio = false;
    
    const popupId = `datePicker${datePickerState.inputId.charAt(0).toUpperCase() + datePickerState.inputId.slice(1)}`;
    const popup = document.getElementById(popupId);
    if (popup) {
        renderizarDatePicker(popup);
    }
}

function cambiarAnioDatePicker(delta) {
    if (!datePickerState.inputId) return;
    
    const nuevaFecha = new Date(datePickerState.currentDate);
    nuevaFecha.setFullYear(nuevaFecha.getFullYear() + delta);
    datePickerState.currentDate = nuevaFecha;
    
    const popupId = `datePicker${datePickerState.inputId.charAt(0).toUpperCase() + datePickerState.inputId.slice(1)}`;
    const popup = document.getElementById(popupId);
    if (popup) {
        renderizarDatePicker(popup);
    }
}

function toggleSelectorAnio() {
    if (!datePickerState.inputId) return;
    
    datePickerState.mostrarSelectorAnio = !datePickerState.mostrarSelectorAnio;
    
    // Si estamos abriendo el selector, inicializar el rango centrado en el año actual
    if (datePickerState.mostrarSelectorAnio) {
        const añoActual = datePickerState.currentDate.getFullYear();
        datePickerState.rangoAnioInicio = añoActual - 10;
        datePickerState.rangoAnioFin = añoActual + 10;
    }
    
    const popupId = `datePicker${datePickerState.inputId.charAt(0).toUpperCase() + datePickerState.inputId.slice(1)}`;
    const popup = document.getElementById(popupId);
    if (popup) {
        renderizarDatePicker(popup);
    }
}

function seleccionarAnio(añoSeleccionado) {
    if (!datePickerState.inputId) return;
    
    datePickerState.currentDate.setFullYear(añoSeleccionado);
    datePickerState.mostrarSelectorAnio = false;
    
    const popupId = `datePicker${datePickerState.inputId.charAt(0).toUpperCase() + datePickerState.inputId.slice(1)}`;
    const popup = document.getElementById(popupId);
    if (popup) {
        renderizarDatePicker(popup);
    }
}

function cambiarRangoAnio(delta) {
    if (!datePickerState.inputId) return;
    
    // Inicializar rango si no existe
    if (datePickerState.rangoAnioInicio === null || datePickerState.rangoAnioFin === null) {
        const añoActual = new Date().getFullYear();
        datePickerState.rangoAnioInicio = añoActual - 10;
        datePickerState.rangoAnioFin = añoActual + 10;
    }
    
    // Cambiar el rango
    const rango = datePickerState.rangoAnioFin - datePickerState.rangoAnioInicio;
    datePickerState.rangoAnioInicio += delta;
    datePickerState.rangoAnioFin = datePickerState.rangoAnioInicio + rango;
    
    const popupId = `datePicker${datePickerState.inputId.charAt(0).toUpperCase() + datePickerState.inputId.slice(1)}`;
    const popup = document.getElementById(popupId);
    if (popup) {
        renderizarDatePicker(popup);
    }
}

function seleccionarFecha(año, mes, dia) {
    if (!datePickerState.inputId) return;
    
    const fecha = new Date(año, mes, dia);
    datePickerState.selectedDate = fecha;
    datePickerState.currentDate = new Date(fecha); // Actualizar currentDate también
    
    // Formatear como DD-MM-AAAA
    const diaStr = String(dia).padStart(2, '0');
    const mesStr = String(mes + 1).padStart(2, '0');
    const añoStr = String(año);
    const fechaFormateada = `${diaStr}-${mesStr}-${añoStr}`;
    
    const input = document.getElementById(datePickerState.inputId);
    if (input) {
        input.value = fechaFormateada;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    // Cerrar popup
    const popupId = `datePicker${datePickerState.inputId.charAt(0).toUpperCase() + datePickerState.inputId.slice(1)}`;
    const popup = document.getElementById(popupId);
    if (popup) {
        popup.style.display = 'none';
    }
    
    // Limpiar el estado para evitar problemas al reabrir
    datePickerState.inputId = null;
}

// Validar formato DD-MM-AAAA o DD/MM/AAAA (función global - acepta ambos)
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
