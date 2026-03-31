# React-native-usb-serial

A professional-grade React Native module providing seamless USB serial communication for **Android devices only**. Built with Kotlin and supporting USB CDC devices, modbus sensors, and high-performance serial data streaming.

> **Important:** This library is **exclusively for Android**. iOS is not supported due to platform limitations. For iOS projects, consider alternative solutions.

[![npm version](https://img.shields.io/npm/v/react-native-usb-serial.svg)](https://www.npmjs.com/package/react-native-usb-serial)
[![license](https://img.shields.io/npm/l/react-native-usb-serial.svg)](LICENSE)
[![Platform - Android Only](https://img.shields.io/badge/Platform-Android%20Only-green)]()
[![Kotlin](https://img.shields.io/badge/Language-Kotlin-purple)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-Supported-blue)]()

## Features

- **Full USB Device Control** - Enumerate, connect, and manage USB devices
- **Real-time Data Streaming** - Configurable interval-based serial data reading
- **Modbus Soil Sensors** - Native support for 8-in-1 modbus soil sensors
- **Configurable Parameters** - Custom baud rates, buffer sizes, and timeouts
- **Permission Handling** - Integrated USB permission request management
- **Type-Safe** - Full TypeScript support with comprehensive type definitions
- **High Performance** - Native Android implementation for optimal throughput

## Platform Support

| Platform | Status | Details |
|----------|--------|---------|
| **Android** | **Fully Supported** | API Level 24+ required |
| **iOS** | **Not Supported** | iOS does not allow direct USB serial access |
| **Web** | **Not Supported** | Web platform not compatible |

### Why Android Only?

- **iOS Limitation:** Apple's iOS sandboxing prevents direct USB serial device access without specific MFi (Made for iPhone) certification
- **Platform Design:** This library uses Android's native USB Host API which is Android-specific
- **Alternative for iOS:** Consider using Bluetooth/BLE modules instead

> **Important:** If you have an iOS requirement, you must use a different architecture (e.g., Bluetooth serial modules with a compatible React Native Bluetooth library).

## Minimum Requirements

- **React Native** >= 0.71.0
- **Android API Level** >= 24 (Android 7.0+)
- **Java** 8+ (OpenJDK or Oracle JDK)
- **Kotlin** 2.0.21+ (included in build system)

## Installation

> **Android Only:** This package only works on Android devices. It will not function on iOS.

```bash
npm install @rejaul/react-native-usb-serial
# or
yarn add @rejaul/react-native-usb-serial
```

### Android Configuration

Add USB permissions to your `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.USB_PERMISSION" />
<uses-feature android:name="android.hardware.usb.host" />
```
## Setup: Auto-Launch App

To make your app open automatically when the hardware is plugged in:

### 1. Define Device Filter
Create `res/xml/device_filter.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Empty tag matches any USB Serial device -->
    <usb-device />
</resources>
```

### 2. Configure Manifest
Update your `MainActivity` in `AndroidManifest.xml`:
```xml
<activity android:name=".MainActivity" android:exported="true">
    <intent-filter>
        <action android:name="android.hardware.usb.action.USB_DEVICE_ATTACHED" />
    </intent-filter>
    <meta-data 
        android:name="android.hardware.usb.action.USB_DEVICE_ATTACHED"
        android:resource="@xml/device_filter" />
</activity>
```
## Quick Start

### Basic Device Enumeration

```typescript
import {
  getDeviceList,
  type UsbDevice,
} from '@rejaul/react-native-usb-serial';

// Get all connected USB devices
const devices: UsbDevice[] = getDeviceList();

devices.forEach(device => {
  console.log(`Vendor ID: ${device.vendorId}`);
  console.log(`Product ID: ${device.productId}`);
  console.log(`Manufacturer: ${device.manufacturer}`);
});
```

### Device Connection with Permission Handling

```typescript
import {
  hasPermission,
  requestUsbPermission,
  connect,
  disconnect,
} from '@rejaul/react-native-usb-serial';

async function connectToDevice(device: UsbDevice): Promise<void> {
  try {
    // Check existing permission
    let hasAccess = await hasPermission(device);

    // Request permission if needed
    if (!hasAccess) {
      hasAccess = await requestUsbPermission(device);
      if (!hasAccess) {
        throw new Error('USB permission denied');
      }
    }

    // Connect with custom baud rate (9600 is default)
    const connected = await connect(device, 115200);

    if (connected) {
      console.log('Connected successfully');
    }
  } catch (error) {
    console.error('Connection failed:', error);
  }
}

// Disconnect when done
await disconnect();
```

### Real-time Serial Data Streaming

```typescript
import {
  onReadInterval,
  offReadInterval,
  type RawReadConfig,
} from '@rejaul/react-native-usb-serial';
import {NativeEventEmitter} from 'react-native';

// Configure reading parameters
const readConfig: RawReadConfig = {
  bufferSize: 2048,    // Buffer size in bytes
  timeout: 1000,       // Read timeout in milliseconds
};

// Start listening for data every 100ms
await onReadInterval(100, readConfig);

// Listen to serial data events
const eventEmitter = new NativeEventEmitter();
const subscription = eventEmitter.addListener(
  'USB_SERIAL_DATA',
  (event: { data: string }) => {
    console.log('Received:', event.data);
  }
);

// Stop listening when done
await offReadInterval();

// Clean up
subscription.remove();
```

### Writing Data to Serial Port

```typescript
import { write, isConnected } from '@rejaul/react-native-usb-serial';

async function sendCommand(command: string): Promise<void> {
  try {
    const connected = await isConnected();
    if (!connected) {
      throw new Error('Device not connected');
    }

    await write(command);
    console.log('Data sent:', command);
  } catch (error) {
    console.error('Write failed:', error);
  }
}

// Send AT commands
await sendCommand('AT+RST\r\n');
```

### Manual Serial Reading

```typescript
import { read } from '@rejaul/react-native-usb-serial';

async function readSerialData(): Promise<void> {
  try {
    // Read with default buffer (1024 bytes) and timeout (1000ms)
    let data = await read();

    // Or with custom parameters
    data = await read(4096, 2000);

    console.log('Received:', data);
  } catch (error) {
    console.error('Read failed:', error);
  }
}
```

## Advanced Usage

### Soil Sensor Integration 8-in-1 (Modbus RTU)

```typescript
import {
  readSoilData,
  onReadSoilDataInterval,
  offReadSoilDataInterval,
  type SoilSensorConfig,
  type SoilData,
} from '@rejaul/react-native-usb-serial';
import {NativeEventEmitter} from 'react-native';

// Configure modbus soil sensor
const soilConfig: SoilSensorConfig = {
  slaveId: 1,           // Modbus slave ID
  startAddress: 0x0000, // Register start address
  registerCount: 8,     // Number of registers to read
  responseDelayMs: 300, // Response wait time
};

// Read once
const soilData: SoilData | null = await readSoilData(soilConfig);
if (soilData) {
  console.log('Soil Moisture:', soilData.moisture);
  console.log('Soil Temperature:', soilData.temperature);
}

// Start continuous monitoring (every 500ms)
await onReadSoilDataInterval(500, soilConfig);

// Listen to soil sensor events
const eventEmitter = new NativeEventEmitter();
const subscription = eventEmitter.addListener(
  'USB_SOIL_DATA',
  (event: SoilData) => {
    console.log('Soil Data:', {
      moisture: event.moisture,
      temperature: event.temperature,
      ec: event.ec,
    });
  }
);

// Stop monitoring
await offReadSoilDataInterval();
subscription.remove();
```

### Get Currently Connected Device

```typescript
import { getConnectedDevice } from '@rejaul/react-native-usb-serial';

const device = await getConnectedDevice();
if (device) {
  console.log('Connected to:', device.productName);
  console.log('Serial Number:', device.serialNumber);
} else {
  console.log('No device connected');
}
```

## Event Listening

Use `NativeEventEmitter` to listen to real-time data:

```typescript
import { NativeEventEmitter } from 'react-native';

const eventEmitter = new NativeEventEmitter();

// Serial data events
const serialSub = eventEmitter.addListener('USB_SERIAL_DATA', (event) => {
  console.log('Serial:', event.data);
});

// Soil sensor events
const soilSub = eventEmitter.addListener('USB_SOIL_DATA', (event) => {
  console.log('Soil:', event);
});

// Clean up
serialSub.remove();
soilSub.remove();
```

## Error Handling

```typescript
import { connect, type UsbDevice } from '@rejaul/react-native-usb-serial';

async function safeConnect(device: UsbDevice): Promise<void> {
  try {
    const success = await connect(device);
    if (!success) {
      console.error('Connection failed');
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error:', error.message);
    }
  }
}
```

## Type Definitions

### UsbDevice

```typescript
type UsbDevice = {
  vendorId: number;
  productId: number;
  manufacturer?: string | null;
};
```

### RawReadConfig

```typescript
type RawReadConfig = {
  bufferSize?: number;  // Default: 1024 bytes
  timeout?: number;     // Default: 1000 ms
};
```

### SoilSensorConfig

```typescript
type SoilSensorConfig = {
  slaveId?: number;        // Default: 1
  startAddress?: number;   // Default: 0x0000
  registerCount?: number;  // Default: 8
  responseDelayMs?: number; // Default: 300 ms
};
```

### SoilData

```typescript
type SoilData = {
  [key: string]: number;
  // Typical keys: moisture, temperature, ec, ph, etc.
};
```

## API Reference

### Device Management

#### `getDeviceList(): UsbDevice[]`
Get all connected USB devices synchronously.

#### `hasPermission(device: UsbDevice): Promise<boolean>`
Check if app has USB permission for a device.

#### `requestUsbPermission(device: UsbDevice): Promise<boolean>`
Request USB permission from user. Returns true if granted.

#### `connect(device: UsbDevice, baudRate?: number): Promise<boolean>`
Connect to a USB device. Default baud rate: 9600.

#### `disconnect(): Promise<void>`
Disconnect from current device.

#### `isConnected(): Promise<boolean>`
Check if currently connected to a device.

#### `getConnectedDevice(): Promise<UsbDevice | null>`
Get the currently connected device information.

### Serial Communication

#### `write(data: string): Promise<void>`
Write data to the serial port.

#### `read(bufferSize?: number, timeout?: number): Promise<string>`
Read data from serial port. Useful for one-off reads.

#### `onReadInterval(intervalMs: number, config?: RawReadConfig): Promise<void>`
Start streaming serial data at specified interval. Emits `USB_SERIAL_DATA` events.

#### `offReadInterval(): Promise<void>`
Stop streaming serial data.

### Soil Sensor

#### `readSoilData(config?: SoilSensorConfig): Promise<SoilData | null>`
Read modbus soil sensor data once.

#### `onReadSoilDataInterval(intervalMs: number, config?: SoilSensorConfig): Promise<void>`
Start reading soil sensor data periodically. Emits `USB_SOIL_DATA` events.

#### `offReadSoilDataInterval(): Promise<void>`
Stop reading soil sensor data.

## Best Practices

1. **Always check connection status** before writing/reading
2. **Handle permissions gracefully** - Some devices may refuse access
3. **Use appropriate timeouts** for different devices
4. **Clean up listeners** to prevent memory leaks
5. **Validate device IDs** before connecting
6. **Buffer large data** properly with adequate buffer sizes
7. **Test with real devices** - Emulator USB support is limited

## Example Application

See the [`example`](./example) directory for a complete React Native application demonstrating:
- Device enumeration and listing
- Permission management
- Connection lifecycle
- Real-time data streaming
- Error handling

```bash
cd example
yarn install
yarn android
```

## Troubleshooting

### Device Not Detected
- Ensure USB debugging is enabled
- Check USB cable connection
- Verify device is recognized by `adb devices`

### Permission Denied
- Grant USB permission when prompted
- Check `AndroidManifest.xml` permissions
- Restart app if permission prompt was dismissed

### No Data Received
- Verify baud rate matches device
- Check serial cable quality
- Increase read timeout value
- Ensure device is sending data

### Connection Drops
- Check USB cable stability
- Reduce read interval if too frequent
- Monitor system resources
- Check device firmware

## Performance Tips

- Use appropriate buffer sizes (1024-4096 for most cases)
- Adjust read intervals based on data volume
- Unsubscribe from events when not needed
- Handle large data streams with chunking
- Monitor memory usage with large buffers

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Code of Conduct

This project adheres to the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

MIT - See [LICENSE](LICENSE) file for details.

## Support

For issues, questions, or suggestions, please open an [issue on GitHub](https://github.com/yourusername/react-native-usb-serial/issues).

---

**Made with ❤️ for the React Native community**
