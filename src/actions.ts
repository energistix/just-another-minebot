import * as pathfinder from "./pathfinder.js"
import * as fs from "fs"
import { Bot } from "./main.js"
import * as mcfinder from "./mc-finder.js"
import vec3 from "vec3"
import { EquipmentDestination } from "mineflayer"

import _mcdata from "minecraft-data"
const mcdata = _mcdata("1.16.5")

import prismarineItem from "prismarine-item"

const tools = fs.readFileSync("tool-list.txt", "utf8").split("\r\n")
const smelting = JSON.parse(fs.readFileSync("smelting.json", "utf8"))

function sleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time))
}

export async function pathfind(bot: Bot, position, range = 1, maxLoops = 300) {
  const tracker = bot.tasks.length
  bot.tasks.push(`pathfind ${range}`)

  if (bot.mcBot.entity.position.distanceTo(position) <= range) {
    bot.tasks.pop()
    return
  }

  let botPosition = bot.mcBot.entity.position
  let path = pathfinder.path(bot, bot.mcBot.entity.position, position, range, maxLoops)

  if (!path.length) {
    await sleep(2000)
    botPosition = bot.mcBot.entity.position
    path = pathfinder.path(bot, bot.mcBot.entity.position, position, range, maxLoops)
  }

  bot.path = {
    path: path,
    goal: position,
    range: range,
    maxLoops: maxLoops
  }

  const originalLength = path.length

  while (botPosition.distanceTo(position) > range) {
    path = bot.path.path
    //path = pathfinder.path(bot, botPosition, position, range, maxLoops);

    bot.tasks[tracker] = `pathfind ${path.length}/${originalLength} <${range}`

    if (path.length) {
      const distanceA = botPosition.distanceTo(path[path.length - 1].position)

      /*if (path.length >= 2) {
              console.log("Pos B");
              let distanceB = botPosition.distanceTo(path[path.length-2].position);
              if (distanceA > distanceB) bot.path.path.pop();
          }*/

      if (distanceA < 0.5) bot.path.path.pop()
      if (path.length) pathfinder.walk(bot, path[path.length - 1].position)
    }

    await sleep(100)

    botPosition = bot.mcBot.entity.position
  }

  bot.path = null
  bot.mcBot.clearControlStates()
  bot.tasks.pop()
}

export async function getItem(bot: Bot, item: string) {
  bot.tasks.push(`get ${item}`)

  const sourceBlocks = mcfinder.blocks(item).map((block) => {
    return mcdata.blocksByName[block].id
  })

  const blocks = bot.mcBot.findBlocks({
    matching: sourceBlocks,
    point: bot.mcBot.entity.position.offset(0, bot.mcBot.entity.height, 0)
  })

  if (blocks.length) {
    await clearBlock(bot, blocks[0])

    for (let loops = 0; loops < 10; loops++) {
      const drop = bot.mcBot.nearestEntity((entity) => {
        return entity.name == "item"
      })

      if (drop) {
        //await pathfind(bot, drop.position.clone().floor().offset(0.5, 0, 0.5), 1);
        await pathfind(bot, drop.position.clone().floor(), 1)
      }
      await sleep(100)
    }
  } else {
    const recipes = mcfinder.recipes(bot, item)

    if (smelting[item]) {
      await smeltItem(bot, smelting[item].sources[0])
    } else if (recipes.length) {
      await craftItem(bot, item)
    } else {
      //console.log(`Couldn't find any recipes for ${item}.`);
      await craftItem(bot, item)
    }
  }

  bot.tasks.pop()
}

export async function clearBlock(bot: Bot, position: vec3.Vec3) {
  bot.tasks.push("clear block")

  await pathfind(bot, position, 2)

  const block = bot.mcBot.blockAt(position)

  if (bot.mcBot.game.gameMode == "survival") {
    const availableTools = bot.mcBot.inventory.slots.filter((slot) => {
      if (!slot) return
      return block.canHarvest(slot.type)
    })

    if (availableTools.length) {
      await bot.mcBot.equip(availableTools[0].type, "hand")
    } else if (!block.canHarvest(null)) {
      const tool = tools.find((toolName) => {
        return block.canHarvest(mcdata.itemsByName[toolName].id)
      })

      if (tool) {
        await getItem(bot, tool)
        await equip(bot, tool)
      } else console.log(`Don't know how to destroy ${block.displayName}.`)
    }
  }

  await pathfind(bot, position, 2)
  await bot.mcBot.dig(block, true)

  bot.tasks.pop()
}

