/**
 * JavaScript para la funcionalidad de Inventario FIFO
 */

// Referencias a elementos del DOM
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const loadingContainer = document.getElementById('loadingContainer');
const statsContainer = document.getElementById('statsContainer');
const partidasContainer = document.getElementById('partidasContainer');
const erroresContainer = document.getElementById('erroresContainer');

/**
 * Formatea un número con separador de miles y decimales
 */
function formatearNumero(numero, decimales = 2) {
    return numero.toFixed(decimales).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Ajusta la altura del panel de reglas para que coincida con el panel de importar Excel
 */
function ajustarAlturaPaneles() {
    const cardImportar = document.getElementById('cardImportarExcel');
    const cardReglas = document.getElementById('cardReglas');
    
    if (cardImportar && cardReglas) {
        // Esperar a que el DOM se renderice completamente
        setTimeout(() => {
            const alturaImportar = cardImportar.offsetHeight;
            cardReglas.style.maxHeight = alturaImportar + 'px';
        }, 100);
    }
}

// Ajustar altura al cargar la página y después de un tiempo para asegurar que el contenido esté renderizado
document.addEventListener('DOMContentLoaded', () => {
    ajustarAlturaPaneles();
    // Ajustar también después de un pequeño delay para asegurar que todo esté renderizado
    setTimeout(ajustarAlturaPaneles, 300);
});

/**
 * Toggle para expandir/contraer partidas
 */
function togglePartida(partidaId) {
    const partidaCard = document.getElementById(partidaId);
    if (partidaCard) {
        partidaCard.classList.toggle('collapsed');
    }
}

/**
 * Solicita una fecha al usuario y reprocesa el archivo hasta esa fecha
 */
window.solicitarFechaReprocesar = function() {
    // Crear modal para solicitar fecha
    const modal = document.createElement('div');
    modal.id = 'modalFechaReprocesar';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center;';
    
    // Obtener fecha de hoy en formato DD-MM-AAAA
    const hoy = new Date();
    const diaHoy = String(hoy.getDate()).padStart(2, '0');
    const mesHoy = String(hoy.getMonth() + 1).padStart(2, '0');
    const anioHoy = hoy.getFullYear();
    const fechaHoy = `${diaHoy}-${mesHoy}-${anioHoy}`;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 8px; padding: 24px; max-width: 400px; width: 90%; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" onclick="event.stopPropagation()">
            <h3 style="font-size: 18px; font-weight: 500; margin-bottom: 16px; color: #5f6368;">Reprocesar a una fecha</h3>
            <p style="font-size: 14px; color: var(--text-secondary); margin-bottom: 16px;">
                Ingrese la fecha límite hasta la cual desea procesar los movimientos (DD-MM-AAAA o DD/MM/AAAA):
            </p>
            <div class="date-input-wrapper" style="width: 100%; margin-bottom: 16px;">
                <input type="text" class="input date-input" id="inputFechaReprocesar" placeholder="DD-MM-AAAA o DD/MM/AAAA" maxlength="10" value="${fechaHoy}" style="width: 100%;" />
                <button type="button" class="date-picker-icon-btn" onclick="abrirDatePicker('inputFechaReprocesar')" title="Seleccionar fecha">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                    </svg>
                </button>
            </div>
            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button onclick="window.cerrarModalFecha()" style="padding: 10px 20px; border: 1px solid var(--border-color); border-radius: 4px; background: white; cursor: pointer; font-size: 14px; font-weight: 500; color: var(--text-primary);">
                    Cancelar
                </button>
                <button onclick="window.confirmarFechaReprocesar()" style="padding: 10px 20px; border: none; border-radius: 4px; background: #1a73e8; color: white; cursor: pointer; font-size: 14px; font-weight: 500;">
                    Reprocesar
                </button>
            </div>
        </div>
    `;
    
    // Cerrar al hacer clic fuera del modal
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            window.cerrarModalFecha();
        }
    });
    
    document.body.appendChild(modal);
    
    // Focus en el input
    setTimeout(() => {
        const input = document.getElementById('inputFechaReprocesar');
        if (input) {
            input.focus();
            // Permitir Enter para confirmar
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    confirmarFechaReprocesar();
                }
            });
        }
    }, 100);
};

/**
 * Cierra el modal de fecha
 */
window.cerrarModalFecha = function() {
    const modal = document.getElementById('modalFechaReprocesar');
    if (modal) {
        modal.remove();
    }
};

/**
 * Confirma y procesa la fecha ingresada
 */
window.confirmarFechaReprocesar = function() {
    const input = document.getElementById('inputFechaReprocesar');
    if (!input) {
        window.cerrarModalFecha();
        return;
    }
    
    const fechaInput = input.value.trim();
    
    if (!fechaInput) {
        alert('Por favor, ingrese una fecha.');
        return;
    }
    
    // Validar formato de fecha DD-MM-AAAA o DD/MM/AAAA
    const fechaRegex = /^(\d{2})[-\/](\d{2})[-\/](\d{4})$/;
    const match = fechaInput.match(fechaRegex);
    
    if (!match) {
        alert('Formato de fecha inválido. Por favor, use el formato DD-MM-AAAA o DD/MM/AAAA (ejemplo: 31-12-2024 o 31/12/2024)');
        return;
    }
    
    const dia = parseInt(match[1], 10);
    const mes = parseInt(match[2], 10);
    const anio = parseInt(match[3], 10);
    
    if (dia < 1 || dia > 31 || mes < 1 || mes > 12) {
        alert('Fecha inválida. Por favor, verifique el día y mes.');
        return;
    }
    
    // Cerrar modal
    window.cerrarModalFecha();
    
    // Obtener el archivo original del input
    const fileInput = document.getElementById('fileInput');
    if (!fileInput.files || fileInput.files.length === 0) {
        alert('No hay archivo cargado. Por favor, cargue un archivo primero.');
        return;
    }
    
    // Convertir formato DD-MM-AAAA o DD/MM/AAAA a DD/MM/AAAA para el backend
    const fechaFormatoBackend = fechaInput.replace(/-/g, '/');
    
    // Reprocesar con fecha límite
    reprocesarConFechaLimite(fileInput.files[0], fechaFormatoBackend);
};

/**
 * Reprocesa el archivo con una fecha límite
 */
async function reprocesarConFechaLimite(archivo, fechaLimite) {
    // Mostrar loading
    loadingContainer.style.display = 'block';
    statsContainer.style.display = 'none';
    partidasContainer.style.display = 'none';
    erroresContainer.style.display = 'none';
    partidasContainer.innerHTML = '';
    erroresContainer.innerHTML = '';

    // Crear FormData
    const formData = new FormData();
    formData.append('archivo', archivo);
    formData.append('fechaLimite', fechaLimite);

    try {
        const response = await fetch('/api/inventario/procesar', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            // Si hay movimientos sin mapear, mostrarlos de forma especial
            if (data.movimientosSinMapear && data.movimientosSinMapear.length > 0) {
                mostrarErroresMapeo(data);
                return;
            }
            throw new Error(data.error || 'Error al procesar el archivo');
        }

        // Mostrar resultados
        mostrarResultados(data);

    } catch (error) {
        console.error('Error:', error);
        alert('Error al procesar el archivo: ' + error.message);
    } finally {
        loadingContainer.style.display = 'none';
    }
}

/**
 * Copia la query SQL al portapapeles
 */
function copiarQuerySQL() {
    const sqlQuery = `SELECT minuta.TIPO AS TIPO_MIN, mov.TIPO AS TIPO_MOV, minuta.NUMERO as MINUTA_ORIGEN , CAST(mov.CANTIDAD AS BIGINT) AS CANTIDAD, CONVERT(VARCHAR(10), mov.FECHA, 23) AS FECHA
FROM MOVIMIENTOS_T AS mov INNER JOIN MINUTAS_T AS minuta ON mov.MINUTA_ORIGEN = minuta.OBJECT_ID 
WHERE mov.NRO_COMITENTE = '000002856' AND mov.ESPECIE = 'TTM26' AND mov.ESTADO = 'C' AND minuta.ANULADO IS NULL AND (mov.TIPO = 'I' OR mov.TIPO = 'E') 
ORDER BY mov.FECHA ASC`;
    
    navigator.clipboard.writeText(sqlQuery).then(() => {
        const btn = document.querySelector('.copy-sql-btn');
        if (btn) {
            const originalText = btn.innerHTML;
            btn.classList.add('copied');
            btn.querySelector('span').textContent = 'Copiado!';
            
            setTimeout(() => {
                btn.classList.remove('copied');
                btn.querySelector('span').textContent = 'Copiar';
            }, 2000);
        }
    }).catch(err => {
        console.error('Error al copiar:', err);
        alert('Error al copiar la query. Por favor, selecciona y copia manualmente.');
    });
}

/**
 * Muestra errores de mapeo de movimientos
 */
function mostrarErroresMapeo(data) {
    loadingContainer.style.display = 'none';
    
    let erroresHTML = '<h3 style="font-size: 18px; font-weight: 500; margin-bottom: 16px; color: #5f6368;">⚠️ Error - Movimientos Sin Mapear</h3>';
    erroresHTML += `<p style="color: var(--text-secondary); margin-bottom: 16px; font-size: 14px;">${data.error}</p>`;
    
    if (data.detalles) {
        erroresHTML += `<div style="background: #fce8e6; padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 13px; white-space: pre-line; font-family: monospace;">${data.detalles}</div>`;
    }
    
    if (data.movimientosSinMapear && data.movimientosSinMapear.length > 0) {
        erroresHTML += '<div style="margin-top: 16px;"><strong style="color: #d93025;">Movimientos sin mapear:</strong></div>';
        erroresHTML += '<table style="width: 100%; border-collapse: collapse; margin-top: 12px;">';
        erroresHTML += `
            <thead>
                <tr style="background: #fce8e6;">
                    <th style="padding: 8px; text-align: left; font-size: 12px; border: 1px solid #fce8e6;">TIPO_MIN</th>
                    <th style="padding: 8px; text-align: left; font-size: 12px; border: 1px solid #fce8e6;">TIPO_MOV</th>
                    <th style="padding: 8px; text-align: left; font-size: 12px; border: 1px solid #fce8e6;">MINUTA_ORIGEN</th>
                    <th style="padding: 8px; text-align: right; font-size: 12px; border: 1px solid #fce8e6;">CANTIDAD</th>
                    <th style="padding: 8px; text-align: left; font-size: 12px; border: 1px solid #fce8e6;">FECHA</th>
                </tr>
            </thead>
            <tbody>
        `;
        
        data.movimientosSinMapear.forEach(mov => {
            erroresHTML += `
                <tr style="border-bottom: 1px solid #fce8e6;">
                    <td style="padding: 8px; font-size: 12px;"><strong>${mov.tipoMin}</strong></td>
                    <td style="padding: 8px; font-size: 12px;">${mov.tipoMov}</td>
                    <td style="padding: 8px; font-size: 12px;">${mov.minutaOrigen}</td>
                    <td style="padding: 8px; font-size: 12px; text-align: right;">${formatearNumero(mov.cantidad)}</td>
                    <td style="padding: 8px; font-size: 12px;">${mov.fecha}</td>
                </tr>
            `;
        });
        
        erroresHTML += '</tbody></table>';
    }
    
    erroresContainer.innerHTML = erroresHTML;
    erroresContainer.style.display = 'block';
    statsContainer.style.display = 'none';
    partidasContainer.style.display = 'none';
}

// Event listeners para drag & drop
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        fileInput.files = files;
        procesarArchivo(files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        procesarArchivo(e.target.files[0]);
    }
});

/**
 * Procesa el archivo Excel
 */
async function procesarArchivo(archivo) {
    if (!archivo) return;

    // Validar extensión
    const extension = archivo.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls'].includes(extension)) {
        alert('Por favor, selecciona un archivo Excel (.xlsx o .xls)');
        return;
    }

    // Mostrar loading
    loadingContainer.style.display = 'block';
    statsContainer.style.display = 'none';
    partidasContainer.style.display = 'none';
    erroresContainer.style.display = 'none';
    partidasContainer.innerHTML = '';
    erroresContainer.innerHTML = '';

    // Crear FormData
    const formData = new FormData();
    formData.append('archivo', archivo);

    try {
        const response = await fetch('/api/inventario/procesar', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            // Si hay movimientos sin mapear, mostrarlos de forma especial
            if (data.movimientosSinMapear && data.movimientosSinMapear.length > 0) {
                mostrarErroresMapeo(data);
                return;
            }
            throw new Error(data.error || 'Error al procesar el archivo');
        }

        // Mostrar resultados
        mostrarResultados(data);

    } catch (error) {
        console.error('Error:', error);
        alert('Error al procesar el archivo: ' + error.message);
    } finally {
        loadingContainer.style.display = 'none';
    }
}

/**
 * Muestra los resultados del procesamiento
 */
function mostrarResultados(data) {
    // Mostrar estadísticas
    document.getElementById('statTotalMovimientos').textContent = data.totalMovimientos || 0;
    document.getElementById('statTotalPartidas').textContent = data.totalPartidas || 0;
    const sumatoriaSaldos = data.sumatoriaSaldos !== undefined ? data.sumatoriaSaldos : 0;
    document.getElementById('statSumatoriaSaldos').textContent = formatearNumero(sumatoriaSaldos);
    statsContainer.style.display = 'block';
    
    // Agregar botón "Reprocesar a una fecha" si hay partidas procesadas
    if (data.partidas && data.partidas.length > 0) {
        // Eliminar botón anterior si existe
        const btnAnterior = document.getElementById('btnReprocesarContainer');
        if (btnAnterior) {
            btnAnterior.remove();
        }
        
        const btnContainer = document.createElement('div');
        btnContainer.id = 'btnReprocesarContainer';
        btnContainer.style.marginTop = '20px';
        btnContainer.style.marginBottom = '20px';
        btnContainer.innerHTML = `
            <button onclick="window.solicitarFechaReprocesar()" class="button" style="background: #1a73e8; color: white; padding: 10px 24px; border-radius: 4px; border: none; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s;">
                Reprocesar a una fecha
            </button>
        `;
        statsContainer.appendChild(btnContainer);
    }

    // Mostrar errores
    if (data.errores && data.errores.length > 0) {
        let erroresHTML = '<h3 style="font-size: 18px; font-weight: 500; margin-bottom: 16px; color: #5f6368;">⚠️ Error - Procesamiento Detenido</h3>';
        erroresHTML += '<p style="color: var(--text-secondary); margin-bottom: 16px; font-size: 14px;">El procesamiento se detuvo al encontrar el primer error. A continuación se muestran las partidas creadas hasta ese momento.</p>';
        
        data.errores.forEach((error, index) => {
            erroresHTML += `
                <div class="error-card">
                    <div class="error-title">Error ${index + 1}</div>
                    <div class="error-message" style="white-space: pre-line;">${error.mensaje}</div>
                    <div style="margin-top: 8px; font-size: 12px; color: var(--text-secondary);">
                        <strong>Movimiento con error:</strong> ${error.movimiento.tipoMin} | ${error.movimiento.tipoMov} | 
                        ${error.movimiento.minutaOrigen} | ${error.movimiento.cantidad} | ${error.movimiento.fechaStr}
                    </div>
                    ${error.movimientosPendientes && error.movimientosPendientes.length > 0 ? `
                        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #fce8e6;">
                            <div style="font-size: 13px; font-weight: 600; color: #d93025; margin-bottom: 8px;">
                                Movimientos pendientes del día (${error.movimientosPendientes.length}):
                            </div>
                            <div style="font-size: 12px; color: var(--text-secondary); max-height: 200px; overflow-y: auto;">
                                <table style="width: 100%; border-collapse: collapse;">
                                    <thead>
                                        <tr style="background: #fce8e6;">
                                            <th style="padding: 6px; text-align: left; font-size: 11px;">TIPO_MIN</th>
                                            <th style="padding: 6px; text-align: left; font-size: 11px;">TIPO_MOV</th>
                                            <th style="padding: 6px; text-align: left; font-size: 11px;">MINUTA_ORIGEN</th>
                                            <th style="padding: 6px; text-align: right; font-size: 11px;">CANTIDAD</th>
                                            <th style="padding: 6px; text-align: left; font-size: 11px;">FECHA</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${error.movimientosPendientes.map(mov => `
                                            <tr style="border-bottom: 1px solid #fce8e6;">
                                                <td style="padding: 6px; font-size: 11px;">${mov.tipoMin}</td>
                                                <td style="padding: 6px; font-size: 11px;">${mov.tipoMov}</td>
                                                <td style="padding: 6px; font-size: 11px;">${mov.minutaOrigen}</td>
                                                <td style="padding: 6px; text-align: right; font-size: 11px;">${mov.cantidad.toLocaleString()}</td>
                                                <td style="padding: 6px; font-size: 11px;">${mov.fecha}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        });

        erroresContainer.innerHTML = erroresHTML;
        erroresContainer.style.display = 'block';
    }

    // Mostrar partidas (siempre, incluso si hay errores)
    if (data.partidas && data.partidas.length > 0) {
        let partidasHTML = '<h3 style="font-size: 18px; font-weight: 500; margin-bottom: 16px; color: #5f6368;">Partidas Creadas</h3>';
        if (data.errores && data.errores.length > 0) {
            partidasHTML += '<p style="color: var(--text-secondary); margin-bottom: 16px; font-size: 14px;">Estas son las partidas creadas hasta el momento en que se encontró el error.</p>';
        }
        
        data.partidas.forEach((partida, index) => {
            const saldoClass = partida.saldo > 0 ? 'saldo-positivo' : 
                              partida.saldo === 0 ? 'saldo-cero' : 'saldo-negativo';
            const partidaId = `partida-${partida.id}`;
            
            partidasHTML += `
                <div class="partida-card" id="${partidaId}">
                    <div class="partida-header" onclick="togglePartida('${partidaId}')" title="Expandir/Contraer">
                        <h4 style="font-size: 16px; font-weight: 600; color: var(--primary-color); margin: 0;">
                            Partida #${partida.id}
                        </h4>
                        <div style="display: flex; align-items: center; gap: 16px;">
                            <span class="${saldoClass}" style="font-size: 18px; font-weight: 600;">
                                Saldo: ${formatearNumero(partida.saldo)}
                            </span>
                        </div>
                    </div>
                    
                    <div class="partida-content">
                        <div class="partida-info" style="background: rgba(30, 142, 62, 0.1); padding: 16px; border-radius: 8px; border: 1px solid rgba(30, 142, 62, 0.2);">
                            <div class="partida-info-fecha">
                                <div class="partida-info-item">
                                    <span class="partida-info-label">Fecha</span>
                                    <span class="partida-info-value">${partida.fechaStr}</span>
                                </div>
                            </div>
                            <div class="partida-info-resto">
                                <div class="partida-info-item">
                                    <span class="partida-info-label">TIPO_MIN</span>
                                    <span class="partida-info-value">${partida.tipoMin}</span>
                                </div>
                                <div class="partida-info-item">
                                    <span class="partida-info-label">TIPO_MOV</span>
                                    <span class="partida-info-value">${partida.tipoMov}</span>
                                </div>
                                <div class="partida-info-item">
                                    <span class="partida-info-label">MINUTA_ORIGEN</span>
                                    <span class="partida-info-value">${partida.minutaOrigen}</span>
                                </div>
                                <div class="partida-info-item">
                                    <span class="partida-info-label">Cantidad Inicial</span>
                                    <span class="partida-info-value">${formatearNumero(partida.cantidadInicial)}</span>
                                </div>
                            </div>
                        </div>
                        
                        ${partida.imputaciones && partida.imputaciones.length > 0 ? `
                            <div style="margin-top: 16px;">
                                <h5 style="font-size: 14px; font-weight: 500; margin-bottom: 8px; color: var(--text-secondary);">
                                    Imputaciones (${partida.imputaciones.length})
                                </h5>
                                <table class="imputaciones-table">
                                    <thead>
                                        <tr>
                                            <th>Fecha</th>
                                            <th>TIPO_MIN</th>
                                            <th>TIPO_MOV</th>
                                            <th>MINUTA_ORIGEN</th>
                                            <th>Cantidad Original</th>
                                            <th>Cantidad Imputada</th>
                                            <th>Saldo Después</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${partida.imputaciones.map(imp => {
                                            const impSaldoClass = imp.saldoDespues > 0 ? 'saldo-positivo' : 
                                                                 imp.saldoDespues === 0 ? 'saldo-cero' : 'saldo-negativo';
                                            let cantidadOriginal = imp.cantidadOriginal !== undefined ? imp.cantidadOriginal : imp.cantidad;
                                            const cantidadImputada = imp.cantidad;
                                            
                                            // Si es un egreso, la cantidad original debe mostrarse como negativa
                                            const esEgreso = imp.tipoMov === 'E';
                                            if (esEgreso && cantidadOriginal > 0) {
                                                cantidadOriginal = -cantidadOriginal;
                                            }
                                            
                                            const cantidadesDifieren = Math.abs(cantidadOriginal) !== Math.abs(cantidadImputada);
                                            const rowClass = cantidadesDifieren ? 'imputacion-cantidad-diferente' : '';
                                            
                                            // Verificar si es una imputación pendiente x PA
                                            const esPendienteXPA = imp.pendiente === true || imp.pendienteXPA === true;
                                            const estaResuelta = imp.resuelta === true;
                                            const pendienteClass = esPendienteXPA ? 'imputacion-pendiente-x-pa' : '';
                                            const pendienteStyle = esPendienteXPA && !estaResuelta ? 'background: rgba(255, 152, 0, 0.1); border-left: 3px solid #ff9800;' : 
                                                                  esPendienteXPA && estaResuelta ? 'background: rgba(76, 175, 80, 0.15); border-left: 3px solid #4caf50;' : '';
                                            
                                            let pendienteBadge = '';
                                            if (esPendienteXPA) {
                                                if (estaResuelta) {
                                                    const infoResolucion = imp.fechaResolucionStr ? ` el ${imp.fechaResolucionStr}` : '';
                                                    const infoPartida = imp.partidaResolucion ? ` en partida #${imp.partidaResolucion}` : '';
                                                    pendienteBadge = `<span style="background: #4caf50; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-left: 4px;" title="Resuelta${infoResolucion}${infoPartida}">PENDIENTE x PA (RESUELTA)</span>`;
                                                } else {
                                                    pendienteBadge = '<span style="background: #ff9800; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-left: 4px;">PENDIENTE x PA</span>';
                                                }
                                            }
                                            
                                            // Verificar si es una imputación resuelta desde pendiente x PA
                                            const esResueltaDesdePendiente = imp.resueltaDesdePendienteXPA === true;
                                            const resueltaClass = esResueltaDesdePendiente ? 'imputacion-resuelta-desde-pendiente' : '';
                                            const resueltaStyle = esResueltaDesdePendiente ? 'background: rgba(76, 175, 80, 0.1); border-left: 3px solid #4caf50;' : '';
                                            const resueltaBadge = esResueltaDesdePendiente ? '<span style="background: #4caf50; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-left: 4px;">RESUELTA desde PA</span>' : '';
                                            
                                            // Combinar estilos y clases
                                            const combinedClass = `${rowClass} ${pendienteClass} ${resueltaClass}`;
                                            const combinedStyle = esPendienteXPA ? pendienteStyle : (esResueltaDesdePendiente ? resueltaStyle : '');
                                            const combinedBadge = esPendienteXPA ? pendienteBadge : (esResueltaDesdePendiente ? resueltaBadge : '');
                                            
                                            // Información adicional para mostrar
                                            let infoAdicional = '';
                                            if (esPendienteXPA && !estaResuelta) {
                                                infoAdicional = ' <span style="color: #ff9800; font-size: 11px;">(pendiente)</span>';
                                            } else if (esPendienteXPA && estaResuelta) {
                                                infoAdicional = ' <span style="color: #4caf50; font-size: 11px;">(resuelta)</span>';
                                            } else if (esResueltaDesdePendiente && imp.partidaPAOrigen) {
                                                infoAdicional = ` <span style="color: #4caf50; font-size: 11px;" title="Resuelta desde partida PA #${imp.partidaPAOrigen}">(resuelta)</span>`;
                                            }
                                            
                                            return `
                                                <tr class="${combinedClass}" style="${combinedStyle}">
                                                    <td>${imp.fechaStr}${combinedBadge}</td>
                                                    <td>${imp.tipoMin}</td>
                                                    <td>${imp.tipoMov}</td>
                                                    <td>${imp.minutaOrigen}</td>
                                                    <td style="color: ${cantidadOriginal < 0 ? '#d93025' : '#1e8e3e'};">
                                                        ${cantidadOriginal > 0 ? '+' : ''}${formatearNumero(cantidadOriginal)}
                                                    </td>
                                                    <td style="color: ${cantidadImputada < 0 ? '#d93025' : '#1e8e3e'};">
                                                        ${cantidadImputada > 0 ? '+' : ''}${formatearNumero(cantidadImputada)}
                                                    </td>
                                                    <td class="${impSaldoClass}">${formatearNumero(imp.saldoDespues)}${infoAdicional}</td>
                                                </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        ` : '<p style="color: var(--text-secondary); font-size: 14px; margin-top: 12px;">No hay imputaciones</p>'}
                    </div>
                </div>
            `;
        });

        partidasContainer.innerHTML = partidasHTML;
        partidasContainer.style.display = 'block';
    }
}

