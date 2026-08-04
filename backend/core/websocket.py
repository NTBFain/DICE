from fastapi import WebSocket
from typing import Dict, Set
import asyncio

class ConnectionManager:
    def __init__(self):
        # Maps user_id (int) -> Set of active WebSocket connections
        self.active_connections: Dict[int, Set[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket):
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            connections = list(self.active_connections[user_id])
            for connection in connections:
                try:
                    await connection.send_json(message)
                except Exception:
                    # Clean up broken connection
                    self.active_connections[user_id].discard(connection)

    async def broadcast(self, message: dict):
        tasks = []
        for user_id, connections in list(self.active_connections.items()):
            for connection in list(connections):
                tasks.append(self._send_safe(user_id, connection, message))
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    async def _send_safe(self, user_id: int, connection: WebSocket, message: dict):
        try:
            await connection.send_json(message)
        except Exception:
            if user_id in self.active_connections:
                self.active_connections[user_id].discard(connection)
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]

manager = ConnectionManager()
