import http from 'http';

import {
  initializeDatabase,
  closeDatabase
} from './database.js';

import { bot } from './bot.js';

const PORT =
  Number(process.env.PORT) || 3000;

async function start() {
  try {
    console.log(
      '🎲 Запускаю «Твой ход»...'
    );

    await initializeDatabase();

    const server =
      http.createServer(
        (req, res) => {
          if (
            req.url === '/health'
          ) {
            res.writeHead(
              200,
              {
                'Content-Type':
                  'application/json'
              }
            );

            res.end(
              JSON.stringify({
                status: 'ok',
                bot: 'Твой ход'
              })
            );

            return;
          }

          res.writeHead(200);

          res.end(
            'Твой ход работает.'
          );
        }
      );

    server.listen(
      PORT,
      '0.0.0.0',
      () => {
        console.log(
          `✅ Health server: ${PORT}`
        );
      }
    );

    await bot.launch();

    console.log(
      '✨ «Твой ход» запущен.'
    );

    const shutdown =
      async (signal) => {
        console.log(
          `\nПолучен ${signal}. Завершаю работу...`
        );

        bot.stop(signal);

        server.close(
          async () => {
            await closeDatabase();

            console.log(
              '👋 «Твой ход» остановлен.'
            );

            process.exit(0);
          }
        );
      };

    process.once(
      'SIGINT',
      () => shutdown('SIGINT')
    );

    process.once(
      'SIGTERM',
      () => shutdown('SIGTERM')
    );
  } catch (error) {
    console.error(
      '❌ Ошибка запуска «Твоего хода»:',
      error
    );

    process.exit(1);
  }
}

start();
