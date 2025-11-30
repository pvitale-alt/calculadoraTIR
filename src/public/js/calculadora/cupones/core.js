/**
 * Core de gestión de cupones
 * Funcionalidades básicas: agregar, eliminar, renderizar
 * 
 * NOTA: Este archivo será extendido con lógica compleja de autocompletado
 */

// Estado de la tabla de cupones
let cuponesData = [];
let cuponCounter = 1;

/**
 * Función para cargar/mostrar la tabla de cupones
 */
function cargarCupones() {
    const container = document.getElementById('tablaCuponesContainer');
    const tbody = document.getElementById('cuponesBody');
    
    if (!container || !tbody) {
        console.error('No se encontraron los elementos de la tabla de cupones');
        return;
    }
    
    // Si la tabla está oculta, mostrarla
    if (container.style.display === 'none') {
        container.style.display = 'block';
        
        // Si no hay cupones, agregar uno inicial
        if (cuponesData.length === 0) {
            agregarFilaCupon();
        } else {
            // Si ya hay cupones, renderizar los existentes
            renderizarCupones();
        }
    } else {
        // Si está visible, ocultarla
        container.style.display = 'none';
    }
}

/**
 * Agrega una nueva fila de cupón a la tabla
 */
function agregarFilaCupon() {
    const cuponId = cuponCounter++;
    const nuevoCupon = {
        id: cuponId,
        cupon: cuponId,
        fechaInicio: '',
        fechaFinDev: '',
        fechaLiquid: '',
        inicioIntervalo: '',
        finalIntervalo: '',
        valorCERInicio: '',
        valorCERFinal: '',
        dayCountFactor: '',
        amortiz: '',
        valorResidual: '',
        amortizAjustada: '',
        rentaNominal: '',
        rentaTNA: '',
        rentaAjustada: '',
        factorActualiz: '',
        pagosActualiz: '',
        flujos: '',
        flujosDesc: ''
    };
    
    cuponesData.push(nuevoCupon);
    renderizarCupones();
}

/**
 * Elimina una fila de cupón
 */
function eliminarFilaCupon(cuponId) {
    cuponesData = cuponesData.filter(c => c.id !== cuponId);
    renderizarCupones();
    
    // Actualizar visibilidad de coeficientes CER
    if (typeof window.actualizarVisibilidadCoeficientesCER === 'function') {
        window.actualizarVisibilidadCoeficientesCER();
    }
    
    // Actualizar visibilidad de coeficientes CER
    if (typeof window.actualizarVisibilidadCoeficientesCER === 'function') {
        window.actualizarVisibilidadCoeficientesCER();
    }
}

/**
 * Renderiza todas las filas de cupones en la tabla
 */
