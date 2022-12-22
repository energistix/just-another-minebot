import { Bot } from "./Bot.js"
import mcdata from "./mcdataCustom.js"

const { blockLoot, entityLoot } = mcdata

export function blocks(item: string) {
  const results = []

  for (const blockName of Object.keys(blockLoot)) {
    const found = blockLoot[blockName].drops.find((dropped) => {
      return dropped.item == item
    })
    if (found) {
      results.push(blockName)
    }
  }
  return results
}

export function mobs(item: string) {
  const results = []

  for (const entityName of Object.keys(entityLoot)) {
    const found = entityLoot[entityName].drops.find((dropped) => {
      return dropped.item == item
    })
    if (found) {
      results.push(entityName)
    }
  }
  return results
}

interface Recipe {
  delta: {
    id: number
    count: number
  }[]
}

export function recipes(bot: Bot, itemName: string, useTable = true): Recipe[] {
  const item = mcdata.itemsByName[itemName]
  if (item) {
    if (useTable) {
      const craftingTable = bot.mcBot.findBlock({
        matching: mcdata.blocksByName.crafting_table.id
      })

      const repices = bot.mcBot.recipesAll(item.id, null, craftingTable)
      return repices
    } else {
      const repices = bot.mcBot.recipesAll(item.id, null, null)
      return repices
    }
  } else {
    return []
  }
}
