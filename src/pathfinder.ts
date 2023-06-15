/*
    This is a work in progress and isn't very reliable.
    I'm putting it in here for testing.
*/

import { Vec3 } from "vec3"
import { createBot } from "mineflayer"

type Bot = ReturnType<typeof createBot>

function neighbours(bot: Bot, p: Vec3) {
  const points = [
    p.offset(0, 0, -1),
    p.offset(0, 0, 1),
    p.offset(-1, 0, 0),
    p.offset(1, 0, 0)
  ]

  for (const i in points) {
    if (!clean(bot, points[i])) {
      points[i] = points[i].offset(0, 1, 0)
    } else if (clean(bot, points[i], 0, -1, 0)) {
      points[i] = points[i].offset(0, -1, 0)
    }
  }

  return points.filter((n) => {
    const block = bot.blockAt(n.offset(0, -1, 0))
    const height = block && block.shapes.length ? block.shapes[0][4] : 1

    return (
      height <= 1 &&
      !clean(bot, n, 0, -1, 0) &&
      clean(bot, n, 0, 0, 0) &&
      clean(bot, n, 0, 1, 0)
    )
  })
}

function clean(bot: Bot, n: Vec3, x = 0, y = 0, z = 0) {
  const b = bot.blockAt(n.offset(x, y, z))
  return b && (b.displayName.includes("Air") || b.material == "plant")
}

function gridWalk(bot: Bot, goal: Vec3) {
  const botPos = bot.entity.position

  goal = goal.offset(
    -bot.entity.position.x,
    -bot.entity.position.y,
    -bot.entity.position.z
  )

  if (goal && botPos.distanceTo(botPos.offset(goal.x, goal.y, goal.z)) >= 0.1) {
    bot.lookAt(botPos.offset(goal.x, 1.8, goal.z), true)
    bot.setControlState("forward", true)
    bot.setControlState("sprint", true)
    bot.setControlState("jump", goal.y > 0)
  } else {
    bot.setControlState("forward", false)
    bot.setControlState("sprint", false)
    bot.setControlState("jump", false)
  }
}

export interface Point {
  position: Vec3
  g: number
  h: number
  f: number
  root?: Point
}

function pathfind(bot: Bot, start: Vec3, end: Vec3, range = 1, maxLoops = 100) {
  const openList: Point[] = []
  const closedList = []
  const initDist = start.distanceTo(end)
  let loops = 0

  start = new Vec3(
    Math.floor(start.x) + 0.5,
    Math.floor(start.y),
    Math.floor(start.z) + 0.5
  )

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

export default {
  path: pathfind,
  walk: gridWalk
}
