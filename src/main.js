import { createBot as _createBot } from "mineflayer"
import {
  pathfinder,
  clearBlock,
  collectItem,
  pathfind,
  deposit,
  equip,
  getItem,
  give,
  clearArea,
  smelt
} from "./actions.js"
import { readFileSync } from "fs"
import vec3 from "vec3"

const settings = JSON.parse(readFileSync("./settings.json", "utf8"))

const bots = []
const commands = []

var lastJoin = new Date()
var spawning = false

function createBot() {
  spawning = true

  let bot = _createBot({
    username: `TestMachine_${bots.length}`,
    server: "localhost",
    version: "1.16.4",
    port: 50017
  })

  bot.task = []
  bot.todo = []

  bot.once("spawn", () => {
    spawning = false
    lastJoin = new Date()
  })

  bot.on("kicked", (reason, loggedIn) => console.log(reason, loggedIn))
  bot.on("error", (err) => console.log(err))

  let updatePath = () => {
    if (!bot.path || !bot.path.path.length) return

    //let start = bot.path.path[bot.path.path.length-1].position;
    let start = bot.entity.position
    let end = bot.path.goal

    bot.path.path = pathfinder.path(bot, start, end, bot.path.range, bot.path.maxLoops)
  }

  bot.on("blockUpdate", updatePath)
  bot.on("chunkColumnLoad", updatePath)
  setInterval(updatePath, 2000)

  bots.push(bot)
}

function processCommand(username, message) {
  if (!settings.bosses.includes(username)) return

  let tokens = message.split(" ")

  if (tokens[0].startsWith("@")) {
    let bot = bots.find((bot) => {
      return bot.username == tokens[0].slice(1)
    })

    tokens.shift()

    if (bot) {
      if (bot.task.length) {
        bot.chat(`I'm busy. I'll do it later.`)
        bot.todo.push(tokens)
      } else {
        runCommand(bot, tokens)
      }
    } else {
      bots[0].chat("Couldn't find the specified bot.")
    }
  } else {
    let bot = bots.find((bot) => {
      return !bot.task.length
    })

    if (bot) {
      runCommand(bot, tokens)
    } else {
      bots[0].chat("Everyone is busy. Adding the command to list.")
      commands.push(tokens)
    }
  }
}

/*
	The comments in the following function are only reminders to myself of all the things I haven't added.
	Please keep that in mind.
*/

function runCommand(bot, tokens) {
  switch (tokens[0]) {
    case "break":
      clearBlock(bot, vec3(parseInt(tokens[1]), parseInt(tokens[2]), parseInt(tokens[3])))
      break
    case "collect":
      // Get a type of item by both mining and hunting on loop.
      // Can also include stopping criteria.

      collectItem(bot, tokens[1], parseInt(tokens[2]))
      break
    case "come":
      pathfind(bot, bot.players["Makkusu_Otaku"].entity.position, 2.5, 300)
      break
    case "deposit": {
      //Deposit items into chest at position.
      //Can also include the type of item to deposit.
      //If no position is specified it'll use the default. (dropoff location)

      const location = vec3(parseInt(tokens[1]), parseInt(tokens[2]), parseInt(tokens[3]))

      //Or just use default location.
      deposit(bot, location)
      break
    }
    case "dropoff":
      //Sets the position of the chest used to deposit items when inventory is full.
      break
    case "equip":
      equip(bot, tokens[1])
      break
    case "get":
      //Get the specified item.
      getItem(bot, tokens[1])
      break
    case "give":
      give(bot, tokens[1], tokens[2], parseInt(tokens[3] || "1"))
      break
    case "goto":
      //Go to specified position.
      pathfind(bot, vec3(parseInt(tokens[1]), parseInt(tokens[2]), parseInt(tokens[3])), 1)
      break
    case "hunt":
      //Hunt for a single item.
      break
    case "mine":
      //Mine for a single item.
      break
    case "minefor":
      //Go mining for a type of item on loop.
      //Can also include stopping criteria.
      break
    case "quarry": {
      //Dig a quarry between points A & B.
      const pointA = vec3(parseInt(tokens[1]), parseInt(tokens[2]), parseInt(tokens[3]))
      const pointB = vec3(parseInt(tokens[4]), parseInt(tokens[5]), parseInt(tokens[6]))
      clearArea(bot, pointA, pointB)
      break
    }
    case "smelt":
      smelt(bot, tokens[1])
      break
    case "source":
      //Tells you the sources of an item.
      break
  }
}

async function cosmicLooper() {
  let time = new Date()

  if (!spawning && bots.length < settings.maxBots && time - lastJoin > settings.spawnDelay) {
    createBot()
  }

  for (const bot of bots) {
    if (!bot.task.length) {
      if (bot.todo.length) {
        runCommand(bot, bot.todo[0])
        bot.todo.shift()
      } else if (commands.length) {
        runCommand(bot, commands[0])
        commands.shift()
      }
    }
  }

  if (bots.length) {
    console.clear()
    for (const bot of bots) {
      console.log(`${bot.username}:  ${bot.task.join(" > ")}`)
    }
  }
  setTimeout(cosmicLooper, 100)
}

createBot()

bots[0].once("spawn", () => {
  let bot = bots[0]

  bot.on("chat", processCommand)
  bot.on("whisper", processCommand)
  cosmicLooper()
})
