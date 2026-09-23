import {
  getRecentActions,
  getRecentResults,
  getSupportStats
} from './database.js';

function pluralDays(number) {
  const mod10 = number % 10;
  const mod100 = number % 100;

  if (
    mod10 === 1 &&
    mod100 !== 11
  ) {
    return 'день';
  }

  if (
    mod10 >= 2 &&
    mod10 <= 4 &&
    !(mod100 >= 12 && mod100 <= 14)
  ) {
    return 'дня';
  }

  return 'дней';
}

export async function buildWeeklyReport(userId) {
  const [
    actions,
    results,
    stats
  ] = await Promise.all([
    getRecentActions(userId, 7),
    getRecentResults(userId, 7),
    getSupportStats(userId, 7)
  ]);

  const completed =
    actions.filter(
      (action) =>
        action.status === 'completed'
    ).length;

  const wonDays =
    results.filter(
      (result) =>
        result.day_won
    ).length;

  const lines = [
    '✨ <b>Как идёт твоя игра</b>',
    '',
    `🏆 Выиграно: <b>${wonDays} ${pluralDays(wonDays)}</b>`,
    `🎯 Сделано ходов: <b>${completed}</b>`,
    '',
    '<b>Куда шло внимание:</b>'
  ];

  for (const stat of stats) {
    const count =
      Number(stat.completed_count);

    const dots =
      '●'.repeat(
        Math.min(count, 7)
      );

    const empty =
      '○'.repeat(
        Math.max(0, 7 - count)
      );

    lines.push(
      `${stat.emoji} ${stat.name}: ${dots}${empty}`
    );
  }

  const sortedStats = [...stats].sort(
    (a, b) =>
      Number(b.completed_count) -
      Number(a.completed_count)
  );

  const strongest =
    sortedStats[0];

  const quietest =
    sortedStats[
      sortedStats.length - 1
    ];

  if (
    strongest &&
    Number(strongest.completed_count) > 0
  ) {
    lines.push('');
    lines.push(
      `🌿 Сейчас особенно хорошо держится опора <b>«${strongest.name}»</b>.`
    );
  }

  if (
    quietest &&
    strongest &&
    quietest.code !== strongest.code
  ) {
    lines.push(
      `🌱 А <b>«${quietest.name}»</b> пока получает меньше внимания. Я учту это в следующих ходах.`
    );
  }

  lines.push('');
  lines.push(
    '<b>Посмотри: движение уже накапливается.</b>'
  );

  lines.push(
    'Не нужно торопить его. ✨'
  );

  return lines.join('\n');
}
