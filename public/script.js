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
        return doc.replace(/[\.\-]/g, '').toUpperCase();
    }

    function formatearDocumento(doc, tipo) {
        if (tipo !== 'rut') return doc.toUpperCase();
        let limpio = limpiarDocumentoParaCalculo(doc);
        if (limpio.length === 0) return '';
        if (limpio.length < 2) return limpio;
        let dv = limpio.slice(-1);
        let cuerpo = limpio.slice(0, -1);
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
        if (tipo !== 'rut') return true;
        let limpio = limpiarDocumentoParaCalculo(doc);
        if (limpio.length < 2) return false;
        if (!/^(\d{7,8}[0-9K])$/.test(limpio)) return false;
        let cuerpo = limpio.slice(0, -1);
        let dv = limpio.slice(-1);
        let dvCalculado = calcularDv(cuerpo);
        return dv === dvCalculado;
    }

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

    function setupDocumentoInput(inputId, tipoSelectId) {
        const input = document.getElementById(inputId);
        const selectTipo = document.getElementById(tipoSelectId);
        if (!input) return;
        input.addEventListener('input', () => {
            let valor = input.value.toUpperCase();
            const tipoActual = selectTipo ? selectTipo.value : 'rut';
            if (tipoActual === 'rut') {
                valor = valor.replace(/[^0-9K]/g, '');
                if (valor.match(/K/g) && valor.match(/K/g).length > 1) valor = valor.replace(/K/g, '');
                if (valor.length > 1 && /[K]/.test(valor.slice(0, -1))) valor = valor.replace(/K/g, '');
            } else {
                valor = valor.replace(/[^A-Z0-9\-]/g, '');
            }
            input.value = valor;
        });
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

    function parseMonedaCL(valor) {
        if (valor === null || valor === undefined) return 0;
        const limpio = String(valor).replace(/[^\d]/g, '');
        return parseInt(limpio || '0', 10);
    }

    function formatMonedaCL(numero) {
        const n = parseInt(numero || 0, 10);
        return '$' + n.toLocaleString('es-CL');
    }

    // Volver SOLO al área principal de Finanzas
    function volverAreaFinanzas() {
        document.getElementById('subseccion-modificar-pago').style.display = 'none';
        document.getElementById('resultados-modificar-pago').innerHTML = '';
        document.getElementById('buscar-modificar-pago').value = '';
        document.querySelector('.botones-finanzas-grid').style.display = 'grid';
        const tituloFinanzas = document.querySelector('#seccion-finanzas .titulo-seccion');
        if (tituloFinanzas) tituloFinanzas.style.display = 'block';
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
                if (seccion === 'capacidad') {
                    cargarCapacidades();
                }
                if (seccion === 'kpi') {
                    cargarKpiDashboard();
                }
            }
            if (seccion === 'stock-mercaderia') {
                document.getElementById('seccion-stock-mercaderia').style.display = 'block';
            }
        });
    });

    document.querySelectorAll('.btn-volver').forEach(btn => {
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

    // Lista de etapas (incluye Reeducado)
    const etapasList = ['Compromiso', 'Grupo 4', 'Grupo 3', 'Grupo 2', 'Grupo 1', 'Nivel 1', 'Nivel 2', 'Nivel 3', 'Reeducado'];

    // === REGISTRAR PACIENTE ===
    document.getElementById('registro-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const confirmar = confirm("¿Desea registrar el paciente con los datos ingresados?\n\nEsto creará un nuevo registro en el sistema.");
        if (!confirmar) return;

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
        formData.append('estado', 'Activo');
        formData.append('etapa', document.getElementById('etapa')?.value || 'Compromiso');
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
        formData.append('region_apoderado', document.getElementById('region_apoderado')?.value || '');
        formData.append('comuna_apoderado', document.getElementById('comuna_apoderado')?.value.trim() || '');

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
            console.log('Enviando datos del paciente al servidor...');
            const res = await fetch('/api/pacientes', { method: 'POST', body: formData });
            if (res.ok) {
                const data = await res.json();
                const pacienteId = data.id;

                alert("¡Paciente registrado exitosamente!");
                showSuccess('¡Paciente registrado con éxito!');

                // Guardar pago inicial si el combo está en "si"
                const pagoAlIngresar = document.getElementById('pago_al_ingresar').value;
                if (pagoAlIngresar === 'si') {
                    const fechaIngreso = document.getElementById('fecha_ingreso').value;
                    if (fechaIngreso) {
                        const date = new Date(fechaIngreso);
                        const año = date.getFullYear();
                        const mes = date.getMonth() + 1;

                        const fechaPago = document.getElementById('fecha_pago_inicial')?.value || fechaIngreso;
                        let formaPago = document.getElementById('forma_pago_inicial')?.value || 'efectivo';
                        const valorPagado = parseFloat(document.getElementById('valor_pagado_inicial')?.value) || 0;

                        const pagado = true; // Siempre pagado si se registra pago inicial

                        const pagoInicial = [{
                            año: año,
                            mes: mes,
                            pagado: pagado,
                            fecha_pago: fechaPago,
                            forma_pago: formaPago,
                            valor_pagado: valorPagado
                        }];

                        try {
                            console.log('Intentando guardar pago inicial en BD con valor_pagado:', valorPagado);
                            const resPago = await fetch(`/api/pacientes/${pacienteId}/pagos`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ pagos: pagoInicial })
                            });

                            if (resPago.ok) {
                                console.log('Pago inicial guardado OK en BD');
                                showSuccess('¡Pago inicial generado automáticamente!');
                            } else {
                                const errText = await resPago.text();
                                console.error('Error al guardar pago inicial en BD:', errText);
                                alert('Paciente registrado, pero no se pudo guardar el pago inicial en BD.');
                            }

                            // SUBIR COMPROBANTE
                            const inputComprobante = document.getElementById('input-comprobante-inicial');
                            if (inputComprobante && inputComprobante.files && inputComprobante.files.length > 0) {
                                console.log('Archivos seleccionados para subir:', inputComprobante.files.length);

                                const formDataComprobante = new FormData();
                                for (let file of inputComprobante.files) {
                                    formDataComprobante.append('comprobantes', file);
                                }
                                formDataComprobante.append('pacienteId', pacienteId);

                                try {
                                    console.log('Enviando comprobante inicial al servidor...');
                                    const resComprobante = await fetch('/api/subir-comprobantes', {
                                        method: 'POST',
                                        body: formDataComprobante
                                    });

                                    if (resComprobante.ok) {
                                        const data = await resComprobante.json();
                                        console.log('Comprobante inicial subido OK:', data);
                                        showSuccess('Comprobante del pago inicial subido con éxito');
                                        inputComprobante.value = '';
                                        document.getElementById('lista-comprobante-inicial').innerHTML = '';
                                    } else {
                                        const err = await resComprobante.json();
                                        console.error('Error del servidor al subir comprobante inicial:', err);
                                        alert('Paciente y pago registrados, pero error al subir comprobante: ' + (err.error || 'Desconocido'));
                                    }
                                } catch (errComp) {
                                    console.error('Error en subida de comprobante inicial:', errComp);
                                    alert('Error de conexión al subir el comprobante inicial.');
                                }
                            } else {
                                console.log('No hay comprobante seleccionado para el pago inicial');
                            }
                        } catch (errPago) {
                            console.error('Error en fetch de pago inicial:', errPago);
                            alert('Paciente registrado, pero hubo un error al intentar guardar el pago inicial.');
                        }
                    } else {
                        console.warn('No hay fecha de ingreso para generar pago inicial');
                        alert('Selecciona fecha de ingreso antes de marcar pago inicial.');
                    }
                }

                e.target.reset();
                document.getElementById('preview-foto').innerHTML = '';
            } else {
                const err = await res.json();
                alert('Error al registrar: ' + (err.error || 'Intente nuevamente'));
            }
        } catch (err) {
            console.error('Error general en registro:', err);
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
                    <div class="botones-accion">
                        <button class="btn-edit" data-id="${p.id}">Editar</button>
                        <button class="btn-delete" data-id="${p.id}" data-nombre="${p.nombre.replace(/"/g, '&quot;')}">Eliminar</button>
                    </div>
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
                            ${etapasList.map(e => `<option value="${e}" ${e === p.etapa ? 'selected' : ''}>${e}</option>`).join('')}
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
                        <div class="form-group">
                            <label>Región apoderado</label>
                            <select id="edit-region_apoderado">
                                <option value="">Seleccionar región</option>
                                ${['Arica y Parinacota','Tarapacá','Antofagasta','Atacama','Coquimbo','Valparaíso','Metropolitana','O\'Higgins','Maule','Ñuble','Biobío','Araucanía','Los Ríos','Los Lagos','Aysén','Magallanes'].map(r => `<option value="${r}" ${r === p.region_apoderado ? 'selected' : ''}>${r}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Comuna apoderado</label>
                            <input type="text" id="edit-comuna_apoderado" value="${p.comuna_apoderado || ''}" placeholder="Ej: Temuco">
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
            setupDocumentoInput('edit-numero_documento_apoderado', 'edit-tipo_documento_apoderado');
            const selectEstado = document.getElementById('edit-estado');
            const contenedorFecha = document.getElementById('container-fecha-cambio-estado');
            const labelFecha = document.getElementById('label-fecha-cambio-estado');
            const inputFecha = document.getElementById('edit-fecha_cambio_estado');
            selectEstado.addEventListener('change', () => {
                const valor = selectEstado.value;
                if (valor !== 'Activo') {
                    contenedorFecha.style.display = 'block';
                    labelFecha.textContent = `Fecha de ${valor} *`;
                    inputFecha.required = true;
                    if (!inputFecha.value) inputFecha.value = new Date().toISOString().split('T')[0];
                } else {
                    contenedorFecha.style.display = 'none';
                    inputFecha.required = false;
                }
            });
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
        if (!confirmar) return;
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
        formData.append('region_apoderado', document.getElementById('edit-region_apoderado').value || '');
        formData.append('comuna_apoderado', document.getElementById('edit-comuna_apoderado').value.trim() || '');
        formData.append('monto_mensual', document.getElementById('edit-monto_mensual').value || 350000);
        formData.append('fecha_vencimiento_pago', document.getElementById('edit-fecha_vencimiento_pago').value || 5);
        formData.append('documento_tipo', document.getElementById('edit-tipo_documento').value);
        formData.append('documento_numero', document.getElementById('edit-numero_documento').value.trim());
        formData.append('documento_tipo_apoderado', document.getElementById('edit-tipo_documento_apoderado').value || '');
        formData.append('documento_numero_apoderado', document.getElementById('edit-numero_documento_apoderado').value.trim() || '');
        formData.append('fecha_cambio_estado', document.getElementById('edit-fecha_cambio_estado')?.value || null);
        const otrosContactosEdit = [];
        for (let i = 1; i <= 3; i++) {
            const nombre = document.getElementById(`edit-otro_contacto${i}_nombre`)?.value.trim() || '';
            const telefono = document.getElementById(`edit-otro_contacto${i}_telefono`)?.value.trim() || '';
            const parentesco = document.getElementById(`edit-otro_contacto${i}_parentezco`)?.value.trim() || '';
            otrosContactosEdit.push({ nombre, telefono, parentesco });
        }
        formData.append('otros_contactos', JSON.stringify(otrosContactosEdit));
        const fotoActualImg = editForm.querySelector('img[src*="documentos"]');
        const fotoActualUrl = fotoActualImg ? fotoActualImg.src.split('?')[0] : '';
        formData.append('foto_cedula_actual', fotoActualUrl);
        const nuevaFoto = document.getElementById('edit-foto_cedula').files[0];
        if (nuevaFoto) formData.append('foto_cedula', nuevaFoto);
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
                        <p><strong>Región apoderado:</strong> ${p.region_apoderado || 'No registrada'}</p>
                        <p><strong>Comuna apoderado:</strong> ${p.comuna_apoderado || 'No registrada'}</p>
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

    // === CONSULTAR SEDES ===
    document.getElementById('btn-consultar-sedes').addEventListener('click', async () => {
        const sedeSeleccionada = document.getElementById('select-sede-consultar').value || '';
        const container = document.getElementById('sedes-cards-container');
        container.innerHTML = '<p style="text-align:center; color:#999; padding:40px;">Cargando...</p>';

        try {
            const resPac = await fetch('/api/pacientes');
            const pacientes = await resPac.json();

            const resCap = await fetch('/api/capacidades');
            const capacidades = await resCap.json();
            const capMap = {};
            capacidades.forEach(c => capMap[c.sede] = c.capacidad || 0);

            const sedes = ['Olea', 'Naltahua', 'Femenino uno', 'Femenino dos', 'Polpaico', 'Buin'];

            let sedesFiltradas = sedes;
            if (sedeSeleccionada) sedesFiltradas = [sedeSeleccionada];

            container.innerHTML = '';

            sedesFiltradas.forEach(sede => {
                const pacientesSede = pacientes.filter(p => p.sede === sede);

                const conteoEstados = {
                    'Activo': 0,
                    'Reeducado': 0,
                    'Reinserción': 0,
                    'Abandono': 0,
                    'Expulsado': 0,
                    'Otro': 0
                };
                pacientesSede.forEach(p => {
                    const estado = p.estado || 'Activo';
                    conteoEstados[estado] = (conteoEstados[estado] || 0) + 1;
                });

                const capacidadMax = capMap[sede] || 0;
                const usuariosActivos = conteoEstados['Activo'] || 0;
                const reinsersion = conteoEstados['Reinserción'] || 0;
                const totalPacientes = pacientesSede.length;
                const disponible = capacidadMax - usuariosActivos;
                const sobreCupos = disponible < 0 ? Math.abs(disponible) : 0;

                const card = document.createElement('div');
                card.className = 'sede-card';
                card.innerHTML = `
                    <h3>${sede.toUpperCase()}</h3>
                    <div class="sede-content">
                        <div class="chart-container">
                            <canvas id="chart-${sede.replace(/ /g, '-')}" width="300" height="300"></canvas>
                        </div>
                        <div class="sede-table-container">
                            <table class="sede-table">
                                <tr><td>Capacidad Máxima</td><td>${capacidadMax}</td></tr>
                                <tr><td>Usuarios Activos</td><td>${usuariosActivos}</td></tr>
                                <tr><td>Reinsersión</td><td>${reinsersion}</td></tr>
                                <tr><td>Total Pacientes</td><td>${totalPacientes}</td></tr>
                                <tr><td>Disponible</td><td>${disponible}</td></tr>
                                <tr class="sobre-cupos"><td>Sobre Cupos</td><td>${sobreCupos}</td></tr>
                            </table>
                        </div>
                    </div>
                `;
                container.appendChild(card);

                const ctx = document.getElementById(`chart-${sede.replace(/ /g, '-')}`).getContext('2d');
                new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Activo', 'Reinsersión', 'Reeducado', 'Abandono', 'Expulsado', 'Otro'],
                        datasets: [{
                            data: [
                                conteoEstados['Activo'],
                                conteoEstados['Reinserción'],
                                conteoEstados['Reeducado'],
                                conteoEstados['Abandono'],
                                conteoEstados['Expulsado'],
                                conteoEstados['Otro']
                            ],
                            backgroundColor: ['#28a745', '#007bff', '#ffc107', '#dc3545', '#6c757d', '#6f42c1'],
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'right',
                                labels: {
                                    font: { size: 12 },
                                    boxWidth: 12,
                                    padding: 15
                                }
                            },
                            tooltip: { enabled: true }
                        },
                        cutout: '60%'
                    }
                });
            });

            if (sedesFiltradas.length === 0 || container.innerHTML === '') {
                container.innerHTML = '<p style="text-align:center; color:#999; padding:40px;">No hay datos para mostrar.</p>';
            }
        } catch (err) {
            container.innerHTML = '<p style="color:red; text-align:center;">Error al cargar sedes.</p>';
            console.error(err);
        }
    });

    // === CIERRE DE MODALES ===
    document.querySelectorAll('.close-modal, .close-modal-ficha').forEach(closeBtn => {
        closeBtn.onclick = () => {
            const modal = closeBtn.closest('.modal');
            if (modal) modal.style.display = 'none';
        };
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });

    window.cerrarModalPagos = () => {
        const modal = document.getElementById('modal-control-pagos');
        if (modal) modal.style.display = 'none';
    };

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

        const dia = String(fechaEval.getDate()).padStart(2, '0');
        const mes = String(fechaEval.getMonth() + 1).padStart(2, '0');
        const año = fechaEval.getFullYear();
        const fechaFormateada = `${dia}-${mes}-${año}`;

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
                    const etapas56 = ['Grupo 3', 'Grupo 2', 'Grupo 1', 'Nivel 1', 'Nivel 2', 'Nivel 3', 'Reeducado'];
                    if (etapas56.includes(etapa)) {
                        const ordenEtapas = {
                            'Grupo 4': 0,
                            'Grupo 3': 1,
                            'Grupo 2': 2,
                            'Grupo 1': 3,
                            'Nivel 1': 4,
                            'Nivel 2': 5,
                            'Nivel 3': 6,
                            'Reeducado': 7
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
            if (!confirm('¿ESTÁS ABSOLUTAMENTE SEGURO? Esta acción no se puede deshacer.')) return;
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

    window.generarContrato = async (id) => {
        try {
            const res = await fetch(`/api/pacientes/${id}`);
            if (!res.ok) throw new Error('Error al cargar paciente');
            const p = await res.json();

            const sedeMap = {
                'Olea': 'Olea',
                'Naltahua': 'Naltahua',
                'Femenino uno': 'Femenino_uno',
                'Femenino dos': 'Femenino_dos',
                'Polpaico': 'Polpaico',
                'Buin': 'Buin'
            };
            const sedeFile = sedeMap[p.sede] || 'Olea';
            const templateUrl = `/contratos_templates/contrato_${sedeFile}.docx`;

            const templateRes = await fetch(templateUrl);
            if (!templateRes.ok) throw new Error(`Template no encontrado para sede ${p.sede}`);
            const templateArrayBuffer = await templateRes.arrayBuffer();

            const zip = new PizZip(templateArrayBuffer);
            const doc = new docxtemplater(zip);

            let contactos = [];
            if (p.otros_contactos) {
                try {
                    contactos = JSON.parse(p.otros_contactos);
                } catch (e) {
                    contactos = [];
                }
            }
            while (contactos.length < 3) contactos.push({ nombre: '', telefono: '', parentesco: '' });

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
                region_apoderado: p.region_apoderado || '',
                comuna_apoderado: p.comuna_apoderado || '',
                valor_mensual: parseInt(p.monto_mensual || 350000).toLocaleString('es-CL'),
                fecha_ingreso: formatDate(p.fecha_ingreso)
            });

            doc.render();
            const out = doc.getZip().generate({ type: "blob" });
            const fecha = new Date().toISOString().slice(0,10).replace(/-/g, '');
            const fileName = `contrato_${p.nombre.replace(/ /g, '_')}_${fecha}.docx`;

            const formData = new FormData();
            formData.append('contrato', out, fileName);
            formData.append('paciente_id', id);

            const saveRes = await fetch('/api/guardar-contrato', {
                method: 'POST',
                body: formData
            });

            if (!saveRes.ok) {
                const err = await saveRes.json();
                throw new Error('Error al guardar contrato: ' + (err.error || 'Desconocido'));
            }

            saveAs(out, fileName);

            alert('¡Contrato generado exitosamente!\nGuardado en: /contratos/ dentro de la carpeta del paciente\nDescargado para imprimir.');
        } catch (err) {
            console.error(err);
            alert('Error al generar contrato: ' + err.message + '\nRevisa la consola (F12)');
        }
    };

    // Event listeners para botones Editar y Eliminar
    document.getElementById('resultados-modificar').addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-edit')) {
            const id = e.target.dataset.id;
            if (id) abrirEditarPaciente(id);
        }
        if (e.target.classList.contains('btn-delete')) {
            const id = e.target.dataset.id;
            const nombre = e.target.dataset.nombre || 'el paciente';
            const confirmar = confirm(`¿Estás ABSOLUTAMENTE SEGURO de eliminar al paciente "${nombre}"?\n\nEsta acción es IRREVERSIBLE:\n• Se borrará toda su información\n• Se eliminarán sus fotos, contratos y documentos\n• No se podrá recuperar`);
            if (!confirmar || !id) return;
            try {
                const res = await fetch(`/api/pacientes/${id}`, { method: 'DELETE' });
                const data = await res.json();
                if (res.ok && data.success) {
                    alert(`¡Paciente "${nombre}" eliminado correctamente!`);
                    document.getElementById('btn-buscar-modificar').click();
                } else {
                    alert('Error al eliminar: ' + (data.error || 'Paciente no encontrado'));
                }
            } catch (err) {
                console.error(err);
                alert('Error de conexión al eliminar');
            }
        }
    });

    // Formateo automático a "Primera letra mayúscula en cada palabra"
    const camposCapitalizar = [
        'nombre', 'ocupacion', 'direccion', 'comuna',
        'nombre_apoderado', 'direccion_apoderado',
        'otro_contacto1_nombre', 'otro_contacto1_parentezco',
        'otro_contacto2_nombre', 'otro_contacto2_parentezco',
        'otro_contacto3_nombre', 'otro_contacto3_parentezco',
        'comuna_apoderado',
        'edit-comuna_apoderado'
    ];

    function toTitleCase(str) {
        return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()).trim();
    }

    camposCapitalizar.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('blur', () => {
                if (input.value.trim() !== '') {
                    input.value = toTitleCase(input.value);
                }
            });
        }
    });

    // Cargar capacidades
    async function cargarCapacidades() {
        try {
            const res = await fetch('/api/capacidades');
            const capacidades = await res.json();
            const container = document.getElementById('lista-capacidades');
            container.innerHTML = '<h2 style="text-align:center; margin:30px 0; color:#2c3e50;">Capacidad Máxima por Sede</h2>';
            capacidades.forEach(c => {
                const card = document.createElement('div');
                card.className = 'capacidad-card';
                card.innerHTML = `
                    <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:15px;">
                        <strong style="font-size:1.4rem;">${c.sede}</strong>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <label>Capacidad máxima:</label>
                            <input type="number" id="capacidad-${c.sede.replace(/ /g, '-')}" value="${c.capacidad}" min="0" style="width:120px; padding:8px; border-radius:8px; border:1px solid #ddd;">
                            <button class="btn-primary" onclick="guardarCapacidad('${c.sede}')">Guardar</button>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });
        } catch (err) {
            alert('Error al cargar capacidades');
            console.error(err);
        }
    }

    window.guardarCapacidad = async (sede) => {
        const inputId = `capacidad-${sede.replace(/ /g, '-')}`;
        const input = document.getElementById(inputId);
        if (!input) return;
        const capacidad = parseInt(input.value) || 0;
        try {
            const res = await fetch(`/api/capacidades/${encodeURIComponent(sede)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ capacidad: capacidad })
            });
            const data = await res.json();
            if (res.ok) {
                alert(`Capacidad de ${sede} actualizada a ${capacidad}`);
            } else {
                alert('Error: ' + (data.error || 'No se pudo guardar'));
            }
        } catch (err) {
            alert('Error de conexión');
            console.error(err);
        }
    };

    // Llenar selector de años
    function llenarAniosKpi() {
        const select = document.getElementById('kpi-select-anio');
        const anioActual = new Date().getFullYear();
        for (let a = anioActual + 1; a >= 2020; a--) {
            const option = document.createElement('option');
            option.value = a;
            option.textContent = a;
            if (a === anioActual) option.selected = true;
            select.appendChild(option);
        }
    }

    // Cargar dashboard KPI
    async function cargarKpiDashboard() {
        llenarAniosKpi();
        document.getElementById('kpi-dashboard').innerHTML = '<p style="text-align:center; color:#999; font-size:1.4rem; margin:100px 0;">Selecciona opciones y presiona "Consultar" para ver el KPI</p>';
    }

    document.getElementById('btn-consultar-kpi').addEventListener('click', async () => {
        const sede = document.getElementById('kpi-select-sede').value;
        const anio = document.getElementById('kpi-select-anio').value;
        const mes = document.getElementById('kpi-select-mes').value;
        try {
            const res = await fetch('/api/pacientes');
            const pacientes = await res.json();
            let filtrados = pacientes;
            if (sede) filtrados = pacientes.filter(p => p.sede === sede);
            const conteo = {};
            const sedes = ['Olea', 'Naltahua', 'Femenino uno', 'Femenino dos', 'Polpaico', 'Buin'];
            sedes.forEach(s => conteo[s] = { ingresos: 0, abandonos: 0 });

            filtrados.forEach(p => {
                if (p.sede && sedes.includes(p.sede.trim())) {
                    const fechaIngreso = new Date(p.fecha_ingreso);
                    const mesIngreso = fechaIngreso.getMonth() + 1;
                    const anioIngreso = fechaIngreso.getFullYear();

                    const matchesPeriodo = (!mes || mesIngreso === parseInt(mes)) && (!anio || anioIngreso === parseInt(anio));

                    if (matchesPeriodo) conteo[p.sede.trim()].ingresos++;

                    if (p.estado === 'Abandono' && p.fecha_cambio_estado) {
                        const fechaAbandono = new Date(p.fecha_cambio_estado);
                        const mesAbandono = fechaAbandono.getMonth() + 1;
                        const anioAbandono = fechaAbandono.getFullYear();
                        const matchesAbandono = (!mes || mesAbandono === parseInt(mes)) && (!anio || anioAbandono === parseInt(anio));
                        if (matchesAbandono) conteo[p.sede.trim()].abandonos++;
                    }
                }
            });

            let totalIngresos = 0, totalAbandonos = 0;
            sedes.forEach(s => {
                totalIngresos += conteo[s].ingresos;
                totalAbandonos += conteo[s].abandonos;
            });
            const retencionGeneral = totalIngresos > 0 ? Math.round(((totalIngresos - totalAbandonos) / totalIngresos) * 100) : 0;
            const colorGauge = retencionGeneral >= 70 ? '#28a745' : retencionGeneral >= 50 ? '#ffc107' : '#dc3545';

            let html = `
                <div class="kpi-gauge-container">
                    <canvas id="gauge-general"></canvas>
                    <div class="kpi-gauge-text">${retencionGeneral}%</div>
                </div>
                <h4 style="text-align:center; color:#2c3e50; margin:20px 0;">Retención General</h4>
                <div class="kpi-sedes-grid">
            `;
            sedes.forEach(s => {
                const ingresos = conteo[s].ingresos;
                const abandonos = conteo[s].abandonos;
                const retencion = ingresos > 0 ? Math.round(((ingresos - abandonos) / ingresos) * 100) : 0;
                const colorMini = retencion >= 70 ? '#28a745' : retencion >= 50 ? '#ffc107' : '#dc3545';
                if (ingresos === 0 && abandonos === 0) return;
                html += `
                    <div class="kpi-sede-card">
                        <h4>${s}</h4>
                        <canvas class="kpi-mini-gauge" id="gauge-${s.replace(/ /g, '-')}"></canvas>
                        <div class="kpi-numeros">
                            <div class="kpi-numero ingresos">Ingresos: ${ingresos}</div>
                            <div class="kpi-numero abandonos">Abandonos: ${abandonos}</div>
                        </div>
                        <p style="font-size:1.6rem; margin:15px 0; color:${colorMini}; font-weight:bold;">${retencion}% Retención</p>
                    </div>
                `;
            });
            html += `</div>`;
            document.getElementById('kpi-dashboard').innerHTML = html;

            new Chart(document.getElementById('gauge-general'), {
                type: 'doughnut',
                data: {
                    datasets: [{
                        data: [retencionGeneral, 100 - retencionGeneral],
                        backgroundColor: [colorGauge, '#e9ecef'],
                        borderWidth: 0,
                        circumference: 180,
                        rotation: 270
                    }]
                },
                options: {
                    responsive: true,
                    cutout: '80%',
                    plugins: { legend: { display: false }, tooltip: { enabled: false } }
                }
            });

            sedes.forEach(s => {
                const ingresos = conteo[s].ingresos;
                const abandonos = conteo[s].abandonos;
                const retencion = ingresos > 0 ? Math.round(((ingresos - abandonos) / ingresos) * 100) : 0;
                const colorMini = retencion >= 70 ? '#28a745' : retencion >= 50 ? '#ffc107' : '#dc3545';
                if (ingresos === 0 && abandonos === 0) return;
                new Chart(document.getElementById(`gauge-${s.replace(/ /g, '-')}`), {
                    type: 'doughnut',
                    data: {
                        datasets: [{
                            data: [retencion, 100 - retencion],
                            backgroundColor: [colorMini, '#e9ecef'],
                            borderWidth: 0,
                            circumference: 180,
                            rotation: 270
                        }]
                    },
                    options: {
                        responsive: true,
                        cutout: '70%',
                        plugins: { legend: { display: false }, tooltip: { enabled: false } }
                    }
                });
            });
        } catch (err) {
            alert('Error al consultar KPI');
            console.error(err);
        }
    });

    // === BOTÓN MODIFICAR PAGO ===
    document.getElementById('btn-modificar-pago')?.addEventListener('click', () => {
        document.querySelectorAll('.botones-finanzas-grid, .titulo-seccion').forEach(el => el.style.display = 'none');
        document.getElementById('subseccion-modificar-pago').style.display = 'block';
    });

    document.getElementById('btn-buscar-modificar-pago')?.addEventListener('click', async () => {
        const termino = document.getElementById('buscar-modificar-pago').value.trim();
        const resultados = document.getElementById('resultados-modificar-pago');
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
                        Documento: ${p.documento_numero} | Sede: ${p.sede}
                    </div>
                    <div class="botones-accion">
                        <button class="btn-primary gestionar-pagos-btn" data-id="${p.id}">Gestionar Pagos</button>
                    </div>
                `;
                resultados.appendChild(card);
            });
        } catch (err) {
            resultados.innerHTML = '<p style="color:red;text-align:center;">Error al cargar pacientes.</p>';
        }
    });

    function cerrarModalGestionarPagos() {
        document.getElementById('modal-gestionar-pagos').style.display = 'none';
    }

    document.getElementById('btn-consultar-pagos')?.addEventListener('click', () => {
        alert('Módulo "Consultar Pagos" en desarrollo');
    });

    // Listar detalle
