import { createBot, Bot as MCBot } from "mineflayer"
import { pathfinder, ComputedPath } from "mineflayer-pathfinder"
import settings from "../settings.json"

class Bot {
  private mcBot: MCBot
  path: ComputedPath | null = null
  static bots: Bot[] = []
  static commands: string[][] = []
  // TODO: find out what those are
  tasks: any[] = []
  todos: string[][] = []
  constructor() {
    this.mcBot = createBot({
      host: "localhost",
      username: `Bot#${Bot.bots.length}`
    })
    this.mcBot.loadPlugin(pathfinder)

    this.mcBot.on("kicked", (reason, loggedIn) => console.log(reason, loggedIn))
    this.mcBot.on("error", (err) => console.log(err))

    this.mcBot.on("blockUpdate", this.updatePath.call(this))
    this.mcBot.on("chunkColumnLoad", this.updatePath.call(this))
    setInterval(this.updatePath.call(this), 2000)
  }
  updatePath() {
    //TODO: i'll figure out pathfinding later
    // if (!this.path || !this.path.path.length) return
    // //let start = this.path.path[this.path.path.length-1].position;
    // const start = this.mcBot.entity.position
    // const end = this.path.goal
    // this.path.path = actions.pathfinder.path(
    //   this.mcBot,
    //   start,
    //   end,
    //   this.path.range,
    //   this.path.maxLoops
    // )
  }

  processCommand(username: string, message: string) {
    if (!settings.bosses.includes(username)) return

    const tokens = message.split(" ")

    if (tokens[0].startsWith("@")) {
      const bot = Bot.bots.find((bot) => {
        return bot.mcBot.username == tokens[0].slice(1) || bot.mcBot.username == `Bot#${tokens[0].slice(1)}`
      })

      tokens.shift()

      if (bot) {
        if (bot.tasks.length) {
          bot.mcBot.chat(`I'm busy. I'll do it later.`)
          bot.todos.push(tokens)
        } else {
          //TODO: implementing runCommand and actions
          // runCommand(bot, tokens)
        }
      } else {
        Bot.bots[0].mcBot.chat("Couldn't find the specified bot.")
      }
    } else {
      const bot = Bot.bots.find((bot) => {
        return !bot.tasks.length
      })

      if (bot) {
        // runCommand(bot, tokens)
      } else {
        Bot.bots[0].mcBot.chat("Everyone is busy. Adding the command to list.")
        Bot.commands.push(tokens)
      }
    }
  }
}
