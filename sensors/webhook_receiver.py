"""
Standalone webhook receiver for demos.

Run:  uvicorn webhook_receiver:app --port 9000
Expose via ngrok:  ngrok http 9000
"""
from fastapi import FastAPI, Request
from datetime import datetime

app = FastAPI(title="Webhook Receiver (demo)")


@app.post("/webhook")
async def receive_webhook(request: Request):
    payload = await request.json()
    print(f"\n[{datetime.now().isoformat()}] Webhook received:")
    for key, value in payload.items():
        print(f"  {key}: {value}")
    return {"status": "received"}
