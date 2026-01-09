const sqlite3 = require('sqlite3').verbose();

console.log('Conectando a la base de datos...');

const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Error al abrir la base de datos:', err.message);
    } else {
        console.log('Base de datos conectada (database.db)');
    }
});

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS pacientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            rut TEXT NOT NULL UNIQUE,
            sede TEXT NOT NULL,
            estado TEXT DEFAULT 'Activo',
            etapa TEXT,
            fecha_ingreso TEXT NOT NULL,
            psiquiatra TEXT,
            doctor TEXT,
            tipo_atencion TEXT,
            fecha_ultima_receta TEXT,
            fecha_termino_licencia TEXT,
            nombre_apoderado TEXT,
            rut_apoderado TEXT,
            telefono_apoderado TEXT,
            clave_unica TEXT,
            correo TEXT,
            foto_cedula TEXT,
            monto_mensual INTEGER DEFAULT 350000,
            fecha_vencimiento_pago INTEGER DEFAULT 5,
            sexo TEXT,
            fecha_nacimiento TEXT,
            ocupacion TEXT,
            prevision TEXT,
            atencion_psiquiatrica TEXT,
            direccion TEXT,
            direccion_apoderado TEXT
        )
    `, (err) => {
        if (err) {
            console.error('Error al crear la tabla:', err.message);
        } else {
            console.log('Tabla "pacientes" creada/actualizada con todos los campos necesarios');
        }
    });

    // === MIGRACIONES: Agregar columnas si no existen ===
    const columnasNuevas = [
        { nombre: 'monto_mensual', tipo: 'INTEGER DEFAULT 350000' },
        { nombre: 'fecha_vencimiento_pago', tipo: 'INTEGER DEFAULT 5' },
        { nombre: 'sexo', tipo: 'TEXT' },
        { nombre: 'fecha_nacimiento', tipo: 'TEXT' },
        { nombre: 'ocupacion', tipo: 'TEXT' },
        { nombre: 'prevision', tipo: 'TEXT' },
        { nombre: 'atencion_psiquiatrica', tipo: 'TEXT' },
        { nombre: 'direccion', tipo: 'TEXT' },
        { nombre: 'direccion_apoderado', tipo: 'TEXT' },
        { nombre: 'foto_cedula', tipo: 'TEXT' }
    ];

    db.all("PRAGMA table_info(pacientes)", (err, rows) => {
        if (err) {
            console.error('Error al leer estructura de tabla:', err);
            return;
        }

        const columnasExistentes = rows.map(row => row.name);

        columnasNuevas.forEach(col => {
            if (!columnasExistentes.includes(col.nombre)) {
                db.run(`ALTER TABLE pacientes ADD COLUMN ${col.nombre} ${col.tipo}`, (alterErr) => {
                    if (alterErr) {
                        console.error(`Error al agregar columna ${col.nombre}:`, alterErr.message);
                    } else {
                        console.log(`Columna ${col.nombre} agregada correctamente`);
                    }
                });
            }
        });
    });
});

module.exports = db;