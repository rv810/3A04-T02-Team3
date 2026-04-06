import time
from sensor_base import RaiseSensorValues, SensorConfig, generate_reading

#oxygen doesn't change that much
SENSORS = [
    SensorConfig(
        sensor_type="ox", zone="downtown",
        baseline=20.8, daytime_change=0.05, seasonal_change=0.08,
        noise_std=0.021, unit="% vol", val_min=17.0, val_max=21.5,
        high_reading=RaiseSensorValues(enabled=True, prob=0.010, magnitude= -25.0, max_cycles=8),
    ),
    SensorConfig(
        sensor_type="ox", zone="industrial",
        baseline=20.8, daytime_change=0.04, seasonal_change=0.06,
        noise_std=0.044, unit="% vol", val_min=17.0, val_max=21.5,
        high_reading=RaiseSensorValues(enabled=True, prob=0.010, magnitude= -30.0, max_cycles=8),
    ),
    # park O2 has a slight positive daytime bump from photosynthesis during daylight
    SensorConfig(
        sensor_type="ox", zone="park",
        baseline=20.8, daytime_change=0.06, seasonal_change=0.10,
        noise_std=0.016, unit="% vol", val_min=17.0, val_max=21.5,
        high_reading=RaiseSensorValues(enabled=True, prob=0.010, magnitude= -10.0, max_cycles=8),
    ),
    SensorConfig(
        sensor_type="ox", zone="waterfront",
        baseline=20.8, daytime_change=0.04, seasonal_change=0.07,
        noise_std=0.018, unit="% vol", val_min=17.0, val_max=21.5,
        high_reading=RaiseSensorValues(enabled=True, prob=0.010, magnitude= -15.0, max_cycles=8),
    ),
    SensorConfig(
        sensor_type="ox", zone="residential",
        baseline=20.8, daytime_change=0.05, seasonal_change=0.08,
        noise_std=0.022, unit="% vol", val_min=17.0, val_max=21.5,
        high_reading=RaiseSensorValues(enabled=True, prob=0.010, magnitude= -15.0, max_cycles=8),
    ),
]


def run(interval=1.0):
    print(f"oxygen sim starting, {len(SENSORS)} sensors, interval= {interval}s")

    try:
        while True:
            for s in SENSORS:
                try:
                    generate_reading(s)
                except Exception as e:
                    print("generate_reading failed for %s: %s", s.sensor_id, e)
            time.sleep(interval)
    except KeyboardInterrupt:
        print("\noxygen sim stopped")


if __name__ == "__main__":
    run()