const fuels = ["coal", "oak_log"]

export async function smeltItem(bot: Bot, itemName: string) {
  bot.tasks.push(`smelt ${itemName}`)

  const item = mcdata.itemsByName[itemName]

  if (!bot.mcBot.inventory.count(item.id)) {
    await getItem(bot, itemName)
  }

  let fuel = fuels.find((name) => {
    return bot.mcBot.inventory.count(mcdata.itemsByName[name].id)
  })

  if (!fuel) {
    await getItem(bot, fuels[0])
    fuel = fuels[0]
    console.log("Got some fuel.")
  }

  const furnacePosition = await prepareTable(bot, "furnace")
  const furnaceBlock = bot.mcBot.blockAt(furnacePosition)

  /*let furnaceBlock = bot.findBlock({
        matching: mcdata.blocksByName.furnace.id,
    });*/

  if (furnaceBlock) {
    await pathfind(bot, furnaceBlock.position, 2)

    const furnace = await bot.mcBot.openFurnace(furnaceBlock)

    await furnace.putInput(item.id, null, 1)
    await furnace.putFuel(mcdata.itemsByName[fuel].id, null, 1)

    furnace.close()

    // eslint-disable-next-line no-constant-condition
    while (true) {
      //This could easily be a problem. ¯\_(ツ)_/¯
      await sleep(2000)
      console.log("Waiting for furnace.")

      const furnace = await bot.mcBot.openFurnace(furnaceBlock)
      // const out = furnace.outputItem()

      if (furnace.outputItem()) {
        await furnace.takeOutput()
        furnace.close()
        break
      }
      furnace.close()
    }
  }

  bot.tasks.pop()
}

async function prepareTable(bot: Bot, tableType: string) {
  bot.tasks.push(`prepare ${tableType}`)

  const table = bot.mcBot.findBlock({
    matching: mcdata.blocksByName[tableType].id
  })

  let tablePosition

  if (!table) {
    const blocks = bot.mcBot.findBlocks({
      maxDistance: 8,
      matching: [mcdata.blocksByName.air.id, mcdata.blocksByName.cave_air.id],
      count: 64
    })

    console.log(`Found ${blocks.length} air.`)

    const block = blocks.find((b) => {
      const below = bot.mcBot.blockAt(b.offset(0, -1, 0))

      for (const entity of Object.values(bot.mcBot.entities)) {
        // This should be improved. I'll do it later.... maybe.
        if (entity.position.distanceTo(b) <= 1) return false
      }

      return !["air", "cave_air"].includes(below.name)
    })

    if (block) tablePosition = block
    else console.log("Couldn't find a place to put the table.")

    await placeBlock(bot, tablePosition, tableType)
  } else {
    tablePosition = table.position
  }

  bot.tasks.pop()
  return tablePosition
}

async function craftItem(bot: Bot, item: string) {
  bot.tasks.push(`craft ${item}`)

  let recipes = mcfinder.recipes(bot, item, false)
  console.log(`Recipes for ${item}: ${recipes.length}`)

  let usingTable = false
  let craftingTable

  if (!recipes.length) {
    usingTable = true
    console.log("Crafting table required.")

    const tablePosition = await prepareTable(bot, "crafting_table")
    craftingTable = bot.mcBot.blockAt(tablePosition)

    recipes = mcfinder.recipes(bot, item, true)
  }

  const recipe = recipes[0] //This needs work.

  const needs = recipe.delta.filter((ingredient) => {
    return ingredient.count < 0
  })

  while (!hasIngredients(bot, needs)) {
    for (const ingredient of needs) {
      const name = mcdata.items[ingredient.id].name
      await collectItem(bot, name, -ingredient.count)
    }
  }

  if (usingTable) {
    await pathfind(bot, craftingTable.position, 2)
    await bot.mcBot.craft(recipe, 1, craftingTable)
  } else await bot.mcBot.craft(recipe, 1)

  bot.tasks.pop()
}

async function placeBlock(bot: Bot, position: vec3.Vec3, type = "dirt") {
  bot.tasks.push("place block")

  await pathfind(bot, position, 4)

  await clearBlock(bot, position).catch(console.log)

  await equip(bot, type)

  await pathfind(bot, position, 4)

  const referenceBlock = bot.mcBot.blockAt(position.offset(0, -1, 0), false)
  await bot.mcBot.placeBlock(referenceBlock, new vec3.Vec3(0, 1, 0)).catch(console.log)

  bot.tasks.pop()
}

