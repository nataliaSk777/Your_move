import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('Не задана переменная DATABASE_URL в Railway.');
}

export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false
});

export async function initializeDatabase() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  await pool.query(schema);

  console.log('✅ PostgreSQL готов.');
}

export async function getOrCreateUser(telegramUser) {
  const { id, first_name, username } = telegramUser;

  const result = await pool.query(
    `
    INSERT INTO users (
      telegram_id,
      first_name,
      username
    )
    VALUES ($1, $2, $3)

    ON CONFLICT (telegram_id)
    DO UPDATE SET
      first_name = EXCLUDED.first_name,
      username = EXCLUDED.username,
      updated_at = NOW()

    RETURNING *;
    `,
    [
      id,
      first_name || null,
      username || null
    ]
  );

  const user = result.rows[0];

  await ensureDefaultSupportPoints(user.id);

  return user;
}

export async function ensureDefaultSupportPoints(userId) {
  const supportPoints = [
    ['PROJECT', 'Проект', '🚀', 1],
    ['BODY', 'Тело', '🌿', 1],
    ['HOME', 'Пространство', '🏠', 1],
    ['JOY', 'Радость', '✨', 1]
  ];

  for (const [code, name, emoji, priority] of supportPoints) {
    await pool.query(
      `
      INSERT INTO support_points (
        user_id,
        code,
        name,
        emoji,
        priority
      )
      VALUES ($1, $2, $3, $4, $5)

      ON CONFLICT (user_id, code)
      DO NOTHING;
      `,
      [userId, code, name, emoji, priority]
    );
  }
}

export async function getSupportPoints(userId) {
  const result = await pool.query(
    `
    SELECT *
    FROM support_points
    WHERE user_id = $1
      AND active = TRUE
    ORDER BY priority DESC, id ASC;
    `,
    [userId]
  );

  return result.rows;
}

export async function getTodayAction(userId) {
  const result = await pool.query(
    `
    SELECT
      da.*,
      sp.code AS support_code,
      sp.name AS support_name,
      sp.emoji AS support_emoji
    FROM daily_actions da
    JOIN support_points sp
      ON sp.id = da.support_point_id
    WHERE da.user_id = $1
      AND da.action_date = CURRENT_DATE
    LIMIT 1;
    `,
    [userId]
  );

  return result.rows[0] || null;
}

export async function createTodayAction(
  userId,
  supportPointId,
  actionText,
  waterfallText
) {
  const result = await pool.query(
    `
    INSERT INTO daily_actions (
      user_id,
      support_point_id,
      action_date,
      action_text,
      waterfall_text
    )
    VALUES ($1, $2, CURRENT_DATE, $3, $4)

    ON CONFLICT (user_id, action_date)
    DO UPDATE SET
      support_point_id = EXCLUDED.support_point_id,
      action_text = EXCLUDED.action_text,
      waterfall_text = EXCLUDED.waterfall_text,
      status = 'offered',
      completed_at = NULL

    RETURNING *;
    `,
    [
      userId,
      supportPointId,
      actionText,
      waterfallText
    ]
  );

  return result.rows[0];
}

export async function completeTodayAction(userId) {
  const result = await pool.query(
    `
    UPDATE daily_actions
    SET
      status = 'completed',
      completed_at = NOW()
    WHERE user_id = $1
      AND action_date = CURRENT_DATE

    RETURNING *;
    `,
    [userId]
  );

  if (result.rows[0]) {
    await pool.query(
      `
      UPDATE support_points
      SET last_supported_at = NOW()
      WHERE id = $1;
      `,
      [result.rows[0].support_point_id]
    );
  }

  return result.rows[0] || null;
}

export async function markTodayActionChanged(userId) {
  await pool.query(
    `
    UPDATE daily_actions
    SET status = 'changed'
    WHERE user_id = $1
      AND action_date = CURRENT_DATE;
    `,
    [userId]
  );
}

export async function saveDailyResult({
  userId,
  actionId,
  dayWon,
  supportScore,
  celebrationText
}) {
  const result = await pool.query(
    `
    INSERT INTO daily_results (
      user_id,
      action_id,
      result_date,
      day_won,
      support_score,
      celebration_text
    )
    VALUES ($1, $2, CURRENT_DATE, $3, $4, $5)

    ON CONFLICT (user_id, result_date)
    DO UPDATE SET
      action_id = EXCLUDED.action_id,
      day_won = EXCLUDED.day_won,
      support_score = EXCLUDED.support_score,
      celebration_text = EXCLUDED.celebration_text

    RETURNING *;
    `,
    [
      userId,
      actionId,
      dayWon,
      supportScore,
      celebrationText
    ]
  );

  return result.rows[0];
}

export async function getRecentActions(userId, days = 30) {
  const result = await pool.query(
    `
    SELECT
      da.*,
      sp.code AS support_code,
      sp.name AS support_name,
      sp.emoji AS support_emoji
    FROM daily_actions da
    JOIN support_points sp
      ON sp.id = da.support_point_id
    WHERE da.user_id = $1
      AND da.action_date >= CURRENT_DATE - ($2::int - 1)
    ORDER BY da.action_date DESC;
    `,
    [userId, days]
  );

  return result.rows;
}

export async function getRecentResults(userId, days = 30) {
  const result = await pool.query(
    `
    SELECT *
    FROM daily_results
    WHERE user_id = $1
      AND result_date >= CURRENT_DATE - ($2::int - 1)
    ORDER BY result_date DESC;
    `,
    [userId, days]
  );

  return result.rows;
}

export async function getSupportStats(userId, days = 7) {
  const result = await pool.query(
    `
    SELECT
      sp.code,
      sp.name,
      sp.emoji,

      COUNT(da.id) FILTER (
        WHERE da.status = 'completed'
      )::int AS completed_count

    FROM support_points sp

    LEFT JOIN daily_actions da
      ON da.support_point_id = sp.id
      AND da.action_date >= CURRENT_DATE - ($2::int - 1)

    WHERE sp.user_id = $1
      AND sp.active = TRUE

    GROUP BY
      sp.id,
      sp.code,
      sp.name,
      sp.emoji

    ORDER BY sp.id;
    `,
    [userId, days]
  );

  return result.rows;
}

export async function closeDatabase() {
  await pool.end();
}
