/**
 * Complete Device Management Example
 * Demonstrates full device lifecycle management with error handling
 */

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  getDeviceList,
  connect,
  disconnect,
  hasPermission,
  requestUsbPermission,
  getConnectedDevice,
  type UsbDevice,
} from '@rejaul/react-native-usb-serial';

interface DeviceState {
  allDevices: UsbDevice[];
  connectedDevice: UsbDevice | null;
  isLoading: boolean;
  error: string | null;
}

export default function DeviceManagementExample() {
  const [state, setState] = useState<DeviceState>({
    allDevices: [],
    connectedDevice: null,
    isLoading: false,
    error: null,
  });

  /**
   * Scan for connected USB devices
   */
  const scanDevices = () => {
    try {
      setState((prev) => ({ ...prev, error: null, isLoading: true }));
      const devices = getDeviceList();
      setState((prev) => ({
        ...prev,
        allDevices: devices,
        isLoading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setState((prev) => ({
        ...prev,
        error: message,
        isLoading: false,
      }));
    }
  };

  /**
   * Connect to a specific device with permission handling
   */
  const handleConnect = async (device: UsbDevice) => {
    try {
      setState((prev) => ({ ...prev, error: null, isLoading: true }));

      // Check permission
      let hasAccess = await hasPermission(device);
      if (!hasAccess) {
        hasAccess = await requestUsbPermission(device);
      }

      if (!hasAccess) {
        throw new Error('USB permission denied by user');
      }

      // Attempt connection (default baud rate: 9600)
      const connected = await connect(device, 115200);

      if (connected) {
        setState((prev) => ({
          ...prev,
          connectedDevice: device,
          isLoading: false,
        }));
        Alert.alert(
          'Success',
          `Connected to ${device.productId || 'Unknown Device'}`
        );
      } else {
        throw new Error('Failed to establish connection');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setState((prev) => ({
        ...prev,
        error: message,
        isLoading: false,
      }));
    }
  };

  /**
   * Disconnect from current device
   */
  const handleDisconnect = async () => {
    try {
      await disconnect();
      setState((prev) => ({
        ...prev,
        connectedDevice: null,
      }));
      Alert.alert('Success', 'Device disconnected');
    } catch {
      Alert.alert('Error', 'Failed to disconnect');
    }
  };

  useEffect(() => {
    scanDevices();

    // Auto-refresh connected device status every 2 seconds
    const interval = setInterval(async () => {
      try {
        const device = await getConnectedDevice();
        if (device && !state.connectedDevice) {
          setState((prev) => ({ ...prev, connectedDevice: device }));
        } else if (!device && state.connectedDevice) {
          setState((prev) => ({ ...prev, connectedDevice: null }));
        }
      } catch {
        // Silently handle
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [state.connectedDevice]);

  const renderDevice = ({ item }: { item: UsbDevice }) => {
    const isConnected = state.connectedDevice?.productId === item.productId;

    return (
      <View style={[styles.deviceCard, isConnected && styles.connectedCard]}>
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceName}>
            {item.productId || 'Unknown Device'}
          </Text>
          <Text style={styles.deviceMeta}>
            {item.manufacturer || 'Unknown Manufacturer'}
          </Text>
          <Text style={styles.deviceIds}>
            VID: {item.vendorId} | PID: {item.productId}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            isConnected ? styles.disconnectButton : styles.connectButton,
          ]}
          onPress={() =>
            isConnected ? handleDisconnect() : handleConnect(item)
          }
          disabled={state.isLoading}
        >
          {state.isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {isConnected ? 'Disconnect' : 'Connect'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>USB Device Manager</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={scanDevices}
          disabled={state.isLoading}
        >
          <Text style={styles.refreshText}>
            {state.isLoading ? 'Scanning...' : 'Refresh'}
          </Text>
        </TouchableOpacity>
      </View>

      {state.error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{state.error}</Text>
        </View>
      )}

      {state.allDevices.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No devices found</Text>
          <Text style={styles.emptySubtext}>
            Connect a USB device and tap Refresh
          </Text>
        </View>
      ) : (
        <FlatList
          data={state.allDevices}
          renderItem={renderDevice}
          keyExtractor={(item) => `${item.vendorId}-${item.productId}`}
          style={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
  },
  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  refreshText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  list: {
    padding: 12,
  },
  deviceCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  connectedCard: {
    borderColor: '#34C759',
    backgroundColor: '#f0fdf4',
  },
  deviceInfo: {
    flex: 1,
    marginRight: 12,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 4,
  },
  deviceMeta: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  deviceIds: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  serialNumber: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  connectButton: {
    backgroundColor: '#007AFF',
  },
  disconnectButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: '#ffebee',
    borderRadius: 6,
    padding: 12,
    margin: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
});
