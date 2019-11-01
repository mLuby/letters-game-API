const test = require("tape")
const request = require("supertest")
const {server} = require("./server.js")
const gameId = 0 // will exist after 1st valid game CREATE.

test("malformed board", t => {
  const malformedBoard = null
  request(server).post("/games").send(malformedBoard)
    .expect(400, "Invalid board").end(t.end)
})

test("valid board", t => {
  const validBoard = require("./files/test-board-1.json")
  request(server).post("/games").send(validBoard)
  .expect(201, {gameId: 0}).end(t.end)
})

test("malformed dict", t => {
  const malformedDict = null
  request(server).put(`/games/${gameId}/dict`).send(malformedDict)
    .expect(400, "Invalid dictionary").end(t.end)
})

test("valid dict", t => {
  const validDict = require("./files/dictionary.json")
  request(server).put(`/games/${gameId}/dict`).send(validDict)
    .expect(204).end(t.end)
})

test("malformed move", t => {
  const malformedMove = null
  request(server).post(`/games/${gameId}/moves`).send(malformedMove)
    .expect(400, "Move must be list of 3+ tiles").end(t.end)
})

test("disallowed move", t => {
  const disallowedMove = [12,15,1,4] // "LOAD"
  request(server).post(`/games/${gameId}/moves`).send(disallowedMove)
    .expect(403, "Move is not allowed on board").end(t.end)
})

test("allowed move", t => {
  const allowedMove = [6,1,2] // "FAB"
  request(server).post(`/games/${gameId}/moves`).send(allowedMove)
    .expect(201, {moveId: 0, points: 1}).end(t.end)
})

test("duplicate move", t => {
  const allowedMove = [6,1,2] // "FAB"
  request(server).post(`/games/${gameId}/moves`).send(allowedMove)
    .expect(403, "Move already played").end(t.end)
})
