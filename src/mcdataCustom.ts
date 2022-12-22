import _mcdata from "minecraft-data"

interface lootItem {
  item: string
  dropChance: number
  stackSizeRange: [number, number | null]
}

type blockState =
  | {
      name: string
      type: "enum"
      num_values: number
      values: string[]
    }
  | {
      name: string
      type: "bool" | "int"
      num_values: number
    }

export type McData = {
  blockLoot: {
    [key: string]: {
      block: string
      drops: lootItem[]
    }
  }
  entityLoot: {
    [key: string]: {
      entity: string
      drops: lootItem[]
    }
  }
  itemsByName: {
    [key: string]: {
      id: number
      displayName: string
      name: string
      stackSize: number
    }
  }
  blocksByName: {
    [key: string]: {
      id: number
      displayName: string
      name: string
      hardness: number
      minStateId: number
      maxStateId: number
      states: Array<blockState>
      drops: Array<number>
      diggable: boolean
      transparent: boolean
      filterLight: number
      emitLight: number
      boundingBox: "block" | "empty"
      stackSize: number
      material: "dirt" | "plant" | undefined | "wood" | "rock" | "UNKNOWN_MATERIAL"
      harvestTools: {
        [key: string]: boolean
      }
    }
  }
}
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const mcdata: McData = _mcdata("1.16.5")
export default mcdata
