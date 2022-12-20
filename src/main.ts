import { createBot, Bot as MCBot } from "mineflayer"
import vec3 from "vec3"
import * as actions from "./actions.js"
import { PathNode } from "./pathfinder.js"
import _viewer from "prismarine-viewer"
const mineflayerViewer = _viewer.mineflayer
import { pathfinder } from "mineflayer-pathfinder"
import { readFileSync } from "fs"

const settings = JSON.parse(readFileSync("settings.json", "utf8"))

const commands = []

class Bot {
  mcBot: MCBot
  path: {
    path: PathNode[]
    goal: vec3.Vec3
    range: number
    maxLoops: number
  } | null = null
  static bots: Bot[] = []
  static commands: string[][] = []
  // TODO: find out what those are
  tasks: string[] = []
  todos: string[][] = []
  constructor() {
    Bot.bots.push(this)
    this.mcBot = createBot({
      host: "localhost",
      username: `Bot#${Bot.bots.length}`
    })
    this.mcBot.loadPlugin(pathfinder)

    this.mcBot.on("kicked", (reason, loggedIn) => console.log(reason, loggedIn))
    this.mcBot.on("error", (err) => console.log(err))
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

  //TODO: username should not be default
  runCommand(tokens, username = "energistix") {
    switch (tokens[0]) {
      case "break":
        actions.clearBlock(this, new vec3.Vec3(parseInt(tokens[1]), parseInt(tokens[2]), parseInt(tokens[3])))
        break
      case "collect":
        // Get a type of item by both mining and hunting on loop.
        // Can also include stopping criteria.

        actions.collectItem(this, tokens[1], parseInt(tokens[2]))
        break
      case "come":
        actions.pathfind(this, this.mcBot.players.energistix.entity.position, 2.5)
        break
      case "deposit": {
        //Deposit items into chest at position.
        //Can also include the type of item to deposit.
        //If no position is specified it'll use the default. (dropoff location)

        const location = new vec3.Vec3(parseInt(tokens[1]), parseInt(tokens[2]), parseInt(tokens[3]))

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
        actions.give(this, username, tokens[2], parseInt(tokens[1] || "1"))
        break
      case "goto":
        //Go to specified position.
        actions.pathfind(this, new vec3.Vec3(parseInt(tokens[1]), parseInt(tokens[2]), parseInt(tokens[3])), 1)
        break
      case "quarry": {
        //Dig a quarry between points A & B.
        const pointA = new vec3.Vec3(parseInt(tokens[1]), parseInt(tokens[2]), parseInt(tokens[3]))
        const pointB = new vec3.Vec3(parseInt(tokens[4]), parseInt(tokens[5]), parseInt(tokens[6]))
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

const lastJoin = Date.now()
const spawning = false

async function cosmicLooper() {
  const time = Date.now()

  if (!spawning && Bot.bots.length < settings.maxBots && time - lastJoin > settings.spawnDelay) {
    new Bot()
  }

  for (const bot of Bot.bots) {
    if (!bot.tasks.length) {
      if (bot.todos.length) {
        bot.runCommand(bot.todos[0])
        bot.todos.shift()
      } else if (commands.length) {
        bot.runCommand(commands[0])
        commands.shift()
      }
    }
  }

  if (Bot.bots.length) {
    console.clear()
    for (const bot of Bot.bots) {
      console.log(`${bot.mcBot.username}:  ${bot.tasks.join(" > ")}`)
    }
  }
  setTimeout(cosmicLooper, 1000)
}

new Bot()

Bot.bots[0].mcBot.once("spawn", () => {
  mineflayerViewer(Bot.bots[0].mcBot, { port: 3007, firstPerson: true })
  const bot = Bot.bots[0]

  bot.mcBot.on("chat", bot.processCommand.bind(bot))
  bot.mcBot.on("whisper", bot.processCommand.bind(bot))
  cosmicLooper()
})

cosmicLooper()
