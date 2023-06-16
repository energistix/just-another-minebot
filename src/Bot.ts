import mineflayer from "mineflayer"

function createBot(pseudo = "bot") {
  const bot = mineflayer.createBot({
    host: "localhost",
    port: 25565,
    username: pseudo,
    version: "1.19.4"
  })

  return {
    ...bot
  }
}

type Bot = ReturnType<typeof createBot>

export { createBot, Bot }
