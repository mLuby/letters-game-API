const express = require("express")
const bodyParser = require("body-parser")
const server = express()
const PORT = process.env.PORT || 3000
// Game : { "dict": {String: Boolean}, "board": [String], "moves": [[Number]] }
const games = []

// Routes & Middleware

server.use(bodyParser.json())

/**
 * @api {post} /game createGame
 * @apiGroup Game
 * @apiParam {Object} boardWrapper Wraps the board tiles
 * @apiParam {String[]} obj.board List of length 1 strings
 * @apiSuccess (Success) {Number} gameId Game ID
 * @apiError (Error) {String} message Description of the error
 * @apiExample {curl} Example Usage
 *     curl -X POST http://localhost:3000/games -H 'Content-Type: application/json' \
 *          -d '{"board":["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P"]}'
 * @apiExample 201 Created
 *     { "gameId": 2 }
 * @apiExample 400 Bad Request
 *     "Invalid board"
 */
server.post("/games", createGame)

/**
 * @api {put} /game/:gameId/dict setGameDict
 * @apiGroup Game
 * @apiParam {Object} dictWrapper Wraps the dictionary words
 * @apiParam {String[]} obj.words List of strings
 * @apiError (Error) {String} message Description of the error
 * @apiExample {curl} Example Usage
 *     curl -X PUT http://localhost:3000/games/0/dict -H 'Content-Type: application/json' \
 *          -d '{"words":["Anvil","Bar","Cool","Dog"]}'
 * @apiExample 204 No Content
 *     <no content>
 * @apiExample 404 Not Found
 *     "Game was not found"
 * @apiExample 400 Bad Request
 *     "Invalid dictionary"
 */
server.put("/games/:gameId/dict", setGameDict)

/**
 * @api {post} /game/:gameId/moves makeMove
 * @apiGroup Game
 * @apiParam {Number[]} tiles List of tiles counting from upper right 1-indexed
 * @apiError (Error) {String} message Description of the error
 * @apiExample {curl} Example Usage
 *     curl -X POST http://localhost:3000/games/0/moves -H 'Content-Type: application/json' \
 *          -d '[1,5,6,7]'
 * @apiExample 204 No Content
 *     <no content>
 * @apiExample 404 Not Found
 *     "Game was not found"
 * @apiExample 400 Bad Request
 *     "Invalid dictionary"
 */
server.post("/games/:gameId/moves", makeMove)

// Controllers

function createGame (req, res) {
  const boardWrapper = req.body
  if (!boardIsValid(boardWrapper)) return res.status(400).send("Invalid board")
  const gameId = games.length // 0-indexed
  games.push({
    dict: null,
    board: boardWrapper.board.map(char => char.toUpperCase()),
    moves: []
  })
  console.log("Created game #"+gameId)
  return res.status(201).json({gameId})
}

function setGameDict (req, res) {
  const {gameId} = req.params
  const game = games[gameId]
  const dictWrapper = req.body
  if (!game) return res.status(404).send("Game was not found")
  if (!dictIsValid(dictWrapper)) return res.status(400).send("Invalid dictionary")
  game.dict = dictWrapper.words.reduce((dict, word) => Object.assign(dict, {[word.toUpperCase()]: true}), {})
  console.log("Set dictionary for game #"+gameId)
  return res.sendStatus(204)
}

function makeMove (req, res) {
  const {gameId} = req.params
  const game = games[gameId]
  const tiles = req.body
  if (!game) return res.status(404).send("Game was not found")
  if (!game.dict) return res.status(403).send("Game is missing dictionary")
  if (!Array.isArray(tiles) || !tiles.every(tileIsValid)) return res.status(400).send("Move must be list of 3+ tiles")
  if (!moveIsAllowed(tiles, game)) return res.status(403).send("Move is not allowed on board")
  if (moveExists(tiles, game)) return res.status(403).send("Move already played")
  const moveId = game.moves.length // 0-indexed
  const points = Math.pow(2, tiles.length - 3) // 3,4,5,6 -> 1,2,4,8
  game.moves.push(tiles)
  console.log(`Made move #${moveId} "${tilesToWord(tiles, game)}" for ${points} points in game #${gameId}`)
  return res.status(201).json({moveId, points})
}

// Helpers

// boardIsValid : boardWrapper -> Boolean
function boardIsValid (board) {
  return board.board
    && Array.isArray(board.board)
    && board.board.length === 16
    && board.board.every(char => typeof char === "string" && char.length === 1)
}

// dictIsValid : dictWrapper -> Boolean
function dictIsValid (dict) {
  return dict.words
    && Array.isArray(dict.words)
    && dict.words.every(word => typeof word === "string")
}

// tileIsValid : Number -> Boolean
function tileIsValid (tile) {
  return !isNaN(tile) // is number
    && tile % 1 === 0 // is integer
    && tile >= 1 && tile <= 16 // is 1 to 16
}

// tilesToWord : [Number] -> Game -> String
function tilesToWord (tiles, game) {
  return tiles.map(tile => game.board[tile - 1]).join("").toUpperCase()
}

// moveIsAllowed : [Number] -> Game -> Boolean
function moveIsAllowed (tiles, game) {
  // The formed word is at least 3 letters.
  return tiles.length >= 3
    // Consecutive tiles are neighbors (including diagonals).
    && tiles.every(isConsecutiveNeighbor)
    // Tiles can only be used once in each move, but they can be used again in future moves.
    && tiles.length === (new Set(tiles)).size // Set dedups to detect repeat letters
    // The formed word is present in the app'"'s dictionary.
    && game.dict[tilesToWord(tiles, game)]
}

// isConsecutiveNeighbor : Number -> Number -> [Number] -> Boolean
function isConsecutiveNeighbor (tile, index, tiles) {
  if (index === 0) return true
  const lastTile = tiles[index - 1]
  return tile - 4 === lastTile // last tile N of tile
      || tile + 4 === lastTile // last tile S of tile
      || tile - 1 === lastTile // last tile W of tile
      || tile + 1 === lastTile // last tile E of tile
      || tile - 3 === lastTile // last tile NE of tile
      || tile + 3 === lastTile // last tile SW of tile
      || tile - 5 === lastTile // last tile NW of tile
      || tile + 5 === lastTile // last tile SE of tile
      // for reference:
      // [[ 1, 2, 3, 4],
      //  [ 5, 6, 7, 8],
      //  [ 9,10,11,12],
      //  [13,14,15,16]]
}

// moveExists : [Number] -> Game -> Boolean
function moveExists (tiles, game) {
  return game.moves.map(move => tilesToWord(move, game)).includes(tilesToWord(tiles, game))
}

// Side Effects (export or listen on port)

if (require.main === module) { // this file is being called directly
  server.listen(PORT, () => console.log("Listening on :"+PORT))
} else { // another file is "require"ing this file
  module.exports = {server} // for testing
}
