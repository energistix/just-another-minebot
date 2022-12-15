import MCDATA from "minecraft-data"
const mcdata = MCDATA("1.16.4")

const blockLoot = mcdata.blockLoot
const entityLoot = mcdata.entityLoot

export function blocks(item) {
  let results = []

  for (const blockName of Object.keys(blockLoot)) {
    let found = blockLoot[blockName].drops.find((dropped) => {
      return dropped.item == item
    })
    if (found) {
      results.push(blockName)
    }
  }
  return results
}

export function mobs(item) {
  let results = []

  for (const entityName of Object.keys(entityLoot)) {
    let found = entityLoot[entityName].drops.find((dropped) => {
      return dropped.item == item
    })
    if (found) {
      results.push(entityName)
    }
  }
  return results
}

export function recipes(bot, itemName, useTable = true) {
  let item = mcdata.itemsByName[itemName]
  if (item) {
    if (useTable) {
      let craftingTable = bot.findBlock({
        matching: mcdata.blocksByName.crafting_table.id
      })

      let repices = bot.recipesAll(item.id, null, craftingTable)
      return repices
    } else {
      let repices = bot.recipesAll(item.id, null)
      return repices
    }
  } else {
    return []
  }
}
