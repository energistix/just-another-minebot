import { createBot, Bot as MCBot } from "mineflayer"
import { pathfinder, ComputedPath } from "mineflayer-pathfinder"
import { Vec3 } from "vec3"
import settings from "../settings.json"
import * as actions from "./actions.js"

class Bot {
  mcBot: MCBot
  path: ComputedPath | null = null
  static bots: Bot[] = []
  static commands: string[][] = []
  // TODO: find out what those are
  tasks: string[] = []
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
          this.runCommand(tokens)
        }
      } else {
        Bot.bots[0].mcBot.chat("Couldn't find the specified bot.")
      }
    } else {
      const bot = Bot.bots.find((bot) => {
        return !bot.tasks.length
      })

      if (bot) {
        this.runCommand(tokens)
      } else {
        Bot.bots[0].mcBot.chat("Everyone is busy. Adding the command to list.")
        Bot.commands.push(tokens)
      }
    }
  }

  runCommand(tokens) {
    switch (tokens[0]) {
      case "break":
        actions.clearBlock(this, new Vec3(parseInt(tokens[1]), parseInt(tokens[2]), parseInt(tokens[3])))
        break
      case "collect":
        // Get a type of item by both mining and hunting on loop.
        // Can also include stopping criteria.

        actions.collectItem(this, tokens[1], parseInt(tokens[2]))
        break
      case "come":
        actions.pathfind(this, this.mcBot.players["energistix"].entity.position, 2.5, 300)
        break
      case "deposit": {
        //Deposit items into chest at position.
        //Can also include the type of item to deposit.
        //If no position is specified it'll use the default. (dropoff location)

        const location = new Vec3(parseInt(tokens[1]), parseInt(tokens[2]), parseInt(tokens[3]))

        //Or just use default location.
        actions.deposit(this, location)
        break
      }
      case "equip":
        actions.equip(this, tokens[1])
        break
      case "get":
        //Get the specified item.
        actions.getItem(this, tokens[1])
        break
      case "give":
        actions.give(this, tokens[1], tokens[2], parseInt(tokens[3] || "1"))
        break
      case "goto":
        //Go to specified position.
        actions.pathfind(this, new Vec3(parseInt(tokens[1]), parseInt(tokens[2]), parseInt(tokens[3])), 1)
        break
      case "quarry": {
        //Dig a quarry between points A & B.
        const pointA = new Vec3(parseInt(tokens[1]), parseInt(tokens[2]), parseInt(tokens[3]))
        const pointB = new Vec3(parseInt(tokens[4]), parseInt(tokens[5]), parseInt(tokens[6]))
        actions.clearArea(this, pointA, pointB)
        break
      }
      case "smelt":
        actions.smeltItem(this, tokens[1])
        break
    }
  }
}

export { Bot }
