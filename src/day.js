import {
  getTodayAction,
  createTodayAction
} from './database.js';

import {
  chooseDailyMove
} from './system.js';

export async function getOrCreateDailyMove(userId) {
  const existing =
    await getTodayAction(userId);

  if (existing) {
    return existing;
  }

  const move =
    await chooseDailyMove(userId);

  await createTodayAction(
    userId,
    move.supportPoint.id,
    move.actionText,
    move.waterfallText
  );

  return getTodayAction(userId);
}

export async function replaceDailyMove(userId) {
  const current =
    await getTodayAction(userId);

  const excludedCode =
    current?.support_code || null;

  const move =
    await chooseDailyMove(
      userId,
      excludedCode
    );

  await createTodayAction(
    userId,
    move.supportPoint.id,
    move.actionText,
    move.waterfallText
  );

  return getTodayAction(userId);
}

export function formatDailyMove(action) {
  return [
    '☀️ <b>Твой ход на сегодня</b>',
    '',
    `${action.support_emoji} <b>${action.support_name}</b>`,
    '',
    action.action_text,
    '',
    '🌊 <b>А вот маленький водопад:</b>',
    action.waterfall_text,
    '',
    '<b>На сегодня этого достаточно.</b> ✨'
  ].join('\n');
}

export function formatCompletedMove(action) {
  return [
    '✨ <b>Ход сделан.</b>',
    '',
    `Сегодня ты поддержала опору «${action.support_name}».`,
    '',
    'Пусть теперь это маленькое изменение работает на тебя.',
    '',
    '🌙 А вечером узнаем, выигран ли сегодняшний день.'
  ].join('\n');
}