function renderizarCupones() {
    const tbody = document.getElementById('cuponesBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // Obtener fecha valuación para comparar
    const fechaValuacionInput = document.getElementById('fechaValuacion');
    const fechaValuacionStr = fechaValuacionInput?.value || '';
    let fechaValuacionDate = null;
    
    if (fechaValuacionStr) {
        try {
            fechaValuacionDate = crearFechaDesdeString(convertirFechaDDMMAAAAaYYYYMMDD(fechaValuacionStr));
        } catch (e) {
            console.warn('Error al parsear fecha valuación:', e);
        }
    }
    
    cuponesData.forEach(cupon => {
        const row = document.createElement('tr');
        row.dataset.cuponId = cupon.id;
        
        // Verificar si alguna fecha del cupón es mayor a fecha valuación
        let esFuturo = false;
        if (fechaValuacionDate) {
            // Comparar fechaLiquid (fecha de liquidación) con fecha valuación
            if (cupon.fechaLiquid) {
                try {
                    const fechaLiquidDate = crearFechaDesdeString(convertirFechaDDMMAAAAaYYYYMMDD(cupon.fechaLiquid));
                    if (fechaLiquidDate && fechaLiquidDate > fechaValuacionDate) {
                        esFuturo = true;
                    }
                } catch (e) {
                    // Ignorar errores de parsing
                }
            }
        }
        
        // Aplicar clase si es futuro (los estilos se manejan con CSS)
        if (esFuturo) {
            row.classList.add('cupon-futuro');
        } else {
            row.classList.remove('cupon-futuro');
        }
        
        const bloqueoIntervaloAttrs = esFuturo ? 'readonly tabindex="-1"' : '';
        const bloqueoIntervaloClase = esFuturo ? ' input-bloqueado' : '';
        const bloqueoCERAttrs = esFuturo ? 'readonly tabindex="-1"' : '';
        const bloqueoCERClase = esFuturo ? ' input-bloqueado' : '';
        const onclickInicioIntervalo = esFuturo ? '' : `event.stopPropagation(); abrirDatePicker('inicioIntervalo_${cupon.id}');`;
        const onclickFinalIntervalo = esFuturo ? '' : `event.stopPropagation(); abrirDatePicker('finalIntervalo_${cupon.id}');`;
        
        row.innerHTML = `
            <td>
                <input type="text" class="input-table" value="${cupon.cupon || ''}" 
                       onchange="actualizarCupon('${cupon.id}', 'cupon', this.value)" 
                       style="width: 50px; text-align: center;" />
            </td>
            <td>
                <div style="position: relative;">
                    <input type="text" class="input-table date-input" 
                           id="fechaInicio_${cupon.id}"
                           value="${cupon.fechaInicio || ''}" 
                           placeholder="DD/MM/AAAA" 
                           maxlength="10"
                           onchange="actualizarCupon('${cupon.id}', 'fechaInicio', this.value)"
                           onclick="event.stopPropagation(); abrirDatePicker('fechaInicio_${cupon.id}');" />
                </div>
            </td>
            <td>
                <div style="position: relative;">
                    <input type="text" class="input-table date-input" 
                           id="fechaFinDev_${cupon.id}"
                           value="${cupon.fechaFinDev || ''}" 
                           placeholder="DD/MM/AAAA" 
                           maxlength="10"
                           onchange="actualizarCupon('${cupon.id}', 'fechaFinDev', this.value)"
                           onclick="event.stopPropagation(); abrirDatePicker('fechaFinDev_${cupon.id}');" />
                </div>
            </td>
            <td>
                <div style="position: relative;">
                    <input type="text" class="input-table date-input" 
                           id="fechaLiquid_${cupon.id}"
                           value="${cupon.fechaLiquid || ''}" 
                           placeholder="DD/MM/AAAA" 
                           maxlength="10"
                           onchange="actualizarCupon('${cupon.id}', 'fechaLiquid', this.value)"
                           onclick="event.stopPropagation(); abrirDatePicker('fechaLiquid_${cupon.id}');" />
                </div>
            </td>
            <td>
                <div style="position: relative;">
                    <input type="text" class="input-table date-input${bloqueoIntervaloClase}" 
                           id="inicioIntervalo_${cupon.id}"
                           value="${cupon.inicioIntervalo || ''}" 
                           placeholder="DD/MM/AAAA" 
                           maxlength="10"
                           onchange="actualizarCupon('${cupon.id}', 'inicioIntervalo', this.value)"
                           ${bloqueoIntervaloAttrs}
                           onclick="${onclickInicioIntervalo}" />
                </div>
            </td>
            <td>
                <div style="position: relative;">
                    <input type="text" class="input-table date-input${bloqueoIntervaloClase}" 
                           id="finalIntervalo_${cupon.id}"
                           value="${cupon.finalIntervalo || ''}" 
                           placeholder="DD/MM/AAAA" 
                           maxlength="10"
                           onchange="actualizarCupon('${cupon.id}', 'finalIntervalo', this.value)"
                           ${bloqueoIntervaloAttrs}
                           onclick="${onclickFinalIntervalo}" />
                </div>
            </td>
            <td>
                <input type="number" class="input-table${bloqueoCERClase}" 
                       id="valorCERInicio_${cupon.id}"
                       value="${cupon.valorCERInicio || ''}" 
                       step="0.0001"
                       onchange="actualizarCupon('${cupon.id}', 'valorCERInicio', this.value)"
                       ${bloqueoCERAttrs} />
            </td>
            <td>
                <input type="number" class="input-table${bloqueoCERClase}" 
                       id="valorCERFinal_${cupon.id}"
                       value="${cupon.valorCERFinal || ''}" 
                       step="0.0001"
                       onchange="actualizarCupon('${cupon.id}', 'valorCERFinal', this.value)"
                       ${bloqueoCERAttrs} />
            </td>
            <td>
                <input type="number" class="input-table" 
                       id="dayCountFactor_${cupon.id}"
                       value="${cupon.dayCountFactor || ''}" 
                       step="0.00000001"
                       onchange="actualizarCupon('${cupon.id}', 'dayCountFactor', this.value)" />
            </td>
            <td>
                <input type="number" class="input-table" 
                       id="amortiz_${cupon.id}"
                       value="${cupon.amortiz || ''}" 
                       step="0.0001"
                       onchange="actualizarCupon('${cupon.id}', 'amortiz', this.value)" />
            </td>
            <td>
                <input type="number" class="input-table" 
                       id="valorResidual_${cupon.id}"
                       value="${cupon.valorResidual || ''}" 
                       step="0.0001"
                       onchange="actualizarCupon('${cupon.id}', 'valorResidual', this.value)" />
            </td>
            <td>
                <input type="number" class="input-table" 
                       id="amortizAjustada_${cupon.id}"
                       value="${cupon.amortizAjustada || ''}" 
                       step="0.0001"
                       onchange="actualizarCupon('${cupon.id}', 'amortizAjustada', this.value)" />
            </td>
            <td>
                <input type="number" class="input-table" 
                       id="rentaNominal_${cupon.id}"
                       value="${cupon.rentaNominal || ''}" 
                       step="0.0001"
                       onchange="actualizarCupon('${cupon.id}', 'rentaNominal', this.value)" />
            </td>
            <td>
                <input type="number" class="input-table" 
                       id="rentaTNA_${cupon.id}"
                       value="${cupon.rentaTNA || ''}" 
                       step="0.0001"
                       onchange="actualizarCupon('${cupon.id}', 'rentaTNA', this.value)" />
            </td>
            <td>
                <input type="number" class="input-table" 
                       id="rentaAjustada_${cupon.id}"
                       value="${cupon.rentaAjustada || ''}" 
                       step="0.0001"
                       onchange="actualizarCupon('${cupon.id}', 'rentaAjustada', this.value)" />
            </td>
            <td>
                <input type="number" class="input-table" 
                       value="${cupon.factorActualiz || ''}" 
                       step="0.0001"
                       onchange="actualizarCupon('${cupon.id}', 'factorActualiz', this.value)" />
            </td>
            <td>
                <input type="number" class="input-table" 
                       value="${cupon.pagosActualiz || ''}" 
                       step="0.0001"
                       onchange="actualizarCupon('${cupon.id}', 'pagosActualiz', this.value)" />
            </td>
            <td>
                <input type="number" class="input-table" 
                       id="flujos_${cupon.id}"
                       value="${cupon.flujos || ''}" 
                       step="0.00000001"
                       readonly tabindex="-1" />
            </td>
            <td>
                <input type="number" class="input-table" 
                       id="flujosDesc_${cupon.id}"
                       value="${cupon.flujosDesc || ''}" 
                       step="0.00000001"
                       readonly tabindex="-1" />
            </td>
            <td>
                <button class="btn-icon" onclick="eliminarFilaCupon('${cupon.id}')" title="Eliminar cupón">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    if (window.cuponesCalculos && typeof window.cuponesCalculos.recalcularValoresDerivados === 'function') {
        window.cuponesCalculos.recalcularValoresDerivados(cuponesData);
    }
}

/**
 * Actualiza un valor de un cupón específico y recalcula dependencias
 */
async function actualizarCupon(cuponId, campo, valor) {
    const cupon = cuponesData.find(c => c.id === cuponId);
    if (cupon) {
        cupon[campo] = valor;
        
        // Recalcular dependencias según el campo modificado
        if (window.cuponesRecalculos && window.cuponesRecalculos.recalcularDependencias) {
            await window.cuponesRecalculos.recalcularDependencias(cupon, campo);
        }
        
        if (window.cuponesCalculos && typeof window.cuponesCalculos.recalcularValoresDerivados === 'function') {
            window.cuponesCalculos.recalcularValoresDerivados(cuponesData);
        }
    }
}

/**
 * Recalcula los campos dependientes cuando se modifica un campo
 * Cadena de dependencias:
 * - fechaInicio → inicioIntervalo → valorCERInicio
 * - fechaLiquid → finalIntervalo → valorCERFinal
 */
// Funciones de recálculo movidas a cupones/recalculos.js
// Se mantienen referencias para compatibilidad

/**
 * Obtiene todos los cupones
 */
function obtenerCupones() {
    return cuponesData;
}

/**
 * Limpia todos los cupones
 */
function limpiarCupones() {
    cuponesData = [];
    cuponCounter = 1;
    renderizarCupones();
}

/**
 * Establece los datos de cupones y renderiza
 */
function setCuponesData(nuevosDatos) {
    cuponesData = nuevosDatos;
    // Asegurar que los IDs sean únicos
    cuponesData.forEach((cupon, index) => {
        if (!cupon.id) {
            cupon.id = cuponCounter++;
        }
    });
    renderizarCupones();
    
    // Actualizar visibilidad de coeficientes CER
    if (typeof window.actualizarVisibilidadCoeficientesCER === 'function') {
        window.actualizarVisibilidadCoeficientesCER();
    }
}

/**
 * Obtiene los datos actuales de cupones
 */
function getCuponesData() {
    return cuponesData;
}

/**
 * Actualizar solo el estilo de las filas según fecha valuación (sin reconstruir la tabla)
 */
function actualizarEstilosCupones() {
    const tbody = document.getElementById('cuponesBody');
    if (!tbody) return;
    
    // Obtener fecha valuación para comparar
    const fechaValuacionInput = document.getElementById('fechaValuacion');
    const fechaValuacionStr = fechaValuacionInput?.value || '';
    let fechaValuacionDate = null;
    
    if (fechaValuacionStr) {
        try {
            fechaValuacionDate = crearFechaDesdeString(convertirFechaDDMMAAAAaYYYYMMDD(fechaValuacionStr));
        } catch (e) {
            console.warn('Error al parsear fecha valuación:', e);
        }
    }
    
    // Actualizar estilo de cada fila existente
    const filas = tbody.querySelectorAll('tr');
    filas.forEach(row => {
        const cuponId = row.dataset.cuponId;
        if (!cuponId) return;
        
        // Buscar el cupón en los datos
        const cupon = cuponesData.find(c => c.id === cuponId);
        if (!cupon) return;
        
        // Verificar si alguna fecha del cupón es mayor a fecha valuación
        let esFuturo = false;
        if (fechaValuacionDate && cupon.fechaLiquid) {
            try {
                const fechaLiquidDate = crearFechaDesdeString(convertirFechaDDMMAAAAaYYYYMMDD(cupon.fechaLiquid));
                if (fechaLiquidDate && fechaLiquidDate > fechaValuacionDate) {
                    esFuturo = true;
                }
            } catch (e) {
                // Ignorar errores de parsing
            }
        }
        
        // Aplicar o remover clase
        if (esFuturo) {
            row.classList.add('cupon-futuro');
        } else {
            row.classList.remove('cupon-futuro');
        }
    });
}

// Exportar funciones globalmente
window.cuponesModule = {
    cargarCupones,
    agregarFilaCupon,
    eliminarFilaCupon,
    renderizarCupones,
    actualizarEstilosCupones,
    actualizarCupon,
    obtenerCupones,
    limpiarCupones,
    setCuponesData,
    getCuponesData,
    // Funciones de recálculo movidas a cupones/recalculos.js
    // Se mantienen referencias para compatibilidad
    recalcularDependencias: (cupon, campo) => {
        if (window.cuponesRecalculos && window.cuponesRecalculos.recalcularDependencias) {
            return window.cuponesRecalculos.recalcularDependencias(cupon, campo);
        }
    },
    recalcularInicioIntervalo: (cupon) => {
        if (window.cuponesRecalculos && window.cuponesRecalculos.recalcularInicioIntervalo) {
            return window.cuponesRecalculos.recalcularInicioIntervalo(cupon);
        }
    },
    recalcularFinalIntervalo: (cupon) => {
        if (window.cuponesRecalculos && window.cuponesRecalculos.recalcularFinalIntervalo) {
            return window.cuponesRecalculos.recalcularFinalIntervalo(cupon);
        }
    },
    recalcularValorCERInicio: (cupon) => {
        if (window.cuponesRecalculos && window.cuponesRecalculos.recalcularValorCERInicio) {
            return window.cuponesRecalculos.recalcularValorCERInicio(cupon);
        }
    },
    recalcularValorCERFinal: (cupon) => {
        if (window.cuponesRecalculos && window.cuponesRecalculos.recalcularValorCERFinal) {
            return window.cuponesRecalculos.recalcularValorCERFinal(cupon);
        }
    },
    recalcularDayCountFactor: (cupon) => {
        if (window.cuponesRecalculos && window.cuponesRecalculos.recalcularDayCountFactor) {
            return window.cuponesRecalculos.recalcularDayCountFactor(cupon);
        }
    }
};

// También exportar actualizarCupon globalmente para el onclick en el HTML
window.actualizarCupon = actualizarCupon;

