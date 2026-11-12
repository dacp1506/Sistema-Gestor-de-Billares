const { pool } = require('../config/db');

const DEFAULT_SETTINGS = {
  tema: 'dark',
  idioma: 'es',
  moneda: 'BOB',
  nombre_comercial: 'SALÓN DE BILLAR BOLA8',
  iva_porcentaje: 13,
  formato_impresion: '80mm',
};

const SELECT_COLUMNS = `id_configuracion, id_usuario, tema, idioma, moneda,
  nombre_comercial, iva_porcentaje, formato_impresion, actualizado_en`;

async function findByUser(userId) {
  const { rows } = await pool.query(
    `SELECT ${SELECT_COLUMNS}
     FROM configuraciones_usuario
     WHERE id_usuario = $1`,
    [userId]
  );
  return rows[0] || null;
}

async function upsert(userId, {
  tema,
  idioma,
  moneda,
  nombre_comercial,
  iva_porcentaje,
  formato_impresion,
}) {
  const { rows } = await pool.query(
    `INSERT INTO configuraciones_usuario
       (id_usuario, tema, idioma, moneda, nombre_comercial, iva_porcentaje, formato_impresion)
     VALUES ($1,
       COALESCE($2::varchar, 'dark'),
       COALESCE($3::varchar, 'es'),
       COALESCE($4::varchar, 'BOB'),
       COALESCE($5::varchar, 'SALÓN DE BILLAR BOLA8'),
       COALESCE($6::numeric, 13),
       COALESCE($7::varchar, '80mm'))
     ON CONFLICT (id_usuario) DO UPDATE SET
       tema = COALESCE($2::varchar, configuraciones_usuario.tema),
       idioma = COALESCE($3::varchar, configuraciones_usuario.idioma),
       moneda = COALESCE($4::varchar, configuraciones_usuario.moneda),
       nombre_comercial = COALESCE($5::varchar, configuraciones_usuario.nombre_comercial),
       iva_porcentaje = COALESCE($6::numeric, configuraciones_usuario.iva_porcentaje),
       formato_impresion = COALESCE($7::varchar, configuraciones_usuario.formato_impresion),
       actualizado_en = NOW()
     RETURNING ${SELECT_COLUMNS}`,
    [
      userId,
      tema ?? null,
      idioma ?? null,
      moneda ?? null,
      nombre_comercial ?? null,
      iva_porcentaje ?? null,
      formato_impresion ?? null,
    ]
  );
  return rows[0] || null;
}

module.exports = { findByUser, upsert, DEFAULT_SETTINGS };
