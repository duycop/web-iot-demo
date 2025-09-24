from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import asyncio
import threading
import paho.mqtt.client as mqtt
import httpx
import json
import os
import time

from fastapi.responses import JSONResponse
from fastapi.requests import Request
from fastapi.exception_handlers import http_exception_handler
from fastapi.exceptions import RequestValidationError, HTTPException

app = FastAPI()

# ==== CẤU HÌNH MQTT & URL ====
MQTT_HOST = "127.0.0.1"
MQTT_PORT = 1883
MQTT_USERNAME = "admin"
MQTT_PASSWORD = "***********"
MQTT_CLIENT_ID = "fastAPI_client"
SENSOR_API_BASE = "http://127.0.0.1:1880/myapp-"	#cầu nối sang nodered
MQTT_TOPIC_CHANGE_SUB = "app/change"
MQTT_TOPIC_ONLINE_PUB = "app/online"

# ==== DANH SÁCH CLIENT ====
connected_clients = set()
clients_lock = asyncio.Lock()
main_loop = None  # Sẽ gán khi startup

async def get_api(api_url):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(api_url, timeout=5)
            response.raise_for_status()
            return response.json()
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Request failed: {e}")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=response.status_code, detail=f"HTTP error: {e}")

@app.get("/{path:path}")
async def catch_all_get(path: str):
    if SENSOR_API_BASE is None:
        raise HTTPException(status_code=500, detail="SENSOR_API_BASE is not set")
    return await get_api(SENSOR_API_BASE.rstrip("/") + path)

@app.post("/{path:path}")
async def catch_all_post(path: str, request: Request):
    body_bytes = await request.body()
    api_url = SENSOR_API_BASE.rstrip("/") + path

    if body_bytes:
        qs = body_bytes.decode("utf-8")
        api_url += "?" + qs

    print(f"api_url={api_url}")
    return await get_api(api_url)


async def broadcast_message(message: str):
    async with clients_lock:
        to_remove = set()
        for ws in connected_clients:
            try:
                await ws.send_text(message)
            except WebSocketDisconnect:
                to_remove.add(ws)
        connected_clients.difference_update(to_remove)

async def broadcast_online_count():
    online_count = json.dumps({"online": len(connected_clients)})
    async with clients_lock:
        for client in connected_clients:
            try:
                await client.send_text(online_count)
            except:
                pass
    # Gửi MQTT topic doosung/online
    if mqttc.is_connected():
        mqttc.publish(MQTT_TOPIC_ONLINE_PUB, str(online_count))

def on_message(client, userdata, msg):
    message = msg.payload.decode()
    print("MQTT:", message)
    asyncio.run_coroutine_threadsafe(broadcast_message(message), main_loop)

def on_disconnect(client, userdata, rc):
    print(f"⚠️ MQTT disconnected (rc={rc})")
    # rc != 0 nghĩa là mất kết nối bất thường
    if rc != 0:
        print("🔁 Reconnecting in 3s...")
        time.sleep(3)
        while True:
            try:
                client.reconnect()
                mqttc.subscribe(MQTT_TOPIC_CHANGE_SUB)
                print("🤝 Subscribe", MQTT_TOPIC_CHANGE_SUB)
                break
            except Exception as e:
                print("❌ Reconnect failed:", e)
                print("🔁 Reconnecting in 3s...")
                time.sleep(3)
    print("Reconnect OK")

def mqtt_thread(loop):
    global mqttc
    # Không cần asyncio.set_event_loop(loop) vì ta không dùng asyncio trong thread này
    mqttc = mqtt.Client(client_id=MQTT_CLIENT_ID)
    mqttc.username_pw_set(username=MQTT_USERNAME, password=MQTT_PASSWORD)
    mqttc.on_message = on_message
    mqttc.on_disconnect = on_disconnect  # THÊM dòng này
    while True:
        try:
            mqttc.connect(MQTT_HOST, MQTT_PORT, 60)
            mqttc.subscribe(MQTT_TOPIC_CHANGE_SUB)
            print("✅ MQTT connected.")
            print("🤝 Subscribe", MQTT_TOPIC_CHANGE_SUB)
            break
        except Exception as e:
            print(f"❌ MQTT connect failed, retrying in 3s... ({e})")
            time.sleep(3)
    mqttc.loop_start()

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    print(f"hello ws")
    await ws.accept()
    client_ip = ws.headers.get("x-real-ip") or ws.headers.get("x-forwarded-for")
    print(f"✅ New WebSocket connection from {client_ip}")
    async with clients_lock:
        connected_clients.add(ws)
    await ws.send_text("Xin chào từ FastAPI 👋")
    await broadcast_online_count()
    try:
        while True:
            data = await ws.receive_text()
            print(f"From client: {data}")
    except WebSocketDisconnect:
        async with clients_lock:
            print(f"❌ Disconnection from {client_ip}")
            connected_clients.discard(ws)
        await broadcast_online_count()

@app.on_event("startup")
async def startup_event():
    global main_loop
    main_loop = asyncio.get_running_loop()
    threading.Thread(target=mqtt_thread, args=(main_loop,), daemon=True).start()
