import { Telegraf } from 'telegraf';

import {
  getOrCreateUser,
  getTodayAction,
  completeTodayAction,
  saveDailyResult
} from './database.js';

import {
  mainKeyboard,
  actionKeyboard,
  eveningKeyboard
} from './keyboards.js';

import {
  getOrCreateDailyMove,
  replaceDailyMove,
  formatDailyMove,
  formatCompletedMove
} from './day.js';

import {
  createCelebration
} from './celebration.js';

import {
  buildWeeklyReport
} from './analytics.js';

const BOT_TOKEN =
  process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  throw new Error(
    'Не задана переменная BOT_TOKEN в Railway.'
  );
}

export const bot =
  new Telegraf(BOT_TOKEN);

async function getUser(ctx) {
  if (!ctx.from) {
    throw new Error(
      'Telegram user is unavailable.'
    );
  }

  return getOrCreateUser(ctx.from);
}

bot.start(async (ctx) => {
  try {
    const user =
      await getUser(ctx);

    const name =
      user.first_name || 'моя дорогая';

    await ctx.reply(
      [
        `✨ <b>Доброе утро, ${name}.</b>`,
        '',
        'Начнём сегодняшний день.',
        '',
        'Здесь не нужно выбирать из десятка задач или пытаться успеть всё.',
        '',
        'Каждый день я буду искать для тебя <b>один хороший ход</b> — маленькое действие, которое поддержит то, что сейчас важно.',
        '',
        'А ещё добавлю к нему немного праздника. 🌊✨',
        '',
        '<b>Тебе нужен только следующий ход.</b>'
      ].join('\n'),
      {
        parse_mode: 'HTML',
        ...mainKeyboard()
      }
    );

    const action =
      await getOrCreateDailyMove(
        user.id
      );

    await ctx.reply(
      formatDailyMove(action),
      {
        parse_mode: 'HTML',
        ...actionKeyboard()
      }
    );
  } catch (error) {
    console.error(
      'START ERROR:',
      error
    );

    await ctx.reply(
      'Что-то пошло не так. Попробуем ещё раз через минуту. 🌿'
    );
  }
});

bot.hears(
  '☀️ Мой ход',
  async (ctx) => {
    try {
      const user =
        await getUser(ctx);

      const action =
        await getOrCreateDailyMove(
          user.id
        );

      if (
        action.status === 'completed'
      ) {
        await ctx.reply(
          [
            '✨ <b>Сегодняшний ход уже сделан.</b>',
            '',
            `${action.support_emoji} ${action.support_name}`,
            '',
            'Главное на сегодня уже произошло.',
            '',
            '<b>Можно просто жить дальше и наслаждаться днём.</b> ✨'
          ].join('\n'),
          {
            parse_mode: 'HTML',
            ...eveningKeyboard()
          }
        );

        return;
      }

      await ctx.reply(
        formatDailyMove(action),
        {
          parse_mode: 'HTML',
          ...actionKeyboard()
        }
      );
    } catch (error) {
      console.error(
        'TODAY ERROR:',
        error
      );

      await ctx.reply(
        'Не получилось найти сегодняшний ход. Попробуй ещё раз. 🌿'
      );
    }
  }
);

bot.action(
  'ACTION_DONE',
  async (ctx) => {
    try {
      await ctx.answerCbQuery(
        '✨ Ход сделан'
      );

      const user =
        await getUser(ctx);

      const completed =
        await completeTodayAction(
          user.id
        );

      if (!completed) {
        await ctx.reply(
          'Сегодняшний ход куда-то спрятался. Нажми «☀️ Мой ход», и найдём его.'
        );

        return;
      }

      const action =
        await getTodayAction(
          user.id
        );

      await ctx.editMessageReplyMarkup(
        undefined
      ).catch(() => {});

      await ctx.reply(
        formatCompletedMove(action),
        {
          parse_mode: 'HTML',
          ...eveningKeyboard()
        }
      );
    } catch (error) {
      console.error(
        'DONE ERROR:',
        error
      );

      await ctx.reply(
        'Не получилось сохранить ход. Попробуй нажать ещё раз. 🌿'
      );
    }
  }
);

