const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const app = express();
// Servir archivos estáticos (HTML, CSS, JS, imágenes)
app.use(express.static('public'));  // si tienes carpeta public
app.use(express.static(__dirname));  // sirve todo desde la raíz (más simple para tu caso)

// Ruta raíz: sirve index.html directamente
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});
const port = 3000;

// Ruta base para documentos por paciente
const documentosPath = path.join(__dirname, 'public', 'documentos');

// Limpia RUT o documento: quita puntos, guion, espacios y convierte a mayúsculas
function limpiarRutParaCarpeta(rut) {
    if (!rut) return null;
    return rut.replace(/[\.\-\s]/g, '').toUpperCase().trim();
}

// Obtiene la ruta de carpeta del paciente usando Sede + RUT limpio
function getPacienteFolderPathBySedeYRut(sede, rut) {
    const rutClean = limpiarRutParaCarpeta(rut);
    if (!rutClean || !sede) return null;
    const sedeClean = sede.trim().replace(/\s+/g, ' '); // normaliza espacios
    return path.join(documentosPath, sedeClean, rutClean);
}

// Función para obtener ruta de foto usando Sede + RUT (robusta)
function getFotoPath(sede, rut) {
    const rutClean = limpiarRutParaCarpeta(rut);
    if (!rutClean || !sede) return null;
    const sedeClean = sede.trim().replace(/\s+/g, ' ');
    const pacientePath = path.join(documentosPath, sedeClean, rutClean);
    const possibleExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    for (const ext of possibleExts) {
        const filePath = path.join(pacientePath, 'cedula' + ext);
        if (fs.existsSync(filePath)) {
            return '/documentos/' + encodeURIComponent(sedeClean) + '/' + rutClean + '/cedula' + ext;
        }
    }
    return null;
}

// Carpeta para documentos institucionales
const documentosInstitucionPath = path.join(__dirname, 'public', 'documentos-institucion');
if (!fs.existsSync(documentosInstitucionPath)) {
    fs.mkdirSync(documentosInstitucionPath, { recursive: true });
}

// Multer para comprobantes y facturas (memoryStorage para leer DB primero)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Multer específico para comprobantes
const storageComprobantes = multer.memoryStorage();
const uploadComprobantes = multer({ storage: storageComprobantes });

// Multer para facturas
const storageFacturas = multer.memoryStorage();
const uploadFacturas = multer({ storage: storageFacturas });

// Multer para carga masiva
const uploadMasivo = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const tempPath = path.join(__dirname, 'temp');
            if (!fs.existsSync(tempPath)) fs.mkdirSync(tempPath);
            cb(null, tempPath);
        },
        filename: (req, file, cb) => {
            cb(null, 'carga-masiva-' + Date.now() + path.extname(file.originalname));
        }
    })
});

// Multer para documentos institucionales
const uploadDocumentos = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, documentosInstitucionPath);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, uniqueSuffix + '-' + file.originalname);
        }
    })
});

const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Error al conectar con SQLite:', err);
    } else {
        console.log('Conectado a la base de datos SQLite');
    }
});

