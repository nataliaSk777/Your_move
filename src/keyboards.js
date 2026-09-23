import { Markup } from 'telegraf';

export function mainKeyboard() {
  return Markup.keyboard([
    ['☀️ Мой ход'],
    ['✨ Как идёт игра', '🌙 Завершить день']
  ]).resize();
}

export function actionKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        '✨ Сделано',
        'ACTION_DONE'
      )
    ],
    [
      Markup.button.callback(
        '🎲 Другой ход',
        'ACTION_CHANGE'
      )
    ]
  ]);
}

export function eveningKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        '🏆 Завершить день',
        'FINISH_DAY'
      )
    ]
  ]);
}
