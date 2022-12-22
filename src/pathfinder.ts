import vec3 from "vec3"
import { Bot } from "./Bot.js"

function neighbours(bot: Bot, p: vec3.Vec3) {
  const points = [p.offset(0, 0, -1), p.offset(0, 0, 1), p.offset(-1, 0, 0), p.offset(1, 0, 0)]

  for (const i in points) {
    if (!clean(bot, points[i])) {
      points[i] = points[i].offset(0, 1, 0)
    } else if (clean(bot, points[i], 0, -1, 0)) {
      points[i] = points[i].offset(0, -1, 0)
    }
  }

  return points.filter((n) => {
    const block = bot.mcBot.blockAt(n.offset(0, -1, 0))
    const height = block && block.shapes.length ? block.shapes[0][4] : 1

    return height <= 1 && !clean(bot, n, 0, -1, 0) && clean(bot, n, 0, 0, 0) && clean(bot, n, 0, 1, 0)
  })
}

function clean(bot: Bot, n: vec3.Vec3, x = 0, y = 0, z = 0) {
  const b = bot.mcBot.blockAt(n.offset(x, y, z))
  return b && (b.displayName.includes("Air") || b.material == "plant")
}

function gridWalk(bot: Bot, goal: vec3.Vec3) {
  const botPos = bot.mcBot.entity.position

  goal = goal.offset(-bot.mcBot.entity.position.x, -bot.mcBot.entity.position.y, -bot.mcBot.entity.position.z)

  if (goal && botPos.distanceTo(botPos.offset(goal.x, goal.y, goal.z)) >= 0.1) {
    bot.mcBot.lookAt(botPos.offset(goal.x, 1.8, goal.z), true)
    bot.mcBot.setControlState("forward", true)
    bot.mcBot.setControlState("sprint", true)
    bot.mcBot.setControlState("jump", goal.y > 0)
  } else {
    bot.mcBot.setControlState("forward", false)
    bot.mcBot.setControlState("sprint", false)
    bot.mcBot.setControlState("jump", false)
  }
}

export interface PathNode {
  position: vec3.Vec3
  g: number
  h: number
  f: number
  root?: PathNode
}

function pathfind(bot: Bot, start: vec3.Vec3, end: vec3.Vec3, range = 1, maxLoops = 100): PathNode[] {
  const openList: PathNode[] = []
  const closedList = []
  const initDist = start.distanceTo(end)
  let loops = 0

  start = new vec3.Vec3(Math.floor(start.x) + 0.5, Math.floor(start.y), Math.floor(start.z) + 0.5)

  openList.push({
    position: start,
    g: 0,
    h: initDist,
    f: 0
  })

  while (openList.length && loops < maxLoops) {
    loops++
    let point = openList.reduce((p, c) => {
      return p.f < c.f ? p : c
    })

    openList.splice(openList.indexOf(point), 1)
    closedList.push(point)

    if (point.position.distanceTo(end) < range) {
      const path = []
      while (point.root) {
        path.push(point)
        point = point.root
      }
      return path
    }

    for (const neighbour of neighbours(bot, point.position)) {
      const onClosedList = closedList.find((obj) => {
        return obj.position.distanceTo(neighbour) < 0.1
      })

      if (!onClosedList) {
        const g = point.g + 1
        const h = neighbour.distanceTo(end)
        const f = g + h

        const babyPoint = {
          position: neighbour,
          g: g,
          h: h,
          f: f,
          root: point
        }

        const previous = openList.find((obj) => {
          return obj.position.distanceTo(neighbour) < 0.1
        })

        if (previous) {
          if (g < previous.g) {
            openList.splice(openList.indexOf(previous), 1)
            openList.push(babyPoint)
          }
        } else {
          openList.push(babyPoint)
        }
      }
    }
  }
  if (openList.length) {
    let point = openList.reduce((p, c) => {
      return p.f < c.f ? p : c
    })
    const path = []
    while (point.root) {
      path.push(point)
      point = point.root
    }
    return path
  }

  return []
}

export { pathfind as path, gridWalk as walk }
