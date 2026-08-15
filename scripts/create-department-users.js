const bcrypt = require('../../casales-core/node_modules/bcryptjs');
require('../../casales-core/node_modules/dotenv').config({ path: require('path').resolve(__dirname, '../../casales-core/.env') });
const { pool } = require('../../casales-core/src/config/database');

const TEMP_PASSWORD = 'Casales2026';
const DEPARTMENT_PERMISSIONS = ['home', 'reservas', 'pagos_alicuota'];

function buildCode(torreNumero, departamentoNumero) {
  const departamento = String(departamentoNumero || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  return `T${torreNumero}D${departamento}`;
}

async function ensureColumns(client) {
  await client.query(`
    ALTER TABLE usuarios
      ADD COLUMN IF NOT EXISTS page_permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS torre_ids INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];
  `);
}

async function main() {
  const client = await pool.connect();
  const passwordHash = await bcrypt.hash(TEMP_PASSWORD, 10);

  let created = 0;
  let updated = 0;
  let assigned = 0;

  try {
    await client.query('BEGIN');
    await ensureColumns(client);

    const departamentosResult = await client.query(`
      SELECT d.id, d.numero AS departamento_numero, t.id AS torre_id, t.numero AS torre_numero
      FROM departamentos d
      INNER JOIN torres t ON t.id = d.torre_id
      ORDER BY t.numero ASC, d.numero ASC
    `);

    for (const departamento of departamentosResult.rows) {
      const code = buildCode(departamento.torre_numero, departamento.departamento_numero);
      const email = `${code.toLowerCase()}@casales.app`;
      const nombre = code;
      const torreIds = [Number(departamento.torre_id)];

      const existing = await client.query(
        'SELECT id FROM usuarios WHERE LOWER(email) = LOWER($1) OR LOWER(nombre) = LOWER($2) LIMIT 1',
        [email, code]
      );

      let userId;

      if (existing.rowCount > 0) {
        userId = existing.rows[0].id;
        await client.query(
          `UPDATE usuarios
           SET nombre = $1,
               email = $2,
               password_hash = $3,
               role = 'condomino',
               page_permissions = $4::jsonb,
               torre_ids = $5::integer[]
           WHERE id = $6`,
          [nombre, email, passwordHash, JSON.stringify(DEPARTMENT_PERMISSIONS), torreIds, userId]
        );
        updated += 1;
      } else {
        const inserted = await client.query(
          `INSERT INTO usuarios (nombre, email, password_hash, role, page_permissions, torre_ids)
           VALUES ($1, $2, $3, 'condomino', $4::jsonb, $5::integer[])
           RETURNING id`,
          [nombre, email, passwordHash, JSON.stringify(DEPARTMENT_PERMISSIONS), torreIds]
        );
        userId = inserted.rows[0].id;
        created += 1;
      }

      const departamentoUpdate = await client.query(
        'UPDATE departamentos SET usuario_id = $1 WHERE id = $2',
        [userId, departamento.id]
      );
      assigned += departamentoUpdate.rowCount;
    }

    await client.query('COMMIT');

    console.log(JSON.stringify({
      departamentos: departamentosResult.rowCount,
      created,
      updated,
      assigned,
      tempPassword: TEMP_PASSWORD
    }, null, 2));
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
