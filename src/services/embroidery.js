// src/utils/embroidery.js


/**
 * Interpoliert eine Linie zwischen zwei Punkten mit gleichmäßigen Abständen.
 * @param {{x: number, y: number}} point1 - Der erste Punkt.
 * @param {{x: number, y: number}} point2 - Der zweite Punkt.
 * @param {number} distance - Der Abstand zwischen den interpolierten Punkten.
 * @param {number} total - Die Gesamtlänge der Linie. Wenn nicht angegeben, wird sie automatisch berechnet.
 * @returns {{x: number, y: number}[]} Ein Array von Punkten entlang der interpolierten Linie.
 */
export function lineInterpolate(point1, point2, distance, total) {
  const xabs = Math.abs(point1.x - point2.x)
  const yabs = Math.abs(point1.y - point2.y)
  const xdiff = point2.x - point1.x
  const ydiff = point2.y - point1.y

  let length = total
  if (!total) length = Math.sqrt(xabs ** 2 + yabs ** 2)

  // If the line is shorter than the minimum distance, return just the endpoints
  if (length <= distance) {
    return [point1, point2]
  }

  const steps = Math.ceil(length / distance)
  const xstep = xdiff / steps
  const ystep = ydiff / steps

  const result = []

  // Always include the starting point
  result.push({ x: point1.x, y: point1.y })

  // Add intermediate points
  for (let s = 1; s < steps; s++) {
    const newx = point1.x + xstep * s
    const newy = point1.y + ystep * s
    result.push({ x: newx, y: newy })
  }

  // Always include the ending point
  result.push({ x: point2.x, y: point2.y })

  return result
}