db.serialize(() => {
    // Tabla pacientes con todos los campos
    db.run(`
        CREATE TABLE IF NOT EXISTS pacientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            documento_tipo TEXT NOT NULL DEFAULT 'rut',
            documento_numero TEXT NOT NULL UNIQUE,
            documento_tipo_apoderado TEXT,
            documento_numero_apoderado TEXT,
            sede TEXT NOT NULL,
            estado TEXT DEFAULT 'Activo',
            etapa TEXT,
            fecha_ingreso DATE NOT NULL,
            psiquiatra TEXT,
            doctor TEXT,
            tipo_atencion TEXT,
            fecha_ultima_receta DATE,
            fecha_termino_licencia DATE,
            nombre_apoderado TEXT,
            telefono_apoderado TEXT,
            clave_unica TEXT,
            correo TEXT,
            foto_cedula TEXT,
            fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
            monto_mensual INTEGER DEFAULT 350000,
            fecha_vencimiento_pago INTEGER DEFAULT 5,
            sexo TEXT CHECK(sexo IN ('Masculino', 'Femenino')),
            fecha_nacimiento DATE,
            ocupacion TEXT,
            prevision TEXT,
            atencion_psiquiatrica TEXT,
            otros_contactos TEXT,
            direccion TEXT,
            direccion_apoderado TEXT,
            fecha_cambio_estado DATE,
            region TEXT,
            comuna TEXT,
            correo_apoderado TEXT,
            region_apoderado TEXT,
            comuna_apoderado TEXT
        )
    `);

    // Tabla pagos - AGREGAMOS valor_pagado
    db.run(`
        CREATE TABLE IF NOT EXISTS pagos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            paciente_id INTEGER NOT NULL,
            año INTEGER NOT NULL,
            mes INTEGER NOT NULL,
            pagado INTEGER DEFAULT 0,
            fecha_pago DATE,
            forma_pago TEXT,
            valor_pagado INTEGER DEFAULT 0,
            UNIQUE(paciente_id, año, mes),
            FOREIGN KEY(paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE
        )
    `);

    // Migración: agregar valor_pagado si no existe
    db.all("PRAGMA table_info(pagos)", (err, rows) => {
        if (err) return console.error(err);
        const columnExists = rows.some(row => row.name === 'valor_pagado');
        if (!columnExists) {
            db.run(`ALTER TABLE pagos ADD COLUMN valor_pagado INTEGER DEFAULT 0`);
            console.log('Columna valor_pagado agregada a la tabla pagos');
        } else {
            console.log('Columna valor_pagado ya existe en pagos');
        }
    });

    // Tabla usuarios
    db.run(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario TEXT NOT NULL UNIQUE,
            contraseña TEXT NOT NULL
        )
    `);

    // Tabla capacidades por sede
    db.run(`
        CREATE TABLE IF NOT EXISTS capacidades (
            sede TEXT PRIMARY KEY,
            capacidad INTEGER DEFAULT 0
        )
    `);

    // Inicializar capacidades con 0 si no existen
    const sedes = ['Olea', 'Naltahua', 'Femenino uno', 'Femenino dos', 'Polpaico', 'Buin'];
    sedes.forEach(s => {
        db.run(`INSERT OR IGNORE INTO capacidades (sede, capacidad) VALUES (?, 0)`, [s]);
    });

    // Crear o verificar usuario admin
    const adminUser = 'admin';
    const adminPass = 'evolucion2025';

    db.get("SELECT * FROM usuarios WHERE usuario = ?", [adminUser], (err, row) => {
        if (err) return console.error('Error al consultar usuario:', err);
        if (row) {
            console.log('Usuario admin ya existe');
        } else {
            bcrypt.hash(adminPass, 10, (hashErr, hash) => {
                if (hashErr) return console.error('Error al hashear contraseña:', hashErr);
                db.run("INSERT INTO usuarios (usuario, contraseña) VALUES (?, ?)", [adminUser, hash], (insertErr) => {
                    if (insertErr) console.error('Error al insertar admin:', insertErr);
                    else console.log('Usuario admin creado: admin / evolucion2025');
                });
            });
        }
    });

    // Migraciones para columnas nuevas en pacientes
    db.all("PRAGMA table_info(pacientes)", (err, rows) => {
        if (err) return console.error(err);
        const columnExists = (name) => rows.some(row => row.name === name);

        const columnas = [
            { name: 'sexo', sql: "ALTER TABLE pacientes ADD COLUMN sexo TEXT CHECK(sexo IN ('Masculino', 'Femenino'))" },
            { name: 'direccion', sql: "ALTER TABLE pacientes ADD COLUMN direccion TEXT" },
            { name: 'direccion_apoderado', sql: "ALTER TABLE pacientes ADD COLUMN direccion_apoderado TEXT" },
            { name: 'fecha_nacimiento', sql: "ALTER TABLE pacientes ADD COLUMN fecha_nacimiento DATE" },
            { name: 'ocupacion', sql: "ALTER TABLE pacientes ADD COLUMN ocupacion TEXT" },
            { name: 'prevision', sql: "ALTER TABLE pacientes ADD COLUMN prevision TEXT" },
            { name: 'atencion_psiquiatrica', sql: "ALTER TABLE pacientes ADD COLUMN atencion_psiquiatrica TEXT" },
            { name: 'otros_contactos', sql: "ALTER TABLE pacientes ADD COLUMN otros_contactos TEXT" },
            { name: 'documento_tipo', sql: "ALTER TABLE pacientes ADD COLUMN documento_tipo TEXT NOT NULL DEFAULT 'rut'" },
            { name: 'documento_numero', sql: "ALTER TABLE pacientes ADD COLUMN documento_numero TEXT NOT NULL DEFAULT ''" },
            { name: 'documento_tipo_apoderado', sql: "ALTER TABLE pacientes ADD COLUMN documento_tipo_apoderado TEXT" },
            { name: 'documento_numero_apoderado', sql: "ALTER TABLE pacientes ADD COLUMN documento_numero_apoderado TEXT" },
            { name: 'fecha_cambio_estado', sql: "ALTER TABLE pacientes ADD COLUMN fecha_cambio_estado DATE" },
            { name: 'region', sql: "ALTER TABLE pacientes ADD COLUMN region TEXT" },
            { name: 'comuna', sql: "ALTER TABLE pacientes ADD COLUMN comuna TEXT" },
            { name: 'correo_apoderado', sql: "ALTER TABLE pacientes ADD COLUMN correo_apoderado TEXT" },
            { name: 'region_apoderado', sql: "ALTER TABLE pacientes ADD COLUMN region_apoderado TEXT" },
            { name: 'comuna_apoderado', sql: "ALTER TABLE pacientes ADD COLUMN comuna_apoderado TEXT" }
        ];

        columnas.forEach(col => {
            if (!columnExists(col.name)) {
                db.run(col.sql, err => {
                    if (!err) console.log(`Columna ${col.name} agregada`);
                });
            }
        });

        // Índice único para documento_numero
        db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_documento_numero ON pacientes(documento_numero)`);
    });

    // Migración para forma_pago en tabla pagos
    db.all("PRAGMA table_info(pagos)", (err, rows) => {
        if (err) return console.error(err);
        const columnExists = (name) => rows.some(row => row.name === name);

        if (!columnExists('forma_pago')) {
            db.run(`ALTER TABLE pagos ADD COLUMN forma_pago TEXT`);
            console.log('Columna forma_pago agregada a pagos');
        }
    });
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Carpeta estática para documentos institucionales
app.use('/documentos-institucion', express.static(documentosInstitucionPath));