export async function equip(bot: Bot, item: string, slot: EquipmentDestination = "hand") {
  bot.tasks.push(`equip ${item}`)

  const itemType = mcdata.itemsByName[item].id

  if (!checkInventory(bot, item)) {
    if (bot.mcBot.game.gameMode == "creative") {
      await bot.mcBot.creative.setInventorySlot(36, new prismarineItem.Item(itemType, 1))
    } else {
      await getItem(bot, item)
    }
  }

  await bot.mcBot.equip(itemType, slot)
  bot.tasks.pop()
}

function checkInventory(bot: Bot, itemName: string) {
  const items = bot.mcBot.inventory.items()
  return items.filter((item) => item.name === itemName).length
}

function hasIngredients(bot: Bot, ingredients: _mcdata.Item[]) {
  //bot.inventory.count(mcdata.itemsByName[name].id);
  console.log("Checking for ingredients:")

  for (const ingredient of ingredients) {
    //let name = mcdata.items[ingredient.id].name;
    //await collectItem(bot, name, -ingredient.count);
    const got = bot.mcBot.inventory.count(ingredient.id)
    const get = -ingredient.count

    console.log(`   ${mcdata.items[ingredient.id].name}: ${got}/${get} ${got >= get ? "✔︎" : "✘"}`)

    if (got < get) return false
  }

  return true
}

export async function collectItem(bot: Bot, itemName: string, quantity: number) {
  const tracker = bot.tasks.length
  bot.tasks.push(`collect ${itemName} x${quantity}`)

  const item = mcdata.itemsByName[itemName]
  const deposited = 0 //Keep track of items deposited into chests. (None for now because I haven't added that)
  if (!quantity) quantity = item.stackSize

  while (bot.mcBot.inventory.count(item.id) + deposited < quantity) {
    bot.tasks[tracker] = `collect ${itemName} ${bot.mcBot.inventory.count(item.id)}/${quantity}`
    await getItem(bot, itemName)
  }

  bot.tasks.pop()
}

export async function deposit(bot: Bot, position: vec3.Vec3) {
  bot.tasks.push(`deposit`)

  await pathfind(bot, position, 4)

  /*let chestBlock = bot.findBlock({
  matching: mcdata.blocksByName['chest'].id,
  maxDistance: 5,// This should be 2.
      point: position,
});*/

  const chestBlock = bot.mcBot.blockAt(position)

  if (chestBlock) {
    await pathfind(bot, chestBlock.position, 2)

    const chest = await bot.mcBot.openChest(chestBlock)

    await bot.mcBot.waitForTicks(20)

    for (const slot of bot.mcBot.inventory.slots) {
      if (slot) {
        console.log(slot.type)
        await chest.deposit(slot.type, null, slot.count)
        //await chest.deposit(slot.type, null, bot.inventory.count(slot.type));
      }
    }

    chest.close()
  } else {
    console.log(`${bot.mcBot.username} was unable to find chest.`)
  }

  bot.tasks.pop()
}

export async function clearArea(bot: Bot, pointA: vec3.Vec3, pointB: vec3.Vec3) {
  bot.tasks.push(`quarry`)

  const minX = Math.min(pointA.x, pointB.x)
  const minY = Math.min(pointA.y, pointB.y)
  const minZ = Math.min(pointA.z, pointB.z)

  const maxX = Math.max(pointA.x, pointB.x)
  const maxY = Math.max(pointA.y, pointB.y)
  const maxZ = Math.max(pointA.z, pointB.z)

  let zD = 1
  let z = minZ

  for (let y = maxY; y >= minY; y--) {
    for (let x = minX; x < maxX; x += 4) {
      while (z < maxZ && z > minZ - 1) {
        for (let xx = 0; xx < 4 && x + xx < maxX; xx++) {
          const k = x + xx
          await clearBlock(bot, new vec3.Vec3(k, y, z))
        }
        z += zD
      }
      zD = -zD
      z += zD
    }
  }

  bot.tasks.pop()
}

export async function give(bot: Bot, username: string, itemName: string, quantity: number) {
  bot.tasks.push(`give ${username} ${itemName} x${quantity}`)

  const player = bot.mcBot.players[username]
  const itemID = mcdata.itemsByName[itemName]?.id
  if (!itemID) {
    bot.tasks.pop()
    return bot.mcBot.chat(`Item ${itemName} not found.`)
  }

  await collectItem(bot, itemName, quantity)

  await pathfind(bot, player.entity.position, 2.5, 300)

  await bot.mcBot.toss(itemID, null, quantity)

  bot.tasks.pop()
}
