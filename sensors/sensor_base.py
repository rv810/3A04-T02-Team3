import os
import json
import random
import uuid
import ssl
from datetime import datetime, timezone
from dataclasses import dataclass, field
import paho.mqtt.client as mqtt
from dotenv import load_dotenv

# 🌟 LOAD ENVIRONMENT VARIABLES 🌟
load_dotenv()

# --- AWS IoT Core MQTT SETUP ---
# Fetching configurations from .env file
AWS_ENDPOINT = os.getenv("AWS_ENDPOINT")
PORT = int(os.getenv("AWS_PORT", 8883)) # Defaults to secure MQTT port 8883
CLIENT_ID = f"scemas_sim_{random.randint(0, 1000)}"

# Paths to the certificates downloaded from AWS IoT Core
CA_CERTS = os.getenv("AWS_CA_CERT")
CERTFILE = os.getenv("AWS_CLIENT_CERT")
KEYFILE = os.getenv("AWS_PRIVATE_KEY")

# Safety Check: Prevent the script from running if the .env file is missing
if not all([AWS_ENDPOINT, CA_CERTS, CERTFILE, KEYFILE]):
    raise ValueError("❌ ERROR: Missing AWS credentials! Check your .env file.")

mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, CLIENT_ID, protocol=mqtt.MQTTv311)

# --- ADD THESE NEW CALLBACK FUNCTIONS ---
def on_connect(client, userdata, flags, reason_code, properties):
    if reason_code == 0:
        print("\n>>> ✅ OFFICIALLY CONNECTED! AWS accepted the handshake! <<<")
    else:
        print(f"\n>>> ❌ CONNECTION REJECTED! AWS Reason Code: {reason_code} <<<")

def on_disconnect(client, userdata, disconnect_flags, reason_code, properties):
    print(f"\n>>> ⚠️ DISCONNECTED! AWS hung up. Reason: {reason_code} <<<")

# Attach the callbacks to your client
mqtt_client.on_connect = on_connect
mqtt_client.on_disconnect = on_disconnect
# ----------------------------------------

# Configure TLS/SSL for secure connection to AWS
try:
    mqtt_client.tls_set(ca_certs=CA_CERTS,
                        certfile=CERTFILE,
                        keyfile=KEYFILE,
                        cert_reqs=ssl.CERT_REQUIRED,
                        tls_version=ssl.PROTOCOL_TLSv1_2,
                        ciphers=None)
    
    mqtt_client.connect(AWS_ENDPOINT, PORT, 60)
    mqtt_client.loop_start() 
except Exception as e:
    print(f"Failed to even attempt connection: {e}")

CITY_ZONES = {
    "downtown": {
        "temp_offset": +2.5,
        "humidity_offset": -5.0,
        "ox_offset": -0.10,
    },
    "industrial": {
        "temp_offset": +4.0,
        "humidity_offset": -3.0,
        "ox_offset": -0.25,
    },
    "residential": {
        "temp_offset": +1.0,
        "humidity_offset": +0.0,
        "ox_offset": +0.0,
    },
    "park": {
        "temp_offset": -1.5,
        "humidity_offset": +8.0,
        "ox_offset": +0.15,
    },
    "waterfront": {
        "temp_offset": -0.5,
        "humidity_offset": +12.0,
        "ox_offset": +0.05,
    },
}

def daytime_change(hour):
    if 6 <= hour < 12:
        return (hour - 6) / 6
    elif 12 <= hour < 18:
        return 1 - (hour - 12) / 6 
    return -0.5 

def seasonal_change(day):
    # based on Canadian weather
    if 80 <= day < 172:
        return (day - 80) / 92
    elif 172 <= day < 264:
        return 1 - (day - 172) / 92
    elif 264 <= day < 355:
        return -((day - 264) / 91)
    else:
        return -1.0

@dataclass
class RaiseSensorValues:
    # raises reading above normal to test alert logic
    enabled: bool = True
    prob: float = 0.5 #0.5% chance
    magnitude: float = 2.5
    max_cycles: int = 8

@dataclass
class SensorConfig:
    sensor_type: str
    zone: str
    baseline: float
    daytime_change: float
    seasonal_change: float
    noise_std: float
    unit: str
    val_min: float
    val_max: float
    sensor_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    high_reading: RaiseSensorValues = field(default_factory=RaiseSensorValues)

def generate_reading(config: SensorConfig) -> dict:
    if not hasattr(config, "bursts_remaining"):
        config.bursts_remaining = 0
        config.burst_offset = 0.0

    now = datetime.now(timezone.utc)
    hour = now.hour + now.minute / 60.0
    day = now.timetuple().tm_yday

    value = None
    offset = CITY_ZONES[config.zone][f"{config.sensor_type}_offset"]

    value = (
        config.baseline
        + offset
        + daytime_change(hour) * config.daytime_change
        + seasonal_change(day) * config.seasonal_change
        + random.random() * config.noise_std
    )

    if config.high_reading.enabled and config.bursts_remaining == 0:
        if random.random() < config.high_reading.prob:
            config.bursts_remaining = config.high_reading.max_cycles
            config.burst_offset = config.high_reading.magnitude * config.daytime_change
            print(f"high reading event started on {config.sensor_id} ({config.zone})")
 
    if config.bursts_remaining > 0:
        value += config.burst_offset
        config.bursts_remaining -= 1
        if config.bursts_remaining == 0:
            print(f"high reading event ended on {config.sensor_id} ({config.zone})")

    value = round(max(config.val_min, min(config.val_max, value)), 3)

    payload = {
        "sensor_id": config.sensor_id,
        "sensor_type": config.sensor_type,
        "zone": config.zone,
        "value": value,
        "unit": config.unit,
        "timestamp": now.isoformat(),
    }

    # Generate the JSON string
    payload_json = json.dumps(payload, ensure_ascii=False)
    
    # Define the MQTT topic (e.g., scemas/telemetry/downtown/temp)
    topic = f"scemas/telemetry/{config.zone}/{config.sensor_type}"
    
    # Publish to AWS IoT Core
    mqtt_client.publish(topic, payload_json, qos=1) # qos=1 ensures at least once delivery
    
    print(f"Published to {topic}: {value} {config.unit}")
    
    return payload