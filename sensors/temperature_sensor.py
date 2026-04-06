import time
from sensor_base import SensorConfig, generate_reading

# values based on Canadian weather
SENSORS = [
    SensorConfig(
        sensor_type="temp", zone="downtown",
        baseline=15.0, daytime_change=5.0, seasonal_change=18.0,
        noise_std=0.42, unit="°C", val_min=-30.0, val_max=55.0,
    ),
    SensorConfig(
        sensor_type="temp", zone="industrial",
        baseline=15.0, daytime_change=4.5, seasonal_change=18.0,
        noise_std=0.67, unit="°C", val_min=-30.0, val_max=55.0,
    ),
    SensorConfig(
        sensor_type="temp", zone="park",
        baseline=15.0, daytime_change=5.6, seasonal_change=18.0,
        noise_std=0.29, unit="°C", val_min=-30.0, val_max=55.0,
    ),
    # waterfront temps swing less due to water
    SensorConfig(
        sensor_type="temp", zone="waterfront",
        baseline=15.0, daytime_change=3.4, seasonal_change=14.8,
        noise_std=0.31, unit="°C", val_min=-30.0, val_max=55.0,
    ),
    SensorConfig(
        sensor_type="temp", zone="residential",
        baseline=15.0, daytime_change=5.0, seasonal_change=18.0,
        noise_std=0.36, unit="°C", val_min=-30.0, val_max=55.0,
    ),
]

def run(interval=10.0):
    print(f"temperature sim starting, {len(SENSORS)} sensors, interval= {interval}s")

    try:
        while True:
            for s in SENSORS:
                try:
                    generate_reading(s)
                except Exception as e:
                    print("generate reading failed for %s: %s", s.sensor_id, e)
            time.sleep(interval)
    except KeyboardInterrupt:
        print("\ntemperature sim stopped")


if __name__ == "__main__":
    run()