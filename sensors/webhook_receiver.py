from fastapi import FastAPI, Request
from datetime import datetime
import uvicorn

app = FastAPI(title="Webhook Receiver (demo)")

@app.post("/alert-webhook")
async def receive_webhook(request: Request):
    payload = await request.json()
    print(f"\n{'='*60}")
    print(f"  ALERT RECEIVED — {datetime.now().strftime('%H:%M:%S')}")
    print(f"{'='*60}")
    for key, value in payload.items():
        print(f"  {key}: {value}")
    print(f"{'='*60}\n")
    return {"status": "received"}

if __name__ == "__main__":
    print("Listening on port 9000...")
    uvicorn.run(app, host="0.0.0.0", port=9000)