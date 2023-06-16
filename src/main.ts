import { Bot, createBot } from "./Bot.js"

const bots: Bot[] = []

const botAmoount = 10 as const

;(function createBots() {
  const bot = createBot()
  bots.push(bot)
  if (bots.length < botAmoount) {
    bot.once("spawn", () => {
      createBots()
    })
  } else {
    bots[0].chat("Finished creating bots")
    main()
  }
})()

function main() {
  const master = bots[0]
}
