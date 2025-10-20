// Minimal room join events
export const registerRoomEvents = (socket) => {
  // Join customer room with ack
  socket.on("join_customer_room", (userId, ack) => {
    if (!userId) {
      const err = { message: "User ID is required to join customer room" };
      socket.emit("error", err);
      if (typeof ack === 'function') ack({ ok: false, error: err.message });
      return;
    }
    if (!socket.user || socket.user._id.toString() !== userId.toString()) {
      const err = { message: "Unauthorized: Cannot join room for different customer" };
      socket.emit("error", err);
      if (typeof ack === 'function') ack({ ok: false, error: err.message });
      return;
    }
    socket.join(`customer_${userId}`);
    const payload = { room: `customer_${userId}`, message: "Successfully joined customer room" };
    socket.emit("room_joined", payload);
    if (typeof ack === 'function') ack({ ok: true, ...payload });
  });

  // Join driver room with ack
  socket.on("join_driver_room", (driverId, ack) => {
    if (!driverId) {
      const err = { message: "Driver ID is required to join room" };
      socket.emit("error", err);
      if (typeof ack === 'function') ack({ ok: false, error: err.message });
      return;
    }
    if (!socket.user || socket.user._id.toString() !== driverId.toString()) {
      const err = { message: "Unauthorized: Cannot join room for different driver" };
      socket.emit("error", err);
      if (typeof ack === 'function') ack({ ok: false, error: err.message });
      return;
    }
    if (socket.user.role !== "driver") {
      const err = { message: "Unauthorized: Only drivers can join driver rooms" };
      socket.emit("error", err);
      if (typeof ack === 'function') ack({ ok: false, error: err.message });
      return;
    }
    socket.join(`driver_${driverId}`);
    const payload = { room: `driver_${driverId}`, message: "Successfully joined driver room" };
    socket.emit("room_joined", payload);
    if (typeof ack === 'function') ack({ ok: true, ...payload });
  });
};


