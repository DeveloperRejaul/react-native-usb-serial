import { useState, useCallback, useEffect } from 'react';
import {
  getDeviceList,
  connect,
  disconnect,
  hasPermission,
  requestUsbPermission,
  isConnected,
  type UsbDevice,
} from '@rejaul/react-native-usb-serial';

export interface UseUsbSerialReturn {
  devices: UsbDevice[];
  selectedDevice: UsbDevice | null;
  isConnecting: boolean;
  isConnected: boolean;
  scanDevices: () => Promise<void>;
  requestPermission: (device: UsbDevice) => Promise<boolean>;
  connectToDevice: (device: UsbDevice, baudRate?: number) => Promise<boolean>;
  disconnectDevice: () => Promise<void>;
  error: string | null;
}

/**
 * Custom hook for managing USB serial device connection lifecycle
 * 
 * @example
 * const { devices, selectedDevice, connectToDevice, disconnectDevice } = useUsbSerial();
 * 
 * // Scan for devices
 * await scanDevices();
 * 
 * // Connect to first device
 * if (devices.length > 0) {
 *   await connectToDevice(devices[0]);
 * }
 */
export function useUsbSerial(): UseUsbSerialReturn {
  const [devices, setDevices] = useState<UsbDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<UsbDevice | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnectedState, setIsConnectedState] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Scan for connected USB devices
  const scanDevices = useCallback(async () => {
    try {
      setError(null);
      const foundDevices = getDeviceList();
      setDevices(foundDevices);
      console.log(`[USB] Found ${foundDevices.length} device(s)`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('[USB] Device scan failed:', message);
    }
  }, []);

  // Request permission for a device
  const requestPermission = useCallback(async (device: UsbDevice): Promise<boolean> => {
    try {
      setError(null);
      const access = await hasPermission(device);

      if (!access) {
        const granted = await requestUsbPermission(device);
        if (!granted) {
          setError('USB permission denied by user');
          return false;
        }
      }
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('[USB] Permission request failed:', message);
      return false;
    }
  }, []);

  // Connect to a specific device
  const connectToDevice = useCallback(
    async (device: UsbDevice, baudRate: number = 9600): Promise<boolean> => {
      setIsConnecting(true);
      setError(null);

      try {
        const hasAccess = await requestPermission(device);
        if (!hasAccess) {
          setIsConnecting(false);
          return false;
        }

        const connected = await connect(device, baudRate);
        if (connected) {
          setSelectedDevice(device);
          setIsConnectedState(true);
          console.log(`[USB] Connected to (${device.vendorId}:${device.productId})`);
        } else {
          setError('Failed to connect to device');
        }
        return connected;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        console.error('[USB] Connection failed:', message);
        return false;
      } finally {
        setIsConnecting(false);
      }
    },
    [requestPermission]
  );

  // Disconnect from current device
  const disconnectDevice = useCallback(async () => {
    try {
      setError(null);
      await disconnect();
      setSelectedDevice(null);
      setIsConnectedState(false);
      console.log('[USB] Disconnected');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('[USB] Disconnection failed:', message);
    }
  }, []);

  // Monitor connection status
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const connected = await isConnected();
        setIsConnectedState(connected);
      } catch (err) {
        console.error('[USB] Failed to check connection status:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return {
    devices,
    selectedDevice,
    isConnecting,
    isConnected: isConnectedState,
    scanDevices,
    requestPermission,
    connectToDevice,
    disconnectDevice,
    error,
  };
}
