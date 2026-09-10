from fastapi import WebSocket
from typing import Dict, Set
import asyncio

class ConnectionManager:
    def __init__(self):
        # Maps user_id (int) -> Set of active WebSocket connections
        self.active_connections: Dict[int, Set[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            if user_id not in self.active_connections:
                self.active_connections[user_id] = set()
            self.active_connections[user_id].add(websocket)

    async def disconnect(self, user_id: int, websocket: WebSocket):
        async with self._lock:
            if user_id in self.active_connections:
                self.active_connections[user_id].discard(websocket)
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: int):
        async with self._lock:
            connections = list(self.active_connections.get(user_id, set()))
            
        for connection in connections:
            try:
                await connection.send_json(message)
            except Exception:
                async with self._lock:
                    if user_id in self.active_connections:
                        self.active_connections[user_id].discard(connection)
                        if not self.active_connections[user_id]:
                            del self.active_connections[user_id]

    async def broadcast(self, message: dict):
        async with self._lock:
            all_conns = [(uid, conn) for uid, conns in self.active_connections.items() for conn in conns]
            
        tasks = [self._send_safe(uid, conn, message) for uid, conn in all_conns]
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    async def _send_safe(self, user_id: int, connection: WebSocket, message: dict):
        try:
            await connection.send_json(message)
        except Exception:
            async with self._lock:
                if user_id in self.active_connections:
                    self.active_connections[user_id].discard(connection)
                    if not self.active_connections[user_id]:
                        del self.active_connections[user_id]

manager = ConnectionManager()
