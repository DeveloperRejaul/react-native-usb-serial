import UsbSerial, {
  type UsbDevice,
  type SoilData,
  type RawReadConfig,
  type SoilSensorConfig,
} from './NativeUsbSerial';

/**
 * Get list of all connected USB devices
 */
export function getDeviceList(): UsbDevice[] {
  return UsbSerial.getDeviceList();
}

/**
 * Whether this device's hardware supports USB host mode (OTG) at all - a
 * permanent capability, not a runtime toggle. False means no wired USB
 * sensor can ever be used on this device, regardless of cable or settings.
 */
export function isOtgSupported(): boolean {
  return UsbSerial.isOtgSupported();
}

/**
 * Starts listening for any USB device (not just this app's sensor) being
 * physically attached or detached. Android has no public API to read an
 * OEM's OTG on/off toggle - an attach event actually firing is the closest
 * available signal that OTG power is reaching the port right now. Subscribe
 * to 'USB_DEVICE_ATTACHED' / 'USB_DEVICE_DETACHED' via DeviceEventEmitter
 * before calling this.
 */
export function onUsbAttachChange(): Promise<void> {
  return UsbSerial.onUsbAttachChange();
}

/**
 * Stops the listener started by onUsbAttachChange().
 */
export function offUsbAttachChange(): Promise<void> {
  return UsbSerial.offUsbAttachChange();
}

/**
 * Check if app has permission for a device
 */
export function hasPermission(device: UsbDevice): Promise<boolean> {
  return UsbSerial.hasPermission(device);
}

/**
 * Request USB permission for a device
 */
export function requestUsbPermission(device: UsbDevice): Promise<boolean> {
  return UsbSerial.requestUsbPermission(device);
}

/**
 * Connect to a USB device
 */
export function connect(
  device: UsbDevice,
  baudRate?: number
): Promise<boolean> {
  return UsbSerial.connect(device, baudRate);
}

/**
 * Check if currently connected
 */
export function isConnected(): Promise<boolean> {
  return UsbSerial.isConnected();
}

/**
 * Disconnect from device
 */
export function disconnect(): Promise<void> {
  return UsbSerial.disconnect();
}

/**
 * Write data to serial port
 */
export function write(data: string): Promise<void> {
  return UsbSerial.write(data);
}

/**
 * Read data from serial port
 */
export function read(bufferSize?: number, timeout?: number): Promise<string> {
  return UsbSerial.read(bufferSize, timeout);
}

/**
 * Start listening for raw serial data
 */
export function onReadInterval(
  intervalMs: number,
  config?: RawReadConfig
): Promise<void> {
  return UsbSerial.onReadInterval(intervalMs, config);
}

/**
 * Stop listening for raw serial data
 */
export function offReadInterval(): Promise<void> {
  return UsbSerial.offReadInterval();
}

/**
 * Get currently connected device
 */
export function getConnectedDevice(): Promise<UsbDevice | null> {
  return UsbSerial.getConnectedDevice();
}

/**
 * Read soil sensor data once
 */
export function readSoilData(
  config?: SoilSensorConfig
): Promise<SoilData | null> {
  return UsbSerial.readSoilData(config);
}

/**
 * Start listening for soil sensor data
 */
export function onReadSoilDataInterval(
  intervalMs: number,
  config?: SoilSensorConfig
): Promise<void> {
  return UsbSerial.onReadSoilDataInterval(intervalMs, config);
}

/**
 * Stop listening for soil sensor data
 */
export function offReadSoilDataInterval(): Promise<void> {
  return UsbSerial.offReadSoilDataInterval();
}

// Export types
export type { UsbDevice, SoilData, RawReadConfig, SoilSensorConfig };

// Export native module
export default UsbSerial;