// GET todos los pacientes
app.get('/api/pacientes', (req, res) => {
    db.all('SELECT * FROM pacientes ORDER BY fecha_ingreso DESC', [], (err, rows) => {
        if (err) {
            console.error('Error en query pacientes:', err);
            res.status(500).json({ error: 'Error interno al cargar pacientes' });
            return;
        }
        rows.forEach(p => {
            p.foto_cedula = getFotoPath(p.sede, p.documento_numero);
        });
        res.json(rows);
    });
});

// GET paciente por ID
app.get('/api/pacientes/:id', (req, res) => {
    db.get('SELECT * FROM pacientes WHERE id = ?', [req.params.id], (err, row) => {
        if (err || !row) {
            res.status(404).json({ error: 'Paciente no encontrado' });
        } else {
            row.foto_cedula = getFotoPath(row.sede, row.documento_numero);
            res.json(row);
        }
    });
});

// GET pagos de un paciente - AHORA INCLUYE valor_pagado
app.get('/api/pacientes/:id/pagos', (req, res) => {
    const pacienteId = req.params.id;
    db.all(
        'SELECT año, mes, pagado, fecha_pago, forma_pago, valor_pagado FROM pagos WHERE paciente_id = ? ORDER BY año DESC, mes DESC',
        [pacienteId],
        (err, rows) => {
            if (err) {
                console.error('Error consultando pagos:', err);
                res.json([]);
            } else {
                console.log('Pagos devueltos para paciente', pacienteId, ':', rows);
                res.json(rows || []);
            }
        }
    );
});

// POST para guardar pagos (uno o varios) - AHORA GUARDA valor_pagado
app.post('/api/pacientes/:id/pagos', (req, res) => {
    const pacienteId = req.params.id;
    const { pagos } = req.body;

    if (!pagos || !Array.isArray(pagos) || pagos.length === 0) {
        return res.status(400).json({ error: 'Formato de pagos inválido o vacío' });
    }

    console.log('Recibiendo pagos para paciente', pacienteId, ':', pagos);

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO pagos 
            (paciente_id, año, mes, pagado, fecha_pago, forma_pago, valor_pagado)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        try {
            pagos.forEach(pago => {
                stmt.run(
                    pacienteId,
                    pago.año,
                    pago.mes,
                    pago.pagado ? 1 : 0,
                    pago.fecha_pago || null,
                    pago.forma_pago || null,
                    pago.valor_pagado || 0
                );
            });

            stmt.finalize(() => {
                db.run('COMMIT', err => {
                    if (err) {
                        console.error('Error COMMIT pagos:', err);
                        res.status(500).json({ error: 'Error al guardar pagos' });
                    } else {
                        console.log('Pagos guardados correctamente para paciente', pacienteId);
                        res.json({ success: true });
                    }
                });
            });
        } catch (err) {
            db.run('ROLLBACK');
            console.error('Error insertando pagos:', err);
            res.status(500).json({ error: 'Error al procesar pagos' });
        }
    });
});