bot.action(
  'ACTION_CHANGE',
  async (ctx) => {
    try {
      await ctx.answerCbQuery(
        '🎲 Ищу другой ход'
      );

      const user =
        await getUser(ctx);

      const action =
        await replaceDailyMove(
          user.id
        );

      await ctx.editMessageText(
        formatDailyMove(action),
        {
          parse_mode: 'HTML',
          ...actionKeyboard()
        }
      );
    } catch (error) {
      console.error(
        'CHANGE ERROR:',
        error
      );

      await ctx.reply(
        'Другой ход пока не нашёлся. Попробуй ещё раз. 🎲'
      );
    }
  }
);

bot.hears(
  '🌙 Завершить день',
  async (ctx) => {
    try {
      const user =
        await getUser(ctx);

      const action =
        await getTodayAction(
          user.id
        );

      if (!action) {
        await ctx.reply(
          [
            '🌙 <b>На сегодня всё.</b>',
            '',
            'Сегодня мы не делали отдельного хода.',
            'И ничего не нужно наверстывать.',
            '',
            'Этот день можно спокойно отпустить.',
            '<b>Завтра будет новый ход.</b> 🤍'
          ].join('\n'),
          {
            parse_mode: 'HTML',
            ...mainKeyboard()
          }
        );

        return;
      }

      const celebration =
        createCelebration({
          completed:
            action.status === 'completed'
        });

      await saveDailyResult({
        userId: user.id,
        actionId: action.id,
        dayWon:
          celebration.dayWon,
        supportScore:
          celebration.score,
        celebrationText:
          celebration.text
      });

      await ctx.reply(
        celebration.text,
        {
          parse_mode: 'HTML',
          ...mainKeyboard()
        }
      );
    } catch (error) {
      console.error(
        'EVENING ERROR:',
        error
      );

      await ctx.reply(
        'Не получилось закрыть день. Попробуем ещё раз. 🌙'
      );
    }
  }
);

bot.action(
  'FINISH_DAY',
  async (ctx) => {
    try {
      await ctx.answerCbQuery(
        '🌙 Закрываем день'
      );

      const user =
        await getUser(ctx);

      const action =
        await getTodayAction(
          user.id
        );

      const celebration =
        createCelebration({
          completed:
            action?.status ===
            'completed'
        });

      await saveDailyResult({
        userId: user.id,
        actionId:
          action?.id || null,
        dayWon:
          celebration.dayWon,
        supportScore:
          celebration.score,
        celebrationText:
          celebration.text
      });

      await ctx.editMessageReplyMarkup(
        undefined
      ).catch(() => {});

      await ctx.reply(
        celebration.text,
        {
          parse_mode: 'HTML',
          ...mainKeyboard()
        }
      );
    } catch (error) {
      console.error(
        'FINISH DAY ERROR:',
        error
      );

      await ctx.reply(
        'Не получилось закрыть день. Попробуем ещё раз. 🌙'
      );
    }
  }
);

bot.hears(
  '✨ Как идёт игра',
  async (ctx) => {
    try {
      const user =
        await getUser(ctx);

      const report =
        await buildWeeklyReport(
          user.id
        );

      await ctx.reply(
        report,
        {
          parse_mode: 'HTML',
          ...mainKeyboard()
        }
      );
    } catch (error) {
      console.error(
        'ANALYTICS ERROR:',
        error
      );

      await ctx.reply(
        'Не получилось посмотреть игру. Попробуй ещё раз чуть позже. 🌿'
      );
    }
  }
);

bot.catch(
  (error, ctx) => {
    console.error(
      `BOT ERROR ${ctx.updateType}:`,
      error
    );
  }
);
