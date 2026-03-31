package com.usbserial

import android.hardware.usb.UsbDevice
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.ReadableMap
import com.rezaul.usbserial.UsbManager
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.rezaul.usbserial.RawReadConfig
import com.rezaul.usbserial.SoilSensorConfig
import com.facebook.react.bridge.Promise

@ReactModule(name = UsbSerialModule.NAME)
class UsbSerialModule(reactContext: ReactApplicationContext) :
    NativeUsbSerialSpec(reactContext) {

    private val usbManager = UsbManager(reactContext)

    override fun multiply(a: Double, b: Double): Double {
        return a * b
    }

    private fun sendEvent(eventName: String, data: Any?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, data)
    }

    private fun readableMapToUsbDevice(map: ReadableMap): UsbDevice? {
        val devices = usbManager.getDeviceList()
        val vendorId = map.getInt("vendorId")
        val productId = map.getInt("productId")

        for (device in devices) {
            if (device.vendorId == vendorId && device.productId == productId) {
                return device
            }
        }
        return null
    }

    private fun usbDeviceToMap(device: UsbDevice): WritableMap {
        val map = Arguments.createMap()
        map.putInt("vendorId", device.vendorId)
        map.putInt("productId", device.productId)
        map.putString("manufacturer", device.manufacturerName)
        return map
    }

    /**
     * Returns all connected USB devices
     */
    override fun getDeviceList(): WritableArray {
        val result: WritableArray = Arguments.createArray()
        val devices: List<UsbDevice> = usbManager.getDeviceList()

        for (device in devices) {
            result.pushMap(usbDeviceToMap(device))
        }

        return result
    }

    /**
     * Check if app has permission for a specific device
     */
    override fun hasPermission(device: ReadableMap, promise: Promise) {
        try {
            val usbDevice = readableMapToUsbDevice(device)
            if (usbDevice == null) {
                promise.reject("DEVICE_NOT_FOUND", "USB device not found")
                return
            }

            val hasPermission = usbManager.hasPermission(usbDevice)
            promise.resolve(hasPermission)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    /**
     * Request USB permission for a specific device
     */
    override fun requestUsbPermission(device: ReadableMap, promise: Promise) {
        try {
            val usbDevice = readableMapToUsbDevice(device)
            if (usbDevice == null) {
                promise.reject("DEVICE_NOT_FOUND", "USB device not found")
                return
            }

            usbManager.requestUsbPermission(usbDevice) { granted ->
                promise.resolve(granted)
            }
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    /**
     * Connect to a specific USB device with optional baud rate
     */
    override fun connect(device: ReadableMap, baudRate: Double?, promise: Promise) {
        try {
            val usbDevice = readableMapToUsbDevice(device)
            if (usbDevice == null) {
                promise.reject("DEVICE_NOT_FOUND", "USB device not found")
                return
            }

            val baud = baudRate?.toInt() ?: 9600
            val connected = usbManager.connect(usbDevice, baud)
            promise.resolve(connected)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    /**
     * Check if serial connection is active
     */
    override fun isConnected(promise: Promise) {
        try {
            val connected = usbManager.isConnected()
            promise.resolve(connected)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    /**
     * Disconnect the current serial device
     */
    override fun disconnect(promise: Promise) {
        try {
            usbManager.disconnect()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    /**
     * Write data to the serial port
     */
    override fun write(data: String, promise: Promise) {
        try {
            usbManager.write(data.toByteArray())
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    /**
     * Read data from the serial port
     */
    override fun read(bufferSize: Double?, timeout: Double?, promise: Promise) {
        try {
            val buffer = bufferSize?.toInt() ?: 1024
            val timeoutVal = timeout?.toInt() ?: 1000
            val data = usbManager.read(buffer, timeoutVal)
            promise.resolve(String(data))
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    /**
     * Start listening for raw serial data at specified interval
     */
    override fun onReadInterval(intervalMs: Double, config: ReadableMap?, promise: Promise) {
        try {
            val bufferSize = config?.getInt("bufferSize") ?: 1024
            val timeout = config?.getInt("timeout") ?: 1000
            val readConfig = RawReadConfig(bufferSize, timeout)

            usbManager.onReadInterval(
                intervalMs = intervalMs.toLong(),
                onDataReceived = { bytes: ByteArray ->
                    val map = Arguments.createMap()
                    map.putString("data", String(bytes))
                    sendEvent("USB_SERIAL_DATA", map)
                },
                config = readConfig
            )
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    /**
     * Stop listening for raw serial data
     */
    override fun offReadInterval(promise: Promise) {
        try {
            usbManager.offReadInterval()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    /**
     * Get currently connected device
     */
    override fun getConnectedDevice(promise: Promise) {
        try {
            val device = usbManager.getConnectedDevice()
            if (device == null) {
                promise.resolve(null)
            } else {
                promise.resolve(usbDeviceToMap(device))
            }
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    /**
     * Read soil sensor data once
     */
    override fun readSoilData(config: ReadableMap?, promise: Promise) {
        try {
            val slaveId = config?.getInt("slaveId") ?: 1
            val startAddress = config?.getInt("startAddress") ?: 0x0000
            val registerCount = config?.getInt("registerCount") ?: 8
            val responseDelayMs = config?.getInt("responseDelayMs") ?: 300

            val data = usbManager.utils.readSoilData(slaveId, startAddress, registerCount, responseDelayMs)
            if (data == null) {
                promise.resolve(null)
                return
            }

            val map: WritableMap = Arguments.createMap()
            data.forEach { (key: String, value: Double?) ->
                if (value != null) {
                    map.putDouble(key, value)
                }
            }

            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    /**
     * Start listening for soil sensor data at specified interval
     */
    override fun onReadSoilDataInterval(intervalMs: Double, config: ReadableMap?, promise: Promise) {
        try {
            val slaveId = config?.getInt("slaveId") ?: 1
            val startAddress = config?.getInt("startAddress") ?: 0x0000
            val registerCount = config?.getInt("registerCount") ?: 8
            val responseDelayMs = config?.getInt("responseDelayMs") ?: 300
            val soilConfig = SoilSensorConfig(slaveId, startAddress, registerCount, responseDelayMs)

            usbManager.utils.onReadSoilDataInterval(
                intervalMs = intervalMs.toLong(),
                onDataReceived = { soilData: Map<String, Double?> ->
                    val map = Arguments.createMap()

                    soilData.forEach { (key: String, value: Double?) ->
                        if (value != null) {
                            map.putDouble(key, value)
                        }
                    }

                    sendEvent("USB_SOIL_DATA", map)
                },
                config = soilConfig
            )
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    /**
     * Stop listening for soil sensor data
     */
    override fun offReadSoilDataInterval(promise: Promise) {
        try {
            usbManager.utils.offReadSoilDataInterval()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    companion object {
        const val NAME = NativeUsbSerialSpec.NAME
    }
}