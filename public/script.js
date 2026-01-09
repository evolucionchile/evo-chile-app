document.addEventListener('DOMContentLoaded', () => {
// Inicializar documentos
setupDocumentoInput('numero_documento', 'tipo_documento'); // Paciente
setupDocumentoInput('numero_documento_apoderado', 'tipo_documento_apoderado'); // Apoderado
// Elementos modales
    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-form');
    const closeModalBtn = document.querySelector('.close-modal');
    const fichaModal = document.getElementById('ficha-modal');
    const fichaDetalle = document.getElementById('ficha-detalle');
    const closeFichaModal = document.querySelector('.close-modal-ficha');
    const btnCerrarFicha = document.querySelector('.cerrar-ficha');
    let pacienteEditandoId = null;
// === FUNCIONES PARA DOCUMENTO (RUT O EXTRANJERO) ===
function limpiarDocumentoParaCalculo(doc) {
    // Elimina puntos y guiones, mantiene números, letras y K
    return doc.replace(/[\.\-]/g, '').toUpperCase();
}
function formatearDocumento(doc, tipo) {
    if (tipo !== 'rut') return doc.toUpperCase(); // Para extranjeros: solo mayúsculas, sin puntos
    let limpio = limpiarDocumentoParaCalculo(doc);
    if (limpio.length === 0) return '';
    if (limpio.length < 2) return limpio;
    let dv = limpio.slice(-1);
    let cuerpo = limpio.slice(0, -1);
    // Puntos cada 3 dígitos
    let cuerpoFormateado = '';
    for (let i = cuerpo.length - 1, count = 0; i >= 0; i--, count++) {
        if (count > 0 && count % 3 === 0) {
            cuerpoFormateado = '.' + cuerpoFormateado;
        }
        cuerpoFormateado = cuerpo.charAt(i) + cuerpoFormateado;
    }
    return `${cuerpoFormateado}-${dv}`;
}
function calcularDv(rutSinDv) {
    let limpio = rutSinDv.replace(/[\.\-]/g, '');
    let suma = 0;
    let multiplo = 2;
    for (let i = limpio.length - 1; i >= 0; i--) {
        suma += multiplo * parseInt(limpio.charAt(i), 10);
        multiplo = multiplo < 7 ? multiplo + 1 : 2;
    }
    let dvEsperado = 11 - (suma % 11);
    if (dvEsperado === 11) return '0';
    if (dvEsperado === 10) return 'K';
    return dvEsperado.toString();
}
function validarDocumento(doc, tipo) {
    if (tipo !== 'rut') return true; // Para extranjeros: siempre válido si no vacío
    let limpio = limpiarDocumentoParaCalculo(doc);
    if (limpio.length < 2) return false;
    if (!/^(\d{7,8}[0-9K])$/.test(limpio)) return false;
    let cuerpo = limpio.slice(0, -1);
    let dv = limpio.slice(-1);
    let dvCalculado = calcularDv(cuerpo);
    return dv === dvCalculado;
}
// Feedback debajo del campo
function mostrarFeedback(inputId, mensaje, esValido) {
    let feedback = document.getElementById(`feedback-${inputId}`);
    if (!feedback) {
        feedback = document.createElement('div');
        feedback.id = `feedback-${inputId}`;
        feedback.style.fontSize = '0.9rem';
        feedback.style.marginTop = '5px';
        feedback.style.fontWeight = 'bold';
        document.getElementById(inputId).parentNode.appendChild(feedback);
    }
    feedback.textContent = mensaje;
    feedback.style.color = esValido ? 'green' : 'red';
}
// NUEVA FUNCIÓN: setupDocumentoInput
function setupDocumentoInput(inputId, tipoSelectId) {
    const input = document.getElementById(inputId);
    const selectTipo = document.getElementById(tipoSelectId);
    if (!input) return;
    // Mientras escribe: filtrar según tipo
    input.addEventListener('input', () => {
        let valor = input.value.toUpperCase();
        const tipoActual = selectTipo ? selectTipo.value : 'rut';
        if (tipoActual === 'rut') {
            // Solo números y una K al final
            valor = valor.replace(/[^0-9K]/g, '');
            if (valor.match(/K/g) && valor.match(/K/g).length > 1) valor = valor.replace(/K/g, '');
            if (valor.length > 1 && /[K]/.test(valor.slice(0, -1))) valor = valor.replace(/K/g, '');
        } else {
            // Para extranjeros: letras, números y guiones
            valor = valor.replace(/[^A-Z0-9\-]/g, '');
        }
        input.value = valor;
    });
    // Al salir del campo: formatear y validar
    input.addEventListener('blur', () => {
        const tipoActual = selectTipo ? selectTipo.value : 'rut';
        let valorFormateado = formatearDocumento(input.value, tipoActual);
        input.value = valorFormateado;
        if (input.value.trim() === '') {
            mostrarFeedback(inputId, '', true);
            return;
        }
        if (validarDocumento(valorFormateado, tipoActual)) {
            mostrarFeedback(inputId, tipoActual === 'rut' ? 'Documento válido ✓' : 'Documento válido', true);
        } else {
            mostrarFeedback(inputId, 'Documento inválido ✗', false);
        }
    });
}
// Funciones auxiliares
function showSuccess(msg) {
    const div = document.getElementById('mensaje-exito');
    div.textContent = msg;
    div.style.opacity = '1';
    setTimeout(() => div.style.opacity = '0', 3000);
}
function normalizar(texto) {
    if (!texto) return '';
    return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}
function formatDate(date) {
    if (!date) return 'No registrada';
    return new Date(date).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
}
function getNombreMes(año, mes) {
    return new Date(año, mes - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
        .replace(/^\w/, c => c.toUpperCase());
}
// === NAVEGACIÓN ENTRE SECCIONES ===
document.getElementById('menu-principal').style.display = 'block';
document.querySelectorAll('section[id^="seccion-"]').forEach(s => s.style.display = 'none');
document.querySelectorAll('.btn-menu').forEach(btn => {
    btn.addEventListener('click', () => {
        const seccion = btn.getAttribute('data-seccion');
        document.getElementById('menu-principal').style.display = 'none';
        document.querySelectorAll('section[id^="seccion-"]').forEach(s => s.style.display = 'none');
        const target = document.getElementById('seccion-' + seccion);
        if (target) {
            target.style.display = 'block';
            if (seccion === 'pagos') {
                setTimeout(cargarPagosPendientes, 300);
            }
        }
    });
});
document.querySelectorAll('.btn-volver:not(.btn-no-general)').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('section[id^="seccion-"]').forEach(sec => sec.style.display = 'none');
        document.getElementById('menu-principal').style.display = 'block';
    });
});
// Vista previa de foto
function setupPreview(inputId, previewId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    if (input && preview) {
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => preview.innerHTML = `<img src="${ev.target.result}" alt="Vista previa">`;
                reader.readAsDataURL(file);
            } else {
                preview.innerHTML = '';
            }
        });
    }
}
setupPreview('foto_cedula', 'preview-foto');
setupPreview('edit-foto_cedula', 'edit-preview-foto');
// === REGISTRAR PACIENTE ===
document.getElementById('registro-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    // Confirmación
    const confirmar = confirm("¿Desea registrar el paciente con los datos ingresados?\n\nEsto creará un nuevo registro en el sistema.");
    if (!confirmar) {
        return;
    }
    // Validación del documento del paciente
    const tipoDocPaciente = document.getElementById('tipo_documento')?.value || 'rut';
    const numDocPaciente = document.getElementById('numero_documento')?.value?.trim() || '';
    if (numDocPaciente === '') {
        alert('El número de documento del paciente es obligatorio.');
        return;
    }
    if (tipoDocPaciente === 'rut' && !validarDocumento(numDocPaciente, 'rut')) {
        alert('El número de documento (RUT) del paciente es inválido.');
        return;
    }
    // Apoderado (opcional)
    const tipoDocApoderado = document.getElementById('tipo_documento_apoderado')?.value || '';
    const numDocApoderado = document.getElementById('numero_documento_apoderado')?.value?.trim() || '';
    if (numDocApoderado !== '' && tipoDocApoderado === 'rut' && !validarDocumento(numDocApoderado, 'rut')) {
        alert('El número de documento (RUT) del apoderado es inválido.');
        return;
    }
    const formData = new FormData();
    formData.append('nombre', document.getElementById('nombre').value.trim());
    formData.append('sede', document.getElementById('sede').value);
    formData.append('fecha_ingreso', document.getElementById('fecha_ingreso').value);
    formData.append('estado', 'Activo'); // Siempre Activo en registro
    formData.append('etapa', document.getElementById('etapa').value || '');
    formData.append('monto_mensual', document.getElementById('monto_mensual').value || '350000');
    formData.append('fecha_vencimiento_pago', document.getElementById('fecha_vencimiento_pago').value || '5');
    formData.append('sexo', document.getElementById('sexo').value);
    formData.append('fecha_nacimiento', document.getElementById('fecha_nacimiento').value);
    formData.append('ocupacion', document.getElementById('ocupacion').value.trim() || '');
    formData.append('prevision', document.getElementById('prevision').value);
    formData.append('atencion_psiquiatrica', document.getElementById('atencion_psiquiatrica').value || '');
    formData.append('direccion', document.getElementById('direccion').value.trim() || '');
    formData.append('region', document.getElementById('region')?.value || '');
    formData.append('comuna', document.getElementById('comuna')?.value || '');
    formData.append('correo_apoderado', document.getElementById('correo_apoderado')?.value.trim() || '');
    formData.append('nombre_apoderado', document.getElementById('nombre_apoderado').value.trim() || '');
    formData.append('telefono_apoderado', document.getElementById('telefono_apoderado').value.trim() || '');
    formData.append('direccion_apoderado', document.getElementById('direccion_apoderado').value.trim() || '');
    // Nuevos campos de documento
    formData.append('documento_tipo', tipoDocPaciente);
    formData.append('documento_numero', numDocPaciente);
    formData.append('documento_tipo_apoderado', tipoDocApoderado);
    formData.append('documento_numero_apoderado', numDocApoderado);
    // Otros contactos
    const otrosContactos = [];
        for (let i = 1; i <= 3; i++) {
            const nombre = document.getElementById(`otro_contacto${i}_nombre`)?.value.trim() || '';
            const telefono = document.getElementById(`otro_contacto${i}_telefono`)?.value.trim() || '';
            const parentesco = document.getElementById(`otro_contacto${i}_parentezco`)?.value.trim() || '';
            otrosContactos.push({ nombre, telefono, parentesco });
        }
        formData.append('otros_contactos', JSON.stringify(otrosContactos));
    const fotoFile = document.getElementById('foto_cedula').files[0];
    if (fotoFile) formData.append('foto_cedula', fotoFile);
    try {
        const res = await fetch('/api/pacientes', { method: 'POST', body: formData });
        if (res.ok) {
            alert("¡Paciente registrado exitosamente!");
            showSuccess('¡Paciente registrado con éxito!');
            e.target.reset();
            document.getElementById('preview-foto').innerHTML = '';
        } else {
            const err = await res.json();
            alert('Error al registrar: ' + (err.error || 'Intente nuevamente'));
        }
    } catch (err) {
        alert('Error de conexión con el servidor.');
    }
});
// === BÚSQUEDA PARA MODIFICAR PACIENTE ===
document.getElementById('btn-buscar-modificar').addEventListener('click', async () => {
    const termino = document.getElementById('buscar-modificar').value.trim();
    const resultados = document.getElementById('resultados-modificar');
    if (!termino) {
        resultados.innerHTML = '<p style="text-align:center;color:#999;">Ingrese un nombre o número de documento para buscar.</p>';
        return;
    }
    try {
        const res = await fetch('/api/pacientes');
        const pacientes = await res.json();
        const palabrasBuscadas = normalizar(termino).split(/\s+/).filter(p => p.length > 0);
        const coincidencias = pacientes.filter(p => {
            const nombreNormalizado = normalizar(p.nombre);
            const docNormalizado = normalizar(p.documento_numero.replace(/[\.\-kK]/g, ''));
            if (palabrasBuscadas.some(pal => docNormalizado.includes(pal))) return true;
            return palabrasBuscadas.every(palabra => nombreNormalizado.includes(palabra));
        });
        if (coincidencias.length === 0) {
            resultados.innerHTML = '<p style="text-align:center;color:#999;padding:40px;">No se encontraron pacientes.</p>';
            return;
        }
        resultados.innerHTML = '';
        coincidencias.forEach(p => {
            const card = document.createElement('div');
            card.className = 'paciente-card';
            card.innerHTML = `
                <div class="info-paciente">
                    <strong>${p.nombre}</strong><br>
                    Documento: ${p.documento_numero} | Sede: ${p.sede}
                </div>
                <button class="btn-edit" onclick="abrirEditarPaciente(${p.id})">Editar</button>
            `;
            resultados.appendChild(card);
        });
    } catch (err) {
        resultados.innerHTML = '<p style="color:red;text-align:center;">Error al buscar pacientes.</p>';
    }
});
// === ABRIR MODAL DE EDICIÓN ===
window.abrirEditarPaciente = async (id) => {
    pacienteEditandoId = id;
    const editForm = document.getElementById('edit-form');
    if (!editForm) {
        alert('Error: No se encontró el formulario de edición');
        return;
    }
    try {
        const pacRes = await fetch(`/api/pacientes/${id}`);
        if (!pacRes.ok) {
            const err = await pacRes.json();
            alert('Error: ' + (err.error || 'Paciente no encontrado'));
            return;
        }
        const p = await pacRes.json();
        // Parsear otros_contactos
        let contactos = [];
        if (p.otros_contactos) {
            try {
                contactos = JSON.parse(p.otros_contactos);
            } catch (e) {
                console.warn('Error parseando otros_contactos:', e);
                contactos = [];
            }
        }
        while (contactos.length < 3) {
            contactos.push({ nombre: '', telefono: '', parentesco: '' });
        }
        editForm.innerHTML = `
            <fieldset class="fieldset-profesional">
                <legend>Datos del Paciente</legend>
                <div class="form-grid">
                    <div class="form-group"><label>Nombre completo</label><input type="text" id="edit-nombre" value="${p.nombre || ''}" required></div>
                    <div class="form-group"><label>Tipo de documento</label>
                        <select id="edit-tipo_documento">
                            <option value="rut" ${p.documento_tipo === 'rut' ? 'selected' : ''}>RUT Chileno</option>
                            <option value="pasaporte" ${p.documento_tipo === 'pasaporte' ? 'selected' : ''}>Pasaporte</option>
                            <option value="cedula" ${p.documento_tipo === 'cedula' ? 'selected' : ''}>Cédula Extranjera</option>
                            <option value="otro" ${p.documento_tipo === 'otro' ? 'selected' : ''}>Otro ID</option>
                        </select>
                    </div>
                    <div class="form-group"><label>Número de documento</label><input type="text" id="edit-numero_documento" value="${p.documento_numero || ''}" disabled></div>
                    <div class="form-group"><label>Sede</label><select id="edit-sede" required>
                        ${['Olea','Naltahua','Femenino uno','Femenino dos','Polpaico','Buin'].map(s => `<option value="${s}" ${s === p.sede ? 'selected' : ''}>${s}</option>`).join('')}
                    </select></div>
                    <div class="form-group"><label>Fecha ingreso</label><input type="date" id="edit-fecha_ingreso" value="${p.fecha_ingreso || ''}" required></div>
                    <div class="form-group">
                        <label>Estado</label>
                        <select id="edit-estado">
                            <option value="Activo" ${p.estado === 'Activo' ? 'selected' : ''}>Activo</option>
                            <option value="Reeducado" ${p.estado === 'Reeducado' ? 'selected' : ''}>Reeducado</option>
                            <option value="Reinserción" ${p.estado === 'Reinserción' ? 'selected' : ''}>Reinserción</option>
                            <option value="Abandono" ${p.estado === 'Abandono' ? 'selected' : ''}>Abandono</option>
                            <option value="Expulsado" ${p.estado === 'Expulsado' ? 'selected' : ''}>Expulsado</option>
                        </select>
                    </div>
                    <div class="form-group" id="container-fecha-cambio-estado" style="display:none;">
                        <label id="label-fecha-cambio-estado">Fecha del cambio de estado *</label>
                        <input type="date" id="edit-fecha_cambio_estado">
                    </div>
                    <div class="form-group"><label>Etapa</label><select id="edit-etapa">
                        <option value="">Ninguna</option>
                        ${['Compromiso','Grupo 4','Grupo 3','Grupo 2','Grupo 1','Nivel 1','Nivel 2','Nivel 3'].map(e => `<option value="${e}" ${e === p.etapa ? 'selected' : ''}>${e}</option>`).join('')}
                    </select></div>
                    <div class="form-group">
                        <label>Sexo</label>
                        <select id="edit-sexo" required>
                            <option value="Masculino" ${p.sexo === 'Masculino' ? 'selected' : ''}>Masculino</option>
                            <option value="Femenino" ${p.sexo === 'Femenino' ? 'selected' : ''}>Femenino</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Fecha nacimiento</label>
                        <input type="date" id="edit-fecha_nacimiento" value="${p.fecha_nacimiento || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Ocupación</label>
                        <input type="text" id="edit-ocupacion" value="${p.ocupacion || ''}" placeholder="Ej: Mecánico, Estudiante...">
                    </div>
                    <div class="form-group">
                        <label>Previsión</label>
                        <select id="edit-prevision" required>
                            <option value="">Seleccionar</option>
                            <option value="Fonasa" ${p.prevision === 'Fonasa' ? 'selected' : ''}>Fonasa</option>
                            <option value="Isapre - Consalud" ${p.prevision === 'Isapre - Consalud' ? 'selected' : ''}>Isapre - Consalud</option>
                            <option value="Isapre - Banmédica" ${p.prevision === 'Isapre - Banmédica' ? 'selected' : ''}>Isapre - Banmédica</option>
                            <option value="Isapre - Colmena" ${p.prevision === 'Isapre - Colmena' ? 'selected' : ''}>Isapre - Colmena</option>
                            <option value="Isapre - Cruz Blanca" ${p.prevision === 'Isapre - Cruz Blanca' ? 'selected' : ''}>Isapre - Cruz Blanca</option>
                            <option value="Isapre - Nueva Masvida" ${p.prevision === 'Isapre - Nueva Masvida' ? 'selected' : ''}>Isapre - Nueva Masvida</option>
                            <option value="Isapre - Vida Tres" ${p.prevision === 'Isapre - Vida Tres' ? 'selected' : ''}>Isapre - Vida Tres</option>
                            <option value="Isapre - Esencial" ${p.prevision === 'Isapre - Esencial' ? 'selected' : ''}>Isapre - Esencial</option>
                            <option value="Otra Isapre" ${p.prevision === 'Otra Isapre' ? 'selected' : ''}>Otra Isapre</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Atención Psiquiátrica</label>
                        <select id="edit-atencion_psiquiatrica">
                            <option value="">Seleccionar</option>
                            <option value="Medicamentos" ${p.atencion_psiquiatrica === 'Medicamentos' ? 'selected' : ''}>Medicamentos</option>
                            <option value="Licencia" ${p.atencion_psiquiatrica === 'Licencia' ? 'selected' : ''}>Licencia</option>
                            <option value="Licencia y Medicamentos" ${p.atencion_psiquiatrica === 'Licencia y Medicamentos' ? 'selected' : ''}>Licencia y Medicamentos</option>
                        </select>
                    </div>
                    <div class="form-group full-width">
                        <label>Dirección</label>
                        <input type="text" id="edit-direccion" value="${p.direccion || ''}" placeholder="Ej: Calle Los Alamos 123, Comuna, Ciudad">
                    </div>
                    <div class="form-group">
                        <label>Región</label>
                        <select id="edit-region">
                            <option value="">Seleccionar región</option>
                            ${['Arica y Parinacota','Tarapacá','Antofagasta','Atacama','Coquimbo','Valparaíso','Metropolitana','O\'Higgins','Maule','Ñuble','Biobío','Araucanía','Los Ríos','Los Lagos','Aysén','Magallanes'].map(r => `<option value="${r}" ${r === p.region ? 'selected' : ''}>${r}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Comuna</label>
                        <input type="text" id="edit-comuna" value="${p.comuna || ''}" placeholder="Ej: Temuco">
                    </div>
                </div>
            </fieldset>
            <fieldset class="fieldset-profesional">
                <legend>Datos del Apoderado</legend>
                <div class="form-grid">
                    <div class="form-group"><label>Nombre apoderado</label><input type="text" id="edit-nombre_apoderado" value="${p.nombre_apoderado || ''}"></div>
                    <div class="form-group"><label>Tipo documento apoderado</label>
                        <select id="edit-tipo_documento_apoderado">
                            <option value="">Ninguno</option>
                            <option value="rut" ${p.documento_tipo_apoderado === 'rut' ? 'selected' : ''}>RUT Chileno</option>
                            <option value="pasaporte" ${p.documento_tipo_apoderado === 'pasaporte' ? 'selected' : ''}>Pasaporte</option>
                            <option value="cedula" ${p.documento_tipo_apoderado === 'cedula' ? 'selected' : ''}>Cédula Extranjera</option>
                            <option value="otro" ${p.documento_tipo_apoderado === 'otro' ? 'selected' : ''}>Otro ID</option>
                        </select>
                    </div>
                    <div class="form-group"><label>Número documento apoderado</label><input type="text" id="edit-numero_documento_apoderado" value="${p.documento_numero_apoderado || ''}"></div>
                    <div class="form-group"><label>Teléfono</label><input type="tel" id="edit-telefono_apoderado" value="${p.telefono_apoderado || ''}"></div>
                    <div class="form-group"><label>Correo apoderado</label><input type="email" id="edit-correo_apoderado" value="${p.correo_apoderado || ''}" placeholder="Ej: apoderado@example.com"></div>
                    <div class="form-group full-width">
                        <label>Dirección del apoderado</label>
                        <input type="text" id="edit-direccion_apoderado" value="${p.direccion_apoderado || ''}" placeholder="Ej: Avenida Siempre Viva 742, Comuna">
                    </div>
                </div>
            </fieldset>
            <fieldset class="fieldset-profesional">
                <legend>Control de Pago Mensual</legend>
                <div class="form-grid">
                    <div class="form-group"><label>Monto mensual ($)</label><input type="number" id="edit-monto_mensual" value="${p.monto_mensual || 350000}" min="0" step="1000"></div>
                    <div class="form-group"><label>Día de vencimiento</label><input type="number" id="edit-fecha_vencimiento_pago" value="${p.fecha_vencimiento_pago || 5}" min="1" max="31"></div>
                </div>
            </fieldset>
            <!-- OTROS CONTACTOS (3 FILAS) -->
            <fieldset class="fieldset-profesional">
                <legend>Otros Contactos (opcional - hasta 3)</legend>
               
                <!-- Contacto 1 -->
                <div class="form-grid" style="grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 20px;">
                    <div class="form-group">
                        <label>Nombre Contacto 1</label>
                        <input type="text" id="edit-otro_contacto1_nombre" value="${contactos[0]?.nombre || ''}" placeholder="Ej: María González">
                    </div>
                    <div class="form-group">
                        <label>Parentesco Contacto 1</label>
                        <input type="text" id="edit-otro_contacto1_parentezco" value="${contactos[0]?.parentesco || ''}" placeholder="Ej: Hermana, Amigo">
                    </div>
                    <div class="form-group">
                        <label>Teléfono Contacto 1</label>
                        <input type="tel" id="edit-otro_contacto1_telefono" value="${contactos[0]?.telefono || ''}" placeholder="Ej: +56912345678">
                    </div>
                </div>
                <!-- Contacto 2 -->
                <div class="form-grid" style="grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 20px;">
                    <div class="form-group">
                        <label>Nombre Contacto 2</label>
                        <input type="text" id="edit-otro_contacto2_nombre" value="${contactos[1]?.nombre || ''}" placeholder="Ej: Pedro López">
                    </div>
                    <div class="form-group">
                        <label>Parentesco Contacto 2</label>
                        <input type="text" id="edit-otro_contacto2_parentezco" value="${contactos[1]?.parentesco || ''}" placeholder="Ej: Padre, Primo">
                    </div>
                    <div class="form-group">
                        <label>Teléfono Contacto 2</label>
                        <input type="tel" id="edit-otro_contacto2_telefono" value="${contactos[1]?.telefono || ''}" placeholder="Ej: +56987654321">
                    </div>
                </div>
                <!-- Contacto 3 -->
                <div class="form-grid" style="grid-template-columns: repeat(3, 1fr); gap: 20px;">
                    <div class="form-group">
                        <label>Nombre Contacto 3</label>
                        <input type="text" id="edit-otro_contacto3_nombre" value="${contactos[2]?.nombre || ''}" placeholder="Ej: Ana Ramírez">
                    </div>
                    <div class="form-group">
                        <label>Parentesco Contacto 3</label>
                        <input type="text" id="edit-otro_contacto3_parentezco" value="${contactos[2]?.parentesco || ''}" placeholder="Ej: Tío, Vecino">
                    </div>
                    <div class="form-group">
                        <label>Teléfono Contacto 3</label>
                        <input type="tel" id="edit-otro_contacto3_telefono" value="${contactos[2]?.telefono || ''}" placeholder="Ej: +56955555555">
                    </div>
                </div>
            </fieldset>
           
            <fieldset class="fieldset-profesional">
                <legend>Foto de Cédula</legend>
                <div class="form-group full-width">
                    <label>Foto actual</label>
                    ${p.foto_cedula ? `<img src="${p.foto_cedula}?t=${Date.now()}" style="max-width:400px;border-radius:10px;margin:10px 0;">` : '<p>No hay foto subida</p>'}
                    <label>Cambiar foto (opcional)</label>
                    <input type="file" id="edit-foto_cedula" accept="image/*">
                    <div id="edit-preview-foto" class="preview-image"></div>
                </div>
            </fieldset>
            <button type="submit" class="btn-primary grande">Guardar Cambios</button>
        `;
        editModal.style.display = 'flex';
        // Inicializar validación dinámica en edición (para apoderado)
        setupDocumentoInput('edit-numero_documento_apoderado', 'edit-tipo_documento_apoderado');

        // Listener para mostrar/ocultar fecha y cambiar label dinámicamente
        const selectEstado = document.getElementById('edit-estado');
        const contenedorFecha = document.getElementById('container-fecha-cambio-estado');
        const labelFecha = document.getElementById('label-fecha-cambio-estado');
        const inputFecha = document.getElementById('edit-fecha_cambio_estado');

        selectEstado.addEventListener('change', () => {
            const valor = selectEstado.value;
            if (valor !== 'Activo') {
                contenedorFecha.style.display = 'block';
                labelFecha.textContent = `Fecha de ${valor} *`;
                inputFecha.required = true; // Agregar required cuando visible
                if (!inputFecha.value) {
                    inputFecha.value = new Date().toISOString().split('T')[0];
                }
            } else {
                contenedorFecha.style.display = 'none';
                inputFecha.required = false; // Quitar required cuando oculto
            }
        });

        // Al cargar el modal
        if (p.estado && p.estado !== 'Activo') {
            contenedorFecha.style.display = 'block';
            labelFecha.textContent = `Fecha de ${p.estado} *`;
            inputFecha.required = true;
            inputFecha.value = p.fecha_cambio_estado || new Date().toISOString().split('T')[0];
        } else {
            inputFecha.required = false;
        }
    } catch (err) {
        console.error('Error al cargar edición:', err);
        alert('Error de conexión o servidor');
    }
};
// === GUARDAR EDICIÓN ===
editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const confirmar = confirm("¿Se modificará el paciente con los datos ingresados?\n\nEsto actualizará el registro en el sistema.");
    if (!confirmar) {
        return;
    }

    // Validación de fecha de cambio de estado (manual, porque required es dinámico)
    const estado = document.getElementById('edit-estado').value;
    if (estado !== 'Activo' && !document.getElementById('edit-fecha_cambio_estado')?.value) {
        alert('La fecha del cambio de estado es obligatoria para este estado.');
        return;
    }

    const formData = new FormData();
    formData.append('nombre', document.getElementById('edit-nombre').value.trim());
    formData.append('sede', document.getElementById('edit-sede').value);
    formData.append('estado', document.getElementById('edit-estado').value || 'Activo');
    formData.append('etapa', document.getElementById('edit-etapa').value || '');
    formData.append('fecha_ingreso', document.getElementById('edit-fecha_ingreso').value);
    formData.append('sexo', document.getElementById('edit-sexo').value);
    formData.append('fecha_nacimiento', document.getElementById('edit-fecha_nacimiento').value);
    formData.append('ocupacion', document.getElementById('edit-ocupacion').value.trim() || '');
    formData.append('prevision', document.getElementById('edit-prevision').value);
    formData.append('atencion_psiquiatrica', document.getElementById('edit-atencion_psiquiatrica').value || '');
    formData.append('direccion', document.getElementById('edit-direccion').value.trim() || '');
    formData.append('region', document.getElementById('edit-region').value || '');
    formData.append('comuna', document.getElementById('edit-comuna').value || '');
    formData.append('correo_apoderado', document.getElementById('edit-correo_apoderado').value.trim() || '');
    formData.append('nombre_apoderado', document.getElementById('edit-nombre_apoderado').value.trim() || '');
    formData.append('telefono_apoderado', document.getElementById('edit-telefono_apoderado').value.trim() || '');
    formData.append('direccion_apoderado', document.getElementById('edit-direccion_apoderado').value.trim() || '');
    formData.append('monto_mensual', document.getElementById('edit-monto_mensual').value || 350000);
    formData.append('fecha_vencimiento_pago', document.getElementById('edit-fecha_vencimiento_pago').value || 5);
    // Nuevos campos
    formData.append('documento_tipo', document.getElementById('edit-tipo_documento').value);
    formData.append('documento_numero', document.getElementById('edit-numero_documento').value.trim());
    formData.append('documento_tipo_apoderado', document.getElementById('edit-tipo_documento_apoderado').value || '');
    formData.append('documento_numero_apoderado', document.getElementById('edit-numero_documento_apoderado').value.trim() || '');
    // Fecha cambio estado
    formData.append('fecha_cambio_estado', document.getElementById('edit-fecha_cambio_estado')?.value || null);
    // Otros contactos
    const otrosContactosEdit = [];
        for (let i = 1; i <= 3; i++) {
            const nombre = document.getElementById(`edit-otro_contacto${i}_nombre`)?.value.trim() || '';
            const telefono = document.getElementById(`edit-otro_contacto${i}_telefono`)?.value.trim() || '';
            const parentesco = document.getElementById(`edit-otro_contacto${i}_parentezco`)?.value.trim() || '';
            otrosContactosEdit.push({ nombre, telefono, parentesco });
        }
        formData.append('otros_contactos', JSON.stringify(otrosContactosEdit));
    // Foto
    const fotoActualImg = editForm.querySelector('img[src*="documentos"]');
    const fotoActualUrl = fotoActualImg ? fotoActualImg.src.split('?')[0] : '';
    formData.append('foto_cedula_actual', fotoActualUrl);
    const nuevaFoto = document.getElementById('edit-foto_cedula').files[0];
    if (nuevaFoto) {
        formData.append('foto_cedula', nuevaFoto);
    }
    try {
        const resPaciente = await fetch(`/api/pacientes/${pacienteEditandoId}`, {
            method: 'PUT',
            body: formData
        });
        if (resPaciente.ok) {
            alert("¡Paciente modificado correctamente!");
            showSuccess('¡Paciente actualizado con éxito!');
            editModal.style.display = 'none';
            document.getElementById('resultados-modificar').innerHTML = '';
            document.getElementById('buscar-modificar').value = '';
        } else {
            const err = await resPaciente.json();
            alert('Error al modificar: ' + (err.error || 'Intente nuevamente'));
        }
    } catch (err) {
        alert('Error de conexión.');
    }
});
closeModalBtn.onclick = () => editModal.style.display = 'none';
// === BÚSQUEDA PARA VER FICHA PACIENTE ===
document.getElementById('btn-buscar-ver-ficha').addEventListener('click', async () => {
    const termino = document.getElementById('buscar-ver-ficha').value.trim();
    const resultados = document.getElementById('resultados-ver-ficha');
    resultados.innerHTML = '<p style="text-align:center;color:#999;padding:60px;">Buscando...</p>';
    if (!termino) {
        resultados.innerHTML = '<p style="text-align:center;color:#999;padding:60px;">Ingrese un nombre o número de documento para buscar.</p>';
        return;
    }
    try {
        const res = await fetch('/api/pacientes');
        if (!res.ok) throw new Error();
        const pacientes = await res.json();
        const palabrasBuscadas = normalizar(termino).split(/\s+/).filter(p => p.length > 0);
        const coincidencias = pacientes.filter(p => {
            const nombreNormalizado = normalizar(p.nombre);
            const docNormalizado = normalizar(p.documento_numero.replace(/[\.\-kK]/g, ''));
            if (palabrasBuscadas.some(pal => docNormalizado.includes(pal))) return true;
            return palabrasBuscadas.every(palabra => nombreNormalizado.includes(palabra));
        });
        if (coincidencias.length === 0) {
            resultados.innerHTML = '<p style="text-align:center;color:#999;padding:60px;">No se encontraron pacientes.</p>';
            return;
        }
        resultados.innerHTML = '';
        coincidencias.forEach(p => {
            const card = document.createElement('div');
            card.className = 'paciente-card';
            card.innerHTML = `
                <div class="info-paciente">
                    <strong>${p.nombre}</strong><br>
                    Documento: ${p.documento_numero} | Sede: ${p.sede} | Estado: ${p.estado || 'Activo'}
                </div>
                <button class="btn-primary" onclick="mostrarFichaCompleta(${p.id})">Ver Ficha</button>
            `;
            resultados.appendChild(card);
        });
    } catch (err) {
        resultados.innerHTML = '<p style="color:red;text-align:center;">Error al cargar pacientes.</p>';
    }
});
// === MODAL CONTROL DE PAGOS (MEJORADO CON DÍA DE VENCIMIENTO, FECHA DE PAGO Y FORMA DE PAGO) ===
let modalPagosPacienteId = null;
window.abrirModalControlPagos = async (id) => {
    modalPagosPacienteId = id;
    try {
        const pacRes = await fetch(`/api/pacientes/${id}`);
        if (!pacRes.ok) throw new Error();
        const p = await pacRes.json();
        // Llenar datos del paciente
        document.getElementById('modal-pagos-nombre').textContent = p.nombre;
        document.getElementById('modal-pagos-rut').textContent = p.documento_numero;
        document.getElementById('modal-pagos-sede').textContent = p.sede;
        document.getElementById('modal-pagos-monto').textContent = parseInt(p.monto_mensual).toLocaleString('es-CL');
        // Mostrar día de vencimiento
        const diaVencimientoHtml = document.createElement('div');
        diaVencimientoHtml.innerHTML = `<p style="font-size:1.3rem; margin:20px 0; text-align:center; color:#2c3e50;">
            <strong>Día de vencimiento del pago: ${p.fecha_vencimiento_pago || 5} de cada mes</strong>
        </p>`;
        document.querySelector('#modal-control-pagos .estadisticas-card').appendChild(diaVencimientoHtml);
        // Cargar pagos
        let pagos = [];
        try {
            const pagosRes = await fetch(`/api/pacientes/${id}/pagos`);
            if (pagosRes.ok) pagos = await pagosRes.json();
        } catch (e) {
            console.warn('Pagos no disponibles');
        }
        // Generar grid de meses (3 columnas: mes, fecha pago, forma pago)
        const fechaIngreso = new Date(p.fecha_ingreso);
        const grid = document.getElementById('modal-pagos-grid');
        grid.innerHTML = '';
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(300px, 1fr))';
        grid.style.gap = '20px';
        for (let i = 0; i < 12; i++) {
            const date = new Date(fechaIngreso.getFullYear(), fechaIngreso.getMonth() + i, 1);
            const año = date.getFullYear();
            const mes = date.getMonth() + 1;
            const nombreMes = getNombreMes(año, mes);
            const pagoExistente = pagos.find(pg => pg.año === año && pg.mes === mes);
            const pagado = pagoExistente ? pagoExistente.pagado === 1 : false;
            const fechaPago = pagoExistente ? pagoExistente.fecha_pago || '' : '';
            const formaPago = pagoExistente ? pagoExistente.forma_pago || '' : '';
            const div = document.createElement('div');
            div.className = 'form-group';
            div.style.background = '#f8fbff';
            div.style.padding = '15px';
            div.style.borderRadius = '12px';
            div.style.border = '2px solid #5DADE2';
            div.innerHTML = `
                <label style="font-size:1.3rem; font-weight:bold; display:block; margin-bottom:10px;">
                    <input type="checkbox" class="checkbox-pago-modal" data-año="${año}" data-mes="${mes}" ${pagado ? 'checked' : ''}>
                    ${nombreMes}
                </label>
                <div class="pago-detalle" style="margin-top:10px; display:${pagado ? 'block' : 'none'};">
                    <label>Fecha de pago</label>
                    <input type="date" class="input-fecha-pago" value="${fechaPago}" style="width:100%; padding:10px; margin-bottom:10px; border-radius:8px; border:1px solid #ddd;">
                    <label>Forma de pago</label>
                    <select class="select-forma-pago" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ddd;">
                        <option value="">Seleccionar</option>
                        <option value="efectivo" ${formaPago === 'efectivo' ? 'selected' : ''}>Efectivo</option>
                        <option value="transferencia" ${formaPago === 'transferencia' ? 'selected' : ''}>Transferencia</option>
                        <option value="deposito" ${formaPago === 'deposito' ? 'selected' : ''}>Depósito</option>
                        <option value="debito" ${formaPago === 'debito' ? 'selected' : ''}>Débito automático</option>
                    </select>
                </div>
            `;
            // Mostrar/ocultar detalles al marcar checkbox
            const checkbox = div.querySelector('.checkbox-pago-modal');
            const detalle = div.querySelector('.pago-detalle');
            const inputFecha = div.querySelector('.input-fecha-pago');
            checkbox.addEventListener('change', () => {
                detalle.style.display = checkbox.checked ? 'block' : 'none';
                if (checkbox.checked && inputFecha.value === '') {
                    inputFecha.value = new Date().toISOString().split('T')[0]; // fecha hoy por defecto
                }
            });
            grid.appendChild(div);
        }
        // Mostrar modal
        document.getElementById('modal-control-pagos').style.display = 'flex';
    } catch (err) {
        alert('Error al cargar datos del paciente');
    }
};
// Guardar cambios (incluye fecha y forma de pago)
document.getElementById('btn-guardar-pagos-modal').addEventListener('click', async () => {
    if (!modalPagosPacienteId) return;
    const pagosData = [];
    document.querySelectorAll('.checkbox-pago-modal').forEach(cb => {
        const div = cb.closest('.form-group');
        const fechaPago = div.querySelector('.input-fecha-pago').value || null;
        const formaPago = div.querySelector('.select-forma-pago').value || null;
        pagosData.push({
            año: parseInt(cb.dataset.año),
            mes: parseInt(cb.dataset.mes),
            pagado: cb.checked,
            fecha_pago: fechaPago,
            forma_pago: formaPago
        });
    });
    try {
        await fetch(`/api/pacientes/${modalPagosPacienteId}/pagos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pagos: pagosData })
        });
        showSuccess('¡Pagos actualizados con éxito!');
        cerrarModalPagos();
        cargarPagosPendientes();
    } catch (err) {
        alert('Error al guardar pagos');
    }
});
document.getElementById('modal-control-pagos').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-control-pagos')) {
        cerrarModalPagos();
    }
});
// === MOSTRAR FICHA COMPLETA ===
window.mostrarFichaCompleta = async (id) => {
    try {
        const pacRes = await fetch(`/api/pacientes/${id}`);
        if (!pacRes.ok) throw new Error('Paciente no encontrado');
        const p = await pacRes.json();
        fichaDetalle.innerHTML = `
            ${p.foto_cedula ? `<div style="text-align:center; margin-bottom:30px;"><img src="${p.foto_cedula}?t=${Date.now()}" style="max-width:450px; border-radius:15px; border:4px solid #5DADE2; box-shadow:0 10px 30px rgba(93,173,226,0.3);"></div>` : '<p style="text-align:center; color:#999; margin-bottom:30px; font-size:1.2rem;">No hay foto de cédula subida</p>'}
            <fieldset class="fieldset-profesional">
                <legend>Datos del Paciente</legend>
                <div class="form-grid" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:20px;">
                    <p><strong>Nombre completo:</strong> ${p.nombre || '—'}</p>
                    <p><strong>Documento:</strong> ${p.documento_tipo ? p.documento_tipo.charAt(0).toUpperCase() + p.documento_tipo.slice(1) : '—'} - ${p.documento_numero || '—'}</p>
                    <p><strong>Sede:</strong> ${p.sede || '—'}</p>
                    <p><strong>Estado:</strong> ${p.estado || 'Activo'}</p>
                    ${p.estado && p.estado !== 'Activo' ? `
                    <p><strong>Fecha de ${p.estado}:</strong> ${p.fecha_cambio_estado ? new Date(p.fecha_cambio_estado).toLocaleDateString('es-CL') : 'No registrada'}</p>
                    ` : ''}
                    <p><strong>Etapa:</strong> ${p.etapa || 'No especificada'}</p>
                    <p><strong>Fecha de ingreso:</strong> ${formatDate(p.fecha_ingreso)}</p>
                    <p><strong>Sexo:</strong> ${p.sexo || 'No registrado'}</p>
                    <p><strong>Fecha de nacimiento:</strong> ${p.fecha_nacimiento ? new Date(p.fecha_nacimiento).toLocaleDateString('es-CL') : 'No registrada'}</p>
                    <p><strong>Ocupación:</strong> ${p.ocupacion || 'No registrada'}</p>
                    <p><strong>Previsión de salud:</strong> ${p.prevision || 'No registrada'}</p>
                    <p><strong>Atención Psiquiátrica:</strong> ${p.atencion_psiquiatrica || 'No especificada'}</p>
                    <p class="full-width"><strong>Dirección:</strong> ${p.direccion || 'No registrada'}</p>
                    <p><strong>Región:</strong> ${p.region || 'No registrada'}</p>
                    <p><strong>Comuna:</strong> ${p.comuna || 'No registrada'}</p>
                </div>
            </fieldset>
            <fieldset class="fieldset-profesional">
                <legend>Datos del Apoderado</legend>
                <div class="form-grid" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:20px;">
                    <p><strong>Nombre:</strong> ${p.nombre_apoderado || 'No registrado'}</p>
                    <p><strong>Documento:</strong> ${p.documento_tipo_apoderado ? p.documento_tipo_apoderado.charAt(0).toUpperCase() + p.documento_tipo_apoderado.slice(1) : '—'} - ${p.documento_numero_apoderado || '—'}</p>
                    <p><strong>Teléfono:</strong> ${p.telefono_apoderado || '—'}</p>
                    <p><strong>Correo apoderado:</strong> ${p.correo_apoderado || 'No registrado'}</p>
                    <p class="full-width"><strong>Dirección:</strong> ${p.direccion_apoderado || 'No registrada'}</p>
                </div>
            </fieldset>
            ${p.otros_contactos ? `
                <fieldset class="fieldset-profesional">
                    <legend>Otros Contactos</legend>
                    <div class="form-grid" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:20px;">
                        ${JSON.parse(p.otros_contactos).map((c, i) => `
                            <div style="background:#f8fbff; padding:15px; border-radius:12px; border:2px solid #5DADE2;">
                                <p><strong>Contacto ${i+1}</strong></p>
                                <p>Nombre: ${c.nombre || '—'}</p>
                                <p>Parentesco: ${c.parentesco || '—'}</p>
                                <p>Teléfono: ${c.telefono || '—'}</p>
                            </div>
                        `).join('')}
                    </div>
                </fieldset>
                ` : ''}
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-top:40px; text-align:center;">
                <button class="btn-primary grande" style="background:#5DADE2; padding:20px 40px; font-size:1.6rem;">Ver Documentos Paciente</button>
                <button class="btn-primary grande" style="background:#28a745; padding:20px 40px; font-size:1.6rem;" onclick="generarContrato(${p.id})">Imprimir Contrato</button>
                <button class="btn-primary grande" style="background:#17a2b8; padding:20px 40px; font-size:1.6rem;">Imprimir Consentimientos</button>
                <button class="btn-primary grande" style="background:#ffc107; color:#212529; padding:20px 40px; font-size:1.6rem;">Imprimir Comprobante de Pago</button>
            </div>
        `;
        fichaModal.style.display = 'flex';
    } catch (err) {
        console.error('Error en mostrarFichaCompleta:', err);
        alert('Error al cargar la ficha del paciente');
    }
};
closeFichaModal.onclick = () => fichaModal.style.display = 'none';
btnCerrarFicha.onclick = () => fichaModal.style.display = 'none';
// === CONSULTAR SEDES (MEJORADO: MÁS PROFESIONAL, SIN LISTADO INICIAL, BOTÓN IMPRIMIR) ===
document.getElementById('btn-consultar').addEventListener('click', async () => {
    const sedeSeleccionada = document.getElementById('select-sede').value;
    try {
        const res = await fetch('/api/pacientes');
        let pacientes = await res.json();
        if (sedeSeleccionada) {
            pacientes = pacientes.filter(p => p.sede === sedeSeleccionada);
        }
        const conteoPorSede = {};
        const sedes = ['Olea', 'Naltahua', 'Femenino uno', 'Femenino dos', 'Polpaico', 'Buin'];
        sedes.forEach(s => {
            conteoPorSede[s] = { activo: 0, reinsercion: 0, total: 0 };
        });
        pacientes.forEach(p => {
            const est = p.estado || 'Activo';
            const s = p.sede || 'Sin sede';
            if (est === 'Activo') conteoPorSede[s].activo++;
            if (est === 'Reinserción') conteoPorSede[s].reinsercion++;
        });
        sedes.forEach(s => {
            conteoPorSede[s].total = conteoPorSede[s].activo + conteoPorSede[s].reinsercion;
        });
        let totalActivoGeneral = 0;
        let totalReinsercionGeneral = 0;
        let totalGeneral = 0;
        sedes.forEach(s => {
            totalActivoGeneral += conteoPorSede[s].activo;
            totalReinsercionGeneral += conteoPorSede[s].reinsercion;
            totalGeneral += conteoPorSede[s].total;
        });
        let htmlResumen = '<div class="resumen-sede-grid">';
        if (!sedeSeleccionada) {
            htmlResumen += `
                <div class="resumen-sede-card general">
                    <h3 style="font-size:1.8rem; color:#2c3e50; margin-bottom:20px;">Resumen General (Todas las Sedes)</h3>
                    <div class="estadistica-grid">
                        <div class="estadistica-item">
                            <span class="label">Activo</span>
                            <span class="numero grande">${totalActivoGeneral}</span>
                        </div>
                        <div class="estadistica-item">
                            <span class="label">Reinserción</span>
                            <span class="numero grande">${totalReinsercionGeneral}</span>
                        </div>
                        <div class="estadistica-item total">
                            <span class="label">Total Pacientes</span>
                            <span class="numero grande total-num">${totalGeneral}</span>
                        </div>
                    </div>
                </div>
            `;
        }
        sedes.forEach(s => {
            if (conteoPorSede[s].total === 0) return;
            if (sedeSeleccionada && s !== sedeSeleccionada) return;
            htmlResumen += `
                <div class="resumen-sede-card">
                    <h3 style="font-size:1.6rem; color:#2c3e50; margin-bottom:15px;">Sede: ${s}</h3>
                    <div class="estadistica-grid">
                        <div class="estadistica-item">
                            <span class="label">Activo</span>
                            <span class="numero">${conteoPorSede[s].activo}</span>
                        </div>
                        <div class="estadistica-item">
                            <span class="label">Reinserción</span>
                            <span class="numero">${conteoPorSede[s].reinsercion}</span>
                        </div>
                        <div class="estadistica-item total">
                            <span class="label">Total Pacientes</span>
                            <span class="numero total-num">${conteoPorSede[s].total}</span>
                        </div>
                    </div>
                    <button class="btn-primary grande" style="margin-top:25px; width:100%; background:#28a745;">
                        Imprimir Listado
                    </button>
                </div>
            `;
        });
        htmlResumen += '</div>';
        document.getElementById('resumen-container').innerHTML = htmlResumen;
        document.getElementById('lista-sedes').innerHTML = '';
        document.getElementById('lista-sedes').style.display = 'none';
    } catch (err) {
        alert('Error al consultar sedes');
        console.error(err);
    }
});
// === CONTROL DE PAGOS ===
async function cargarPagosPendientes() {
    try {
        const res = await fetch('/api/pagos-pendientes');
        if (!res.ok) throw new Error();
        const data = await res.json();
        const resPac = await fetch('/api/pacientes');
        const todosPacientes = await resPac.json();
        const pendientesMap = new Map();
        data.pacientes.forEach(p => pendientesMap.set(p.id, p));
        const conteoPorSede = {};
        const sedes = ['Olea', 'Naltahua', 'Femenino uno', 'Femenino dos', 'Polpaico', 'Buin'];
        sedes.forEach(s => conteoPorSede[s] = 0);
        todosPacientes.forEach(p => {
            if (pendientesMap.has(p.id)) {
                conteoPorSede[p.sede] = (conteoPorSede[p.sede] || 0) + 1;
            }
        });
        const resumenContainer = document.getElementById('resumen-pagos-sedes');
        resumenContainer.innerHTML = '';
        if (Object.keys(conteoPorSede).every(s => conteoPorSede[s] === 0)) {
            resumenContainer.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:green; font-size:1.6rem; padding:80px;">¡Todos los pacientes están al día con sus pagos! 🎉✅</p>';
        } else {
            sedes.forEach(s => {
                const cantidad = conteoPorSede[s] || 0;
                if (cantidad === 0) return;
                const card = document.createElement('div');
                card.className = 'resumen-sede-card';
                card.innerHTML = `
                    <h4>Sede ${s}</h4>
                    <span class="label">Pacientes Pendientes</span>
                    <div class="numero">${cantidad}</div>
                    <button class="btn-primary" onclick="mostrarListaSede('${s}')">Ver Listado</button>
                `;
                resumenContainer.appendChild(card);
            });
        }
        const inputPrincipal = document.getElementById('buscar-pago-principal');
        const btnPrincipal = document.getElementById('btn-buscar-pago-principal');
        const buscarGlobal = () => {
            const termino = normalizar(inputPrincipal.value.trim());
            if (!termino) {
                cargarPagosPendientes();
                return;
            }
            const palabras = termino.split(/\s+/);
            const filtrados = todosPacientes.filter(p =>
                pendientesMap.has(p.id) &&
                palabras.every(pal => normalizar(p.nombre).includes(pal) || normalizar(p.documento_numero).includes(pal))
            );
            mostrarListaGlobal(filtrados);
        };
        btnPrincipal.onclick = buscarGlobal;
        inputPrincipal.onkeypress = (e) => { if (e.key === 'Enter') buscarGlobal(); };
    } catch (err) {
        console.error('Error al cargar pagos:', err);
        document.getElementById('resumen-pagos-sedes').innerHTML = '<p style="color:red; text-align:center;">Error al cargar datos.</p>';
    }
}
window.mostrarListaSede = async (sede) => {
    try {
        const res = await fetch('/api/pacientes');
        const pacientes = await res.json();
        const resPend = await fetch('/api/pagos-pendientes');
        const dataPend = await resPend.json();
        const pendientesMap = new Map();
        dataPend.pacientes.forEach(p => pendientesMap.set(p.id, p));
        const pacientesSede = pacientes.filter(p => p.sede === sede && pendientesMap.has(p.id));
        document.getElementById('resumen-pagos-sedes').style.display = 'none';
        document.querySelector('#seccion-pagos .btn-volver').style.display = 'none';
        document.getElementById('buscador-principal').style.display = 'none';
        const detalle = document.getElementById('lista-pagos-detalle');
        detalle.style.display = 'block';
        document.getElementById('titulo-lista-sede').textContent = `Pacientes Pendientes - Sede ${sede}`;
        const lista = document.getElementById('contenido-lista-pagos');
        function render(filtrados) {
            lista.innerHTML = '';
            if (filtrados.length === 0) {
                lista.innerHTML = '<p style="text-align:center;color:#999;padding:60px;">No hay pacientes pendientes en esta sede.</p>';
                return;
            }
            filtrados.sort((a, b) => a.nombre.localeCompare(b.nombre));
            filtrados.forEach(p => {
                const info = pendientesMap.get(p.id);
                const meses = info.meses_pendientes.length;
                const card = document.createElement('div');
                card.className = 'pago-card';
                card.style.borderLeft = meses > 1 ? '6px solid #dc3545' : '6px solid #ffc107';
                card.innerHTML = `
                    <div class="info-paciente">
                        <strong>${p.nombre}</strong><br>
                        Documento: ${p.documento_numero}<br>
                        Monto mensual: $${parseInt(p.monto_mensual).toLocaleString('es-CL')}<br>
                        <span class="pendientes">${meses} mes(es) pendiente(s)</span>
                    </div>
                    <div class="botones-pago">
                        <button class="btn-primary" onclick="abrirModalControlPagos(${p.id})">Control de Pagos</button>
                    </div>
                `;
                lista.appendChild(card);
            });
        }
        render(pacientesSede);
        const input = document.getElementById('buscar-pago-detalle');
        const btn = document.getElementById('btn-buscar-pago-detalle');
        const buscar = () => {
            const termino = normalizar(input.value.trim());
            if (!termino) {
                render(pacientesSede);
                return;
            }
            const palabras = termino.split(/\s+/);
            const filtrados = pacientesSede.filter(p =>
                palabras.every(pal => normalizar(p.nombre).includes(pal) || normalizar(p.documento_numero).includes(pal))
            );
            render(filtrados);
        };
        btn.onclick = buscar;
        input.oninput = () => { if (input.value.trim() === '') buscar(); };
        input.onkeypress = (e) => { if (e.key === 'Enter') buscar(); };
    } catch (err) {
        console.error(err);
        alert('Error al cargar lista de sede');
    }
};
window.mostrarListaGlobal = (pacientesFiltrados) => {
    document.getElementById('resumen-pagos-sedes').style.display = 'none';
    const detalle = document.getElementById('lista-pagos-detalle');
    detalle.style.display = 'block';
    document.getElementById('titulo-lista-sede').textContent = 'Resultados de búsqueda global';
    const lista = document.getElementById('contenido-lista-pagos');
    function render(filtrados) {
        lista.innerHTML = '';
        if (filtrados.length === 0) {
            lista.innerHTML = '<p style="text-align:center;color:#999;padding:60px;">No se encontraron pacientes con pagos pendientes.</p>';
            return;
        }
        filtrados.sort((a, b) => a.sede.localeCompare(b.sede) || a.nombre.localeCompare(b.nombre));
        filtrados.forEach(p => {
            const meses = p.meses_pendientes ? p.meses_pendientes.length : 0;
            const card = document.createElement('div');
            card.className = 'pago-card';
            card.style.borderLeft = meses > 1 ? '6px solid #dc3545' : '6px solid #ffc107';
            card.innerHTML = `
                <div class="info-paciente">
                    <strong>${p.nombre}</strong><br>
                    Documento: ${p.documento_numero} | Sede: <strong>${p.sede}</strong><br>
                    Monto mensual: $${parseInt(p.monto_mensual).toLocaleString('es-CL')}<br>
                    <span class="pendientes">${meses} mes(es) pendiente(s)</span>
                </div>
                <div class="botones-pago">
                    <button class="btn-primary" onclick="abrirModalControlPagos(${p.id})">Control de Pagos</button>
                </div>
            `;
            lista.appendChild(card);
        });
    }
    render(pacientesFiltrados);
};
window.ocultarListaDetalle = () => {
    document.getElementById('resumen-pagos-sedes').style.display = 'grid';
    document.getElementById('lista-pagos-detalle').style.display = 'none';
    document.getElementById('buscar-pago-detalle').value = '';
    document.querySelector('#seccion-pagos .btn-volver').style.display = 'block';
};
window.marcarPagoMesActual = async (pacienteId) => {
    if (!confirm('¿Confirmas que este paciente pagó el mes actual?')) return;
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = hoy.getMonth() + 1;
    try {
        await fetch(`/api/pacientes/${pacienteId}/pagos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pagos: [{ año, mes, pagado: true }] })
        });
        showSuccess('¡Pago marcado como recibido!');
        cargarPagosPendientes();
    } catch (err) {
        alert('Error al marcar pago');
    }
};
// === CIERRE DE TODOS LOS MODALES (X y clic fuera) ===
// Cierra con cualquier X (todas las clases close-modal o close-modal-ficha)
document.querySelectorAll('.close-modal, .close-modal-ficha').forEach(closeBtn => {
    closeBtn.onclick = () => {
        const modal = closeBtn.closest('.modal');
        if (modal) modal.style.display = 'none';
    };
});
// Cerrar al hacer clic fuera del contenido del modal (fondo gris)
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});
// Función específica para cerrar modal de pagos (si tiene botón extra)
window.cerrarModalPagos = () => {
    const modal = document.getElementById('modal-control-pagos');
    if (modal) modal.style.display = 'none';
};
// (Opcional pero recomendado) Cerrar con tecla ESC
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(modal => {
            if (modal.style.display === 'flex' || modal.style.display === 'block') {
                modal.style.display = 'none';
            }
        });
    }
});
// === EVALUACIONES SEMANALES ===
document.getElementById('btn-buscar-evaluaciones').addEventListener('click', async () => {
    const fechaInput = document.getElementById('fecha-evaluacion').value;
    if (!fechaInput) {
        alert('Por favor selecciona una fecha');
        return;
    }
    const fechaEval = new Date(fechaInput);
    try {
        const res = await fetch('/api/pacientes');
        const pacientes = await res.json();
        const lista = document.getElementById('lista-evaluaciones');
        lista.innerHTML = '';
        const pacientesAEvaluar = [];
        pacientes.forEach(p => {
            const fechaIngreso = new Date(p.fecha_ingreso);
            const etapa = p.etapa || 'Compromiso';
            let fechaEsperadaEval = null;
            if (etapa === 'Compromiso') {
                const diasHastaDomingo = (7 - fechaIngreso.getDay()) % 7;
                fechaEsperadaEval = new Date(fechaIngreso);
                fechaEsperadaEval.setDate(fechaIngreso.getDate() + diasHastaDomingo);
            } else if (etapa === 'Grupo 4') {
                fechaEsperadaEval = new Date(fechaIngreso);
                fechaEsperadaEval.setDate(fechaIngreso.getDate() + 7);
            } else {
                const etapas56 = ['Grupo 3', 'Grupo 2', 'Grupo 1', 'Nivel 1', 'Nivel 2', 'Nivel 3'];
                if (etapas56.includes(etapa)) {
                    const ordenEtapas = {
                        'Grupo 4': 0,
                        'Grupo 3': 1,
                        'Grupo 2': 2,
                        'Grupo 1': 3,
                        'Nivel 1': 4,
                        'Nivel 2': 5,
                        'Nivel 3': 6
                    };
                    const posicion = ordenEtapas[etapa] || 0;
                    const diasTotales = 7 + (posicion * 56);
                    fechaEsperadaEval = new Date(fechaIngreso);
                    fechaEsperadaEval.setDate(fechaIngreso.getDate() + diasTotales);
                }
            }
            if (fechaEsperadaEval && fechaEsperadaEval.toISOString().slice(0,10) === fechaEval.toISOString().slice(0,10)) {
                pacientesAEvaluar.push(p);
            }
        });
        if (pacientesAEvaluar.length === 0) {
            const dia = String(fechaEval.getDate()).padStart(2, '0');
            const mes = String(fechaEval.getMonth() + 1).padStart(2, '0');
            const año = fechaEval.getFullYear();
            const fechaFormateada = `${dia}-${mes}-${año}`;
            lista.innerHTML = `<p style="text-align:center;color:#999;padding:80px;font-size:1.4rem;">
                No hay pacientes programados para evaluación este domingo (${fechaFormateada}).
            </p>`;
            return;
        }
        lista.innerHTML = `<h4 style="text-align:center;margin:30px 0;color:#2c3e50;">
            ${pacientesAEvaluar.length} paciente(s) a evaluar el ${fechaFormateada}
        </h4>`;
        pacientesAEvaluar.forEach(p => {
            const card = document.createElement('div');
            card.className = 'paciente-card';
            card.style.margin = '15px 0';
            card.innerHTML = `
                <div class="info-paciente">
                    <strong>${p.nombre}</strong><br>
                    Documento: ${p.documento_numero} | Sede: ${p.sede}<br>
                    Etapa actual: <strong>${p.etapa || 'Compromiso'}</strong> | Ingreso: ${formatDate(p.fecha_ingreso)}
                </div>
                <button class="btn-primary" onclick="mostrarFichaCompleta(${p.id})">Ver Ficha</button>
            `;
            lista.appendChild(card);
        });
    } catch (err) {
        console.error(err);
        alert('Error al cargar pacientes para evaluación');
    }
});
// === ELIMINACIÓN MASIVA ===
const inputConfirm = document.getElementById('confirmacion-eliminar');
const btnEliminar = document.getElementById('btn-eliminar-masivo');
if (inputConfirm && btnEliminar) {
    inputConfirm.addEventListener('input', () => {
        if (inputConfirm.value.trim() === 'ELIMINAR TODO') {
            btnEliminar.disabled = false;
            btnEliminar.style.opacity = '1';
        } else {
            btnEliminar.disabled = true;
            btnEliminar.style.opacity = '0.6';
        }
    });
    btnEliminar.addEventListener('click', async () => {
        if (!confirm('¿ESTÁS ABSOLUTAMENTE SEGURO? Esta acción no se puede deshacer.')) {
            return;
        }
        try {
            const res = await fetch('/api/eliminar-todo', { method: 'DELETE' });
            const data = await res.json();
            if (res.ok) {
                alert('¡Todos los pacientes han sido eliminados correctamente!\nLa base de datos y las carpetas de fotos están limpias.');
                document.querySelectorAll('section').forEach(s => s.style.display = 'none');
                document.getElementById('menu-principal').style.display = 'block';
                inputConfirm.value = '';
                btnEliminar.disabled = true;
            } else {
                alert('Error: ' + (data.error || 'No se pudo completar la eliminación'));
            }
        } catch (err) {
            alert('Error de conexión con el servidor');
            console.error(err);
        }
    });
}
// === CARGA MASIVA PARA PRUEBAS ===
const btnCargaMasiva = document.getElementById('btn-subir-carga-masiva');
const inputArchivo = document.getElementById('archivo-carga-masiva');
const divResultado = document.getElementById('resultado-carga-masiva');
if (btnCargaMasiva && inputArchivo && divResultado) {
    btnCargaMasiva.addEventListener('click', async () => {
        if (!inputArchivo.files || inputArchivo.files.length === 0) {
            divResultado.innerHTML = '<p style="color:red; font-size:1.3rem;">⚠️ Por favor selecciona un archivo Excel o CSV.</p>';
            return;
        }
        const file = inputArchivo.files[0];
        const formData = new FormData();
        formData.append('archivo', file);
        divResultado.innerHTML = '<p style="color:#666; font-size:1.3rem;">📤 Subiendo y procesando el archivo, por favor espera...</p>';
        try {
            const response = await fetch('/api/carga-masiva-pruebas', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            if (response.ok) {
                let mensaje = `<p style="color:green; font-size:1.4rem;">
                    ✅ ¡Carga masiva completada exitosamente!<br>
                    Pacientes agregados: <strong>${data.agregados || 0}</strong>
                </p>`;
                if (data.errores && data.errores.length > 0) {
                    mensaje += `<p style="color:orange; margin-top:20px;"><strong>Advertencias (filas con errores):</strong></p>
                    <ul style="text-align:left; max-width:700px; margin:0 auto; color:#d35400;">`;
                    data.errores.forEach(err => {
                        mensaje += `<li>Fila ${err.fila}: ${err.mensaje}</li>`;
                    });
                    mensaje += '</ul>';
                }
                divResultado.innerHTML = mensaje;
            } else {
                divResultado.innerHTML = `<p style="color:red; font-size:1.3rem;">
                    ❌ Error del servidor: ${data.error || 'No se pudo procesar el archivo'}
                </p>`;
            }
        } catch (err) {
            console.error('Error en fetch:', err);
            divResultado.innerHTML = '<p style="color:red; font-size:1.3rem;">❌ Error de conexión. Revisa la consola (F12) para detalles.</p>';
        }
    });
}
// === DOCUMENTOS INSTITUCIONALES ===
document.getElementById('btn-subir-documentos').addEventListener('click', async () => {
    const files = document.getElementById('upload-documentos').files;
    if (files.length === 0) {
        document.getElementById('mensaje-upload').innerHTML = '<p style="color:red;">Selecciona al menos un archivo.</p>';
        return;
    }
    const formData = new FormData();
    for (let file of files) {
        formData.append('documentos', file);
    }
    document.getElementById('mensaje-upload').innerHTML = '<p style="color:#666;">Subiendo archivos...</p>';
    try {
        const res = await fetch('/api/documentos-institucion/upload', {
            method: 'POST',
            body: formData
        });
        if (res.ok) {
            document.getElementById('mensaje-upload').innerHTML = '<p style="color:green;">¡Documentos subidos exitosamente!</p>';
            cargarListaDocumentos();
            document.getElementById('upload-documentos').value = '';
        } else {
            document.getElementById('mensaje-upload').innerHTML = '<p style="color:red;">Error al subir archivos.</p>';
        }
    } catch (err) {
        document.getElementById('mensaje-upload').innerHTML = '<p style="color:red;">Error de conexión.</p>';
    }
});
async function cargarListaDocumentos() {
    try {
        const res = await fetch('/api/documentos-institucion');
        const archivos = await res.json();
        if (archivos.length === 0) {
            document.getElementById('lista-documentos').innerHTML = '<p style="text-align:center; color:#999; padding:60px;">No hay documentos subidos aún.</p>';
            return;
        }
        let html = '<div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:20px;">';
        archivos.forEach(arch => {
            html += `
                <div style="background:#f8fbff; padding:20px; border-radius:12px; border:2px solid #5DADE2; text-align:center;">
                    <p><strong>${arch.nombre}</strong></p>
                    <p>Tamaño: ${arch.tamaño}</p>
                    <p>Subido: ${arch.fecha}</p>
                    <a href="/documentos-institucion/${encodeURIComponent(arch.nombre)}" download class="btn-primary" style="display:inline-block; margin-top:15px; padding:12px 30px;">
                        Descargar
                    </a>
                </div>
            `;
        });
        html += '</div>';
        document.getElementById('lista-documentos').innerHTML = html;
    } catch (err) {
        document.getElementById('lista-documentos').innerHTML = '<p style="color:red; text-align:center;">Error al cargar documentos.</p>';
    }
}
document.querySelector('[data-seccion="documentos-institucion"]').addEventListener('click', () => {
    cargarListaDocumentos();
});
// Función para generar e imprimir contrato
window.generarContrato = async (id) => {
    try {
        const res = await fetch(`/api/pacientes/${id}`);
        if (!res.ok) throw new Error('Error al cargar paciente');
        const p = await res.json();

        // Mapear sede a nombre de template
        const sedeMap = {
            'Olea': 'Olea',
            'Naltahua': 'Naltahua',
            'Femenino uno': 'Femenino_uno',
            'Femenino dos': 'Femenino_dos',
            'Polpaico': 'Polpaico',
            'Buin': 'Buin'
        };
        const sedeFile = sedeMap[p.sede] || 'Olea'; // fallback
        const templateUrl = `/contratos_templates/contrato_${sedeFile}.docx`;

        // Cargar template
        const templateRes = await fetch(templateUrl);
        if (!templateRes.ok) throw new Error(`Template no encontrado para sede ${p.sede}`);
        const templateArrayBuffer = await templateRes.arrayBuffer();

        // Cargar con PizZip
        const zip = new PizZip(templateArrayBuffer);
        const doc = new docxtemplater(zip);

        // Preparar datos para contactos
        let contactos = [];
        if (p.otros_contactos) {
            try {
                contactos = JSON.parse(p.otros_contactos);
            } catch (e) {
                contactos = [];
            }
        }
        while (contactos.length < 3) contactos.push({ nombre: '', telefono: '', parentesco: '' });

        // Datos a reemplazar
        doc.setData({
            nombre_paciente: p.nombre || '',
            rut_paciente: p.documento_numero || '',
            direccion_paciente: p.direccion || '',
            comuna_paciente: p.comuna || '',
            region_paciente: p.region || '',
            nombre_apoderado: p.nombre_apoderado || '',
            rut_apoderado: p.documento_numero_apoderado || '',
            direccion_apoderado: p.direccion_apoderado || '',
            telefono_apoderado: p.telefono_apoderado || '',
            contacto1_nombre: contactos[0].nombre || '',
            contacto1_telefono: contactos[0].telefono || '',
            contacto1_parentezco: contactos[0].parentesco || '',
            contacto2_nombre: contactos[1].nombre || '',
            contacto2_telefono: contactos[1].telefono || '',
            contacto2_parentezco: contactos[1].parentesco || '',
            contacto3_nombre: contactos[2].nombre || '',
            contacto3_telefono: contactos[2].telefono || '',
            contacto3_parentezco: contactos[2].parentesco || '',
            valor_mensual: parseInt(p.monto_mensual || 350000).toLocaleString('es-CL'),
            fecha_ingreso: (() => {
                if (p.fecha_ingreso && p.fecha_ingreso.trim() !== '') {
                    const date = new Date(p.fecha_ingreso);
                    if (!isNaN(date.getTime())) {
                        return date.toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
                    }
                }
                return 'No registrada';
            })(),
        });

        doc.render();

        const out = doc.getZip().generate({ type: "blob" });
        const fecha = new Date().toISOString().slice(0,10).replace(/-/g, '');
        const fileName = `contrato_${p.nombre.replace(/ /g, '_')}_${fecha}.docx`;

        // 1. Guardar en servidor (carpeta paciente/contratos)
        const formData = new FormData();
        formData.append('contrato', out, fileName);
        formData.append('paciente_id', id);

        const saveRes = await fetch('/api/guardar-contrato', {
            method: 'POST',
            body: formData
        });

        if (!saveRes.ok) {
            const err = await saveRes.json();
            throw new Error('Error al guardar en servidor: ' + (err.error || 'Desconocido'));
        }

        // 2. Descargar para imprimir
        saveAs(out, fileName);

        alert('¡Contrato generado exitosamente!\nSe guardó en la carpeta del paciente y se descargó para imprimir.');
    } catch (err) {
        console.error(err);
        alert('Error al generar contrato: ' + err.message + '\nRevisa la consola (F12) para más detalles.');
    }
};

console.log('Script.js cargado - Sistema Evolución Chile listo 🚀');
});