import time
from sensor_base import RaiseSensorValues, SensorConfig, generate_reading

# humidity is higher at night
SENSORS = [
    SensorConfig(
        sensor_type="humidity", zone="downtown",
        baseline=55.0, daytime_change=8.0, seasonal_change=15.0,
        noise_std=1.23, unit="%RH", val_min=5.0, val_max=100.0,
        high_reading=RaiseSensorValues(enabled=True, prob=0.008, magnitude= 3.0, max_cycles=8),
    ),
    SensorConfig(
        sensor_type="humidity", zone="industrial",
        baseline=55.0, daytime_change=7.0, seasonal_change=14.0,
        noise_std=1.91, unit="%RH", val_min=5.0, val_max=100.0,
        high_reading=RaiseSensorValues(enabled=True, prob=0.008, magnitude= 3.0, max_cycles=8),
    ),
    SensorConfig(
        sensor_type="humidity", zone="park",
        baseline=55.0, daytime_change=10.0, seasonal_change=18.0,
        noise_std=1.04, unit="%RH", val_min=5.0, val_max=100.0,
        high_reading=RaiseSensorValues(enabled=True, prob=0.008, magnitude= 3.0, max_cycles=8),
    ),
    SensorConfig(
        sensor_type="humidity", zone="waterfront",
        baseline=55.0, daytime_change=9.0, seasonal_change=16.0,
        noise_std=1.55, unit="%RH", val_min=5.0, val_max=100.0,
        high_reading=RaiseSensorValues(enabled=True, prob=0.008, magnitude= 3.0, max_cycles=8),
    ),
    SensorConfig(
        sensor_type="humidity", zone="residential",
        baseline=55.0, daytime_change=8.0, seasonal_change=15.0,
        noise_std=1.12, unit="%RH", val_min=5.0, val_max=100.0,
        high_reading=RaiseSensorValues(enabled=True, prob=0.008, magnitude= 3.0, max_cycles=8),
    ),
]


def run(interval=1.0):
    print(f"humidity sim starting, {len(SENSORS)} sensors, interval= {interval}s")

    try:
        while True:
            for s in SENSORS:
                try:
                    generate_reading(s)
                except Exception as e:
                    print("generate_reading failed for %s: %s", s.sensor_id, e)
            time.sleep(interval)
    except KeyboardInterrupt:
        print("\nhumidity sim stopped")


if __name__ == "__main__":
    run()
