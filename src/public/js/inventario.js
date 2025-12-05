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
    document.getElementById('statErrores').textContent = data.errores ? data.errores.length : 0;
    statsContainer.style.display = 'block';

    // Mostrar errores
    if (data.errores && data.errores.length > 0) {
        let erroresHTML = '<h3 style="font-size: 18px; font-weight: 500; margin-bottom: 16px; color: #d93025;">⚠️ Error - Procesamiento Detenido</h3>';
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
        let partidasHTML = '<h3 style="font-size: 18px; font-weight: 500; margin-bottom: 16px;">Partidas Creadas</h3>';
        if (data.errores && data.errores.length > 0) {
            partidasHTML += '<p style="color: var(--text-secondary); margin-bottom: 16px; font-size: 14px;">Estas son las partidas creadas hasta el momento en que se encontró el error.</p>';
        }
        
        data.partidas.forEach((partida) => {
            const saldoClass = partida.saldo > 0 ? 'saldo-positivo' : 
                              partida.saldo === 0 ? 'saldo-cero' : 'saldo-negativo';
            
            partidasHTML += `
                <div class="partida-card">
                    <div class="partida-header">
                        <h4 style="font-size: 16px; font-weight: 600; color: var(--primary-color); margin: 0;">
                            Partida #${partida.id}
                        </h4>
                        <div style="display: flex; align-items: center; gap: 16px;">
                            <span class="${saldoClass}" style="font-size: 18px; font-weight: 600;">
                                Saldo: ${formatearNumero(partida.saldo)}
                            </span>
                        </div>
                    </div>
                    
                    <div class="partida-info" style="background: rgba(30, 142, 62, 0.1); padding: 16px; border-radius: 8px; border: 1px solid rgba(30, 142, 62, 0.2);">
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
                            <span class="partida-info-label">Fecha</span>
                            <span class="partida-info-value">${partida.fechaStr}</span>
                        </div>
                        <div class="partida-info-item">
                            <span class="partida-info-label">Cantidad Inicial</span>
                            <span class="partida-info-value">${formatearNumero(partida.cantidadInicial)}</span>
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
                                        
                                        return `
                                            <tr class="${rowClass}">
                                                <td>${imp.fechaStr}</td>
                                                <td>${imp.tipoMin}</td>
                                                <td>${imp.tipoMov}</td>
                                                <td>${imp.minutaOrigen}</td>
                                                <td style="color: ${cantidadOriginal < 0 ? '#d93025' : '#1e8e3e'};">
                                                    ${cantidadOriginal > 0 ? '+' : ''}${formatearNumero(cantidadOriginal)}
                                                </td>
                                                <td style="color: ${cantidadImputada < 0 ? '#d93025' : '#1e8e3e'};">
                                                    ${cantidadImputada > 0 ? '+' : ''}${formatearNumero(cantidadImputada)}
                                                </td>
                                                <td class="${impSaldoClass}">${formatearNumero(imp.saldoDespues)}</td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : '<p style="color: var(--text-secondary); font-size: 14px; margin-top: 12px;">No hay imputaciones</p>'}
                </div>
            `;
        });

        partidasContainer.innerHTML = partidasHTML;
        partidasContainer.style.display = 'block';
    }
}