// POST nuevo paciente + crear 12 meses pendientes
app.post('/api/pacientes', upload.single('foto_cedula'), (req, res) => {
    const body = req.body;

    let fotoPath = null;
    if (req.file) {
        const rut = body.documento_numero ? limpiarRutParaCarpeta(body.documento_numero) : null;
        if (!rut || !body.sede) {
            return res.status(400).json({ error: 'RUT y sede requeridos para guardar foto' });
        }
        const pacienteFolder = getPacienteFolderPathBySedeYRut(body.sede, rut);
        fs.mkdirSync(pacienteFolder, { recursive: true });
        const ext = path.extname(req.file.originalname).toLowerCase();
        const filePath = path.join(pacienteFolder, 'cedula' + ext);
        fs.writeFileSync(filePath, req.file.buffer);
        fotoPath = '/documentos/' + encodeURIComponent(body.sede.trim()) + '/' + rut + '/cedula' + ext;
    }

    const documento_tipo = body.documento_tipo || 'rut';
    const documento_numero = body.documento_numero ? body.documento_numero.trim() : '';
    const documento_tipo_apoderado = body.documento_tipo_apoderado || '';
    const documento_numero_apoderado = body.documento_numero_apoderado ? body.documento_numero_apoderado.trim() : '';

    const {
        nombre, sede, fecha_ingreso,
        estado = 'Activo', etapa = 'Compromiso',
        psiquiatra = null, doctor = null, tipo_atencion = null,
        fecha_ultima_receta = null, fecha_termino_licencia = null,
        nombre_apoderado = null,
        telefono_apoderado = null, clave_unica = null, correo = null,
        monto_mensual = 350000, fecha_vencimiento_pago = 5,
        sexo = null, fecha_nacimiento = null, ocupacion = null, prevision = null,
        atencion_psiquiatrica = null,
        direccion = null,
        direccion_apoderado = null,
        otros_contactos = null,
        region = null,
        comuna = null,
        correo_apoderado = null
    } = body;

    if (!nombre || !documento_numero || !sede || !fecha_ingreso) {
        return res.status(400).json({ error: 'Campos obligatorios faltantes (nombre, número de documento, sede o fecha de ingreso)' });
    }

    const sql = `INSERT INTO pacientes (
        nombre, documento_tipo, documento_numero, documento_tipo_apoderado, documento_numero_apoderado,
        sede, estado, etapa, fecha_ingreso,
        psiquiatra, doctor, tipo_atencion, fecha_ultima_receta,
        fecha_termino_licencia, nombre_apoderado,
        telefono_apoderado, clave_unica, correo, foto_cedula,
        monto_mensual, fecha_vencimiento_pago,
        sexo, fecha_nacimiento, ocupacion, prevision, atencion_psiquiatrica,
        otros_contactos, direccion, direccion_apoderado,
        fecha_cambio_estado, region, comuna, correo_apoderado, region_apoderado, comuna_apoderado
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
        nombre, documento_tipo, documento_numero, documento_tipo_apoderado, documento_numero_apoderado,
        sede, estado, etapa, fecha_ingreso,
        psiquiatra, doctor, tipo_atencion, fecha_ultima_receta,
        fecha_termino_licencia, nombre_apoderado,
        telefono_apoderado, clave_unica, correo, fotoPath,
        parseInt(monto_mensual), parseInt(fecha_vencimiento_pago),
        sexo, fecha_nacimiento, ocupacion, prevision,
        atencion_psiquiatrica || null,
        otros_contactos || null, direccion || null, direccion_apoderado || null,
        null, region || null, comuna || null, correo_apoderado || null, 
        body.region_apoderado || null, body.comuna_apoderado || null
    ];

    db.run(sql, params, function(err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                res.status(400).json({ error: 'Número de documento ya registrado' });
            } else {
                console.error('Error al registrar paciente:', err);
                res.status(500).json({ error: err.message });
            }
        } else {
            const pacienteId = this.lastID;
            const fechaIngreso = new Date(fecha_ingreso);
            const pagosIniciales = [];
            for (let i = 0; i < 12; i++) {
                const date = new Date(fechaIngreso.getFullYear(), fechaIngreso.getMonth() + i, 1);
                pagosIniciales.push([pacienteId, date.getFullYear(), date.getMonth() + 1, 0, null, null, 0]);
            }
            const stmt = db.prepare('INSERT INTO pagos (paciente_id, año, mes, pagado, fecha_pago, forma_pago, valor_pagado) VALUES (?, ?, ?, ?, ?, ?, ?)');
            pagosIniciales.forEach(p => stmt.run(...p));
            stmt.finalize();

            res.json({ id: pacienteId, foto_cedula: fotoPath });
        }
    });
});

app.put('/api/pacientes/:id', upload.single('foto_cedula'), (req, res) => {
    const body = req.body;
    let fotoPath = null;
    if (req.file) {
        db.get('SELECT documento_numero, sede FROM pacientes WHERE id = ?', [req.params.id], (err, row) => {
            if (err || !row || !row.documento_numero || !row.sede) {
                return res.status(400).json({ error: 'RUT o sede no encontrado para guardar foto' });
            }
            const rut = limpiarRutParaCarpeta(row.documento_numero);
            const pacienteFolder = getPacienteFolderPathBySedeYRut(row.sede, rut);
            fs.mkdirSync(pacienteFolder, { recursive: true });
            const ext = path.extname(req.file.originalname).toLowerCase();
            const filePath = path.join(pacienteFolder, 'cedula' + ext);
            fs.writeFileSync(filePath, req.file.buffer);
            fotoPath = '/documentos/' + encodeURIComponent(row.sede) + '/' + rut + '/cedula' + ext;
        });
    }

    db.get('SELECT nombre, sede, fecha_ingreso FROM pacientes WHERE id = ?', [req.params.id], (err, old) => {
        if (err || !old) return res.status(404).json({ error: 'Paciente no encontrado' });

        const nuevoNombre = body.nombre?.trim() || old.nombre;
        const nuevaSede = body.sede?.trim() || old.sede;
        const nuevaFechaIngreso = body.fecha_ingreso || old.fecha_ingreso;

        if (!nuevaFechaIngreso) {
            return res.status(400).json({ error: 'Fecha de ingreso es obligatoria' });
        }

        const sql = `UPDATE pacientes SET 
            nombre = ?, 
            sede = ?, 
            estado = ?, 
            etapa = ?, 
            fecha_ingreso = ?,
            psiquiatra = ?, 
            doctor = ?, 
            tipo_atencion = ?,
            fecha_ultima_receta = ?, 
            fecha_termino_licencia = ?,
            nombre_apoderado = ?, 
            telefono_apoderado = ?,
            clave_unica = ?, 
            correo = ?, 
            foto_cedula = ?,
            monto_mensual = ?, 
            fecha_vencimiento_pago = ?,
            sexo = ?, 
            fecha_nacimiento = ?, 
            ocupacion = ?, 
            prevision = ?,
            direccion = ?,
            direccion_apoderado = ?,
            otros_contactos = ?,
            documento_tipo = ?,
            documento_numero = ?,
            documento_tipo_apoderado = ?,
            documento_numero_apoderado = ?,
            fecha_cambio_estado = ?, 
            region = ?, 
            comuna = ?, 
            correo_apoderado = ?,
            region_apoderado = ?, 
            comuna_apoderado = ?
            WHERE id = ?`;

        const params = [
            nuevoNombre, 
            nuevaSede,
            body.estado || 'Activo',
            body.etapa || null,
            nuevaFechaIngreso,
            body.psiquiatra || null,
            body.doctor || null,
            body.tipo_atencion || null,
            body.fecha_ultima_receta || null,
            body.fecha_termino_licencia || null,
            body.nombre_apoderado || null,
            body.telefono_apoderado || null,
            body.clave_unica || null,
            body.correo || null,
            fotoPath,
            parseInt(body.monto_mensual) || 350000,
            parseInt(body.fecha_vencimiento_pago) || 5,
            body.sexo || null,
            body.fecha_nacimiento || null,
            body.ocupacion || null,
            body.prevision || null,
            body.direccion || null,
            body.direccion_apoderado || null,
            body.otros_contactos || null,
            body.documento_tipo || 'rut',
            body.documento_numero || '',
            body.documento_tipo_apoderado || '',
            body.documento_numero_apoderado || '',
            body.fecha_cambio_estado || null,
            body.region || null,
            body.comuna || null,
            body.correo_apoderado || null,
            body.region_apoderado || null,
            body.comuna_apoderado || null,
            req.params.id
        ];

        db.run(sql, params, function(err) {
            if (err) {
                console.error('Error SQL al actualizar:', err);
                res.status(500).json({ error: err.message });
            } else {
                res.json({ success: true, changes: this.changes });
            }
        });
    });
});

// API para pagos pendientes
// API para pagos pendientes (con pendiente real por mes)
app.get('/api/pagos-pendientes', (req, res) => {
    const hoy = new Date();
    const añoActual = hoy.getFullYear();
    const mesActual = hoy.getMonth() + 1;

    db.all(`
        SELECT p.id, p.nombre, p.documento_numero, p.sede, p.monto_mensual, p.fecha_vencimiento_pago,
           p.telefono_apoderado,  -- ← AGREGAR ESTA LÍNEA
           pag.año, pag.mes, pag.pagado, pag.valor_pagado
        FROM pacientes p
        LEFT JOIN pagos pag ON p.id = pag.paciente_id 
            AND (pag.año < ? OR (pag.año = ? AND pag.mes <= ?))
        WHERE p.estado = 'Activo'
        ORDER BY p.sede, p.nombre, pag.año, pag.mes
    `, [añoActual, añoActual, mesActual], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const pacientesPendientes = {};
        let totalPendiente = 0;

        rows.forEach(row => {
            if (row.pagado === 1) return; // Si ya está pagado, no lo consideramos pendiente

            if (!pacientesPendientes[row.id]) {
                pacientesPendientes[row.id] = {
                    id: row.id,
                    nombre: row.nombre,
                    documento_numero: row.documento_numero,
                    sede: row.sede,
                    monto_mensual: row.monto_mensual,
                    meses_pendientes: [],
                    pendiente_por_mes: [],  // ← NUEVO: pendiente real por mes
                    telefono_apoderado: row.telefono_apoderado || '',  // ← AGREGAR ESTA LÍNEA
                    pendiente_total: 0      // ← NUEVO: suma total pendiente
                    
                };
            }

            const mesStr = `${row.año}-${String(row.mes).padStart(2, '0')}`;
            const pendienteMes = row.monto_mensual - (row.valor_pagado || 0);

            if (pendienteMes > 0) {
                pacientesPendientes[row.id].meses_pendientes.push(mesStr);
                pacientesPendientes[row.id].pendiente_por_mes.push(pendienteMes); // pendiente real
                pacientesPendientes[row.id].pendiente_total += pendienteMes;
                totalPendiente += pendienteMes;
            }
        });

        res.json({
            pacientes: Object.values(pacientesPendientes),
            total_pendiente: totalPendiente
        });
    });
});

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// === ELIMINACIÓN MASIVA ===
app.delete('/api/eliminar-todo', (req, res) => {
    try {
        db.run(`DELETE FROM pagos`);
        db.run(`DELETE FROM pacientes`);

        if (fs.existsSync(documentosPath)) {
            fs.rmSync(documentosPath, { recursive: true, force: true });
            fs.mkdirSync(documentosPath);
        }

        if (fs.existsSync(documentosInstitucionPath)) {
            fs.rmSync(documentosInstitucionPath, { recursive: true, force: true });
            fs.mkdirSync(documentosInstitucionPath);
        }

        res.json({ success: true, message: 'Todos los pacientes y archivos eliminados' });
    } catch (err) {
        console.error('Error en eliminación masiva:', err);
        res.status(500).json({ error: 'Error interno al eliminar' });
    }
});

// === CARGA MASIVA ===
const XLSX = require('xlsx');

app.post('/api/carga-masiva-pruebas', uploadMasivo.single('archivo'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    try {
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const rows = XLSX.utils.sheet_to_json(sheet, { 
            header: 1, 
            raw: false,
            dateNF: 'yyyy-mm-dd'
        });

        if (rows.length <= 1) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'El archivo está vacío o solo tiene encabezado' });
        }

        const datos = rows.slice(1);

        let agregados = 0;
        const errores = [];

        function parsearFecha(cell) {
            if (!cell) return null;

            if (cell instanceof Date) {
                return cell.toISOString().slice(0, 10);
            }

            if (typeof cell === 'number') {
                const d = XLSX.SSF.parse_date_code(cell);
                if (d) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
            }

            if (typeof cell === 'string') {
                let clean = cell.trim();
                clean = clean.replace(/\//g, '-');

                const regex1 = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
                const regex2 = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;

                let match = clean.match(regex1);
                if (match) {
                    let [_, d1, d2, year] = match;
                    let day = parseInt(d1), month = parseInt(d2);
                    if (day > 12) {
                        return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                    } else if (month > 12) {
                        return `${year}-${String(day).padStart(2,'0')}-${String(month).padStart(2,'0')}`;
                    } else {
                        return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                    }
                }

                match = clean.match(regex2);
                if (match) {
                    let [_, year, month, day] = match;
                    return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                }
            }

            return null;
        }

        const insertStmt = db.prepare(`
            INSERT OR IGNORE INTO pacientes 
            (nombre, documento_tipo, documento_numero, sede, fecha_ingreso, estado, etapa, fecha_cambio_estado)
            VALUES (?, 'rut', ?, ?, ?, ?, 'Compromiso', ?)
        `);

        datos.forEach((row, index) => {
            if (row.length < 6) {
                errores.push({ fila: index + 2, mensaje: 'Faltan columnas (se esperan 6)' });
                return;
            }

            let [nombre, documento_numero, estado, fechaEstadoCell, fechaIngresoCell, sede] = row;

            nombre = (nombre || '').toString().trim();
            documento_numero = (documento_numero || '').toString().trim();
            estado = (estado || 'Activo').toString().trim();
            sede = (sede || '').toString().trim();

            if (!nombre || !sede) {
                errores.push({ fila: index + 2, mensaje: 'Faltan datos obligatorios (nombre o sede)' });
                return;
            }

            const fechaIngreso = parsearFecha(fechaIngresoCell);
            if (!fechaIngreso) {
                errores.push({ fila: index + 2, mensaje: 'Fecha de ingreso inválida o no reconocida' });
                return;
            }

            let fechaEstado = null;
            if (estado !== 'Activo') {
                fechaEstado = parsearFecha(fechaEstadoCell);
                if (!fechaEstado) {
                    errores.push({ fila: index + 2, mensaje: 'Fecha estado inválida (requerida cuando estado ≠ Activo)' });
                    return;
                }
            }

            try {
                insertStmt.run(nombre, documento_numero, sede, fechaIngreso, estado, fechaEstado);
                agregados++;
            } catch (err) {
                errores.push({ fila: index + 2, mensaje: err.message.includes('UNIQUE') ? 'Número de documento duplicado' : 'Error al insertar' });
            }
        });

        insertStmt.finalize();
        fs.unlinkSync(req.file.path);

        res.json({ agregados, errores });
    } catch (err) {
        console.error('Error en carga masiva:', err);
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: 'Error procesando el archivo' });
    }
});

// === DOCUMENTOS INSTITUCIONALES ===
app.post('/api/documentos-institucion/upload', uploadDocumentos.array('documentos'), (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No se subieron archivos' });
    }
    res.json({ success: true, subidos: req.files.length });
});

app.get('/api/documentos-institucion', (req, res) => {
    fs.readdir(documentosInstitucionPath, (err, files) => {
        if (err) return res.status(500).json([]);

        const archivos = files.map(file => {
            const stats = fs.statSync(path.join(documentosInstitucionPath, file));
            return {
                nombre: file,
                tamaño: (stats.size / 1024).toFixed(2) + ' KB',
                fecha: stats.mtime.toLocaleDateString('es-CL')
            };
        });

        res.json(archivos);
    });
});

// Guardar contrato generado en carpeta paciente/contratos (usando Sede + RUT)
app.post('/api/guardar-contrato', upload.single('contrato'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se recibió el archivo' });
    }

    const pacienteId = req.body.paciente_id;
    if (!pacienteId) {
        return res.status(400).json({ error: 'ID del paciente requerido' });
    }

    db.get('SELECT documento_numero, sede FROM pacientes WHERE id = ?', [pacienteId], (err, row) => {
        if (err || !row || !row.documento_numero || !row.sede) {
            console.error('Error al buscar RUT/sede para contrato:', err);
            return res.status(404).json({ error: 'RUT o sede no encontrado' });
        }

        const rut = limpiarRutParaCarpeta(row.documento_numero);
        const pacienteFolder = getPacienteFolderPathBySedeYRut(row.sede, rut);
        if (!pacienteFolder) {
            return res.status(400).json({ error: 'RUT o sede inválido' });
        }

        const contratosPath = path.join(pacienteFolder, 'contratos');
        if (!fs.existsSync(contratosPath)) {
            fs.mkdirSync(contratosPath, { recursive: true });
        }

        const destino = path.join(contratosPath, req.file.originalname);

        try {
            fs.writeFileSync(destino, req.file.buffer);
            console.log(`Contrato guardado para RUT ${rut} en sede ${row.sede}: ${destino}`);
            res.json({ success: true, mensaje: 'Contrato guardado en carpeta del paciente (Sede + RUT)' });
        } catch (writeErr) {
            console.error('Error al escribir contrato:', writeErr);
            res.status(500).json({ error: 'Error al guardar el contrato' });
        }
    });
});

// DELETE paciente individual + borrar carpeta completa (usando Sede + RUT)
app.delete('/api/pacientes/:id', (req, res) => {
    const id = req.params.id;

    db.get('SELECT documento_numero, sede FROM pacientes WHERE id = ?', [id], (err, row) => {
        if (err || !row || !row.documento_numero || !row.sede) {
            return res.status(404).json({ error: 'Paciente no encontrado' });
        }

        db.run('DELETE FROM pacientes WHERE id = ?', [id], function(deleteErr) {
            if (deleteErr) {
                console.error('Error al borrar paciente de DB:', deleteErr);
                return res.status(500).json({ error: 'Error al eliminar de la base de datos' });
            }

            const rut = limpiarRutParaCarpeta(row.documento_numero);
            const pacienteFolder = getPacienteFolderPathBySedeYRut(row.sede, rut);
            if (fs.existsSync(pacienteFolder)) {
                fs.rmSync(pacienteFolder, { recursive: true, force: true });
                console.log(`Carpeta del paciente (Sede ${row.sede} - RUT ${rut}) borrada: ${pacienteFolder}`);
            }

            res.json({ success: true, mensaje: 'Paciente eliminado correctamente' });
        });
    });
});

// GET todas las capacidades
app.get('/api/capacidades', (req, res) => {
    db.all('SELECT sede, capacidad FROM capacidades ORDER BY sede', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// PUT actualizar capacidad de una sede
app.put('/api/capacidades/:sede', (req, res) => {
    const sede = req.params.sede;
    const { capacidad } = req.body;

    db.run('UPDATE capacidades SET capacidad = ? WHERE sede = ?', [capacidad, sede], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else if (this.changes === 0) {
            res.status(404).json({ error: 'Sede no encontrada' });
        } else {
            res.json({ success: true, mensaje: 'Capacidad actualizada' });
        }
    });
});

// Ruta para subir comprobantes
app.post('/api/subir-comprobantes', uploadComprobantes.array('comprobantes'), (req, res) => {
    const pacienteId = req.body.pacienteId;

    if (!pacienteId) {
        return res.status(400).json({ error: 'pacienteId requerido' });
    }

    db.get('SELECT documento_numero, sede FROM pacientes WHERE id = ?', [pacienteId], (err, row) => {
        if (err || !row || !row.documento_numero || !row.sede) {
            console.error('Error buscando RUT/sede del paciente:', err);
            return res.status(404).json({ error: 'RUT o sede no encontrado' });
        }

        const rut = limpiarRutParaCarpeta(row.documento_numero);
        const pacienteFolder = getPacienteFolderPathBySedeYRut(row.sede, rut);
        if (!pacienteFolder) {
            return res.status(400).json({ error: 'RUT o sede inválido' });
        }

        const uploadDir = path.join(pacienteFolder, 'comprobantes_de_pago');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const uploadedFiles = [];

        req.files.forEach(file => {
            const filePath = path.join(uploadDir, file.originalname);
            fs.writeFileSync(filePath, file.buffer);
            uploadedFiles.push(file.originalname);
        });

        console.log(`Comprobantes subidos para RUT ${rut} en sede ${row.sede}:`, uploadedFiles);

        res.json({ success: true, files: uploadedFiles });
    });
});

// Ruta para subir facturas
app.post('/api/subir-facturas', uploadFacturas.array('facturas'), (req, res) => {
    const pacienteId = req.body.pacienteId;

    if (!pacienteId) {
        return res.status(400).json({ error: 'pacienteId requerido' });
    }

    db.get('SELECT documento_numero, sede FROM pacientes WHERE id = ?', [pacienteId], (err, row) => {
        if (err || !row || !row.documento_numero || !row.sede) {
            console.error('Error buscando RUT/sede del paciente:', err);
            return res.status(404).json({ error: 'RUT o sede no encontrado' });
        }

        const rut = limpiarRutParaCarpeta(row.documento_numero);
        const pacienteFolder = getPacienteFolderPathBySedeYRut(row.sede, rut);
        if (!pacienteFolder) {
            return res.status(400).json({ error: 'RUT o sede inválido' });
        }

        const uploadDir = path.join(pacienteFolder, 'facturas');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const uploadedFiles = [];

        req.files.forEach(file => {
            const filePath = path.join(uploadDir, file.originalname);
            fs.writeFileSync(filePath, file.buffer);
            uploadedFiles.push(file.originalname);
        });

        console.log(`Facturas subidas para RUT ${rut} en sede ${row.sede}:`, uploadedFiles);

        res.json({ success: true, files: uploadedFiles });
    });
});

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// === ELIMINACIÓN MASIVA ===
app.delete('/api/eliminar-todo', (req, res) => {
    try {
        db.run(`DELETE FROM pagos`);
        db.run(`DELETE FROM pacientes`);

        if (fs.existsSync(documentosPath)) {
            fs.rmSync(documentosPath, { recursive: true, force: true });
            fs.mkdirSync(documentosPath);
        }

        if (fs.existsSync(documentosInstitucionPath)) {
            fs.rmSync(documentosInstitucionPath, { recursive: true, force: true });
            fs.mkdirSync(documentosInstitucionPath);
        }

        res.json({ success: true, message: 'Todos los pacientes y archivos eliminados' });
    } catch (err) {
        console.error('Error en eliminación masiva:', err);
        res.status(500).json({ error: 'Error interno al eliminar' });
    }
});

app.listen(port, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
    console.log('Usuario login por defecto: admin / evolucion2025');
});