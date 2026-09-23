import {
  getSupportPoints,
  getRecentActions
} from './database.js';

const ACTIONS = {
  PROJECT: [
    {
      action:
        'Выбери один маленький результат для своего главного проекта и удели ему 25 минут без переключений.',
      waterfall:
        'После этого остановись на минуту и посмотри, что появилось благодаря тебе. Не спеши сразу делать следующее. ✨'
    },
    {
      action:
        'Открой главный проект и сделай один шаг, после которого он станет заметно ближе к результату.',
      waterfall:
        'Когда закончишь, приготовь себе что-нибудь приятное и мысленно скажи: «Сегодня движение уже произошло». ✨'
    },
    {
      action:
        'Найди в проекте действие, которое упростит следующие несколько шагов, и сделай только его.',
      waterfall:
        'После этого устрой себе маленькую красивую паузу — музыка, окно, чай или несколько минут тишины. 🌊'
    }
  ],

  BODY: [
    {
      action:
        'Подари телу 10 минут движения: мягкая растяжка, велотренажёр или спокойная прогулка.',
      waterfall:
        'После движения задержись на минуту и почувствуй тело. Сегодня ты уже сделала для него что-то хорошее. ✨'
    },
    {
      action:
        'Сделай короткое движение для тела прямо сегодня — настолько небольшое, чтобы не пришлось себя уговаривать.',
      waterfall:
        'Добавь к этому одну приятную деталь: музыку, свежий воздух или красивую одежду для занятия. 🌿'
    },
    {
      action:
        'Выбери 10 минут заботы о теле и сделай их без цели добиться идеального результата.',
      waterfall:
        'После этого посмотри на себя с удовольствием, а не с оценкой. Сегодня тело получило внимание. ✨'
    }
  ],

  HOME: [
    {
      action:
        'Поставь таймер на 10 минут и освободи одну заметную поверхность.',
      waterfall:
        'Когда закончишь, не убегай сразу. Посмотри на освободившееся пространство и насладись им. ✨'
    },
    {
      action:
        'Выбери одну маленькую зону дома, после которой всё пространство будет выглядеть лучше, и приведи в порядок только её.',
      waterfall:
        'Добавь одну красивую деталь: свет, музыку, цветок, чашку или просто ощущение свежести. 🌊'
    },
    {
      action:
        'Сделай один короткий шаг, после которого дому станет легче дышать.',
      waterfall:
        'Остановись и поймай момент: пространство уже стало немного красивее благодаря тебе. ✨'
    }
  ],

  JOY: [
    {
      action:
        'Найди сегодня 10 минут для вещи, которая радует тебя сама по себе и не обязана быть полезной.',
      waterfall:
        'Не превращай её в задачу. Это и есть маленький праздник сегодняшнего дня. ✨'
    },
    {
      action:
        'Заметь сегодня одну красивую вещь, которую обычно могла бы пройти мимо.',
      waterfall:
        'Задержись возле неё чуть дольше обычного. Пусть этот момент действительно случится. 🌊'
    },
    {
      action:
        'Добавь в обычное дело одну деталь исключительно ради удовольствия.',
      waterfall:
        'Не объясняй себе, зачем это нужно. Сегодня красота сама является достаточной причиной. ✨'
    }
  ]
};

function daysSince(date) {
  if (!date) {
    return 999;
  }

  const now = new Date();
  const then = new Date(date);

  return Math.floor(
    (now.getTime() - then.getTime()) /
      (1000 * 60 * 60 * 24)
  );
}

function chooseSupportPoint(supportPoints, recentActions) {
  const completedByCode = {};

  for (const action of recentActions) {
    if (action.status !== 'completed') {
      continue;
    }

    completedByCode[action.support_code] =
      (completedByCode[action.support_code] || 0) + 1;
  }

  const scored = supportPoints.map((point) => {
    const completed =
      completedByCode[point.code] || 0;

    const neglectedDays =
      daysSince(point.last_supported_at);

    /*
      Чем реже поддерживалась опора,
      тем выше её шанс стать сегодняшней.

      Количество недавних выполнений
      немного уменьшает её приоритет.
    */

    const score =
      Math.min(neglectedDays, 30) * 10 -
      completed * 3 +
      point.priority;

    return {
      point,
      score
    };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored[0]?.point || supportPoints[0];
}

function chooseActionTemplate(code, recentActions) {
  const templates = ACTIONS[code];

  if (!templates || templates.length === 0) {
    return {
      action:
        'Сделай сегодня один маленький шаг в поддержку этой части своей жизни.',
      waterfall:
        'После него остановись и отметь: движение уже произошло. ✨'
    };
  }

  const recentTexts = new Set(
    recentActions
      .filter(
        (item) =>
          item.support_code === code
      )
      .slice(0, templates.length - 1)
      .map((item) => item.action_text)
  );

  const unused = templates.filter(
    (template) =>
      !recentTexts.has(template.action)
  );

  const candidates =
    unused.length > 0 ? unused : templates;

  return candidates[
    Math.floor(Math.random() * candidates.length)
  ];
}

export async function chooseDailyMove(
  userId,
  excludedSupportCode = null
) {
  let supportPoints =
    await getSupportPoints(userId);

  const recentActions =
    await getRecentActions(userId, 14);

  if (
    excludedSupportCode &&
    supportPoints.length > 1
  ) {
    supportPoints = supportPoints.filter(
      (point) =>
        point.code !== excludedSupportCode
    );
  }

  const supportPoint =
    chooseSupportPoint(
      supportPoints,
      recentActions
    );

  const template =
    chooseActionTemplate(
      supportPoint.code,
      recentActions
    );

  return {
    supportPoint,
    actionText: template.action,
    waterfallText: template.waterfall
  };
}
