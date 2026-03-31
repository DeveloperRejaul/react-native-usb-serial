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
