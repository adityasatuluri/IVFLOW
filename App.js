import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Button,
  FlatList,
  Alert,
  Platform,
  Linking,
  StyleSheet,
} from "react-native";
import BleManager from "react-native-ble-manager";
import { request, check, RESULTS, PERMISSIONS } from "react-native-permissions";
import { NativeEventEmitter, NativeModules } from "react-native";

const App = () => {
  const [permissionsStatus, setPermissionsStatus] = useState({
    bluetoothScan: false,
    bluetoothConnect: false,
    location: false,
  });
  const [devices, setDevices] = useState([]);
  const [isScanning, setIsScanning] = useState(false);

  const bleManagerEmitter = new NativeEventEmitter(NativeModules.BleManager);

  useEffect(() => {
    // Initialize BLE Manager
    BleManager.start({ showAlert: false });

    // Request required permissions
    requestPermissions();

    // Check Bluetooth and Location services
    checkBluetoothAndLocationServices();

    // Add event listener for discovered devices
    const handleDiscoverPeripheral = (peripheral) => {
      console.log("Discovered device:", peripheral);
      setDevices((prevDevices) => {
        // Avoid duplicate entries by checking the device ID
        const deviceExists = prevDevices.some(
          (device) => device.id === peripheral.id
        );
        return deviceExists ? prevDevices : [...prevDevices, peripheral];
      });
    };

    bleManagerEmitter.addListener(
      "BleManagerDiscoverPeripheral",
      handleDiscoverPeripheral
    );

    return () => {
      // Cleanup event listener
      bleManagerEmitter.removeAllListeners("BleManagerDiscoverPeripheral");
    };
  }, []);

  const requestPermissions = async () => {
    const status = {
      bluetoothScan: false,
      bluetoothConnect: false,
      location: false,
    };

    try {
      if (Platform.OS === "android") {
        const bluetoothScanStatus = await check(
          PERMISSIONS.ANDROID.BLUETOOTH_SCAN
        );
        if (bluetoothScanStatus === RESULTS.GRANTED) {
          status.bluetoothScan = true;
        } else {
          const granted = await request(PERMISSIONS.ANDROID.BLUETOOTH_SCAN);
          status.bluetoothScan = granted === RESULTS.GRANTED;
        }

        const bluetoothConnectStatus = await check(
          PERMISSIONS.ANDROID.BLUETOOTH_CONNECT
        );
        if (bluetoothConnectStatus === RESULTS.GRANTED) {
          status.bluetoothConnect = true;
        } else {
          const granted = await request(PERMISSIONS.ANDROID.BLUETOOTH_CONNECT);
          status.bluetoothConnect = granted === RESULTS.GRANTED;
        }

        const locationStatus = await check(
          PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION
        );
        if (locationStatus === RESULTS.GRANTED) {
          status.location = true;
        } else {
          const granted = await request(
            PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION
          );
          status.location = granted === RESULTS.GRANTED;
        }
      }
    } catch (error) {
      console.error("Permission request error:", error);
    } finally {
      setPermissionsStatus(status);
    }
  };

  const checkBluetoothAndLocationServices = async () => {
    try {
      const isBluetoothEnabled = await BleManager.checkState();
      if (!isBluetoothEnabled) {
        Alert.alert(
          "Bluetooth Disabled",
          "Please enable Bluetooth to scan for devices.",
          [
            { text: "Open Settings", onPress: () => Linking.openSettings() },
            { text: "OK" },
          ]
        );
      }

      const isLocationEnabled = true; // Assume true; implement a check if needed
      if (!isLocationEnabled) {
        Alert.alert(
          "Location Disabled",
          "Please enable Location services to scan for devices.",
          [
            { text: "Open Settings", onPress: () => Linking.openSettings() },
            { text: "OK" },
          ]
        );
      }
    } catch (error) {
      console.error("Bluetooth/Location check error:", error);
    }
  };

  const startScan = () => {
    if (!isScanning) {
      setIsScanning(true);
      setDevices([]); // Clear previous devices
      BleManager.scan([], 5, true)
        .then(() => {
          console.log("Scanning started...");
        })
        .catch((error) => {
          console.error("Scan error:", error);
          Alert.alert(
            "Scan Error",
            "Could not start scanning. Please check permissions."
          );
        })
        .finally(() => {
          setTimeout(() => {
            setIsScanning(false);
          }, 5000); // Stop scanning after 5 seconds
        });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>React Native BLE Scanner.</Text>
      <Button
        title={isScanning ? "Scanning..." : "Start Scan"}
        onPress={startScan}
        disabled={isScanning}
      />
      <View style={styles.permissions}>
        <Text style={styles.subtitle}>Permissions Status:</Text>
        <Text>
          Bluetooth Scan: {permissionsStatus.bluetoothScan ? "True" : "False"}
        </Text>
        <Text>
          Bluetooth Connect:{" "}
          {permissionsStatus.bluetoothConnect ? "True" : "False"}
        </Text>
        <Text>Location: {permissionsStatus.location ? "True" : "False"}</Text>
      </View>
      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.device}>
            <Text style={styles.deviceText}>
              {item.name || "Unnamed Device"} ({item.id})
            </Text>
          </View>
        )}
        ListEmptyComponent={
          !isScanning && (
            <Text style={styles.empty}>No devices found. Start scanning.</Text>
          )
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 20,
    textAlign: "center",
    marginVertical: 10,
  },
  permissions: {
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  device: {
    padding: 10,
    borderBottomWidth: 1,
    borderColor: "#ccc",
  },
  deviceText: {
    fontSize: 16,
  },
  empty: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
    color: "#888",
  },
});

export default App;
