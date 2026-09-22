import { TurboModuleRegistry, type TurboModule , Platform} from 'react-native';

export type UsbDevice = {
  vendorId: number;
  productId: number;
  manufacturer: string;
};

export type SoilData = {
  [key: string]: number;
};

export type RawReadConfig = {
  bufferSize?: number;
  timeout?: number;
};

export type SoilSensorConfig = {
  slaveId?: number;
  startAddress?: number;
  registerCount?: number;
  responseDelayMs?: number;
};

export interface Spec extends TurboModule {
  /**
   * Multiply two numbers
   */
  multiply(a: number, b: number): number;

  /**
   * Returns all connected USB devices
   */
  getDeviceList(): UsbDevice[];

  /**
   * Whether this device's hardware supports USB host mode (OTG) at all - a
   * permanent capability, not a runtime toggle. False means no wired USB
   * sensor can ever be used on this device, regardless of cable or settings.
   */
  isOtgSupported(): boolean;

  /**
   * Starts listening for ANY USB device being physically attached or
   * detached, not just this app's sensor - emits 'USB_DEVICE_ATTACHED' /
   * 'USB_DEVICE_DETACHED' (payload: UsbDevice) via DeviceEventEmitter.
   * Android has no public API to read an OEM's OTG on/off toggle, so an
   * attach event actually firing is the closest available signal that OTG
   * power is reaching the port right now.
   */
  onUsbAttachChange(): Promise<void>;

  /**
   * Stops the listener started by onUsbAttachChange().
   */
  offUsbAttachChange(): Promise<void>;

  /**
   * Check if app has permission for a specific device
   */
  hasPermission(device: UsbDevice): Promise<boolean>;

  /**
   * Request USB permission for a specific device
   */
  requestUsbPermission(device: UsbDevice): Promise<boolean>;

  /**
   * Connect to a specific USB device with optional baud rate
   */
  connect(device: UsbDevice, baudRate?: number): Promise<boolean>;

  /**
   * Check if serial connection is active
   */
  isConnected(): Promise<boolean>;

  /**
   * Disconnect the current serial device
   */
  disconnect(): Promise<void>;

  /**
   * Write data to the serial port
   */
  write(data: string): Promise<void>;

  /**
   * Read data from the serial port
   */
  read(bufferSize?: number, timeout?: number): Promise<string>;

  /**
   * Start listening for raw serial data at specified interval
   */
  onReadInterval(intervalMs: number, config?: RawReadConfig): Promise<void>;

  /**
   * Stop listening for raw serial data
   */
  offReadInterval(): Promise<void>;

  /**
   * Get currently connected device
   */
  getConnectedDevice(): Promise<UsbDevice | null>;

  /**
   * Read soil sensor data once
   */
  readSoilData(config?: SoilSensorConfig): Promise<SoilData | null>;

  /**
   * Start listening for soil sensor data at specified interval
   */
  onReadSoilDataInterval(
    intervalMs: number,
    config?: SoilSensorConfig
  ): Promise<void>;

  /**
   * Stop listening for soil sensor data
   */
  offReadSoilDataInterval(): Promise<void>;
}

export type UsbSerialEvent = {
  data: string;
};

export type UsbSoilEvent = {
  [key: string]: number;
};

function getModule(): Spec {
 return Platform.OS === 'android' ? TurboModuleRegistry.getEnforcing<Spec>('UsbSerial') : {} as Spec;
}

export default getModule();