document.addEventListener('click', e => {
    if (e.target.classList.contains('btn-listar')) {
        const sede = e.target.dataset.sede;
        fetch('/api/pagos-pendientes')
            .then(res => res.json())
            .then(data => {
                let lista = data.pacientes || [];
                if (sede) lista = lista.filter(p => p.sede === sede);

                const tbody = document.getElementById('tbody-detalle-morosidad');
                tbody.innerHTML = '';

                lista.forEach(p => {
                    p.meses_pendientes.forEach(mesStr => {
                        const [a, m] = mesStr.split('-');
                        const monto = p.monto_mensual.toLocaleString('es-CL');
                        tbody.innerHTML += `
                            <tr>
                                <td>${p.sede}</td>
                                <td>${p.nombre}</td>
                                <td>${m}/${a}</td>
                                <td>$${monto}</td>
                                <td>~45 días</td>
                                <td><button class="btn-gestion" data-id="${p.id}">Gestionar</button></td>
                            </tr>`;
                    });
                });

                document.getElementById('resumen-morosidad').style.display = 'none';
                document.getElementById('detalle-morosidad').style.display = 'block';
            })
            .catch(() => alert('Error al cargar detalle'));
    }
});

// Volver
document.getElementById('btn-volver-resumen')?.addEventListener('click', () => {
    document.getElementById('detalle-morosidad').style.display = 'none';
    document.getElementById('resumen-morosidad').style.display = 'block';
});

    document.getElementById('resultados-modificar-pago').addEventListener('click', async (e) => {
        if (e.target && e.target.textContent.trim() === 'Gestionar Pagos') {
            const id = e.target.dataset.id;
            if (!id) return;

            try {
                const pacRes = await fetch(`/api/pacientes/${id}`);
                if (!pacRes.ok) throw new Error('Paciente no encontrado');
                const p = await pacRes.json();

                const nombreEl = document.getElementById('modal-gestionar-nombre');
                const documentoEl = document.getElementById('modal-gestionar-documento');
                const sedeEl = document.getElementById('modal-gestionar-sede');
                const montoEl = document.getElementById('modal-gestionar-monto');
                const diaEl = document.getElementById('modal-gestionar-dia-vencimiento');

                nombreEl.textContent = p.nombre || 'Sin nombre';
                documentoEl.textContent = p.documento_numero || 'Sin documento';
                sedeEl.textContent = p.sede || 'Sin sede';
                montoEl.textContent = parseInt(p.monto_mensual || 0).toLocaleString('es-CL');
                diaEl.textContent = p.fecha_vencimiento_pago || 5;

                const tablaBody = document.querySelector('#tabla-pagos-finanzas tbody');
                tablaBody.innerHTML = '';

                const thead = document.querySelector('#tabla-pagos-finanzas thead');
                if (thead) {
                    thead.innerHTML = `
                        <tr>
                            <th>Mes y Año a pagar</th>
                            <th>Fecha de pago</th>
                            <th>Forma de pago</th>
                            <th>Ingreso</th>
                            <th>Abonado</th>
                            <th>Pendiente</th>
                            <th>Estado</th>
                            <th>Comprobante</th>
                            <th>Factura</th>
                            <th>Acción</th>
                        </tr>
                    `;
                }

                const fechaIngreso = new Date(p.fecha_ingreso);
                const diaVencimiento = parseInt(p.fecha_vencimiento_pago || 2);

                let pagos = [];
                try {
                    const pagosRes = await fetch(`/api/pacientes/${id}/pagos`);
                    if (pagosRes.ok) pagos = await pagosRes.json();
                    console.log('Pagos cargados desde BD para paciente', id, ':', pagos);
                } catch (e) {
                    console.warn('Pagos no disponibles');
                }

                const archivosPorFila = new Map();
                const hoy = new Date();

                for (let i = 0; i < 12; i++) {
                    let date = new Date(fechaIngreso.getFullYear(), fechaIngreso.getMonth() + i, diaVencimiento);
                    if (date.getDate() !== diaVencimiento) {
                        date.setDate(0);
                    }
                    const año = date.getFullYear();
                    const mes = date.getMonth() + 1;
                    const keyFila = `${año}-${mes}`;
                    const nombreMes = getNombreMes(año, mes);

                    const pagoExistente = pagos.find(pg => pg.año === año && pg.mes === mes);
                    const pagado = pagoExistente ? pagoExistente.pagado === 1 : false;
                    const fechaPago = pagoExistente ? pagoExistente.fecha_pago || '' : '';
                    const formaPago = pagoExistente ? pagoExistente.forma_pago || '' : '';

                    const montoMensual = parseInt(p.monto_mensual || 350000, 10);

                    let abonadoAcumulado = pagoExistente ? parseInt(pagoExistente.valor_pagado || 0, 10) : 0;
                    const ingresoInicial = 0;
                    const pendienteInicial = Math.max(0, montoMensual - abonadoAcumulado);

                    // Fecha límite para no ser moroso: vencimiento + 5 días
                        const fechaVencimientoMes = new Date(año, mes - 1, diaVencimiento);
                        if (fechaVencimientoMes.getDate() !== diaVencimiento) {
                            fechaVencimientoMes.setDate(0);
                        }
                        const fechaLimiteMoroso = new Date(fechaVencimientoMes);
                        fechaLimiteMoroso.setDate(fechaLimiteMoroso.getDate() + 2);

                        const esMoroso = (pendienteInicial > 0) && (hoy > fechaLimiteMoroso);
                        const esPagado = pendienteInicial === 0;

                        let estadoHTML = '';
                        if (esPagado) {
                            estadoHTML = '<span class="estado-pagado">Pagado</span>';
                        } else if (esMoroso) {
                            estadoHTML = '<span class="estado-moroso" style="color:#dc3545; font-weight:bold; background:#f8d7da; padding:4px 8px; border-radius:6px;">Moroso</span>';
                        } else {
                            estadoHTML = '<span class="estado-pendiente">Pendiente</span>';
                        }

                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td style="min-width:140px; white-space:nowrap;"><strong>${nombreMes}</strong></td>
                        <td style="min-width:160px;">
                            <input type="date" class="input-fecha-pago" value="${fechaPago}" style="width:100%; padding:8px; border-radius:8px;">
                        </td>
                        <td style="min-width:180px;">
                            <select class="select-forma-pago" style="width:100%; padding:8px; border-radius:8px;">
                                <option value="">Seleccionar</option>
                                <option value="efectivo" ${formaPago === 'efectivo' ? 'selected' : ''}>Efectivo</option>
                                <option value="transferencia" ${formaPago === 'transferencia' ? 'selected' : ''}>Transferencia</option>
                                <option value="debito" ${formaPago === 'debito' ? 'selected' : ''}>Débito automático</option>
                                <option value="otro" ${formaPago === 'otro' ? 'selected' : ''}>Otro</option>
                            </select>
                        </td>

                        <td style="min-width:140px; text-align:right;">
                            <input type="text" class="input-moneda ingreso" value="${formatMonedaCL(ingresoInicial)}"
                                   style="width:100%; padding:8px; border-radius:8px; text-align:right;">
                        </td>

                        <td style="min-width:140px; text-align:right;">
                            <input type="text" class="input-moneda abonado" readonly value="${formatMonedaCL(abonadoAcumulado)}"
                                   style="width:100%; padding:8px; border-radius:8px; text-align:right; background:#f0f0f0; border:1px solid #ccc; cursor:default;">
                        </td>

                        <td style="min-width:140px; text-align:right;">
                            <input type="text" class="input-moneda pendiente" readonly value="${formatMonedaCL(pendienteInicial)}"
                                   style="width:100%; padding:8px; border-radius:8px; text-align:right; background:#f0f0f0; border:1px solid #ccc; cursor:default;">
                        </td>

                        <td style="min-width:120px; text-align:center;" class="estado-cell">
                            ${estadoHTML}
                        </td>

                        <td style="min-width:180px; text-align:center;">
                            <button class="btn-primary btn-subir-comprobante" data-mes="${mes}" data-año="${año}" style="padding:6px 12px; font-size:0.9rem;">Subir Comp.</button>
                            <input type="file" class="input-subir-comprobante" multiple style="display:none;" data-mes="${mes}" data-año="${año}">
                            <div class="lista-comprobantes" id="lista-comprobantes-${mes}-${año}" style="margin-top:8px; font-size:0.85rem; color:#28a745; max-height:60px; overflow-y:auto;"></div>
                        </td>
                        <td style="min-width:180px; text-align:center;">
                            <button class="btn-primary btn-subir-factura" data-mes="${mes}" data-año="${año}" style="padding:6px 12px; font-size:0.9rem;">Subir Factura</button>
                            <input type="file" class="input-subir-factura" multiple style="display:none;" data-mes="${mes}" data-año="${año}">
                            <div class="lista-facturas" id="lista-facturas-${mes}-${año}" style="margin-top:8px; font-size:0.85rem; color:#28a745; max-height:60px; overflow-y:auto;"></div>
                        </td>
                        <td style="min-width:100px; text-align:center;">
                            <button class="btn-primary btn-guardar-fila" 
                                    data-mes="${mes}" 
                                    data-año="${año}" 
                                    data-abonado-anterior="${abonadoAcumulado}"
                                    style="padding:6px 12px; font-size:0.9rem;">Guardar</button>
                        </td>
                    `;
                    tablaBody.appendChild(row);
                }

                // Eventos para subir archivos (sin cambios)
                document.querySelectorAll('.btn-subir-comprobante').forEach(btn => {
                    btn.onclick = () => btn.nextElementSibling.click();
                });

                document.querySelectorAll('.input-subir-comprobante').forEach(input => {
                    input.onchange = (e) => {
                        const files = Array.from(e.target.files);
                        if (files.length === 0) return;
                        const mes = e.target.dataset.mes;
                        const año = e.target.dataset.año;
                        const key = `${año}-${mes}`;
                        archivosPorFila.set(key, files);
                        const lista = document.getElementById(`lista-comprobantes-${mes}-${año}`);
                        lista.innerHTML = '<strong>Seleccionados:</strong><br>' + files.map(f => `• ${f.name}`).join('<br>');
                    };
                });

                document.querySelectorAll('.btn-subir-factura').forEach(btn => {
                    btn.onclick = () => btn.nextElementSibling.click();
                });

                document.querySelectorAll('.input-subir-factura').forEach(input => {
                    input.onchange = (e) => {
                        const files = Array.from(e.target.files);
                        if (files.length === 0) return;
                        const mes = e.target.dataset.mes;
                        const año = e.target.dataset.año;
                        const key = `${año}-${mes}`;
                        if (!archivosPorFila.has('factura-' + key)) {
                            archivosPorFila.set('factura-' + key, files);
                        } else {
                            const existentes = archivosPorFila.get('factura-' + key);
                            archivosPorFila.set('factura-' + key, [...existentes, ...files]);
                        }
                        const lista = document.getElementById(`lista-facturas-${mes}-${año}`);
                        lista.innerHTML = '<strong>Seleccionados:</strong><br>' + 
                            archivosPorFila.get('factura-' + key).map(f => `• ${f.name}`).join('<br>');
                    };
                });

                // Cambio de fecha o forma → NO fuerza el estado automáticamente
                // El estado solo se actualiza al GUARDAR la fila (para evitar falsos "Pagado")
                document.querySelectorAll('.input-fecha-pago, .select-forma-pago').forEach(el => {
                    el.onchange = () => {
                        // No hacemos nada aquí para el estado
                        // El estado se recalcula correctamente al presionar Guardar
                    };
                });

                // Recalcular Pendiente en tiempo real al editar Ingreso
                document.querySelectorAll('.input-moneda.ingreso').forEach(input => {
                    input.addEventListener('input', (e) => {
                        const row = e.target.closest('tr');
                        const montoMensual = parseInt(p.monto_mensual || 350000, 10);
                        const ingreso = parseMonedaCL(row.querySelector('.input-moneda.ingreso').value);
                        const abonado = parseMonedaCL(row.querySelector('.input-moneda.abonado').value);
                        const pendiente = Math.max(0, montoMensual - (abonado + ingreso));
                        row.querySelector('.input-moneda.pendiente').value = formatMonedaCL(pendiente);
                    });
                });

                // Botón Guardar: suma Ingreso al Abonado acumulado y guarda en BD
                document.querySelectorAll('.btn-guardar-fila').forEach(btn => {
                    btn.onclick = async () => {
                        const mes = btn.dataset.mes;
                        const año = btn.dataset.año;
                        const key = `${año}-${mes}`;
                        const row = btn.closest('tr');
                        const fechaPago = row.querySelector('.input-fecha-pago').value || null;
                        const formaPago = row.querySelector('.select-forma-pago').value || null;

                        const montoMensual = parseInt(p.monto_mensual || 350000, 10);
                        const ingresoNuevo = parseMonedaCL(row.querySelector('.input-moneda.ingreso').value);
                        const abonadoAnterior = parseInt(btn.dataset.abonadoAnterior || 0, 10);
                        const abonadoNuevo = abonadoAnterior + ingresoNuevo;
                        const pendiente = Math.max(0, montoMensual - abonadoNuevo);

                        const pagado = pendiente === 0;  // o directamente: abonadoNuevo >= montoMensual (es lo mismo)

                        console.log(`Guardando fila ${año}-${mes}: Ingreso nuevo=${ingresoNuevo}, Abonado anterior=${abonadoAnterior}, Abonado nuevo=${abonadoNuevo}, Pendiente=${pendiente}`);

                        try {
                            await fetch(`/api/pacientes/${id}/pagos`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    pagos: [{
                                        año: parseInt(año),
                                        mes: parseInt(mes),
                                        pagado,
                                        fecha_pago: fechaPago,
                                        forma_pago: formaPago,
                                        valor_pagado: abonadoNuevo
                                    }]
                                })
                            });

                            // Actualizar visualmente la fila
                            row.querySelector('.input-moneda.abonado').value = formatMonedaCL(abonadoNuevo);
                            row.querySelector('.input-moneda.pendiente').value = formatMonedaCL(pendiente);
                            row.querySelector('.input-moneda.ingreso').value = formatMonedaCL(0);
                            row.querySelector('.estado-cell').innerHTML = pagado 
                                ? '<span class="estado-pagado">Pagado</span>' 
                                : '<span class="estado-pendiente">Pendiente</span>';

                            btn.dataset.abonadoAnterior = abonadoNuevo;

                        } catch (err) {
                            alert('Error al guardar datos de pago');
                            console.error(err);
                            return;
                        }

                        // Subir archivos (comprobantes y facturas) - se mantiene igual
                        const files = archivosPorFila.get(key);
                        if (files && files.length > 0) {
                            const formData = new FormData();
                            files.forEach(file => formData.append('comprobantes', file));
                            formData.append('pacienteId', id);
                            try {
                                const res = await fetch('/api/subir-comprobantes', { method: 'POST', body: formData });
                                if (res.ok) {
                                    const data = await res.json();
                                    document.getElementById(`lista-comprobantes-${mes}-${año}`).innerHTML = '<strong>Subidos:</strong><br>' + data.files.map(f => `• ${f}`).join('<br>');
                                    archivosPorFila.delete(key);
                                } else {
                                    alert('Error al subir comprobantes');
                                }
                            } catch (err) {
                                alert('Error de conexión al subir comprobantes');
                            }
                        }

                        const keyFactura = 'factura-' + key;
                        const filesFactura = archivosPorFila.get(keyFactura);
                        if (filesFactura && filesFactura.length > 0) {
                            const formDataFactura = new FormData();
                            const mesNombre = getNombreMes(parseInt(año), parseInt(mes)).toUpperCase();
                            const nombrePaciente = p.nombre.toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').trim().replace(/\s+/g, '_');
                            const nombreBase = `FACTURA_${nombrePaciente}_${mesNombre}`;

                            filesFactura.forEach((file, index) => {
                                const ext = file.name.split('.').pop() || 'pdf';
                                const nombreFinal = index === 0 ? `${nombreBase}.${ext}` : `${nombreBase}_${index + 1}.${ext}`;
                                const renamedFile = new File([file], nombreFinal, { type: file.type });
                                formDataFactura.append('facturas', renamedFile);
                            });

                            formDataFactura.append('pacienteId', id);

                            try {
                                const resFactura = await fetch('/api/subir-facturas', { method: 'POST', body: formDataFactura });
                                if (resFactura.ok) {
                                    const dataFactura = await resFactura.json();
                                    document.getElementById(`lista-facturas-${mes}-${año}`).innerHTML = '<strong>Subidas:</strong><br>' + 
                                        dataFactura.files.map(f => `• ${f}`).join('<br>');
                                    archivosPorFila.delete(keyFactura);
                                } else {
                                    alert('Error al subir facturas');
                                }
                            } catch (err) {
                                alert('Error de conexión al subir facturas');
                            }
                        }

                        alert('Fila guardada con éxito. Ingreso sumado a Abonado.');
                    };
                });

                document.getElementById('modal-gestionar-pagos').style.display = 'flex';
            } catch (err) {
                alert('Error al cargar datos del paciente');
                console.error(err);
            }
        }
    });

    // === TABLA DE PAGO INICIAL ===
    const comboPago = document.getElementById('pago_al_ingresar');
    const tablaContainer = document.getElementById('tabla-pago-inicial');
    const tbodyPago = document.getElementById('tbody-pago-inicial');
    const inputFecha = document.getElementById('fecha_ingreso');

    if (comboPago && tablaContainer && tbodyPago && inputFecha) {
        console.log('Combo pago inicial y elementos encontrados');

        function actualizarTablaPagoInicial() {
            console.log('Cambio en combo o fecha - valor combo:', comboPago.value, 'fecha ingreso:', inputFecha.value);

            const esSi = comboPago.value === 'si';
            const fechaIngreso = inputFecha.value;

            if (esSi) {
                if (!fechaIngreso) {
                    alert('Primero selecciona la Fecha de ingreso');
                    comboPago.value = 'no';
                    tablaContainer.style.display = 'none';
                    return;
                }

                console.log('Mostrando tabla de pago inicial');
                tablaContainer.style.display = 'block';

                const date = new Date(fechaIngreso);
                const año = date.getFullYear();
                const mes = date.getMonth() + 1;
                const nombreMes = getNombreMes(año, mes);

                const montoMensualDefault = 350000;

                tbodyPago.innerHTML = `
                    <tr>
                        <td style="padding:12px; font-weight:bold; text-align:left;">${nombreMes}</td>
                        <td style="padding:12px;">
                            <input type="date" id="fecha_pago_inicial" value="${fechaIngreso}" style="width:100%; padding:10px; border:2px solid #ddd; border-radius:30px;">
                        </td>
                        <td style="padding:12px;">
                            <select id="forma_pago_inicial" style="width:100%; padding:10px; border:2px solid #ddd; border-radius:30px;">
                                <option value="">Seleccionar</option>
                                <option value="efectivo">Efectivo</option>
                                <option value="transferencia">Transferencia</option>
                                <option value="debito">Débito automático</option>
                                <option value="otro">Otro</option>
                            </select>
                        </td>
                        <td style="padding:12px;">
                            <input type="number" id="valor_pagado_inicial" value="${montoMensualDefault}" min="0" step="1000" 
                                   style="width:100%; padding:10px; border:2px solid #ddd; border-radius:30px; text-align:right;">
                        </td>
                        <td style="padding:12px; text-align:center;">
                            <button type="button" class="btn-primary btn-subir-comprobante-inicial" style="padding:8px 16px; border-radius:30px;">Subir Comprobante</button>
                            <input type="file" id="input-comprobante-inicial" multiple style="display:none;">
                            <div id="lista-comprobante-inicial" style="margin-top:10px; font-size:0.9rem; color:#28a745;"></div>
                        </td>
                    </tr>
                `;

                // Subir comprobante en memoria
                const btnSubir = document.querySelector('.btn-subir-comprobante-inicial');
                const inputFile = document.getElementById('input-comprobante-inicial');
                const lista = document.getElementById('lista-comprobante-inicial');

                if (btnSubir && inputFile && lista) {
                    btnSubir.onclick = () => inputFile.click();

                    inputFile.onchange = (e) => {
                        const files = Array.from(e.target.files);
                        if (files.length === 0) return;
                        lista.innerHTML = '<strong>Seleccionados:</strong><br>' + files.map(f => `• ${f.name}`).join('<br>');
                    };
                }
            } else {
                console.log('Ocultando tabla');
                tablaContainer.style.display = 'none';
            }
        }

        comboPago.addEventListener('change', actualizarTablaPagoInicial);
        inputFecha.addEventListener('change', actualizarTablaPagoInicial);
    } else {
        console.log('ERROR: Elementos no encontrados (pago_al_ingresar, tabla-pago-inicial, etc.)');
    }
// Botón "Ver Morosos" en Finanzas
// === MOROSIDADES - Botón Ver Morosos ===
document.getElementById('btn-ver-morosos')?.addEventListener('click', () => {
    // Ocultar botones de Finanzas
    document.querySelector('.botones-finanzas-grid').style.display = 'none';
    document.getElementById('subseccion-modificar-pago').style.display = 'none';

    // Mostrar la sección de Morosidades
    document.getElementById('seccion-pagos').style.display = 'block';

    // Mostrar solo la fase de filtros al entrar
    document.getElementById('fase-filtros').style.display = 'block';
    document.getElementById('resumen-morosidad').style.display = 'none';
    document.getElementById('detalle-morosidad').style.display = 'none';

    // Llenar selector de años
    const selectAnio = document.getElementById('morosidad-anio');
    if (selectAnio) {
        selectAnio.innerHTML = '<option value="">Todos</option>';
        const current = new Date().getFullYear();
        for (let y = current + 1; y >= current - 5; y--) {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = y;
            selectAnio.appendChild(opt);
        }
    }
});

// Consultar morosidades (botón dentro de la sección)
// === MOROSIDADES - Botón Ver Morosos ===
document.getElementById('btn-ver-morosos')?.addEventListener('click', () => {
    // Ocultar botones de Finanzas
    document.querySelector('.botones-finanzas-grid').style.display = 'none';
    document.getElementById('subseccion-modificar-pago').style.display = 'none';

    // Mostrar sección Morosidades
    document.getElementById('seccion-pagos').style.display = 'block';

    // Mostrar solo filtros al entrar
    document.getElementById('fase-filtros').style.display = 'block';
    document.getElementById('resumen-morosidad').style.display = 'none';
    document.getElementById('detalle-morosidad').style.display = 'none';

    // Llenar años
    const selectAnio = document.getElementById('morosidad-anio');
    if (selectAnio) {
        selectAnio.innerHTML = '<option value="">Todos</option>';
        const current = new Date().getFullYear();
        for (let y = current + 1; y >= current - 5; y--) {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = y;
            selectAnio.appendChild(opt);
        }
    }
});

// Consultar Morosidades
// Consultar morosidades (usando pendiente real)
// Consultar morosidades (usando pendiente real)
document.getElementById('btn-consultar-morosidades')?.addEventListener('click', async () => {
    const sede = document.getElementById('morosidad-sede').value;

    try {
        const res = await fetch('/api/pagos-pendientes');
        const data = await res.json();
        let morosos = data.pacientes || [];

        if (sede) morosos = morosos.filter(p => p.sede === sede);

        let totalMorosos = 0;
        let totalDeuda = 0;
        const resumen = {};

        morosos.forEach(p => {
            const s = p.sede || 'Sin sede';
            if (!resumen[s]) resumen[s] = { morosos: 0, deuda: 0 };

            // Contamos 1 moroso por paciente
            resumen[s].morosos++;
            totalMorosos++;

            // Deuda real: suma del pendiente_total (ya calculado en backend)
            const deudaPaciente = p.pendiente_total || 0;
            resumen[s].deuda += deudaPaciente;
            totalDeuda += deudaPaciente;
        });

        const tbody = document.getElementById('tbody-resumen-morosidad');
        tbody.innerHTML = `
            <tr style="font-weight:bold; background:#f0f8ff;">
                <td>TODAS</td>
                <td>${totalMorosos}</td>
                <td>$${totalDeuda.toLocaleString('es-CL')}</td>
                <td><button class="btn-listar" data-sede="">Listar</button></td>
            </tr>
        `;

        Object.keys(resumen).forEach(s => {
            tbody.innerHTML += `
                <tr>
                    <td>${s}</td>
                    <td>${resumen[s].morosos}</td>
                    <td>$${resumen[s].deuda.toLocaleString('es-CL')}</td>
                    <td><button class="btn-listar" data-sede="${s}">Listar</button></td>
                </tr>
            `;
        });

        document.getElementById('fase-filtros').style.display = 'none';
        document.getElementById('resumen-morosidad').style.display = 'block';
    } catch (err) {
        alert('Error al cargar morosidades');
        console.error(err);
    }
});

// Listar detalle (con días de mora reales)
document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-listar')) {
        const sede = e.target.dataset.sede;
        try {
            const res = await fetch('/api/pagos-pendientes');
            const data = await res.json();
            let lista = data.pacientes || [];
            if (sede) lista = lista.filter(p => p.sede === sede);

            const tbody = document.getElementById('tbody-detalle-morosidad');
            tbody.innerHTML = '';

            const hoy = new Date();

            lista.forEach(p => {
                p.meses_pendientes.forEach((mesStr, index) => {
                    const [año, mes] = mesStr.split('-').map(Number);
                    const diaVencimiento = p.fecha_vencimiento_pago || 5;

                    // Fecha de vencimiento del mes
                    const fechaVencimiento = new Date(año, mes - 1, diaVencimiento);

                    // Si el día no existe (ej: 31 en febrero), toma el último día del mes
                    if (fechaVencimiento.getDate() !== diaVencimiento) {
                        fechaVencimiento.setDate(0); // último día del mes anterior
                    }

                    // Días de mora (diferencia en días)
                    const diferenciaMs = hoy - fechaVencimiento;
                    let diasMora = Math.floor(diferenciaMs / (1000 * 60 * 60 * 24));

                    // Si es negativo o 0 → no moroso aún (pendiente pero no vencido)
                    if (diasMora <= 0) diasMora = 0;

                    const pendienteMes = p.pendiente_por_mes[index] || p.monto_mensual;
                    const pendienteFormateado = pendienteMes.toLocaleString('es-CL');

                    const row = `
                        <tr>
                            <td>${p.sede}</td>
                            <td>${p.nombre}</td>
                            <td>${mes}/${año}</td>
                            <td>$${pendienteFormateado}</td>
                            <td>${diasMora} días</td>
                            <td>
                                <button class="btn-gestion-pago" data-paciente-id="${p.id}">
                                    Gestionar
                                </button>
                                <button class="btn-enviar-cobro" 
                                        data-paciente-id="${p.id}" 
                                        data-telefono="${p.telefono_apoderado || ''}"  // ← ya usa el del apoderado
                                        data-monto="${pendienteFormateado}" 
                                        data-mes="${mes}/${año}">
                                    Enviar Cobro
                                </button>
                            </td>
                        </tr>`;
                    tbody.innerHTML += row;
                });
            });

            document.getElementById('resumen-morosidad').style.display = 'none';
            document.getElementById('detalle-morosidad').style.display = 'block';
        } catch (err) {
            alert('Error al cargar lista de morosos');
            console.error(err);
        }
    }
});
// === MOROSIDADES - Botón Ver Morosos ===
document.getElementById('btn-ver-morosos')?.addEventListener('click', () => {
    // Ocultar botones de Finanzas
    document.querySelector('.botones-finanzas-grid').style.display = 'none';
    document.getElementById('subseccion-modificar-pago').style.display = 'none';

    // Mostrar sección Morosidades
    document.getElementById('seccion-pagos').style.display = 'block';

    // Mostrar solo filtros al entrar
    document.getElementById('fase-filtros').style.display = 'block';
    document.getElementById('resumen-morosidad').style.display = 'none';
    document.getElementById('detalle-morosidad').style.display = 'none';

    // Llenar años
    const selectAnio = document.getElementById('morosidad-anio');
    if (selectAnio) {
        selectAnio.innerHTML = '<option value="">Todos</option>';
        const current = new Date().getFullYear();
        for (let y = current + 1; y >= current - 5; y--) {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = y;
            selectAnio.appendChild(opt);
        }
    }
});
// Refrescar página completa al hacer clic en cualquier botón "Menú Principal"
document.querySelectorAll('.btn-volver').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Prevenir cualquier comportamiento por defecto si lo tiene
        e.preventDefault();
        
        // Refrescar la página completamente
        window.location.reload();
    });
});
// Enviar cobro por WhatsApp (usa teléfono del apoderado si no hay del paciente)
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-enviar-cobro')) {
        const btn = e.target;
        let telefono = btn.dataset.telefono || '';  // teléfono del paciente (si existe)

        // Si no hay teléfono del paciente, intentamos usar el del apoderado
        if (!telefono.trim()) {
            // El nombre del apoderado o teléfono viene de la fila o del paciente
            // Asumimos que en el data-telefono ya viene el del apoderado si existe
            telefono = btn.closest('tr').querySelector('[data-telefono-apoderado]')?.dataset.telefonoApoderado || '';
        }

        const monto = btn.dataset.monto;
        const mes = btn.dataset.mes;
        const nombre = btn.closest('tr').querySelector('td:nth-child(2)').textContent; // nombre del paciente

        if (!telefono.trim()) {
            alert('Ni el paciente ni el apoderado tienen teléfono registrado.');
            return;
        }

        // Limpiar teléfono (solo números + código país Chile)
        let telLimpio = telefono.replace(/\D/g, '');
        if (telLimpio.length === 9) telLimpio = '56' + telLimpio;  // agregar +56 si faltan 9 dígitos
        if (!telLimpio.startsWith('56')) telLimpio = '56' + telLimpio;

        // Mensaje personalizado (más profesional y claro)
        const mensaje = encodeURIComponent(
            `Hola, ${nombre},\n\n` +
            `Te informamos que tienes un pago pendiente por $${monto} correspondiente al mes de ${mes}.\n` +
            `Por favor regulariza tu cuenta lo antes posible para evitar intereses o mora.\n\n` +
            `Si necesitas coordinar o tienes alguna duda, estamos a tu disposición.\n` +
            `Gracias por ser parte de Evolución Chile.\n\n` +
            `Saludos cordiales,\n` +
            `Equipo Evolución Chile`
        );

        // Abrir WhatsApp (web o app)
        const url = `https://wa.me/${telLimpio}?text=${mensaje}`;
        window.open(url, '_blank');
    }
});
    console.log('Script.js cargado - Sistema Evolución Chile listo 🚀');
});