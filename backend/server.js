const express = require("express");
const app = express();
const cors = require("cors"); 
const server = require("http").createServer(app);
const { Server } = require("socket.io");

const { addUser, getUser, removeUser , getUsersInRoom} = require("./utils/users");

const io = new Server(server);


let roomIdGlobal, imgURLGlobal;
app.use(cors());
app.use(express.json());
app.post("/api/validateRoomId", (req, res) => {
  const { roomId } = req.body;
  console.log("Checking room ID:", roomId);
  // Validate the roomId using the function
  const isValid = getUsersInRoom(roomId);
  const isValidRoom=isValid.length>0;
  res.json({ isValidRoom });
});

io.on("connection", (socket) => {
  socket.on("userJoined", (data) => {
    const { name, userId, roomId, host, presenter } = data;
    roomIdGlobal = roomId;
    socket.join(roomId);
    const users = addUser({
      name,
      userId,
      roomId,
      host,
      presenter,
      socketId: socket.id,
    });
    socket.emit("userIsJoined", { success: true, users });
    socket.broadcast.to(roomId).emit("userJoinedMessageBroadcasted", name);
    socket.broadcast.to(roomId).emit("allUsers", users);
    socket.broadcast.to(roomId).emit("whiteBoardDataResponse", {
      imgURL: imgURLGlobal,
    });
  });

  socket.on("whiteboardData", (data) => {
    imgURLGlobal = data;
    socket.broadcast.to(roomIdGlobal).emit("whiteBoardDataResponse", {
      imgURL: data,
    });
  });

  socket.on("message", (data) => {
    const { message } = data;
    const user = getUser(socket.id);
    if (user) {
      socket.broadcast
        .to(roomIdGlobal)
        .emit("messageResponse", { message, name: user.name });
    }
  });

  socket.on("disconnect", () => {
    const user = getUser(socket.id);
    if (user) {
      removeUser(socket.id);
      socket.broadcast
        .to(roomIdGlobal)
        .emit("userLeftMessageBroadcasted", user.name);
    }
  });
});

const port = 5000;

server.listen(port, () =>
  console.log("server is running on http://localhost:5000")
);
