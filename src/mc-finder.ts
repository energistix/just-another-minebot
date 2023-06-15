import _mcdata from "minecraft-data"
import { Bot } from "mineflayer"
const mcdata = _mcdata("1.16.4")

const { blockLootByName: blockLoot, entityLootByName: entityLoot } = mcdata

const blocks = (item: string) => {
  const results = []

  for (const blockName of Object.keys(blockLoot)) {
    const found = blockLoot[blockName][0].drops.find((dropped) => {
      return dropped.item == item
    })
    if (found) {
      results.push(blockName)
    }
  }
  return results
}

const mobs = (item: string) => {
  const results = []

  for (const entityName of Object.keys(entityLoot)) {
    const found = entityLoot[entityName][0].drops.find((dropped) => {
      return dropped.item == item
    })
    if (found) {
      results.push(entityName)
    }
  }
  return results
}

const recipes = (bot: Bot, itemName: string, useTable = true) => {
  const item = mcdata.itemsByName[itemName]
  if (item) {
    if (useTable) {
      const craftingTable = bot.findBlock({
        matching: mcdata.blocksByName.crafting_table.id
      })

      return bot.recipesAll(item.id, null, craftingTable)
    } else {
      return bot.recipesAll(item.id, null, null)
    }
  } else {
    return []
  }
}

export default {
  blocks,
  mobs,
  recipes
}
