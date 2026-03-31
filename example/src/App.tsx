import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  NativeEventEmitter,
  ScrollView,
  Platform,
} from 'react-native';
import {
  getDeviceList,
  connect,
  disconnect,
  hasPermission,
  requestUsbPermission,
  onReadInterval,
  offReadInterval,
  write,
  type UsbDevice,
} from '@rejaul/react-native-usb-serial';

interface DeviceItemProps {
  device: UsbDevice;
  onConnect: () => void;
  isSelected: boolean;
  isConnecting: boolean;
}

function DeviceItem({
  device,
  onConnect,
  isSelected,
  isConnecting,
}: DeviceItemProps) {
  return (
    <TouchableOpacity
      style={[styles.deviceItem, isSelected && styles.deviceItemSelected]}
      onPress={onConnect}
      disabled={isConnecting}
    >
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceDetails}>
          {device.manufacturer || 'Unknown Manufacturer'}
        </Text>
        <Text style={styles.deviceIds}>
          VID: {device.vendorId} | PID: {device.productId}
        </Text>
      </View>
      <View style={styles.buttonContainer}>
        {isConnecting ? (
          <ActivityIndicator color="#007AFF" size="small" />
        ) : (
          <Text
            style={[
              styles.connectButton,
              isSelected && styles.connectButtonActive,
            ]}
          >
            {isSelected ? 'Connected' : 'Connect'}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function App() {
  const [devices, setDevices] = useState<UsbDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<UsbDevice | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnectedState, setIsConnectedState] = useState(false);
  const [serialData, setSerialData] = useState<string>('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Scan for devices
  const scanDevices = async () => {
    try {
      setError(null);
      const foundDevices = getDeviceList();
      setDevices(foundDevices);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    }
  };

  // Request permission
  const requestPermissionForDevice = async (device: UsbDevice) => {
    try {
      setError(null);
      const access = await hasPermission(device);
      if (!access) {
        const granted = await requestUsbPermission(device);
        return granted;
      }
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return false;
    }
  };

  // Connect to device
  const handleConnectDevice = async (device: UsbDevice) => {
    if (selectedDevice?.productId === device.productId) {
      setIsConnecting(true);
      try {
        await disconnect();
        setSelectedDevice(null);
        setIsConnectedState(false);
        setIsListening(false);
        setSerialData('');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
      } finally {
        setIsConnecting(false);
      }
      return;
    }

    setIsConnecting(true);
    try {
      const hasAccess = await requestPermissionForDevice(device);
      if (!hasAccess) {
        setIsConnecting(false);
        return;
      }

      const connected = await connect(device, 9600);
      if (connected) {
        setSelectedDevice(device);
        setIsConnectedState(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsConnecting(false);
    }
  };

  // Scan on mount
  useEffect(() => {
     let interval: ReturnType<typeof setTimeout>;
      if(Platform.OS === 'android') {
       scanDevices();
       interval = setInterval(scanDevices, 5000);
    }
   
    return () => clearInterval(interval);
  }, []);

  // Listen for serial data
  useEffect(() => {
    if (!isConnectedState || !isListening) return;

    let subscription: any;
    let isActive = true;

    const startListening = async () => {
      try {
        await onReadInterval(200, {
          bufferSize: 2048,
          timeout: 1000,
        });

        const eventEmitter = new NativeEventEmitter();
        subscription = eventEmitter.addListener(
          'USB_SERIAL_DATA',
          (event: any) => {
            if (isActive) {
              setSerialData((prev) => prev + event.data);
            }
          }
        );
      } catch (err) {
        console.error('Failed to start listening:', err);
        if (isActive) {
          setIsListening(false);
        }
      }
    };
    if(Platform.OS === 'android') {
      startListening();
    }

    
    return () => {
      isActive = false;
      if (subscription) {
        subscription.remove();
      }
      offReadInterval().catch(() => {
        /* ignore cleanup errors */
      });
    };
  }, [isConnectedState, isListening]);

  const handleSendCommand = async (command: string) => {
    if (!isConnectedState || !command.trim()) return;

    try {
      await write(command + '\n');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>USB Serial Monitor</Text>
        <Text style={styles.subtitle}>React Native USB Serial</Text>
      </View>

      {/* Error Display */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      {/* Device List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Available Devices ({devices.length})
        </Text>
        {devices.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No USB devices found</Text>
            <TouchableOpacity style={styles.rescanButton} onPress={scanDevices}>
              <Text style={styles.rescanButtonText}>Scan Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={devices}
            keyExtractor={(item) => `${item.vendorId}-${item.productId}`}
            renderItem={({ item }) => (
              <DeviceItem
                device={item}
                onConnect={() => handleConnectDevice(item)}
                isSelected={selectedDevice?.productId === item.productId}
                isConnecting={isConnecting}
              />
            )}
            scrollEnabled={false}
          />
        )}
      </View>

      {/* Connection Status */}
      {selectedDevice && (
        <View style={styles.section}>
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusIndicator,
                isConnectedState && styles.statusIndicatorConnected,
              ]}
            />
            <View style={styles.statusText}>
              <Text style={styles.statusTitle}>
                {isConnectedState ? 'Connected' : 'Disconnected'}
              </Text>
              <Text style={styles.statusDevice}>
                {selectedDevice.productId}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Serial Data Display */}
      {isConnectedState && (
        <View style={[styles.section, styles.dataSection]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Serial Data</Text>
            <TouchableOpacity onPress={() => setIsListening(!isListening)}>
              <Text
                style={[
                  styles.toggleButton,
                  isListening && styles.toggleButtonActive,
                ]}
              >
                {isListening ? '⏹ Stop' : '▶ Start'}
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.dataDisplay}>
            <Text style={styles.dataText}>
              {serialData || 'Waiting for data...'}
            </Text>
          </ScrollView>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSerialData('')}
          >
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Command Input */}
      {isConnectedState && (
        <View style={styles.commandSection}>
          <Text style={styles.sectionTitle}>Send Command</Text>
          <TouchableOpacity
            style={styles.sendButton}
            onPress={() => handleSendCommand('AT')}
          >
            <Text style={styles.sendButtonText}>Send AT</Text>
          </TouchableOpacity>
        </View>
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
    backgroundColor: '#007AFF',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  section: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dataSection: {
    flex: 1,
    marginBottom: 0,
  },
  commandSection: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  deviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  deviceItemSelected: {
    backgroundColor: '#e7f3ff',
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  deviceDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  deviceIds: {
    fontSize: 12,
    color: '#999',
  },
  serialNumber: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  buttonContainer: {
    marginLeft: 12,
  },
  connectButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  connectButtonActive: {
    backgroundColor: '#007AFF',
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 16,
  },
  rescanButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  rescanButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: '#ffebee',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#f44336',
    marginRight: 12,
  },
  statusIndicatorConnected: {
    backgroundColor: '#4caf50',
  },
  statusText: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  statusDevice: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  dataDisplay: {
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 12,
    minHeight: 200,
    marginBottom: 12,
  },
  dataText: {
    color: '#00ff00',
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  toggleButton: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  toggleButtonActive: {
    color: '#f44336',
  },
  clearButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  sendButton: {
    backgroundColor: '#4caf50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
