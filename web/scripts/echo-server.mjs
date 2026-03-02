import { WebSocketServer } from "ws"

const port = process.env.OPENCLAW_ECHO_PORT || 4210
const server = new WebSocketServer({ host: "0.0.0.0", port })

server.on("connection", (socket) => {
  socket.on("message", (data) => {
    socket.send(data.toString())
  })
})

console.log(`OpenClaw echo server listening on 0.0.0.0:${port}`)
