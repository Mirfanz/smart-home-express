const {
  getFirestore,
  doc,
  addDoc,
  getDoc,
  getDocs,
  collection,
  where,
  query,
  updateDoc,
  deleteDoc,
} = require("firebase/firestore");
const { initializeApp } = require("firebase/app");

const app = initializeApp({
  timestampsInSnapshots: true,
  projectId: "smart-home-87411",
  apiKey: "AIzaSyDt-8_btdee2hbvo5Xwq81CaKqPgD6i1Ps",
  authDomain: "smart-home-87411.firebaseapp.com",
  databaseURL:
    "https://smart-home-87411-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smart-home-87411",
  storageBucket: "smart-home-87411.appspot.com",
  messagingSenderId: "1047120010068",
  appId: "1:1047120010068:web:f2a0bb31556555b13dc6c1",
});

const db = getFirestore(app);

exports.userExists = userExists;
async function userExists(userId) {
  const userDoc = await getDoc(doc(collection(db, "users"), userId));
  return userDoc.exists();
}
exports.getUserId = getUserId;
async function getUserId(accessToken) {
  console.log("FIRESTORE :: getUserId() start");
  const querySnapshot = await getDocs(
    query(collection(db, "users"), where("fakeAccessToken", "==", accessToken))
  );
  //   db.collection("users").where("fakeAccessToken", "==", accessToken).get();

  console.log("FIRESTORE :: getUserId() 2");
  if (querySnapshot.empty) {
    throw new Error("No user found for this access token");
  }
  const doc = querySnapshot.docs[0];
  return doc.id; // This is the user id in Firestore
}

exports.homegraphEnabled = homegraphEnabled;
async function homegraphEnabled(userId) {
  const userDoc = await getDoc(doc(collection(db, `users`), userId));
  //   db.collection("users").doc(userId).get();
  return userDoc.data().homegraph;
}

exports.setHomegraphEnable = setHomegraphEnable;
async function setHomegraphEnable(userId, enable) {
  await updateDoc(doc(collection(db, "users"), userId), { homegraph: enable });
  //   await db.collection("users").doc(userId).update({homegraph: enable,});
}

exports.updateDevice = updateDevice;
async function updateDevice(
  userId,
  deviceId,
  name,
  nickname,
  states,
  localDeviceId,
  errorCode,
  tfa
) {
  // Payload can contain any state data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updatePayload = {};
  if (name) {
    updatePayload["name"] = name;
  }
  if (nickname) {
    updatePayload["nicknames"] = [nickname];
  }
  if (states) {
    updatePayload["states"] = states;
  }
  if (localDeviceId === null) {
    // null means local execution has been disabled.
    updatePayload["otherDeviceIds"] = admin.firestore.FieldValue.delete();
  } else if (localDeviceId !== undefined) {
    // undefined means localDeviceId was not updated.
    updatePayload["otherDeviceIds"] = [{ deviceId: localDeviceId }];
  }
  if (errorCode) {
    updatePayload["errorCode"] = errorCode;
  } else if (!errorCode) {
    updatePayload["errorCode"] = "";
  }
  if (tfa) {
    updatePayload["tfa"] = tfa;
  } else if (tfa !== undefined) {
    updatePayload["tfa"] = "";
  }
  await updateDoc(
    doc(collection(db, `users/${userId}/devices`), deviceId),
    updatePayload
  );
  //   await db
  //     .collection("users")
  //     .doc(userId)
  //     .collection("devices")
  //     .doc(deviceId)
  //     .update(updatePayload);
}

exports.addDevice = addDevice;
async function addDevice(userId, data) {
  addDoc(collection(db, `users/${userId}/devices`), data);
  //   await db
  //     .collection("users")
  //     .doc(userId)
  //     .collection("devices")
  //     .doc(data.id)
  //     .set(data);
}

exports.deleteDevice = deleteDevice;
async function deleteDevice(userId, deviceId) {
  await deleteDoc(doc(collection(db, `users/${userId}/devices`), deviceId));
  //   await db
  //     .collection("users")
  //     .doc(userId)
  //     .collection("devices")
  //     .doc(deviceId)
  //     .delete();
}

exports.getDevices = getDevices;
async function getDevices(userId) {
  const devices = [];
  const querySnapshot = await getDocs(
    collection(db, `users/${userId}/devices`)
  );
  //   await db.collection("users").doc(userId).collection("devices").get();
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    const device = {
      id: data.id,
      type: data.type,
      traits: data.traits,
      name: {
        defaultNames: data.defaultNames,
        name: data.name,
        nicknames: data.nicknames,
      },
      deviceInfo: {
        manufacturer: data.manufacturer,
        model: data.model,
        hwVersion: data.hwVersion,
        swVersion: data.swVersion,
      },
      willReportState: data.willReportState,
      attributes: data.attributes,
      otherDeviceIds: data.otherDeviceIds,
      customData: data.customData,
    };
    devices.push(device);
  });
  return devices;
}

exports.getState = getState;
async function getState(userId, deviceId) {
  console.log(userId, deviceId);
  const deviceSnap = await getDoc(
    doc(collection(db, `/users/${userId}/devices`), deviceId)
  );

  //   db.collection("users").doc(userId).collection("devices").doc(deviceId).get();
  if (!deviceSnap.exists()) {
    throw new Error("deviceNotFound");
  }
  console.log(deviceSnap.data());
  return deviceSnap.data().states;
}

exports.execute = execute;
async function execute(userId, deviceId, execution) {
  const deviceSnap = await getDoc(
    doc(collection(db, `users/${userId}/devices`), deviceId)
  );
  //   await db
  //     .collection("users")
  //     .doc(userId)
  //     .collection("devices")
  //     .doc(deviceId)
  //     .get();
  if (!deviceSnap.exists()) {
    throw new Error("deviceNotFound");
  }
  const states = {
    online: true,
  };
  const data = deviceSnap.data();
  if (!data.states.online) {
    throw new Error("deviceOffline");
  }
  if (data.errorCode) {
    throw new Error(data.errorCode);
  }
  if (data.tfa === "ack" && !execution.challenge) {
    throw new Error("ackNeeded");
  } else if (data.tfa && !execution.challenge) {
    throw new Error("pinNeeded");
  } else if (data.tfa && execution.challenge) {
    if (execution.challenge.pin && execution.challenge.pin !== data.tfa) {
      throw new Error("challengeFailedPinNeeded");
    }
  }
  console.debug("command:", execution.command, "params:", execution.params);
  switch (execution.command) {
    // action.devices.traits.AppSelector
    case "action.devices.commands.appSelect": {
      const { newApplication, newApplicationName } = execution.params;
      const currentApplication = newApplication || newApplicationName;
      await updateDoc(
        doc(collection(db, `users/${userId}/devices`), deviceId),
        { "states.currentApplication": currentApplication }
      );
      //   await db
      //     .collection("users")
      //     .doc(userId)
      //     .collection("devices")
      //     .doc(deviceId)
      //     .update({
      //       "states.currentApplication": currentApplication,
      //     });
      states["currentApplication"] = currentApplication;
      break;
    }
    case "action.devices.commands.appInstall": {
      break;
    }
    case "action.devices.commands.appSearch": {
      break;
    }
    // action.devices.traits.ArmDisarm
    case "action.devices.commands.ArmDisarm": {
      const { arm, cancel, armLevel } = execution.params;
      if (arm !== undefined) {
        states.isArmed = arm;
      } else if (cancel) {
        // Cancel value is in relation to the arm value
        states.isArmed = !data.states.isArmed;
      }
      if (armLevel) {
        await updateDoc(
          doc(collection(db, `users/${userId}/devices`), deviceId),
          {
            "states.isArmed": states.isArmed || data.states.isArmed,
            "states.currentArmLevel": armLevel,
          }
        );
        // await db
        //   .collection("users")
        //   .doc(userId)
        //   .collection("devices")
        //   .doc(deviceId)
        //   .update({
        //     "states.isArmed": states.isArmed || data.states.isArmed,
        //     "states.currentArmLevel": armLevel,
        //   });
        states["currentArmLevel"] = armLevel;
      } else {
        await updateDoc(
          doc(collection(db, `users/${userId}/devices`), deviceId),
          {
            "states.isArmed": states.isArmed || data.states.isArmed,
          }
        );
        // await db
        //   .collection("users")
        //   .doc(userId)
        //   .collection("devices")
        //   .doc(deviceId)
        //   .update({
        //     "states.isArmed": states.isArmed || data.states.isArmed,
        //   });
      }
      break;
    }
    // action.devices.traits.Brightness
    case "action.devices.commands.BrightnessAbsolute": {
      const { brightness } = execution.params;
      await updateDoc(
        doc(collection(db, `users/${userId}/devices`), deviceId),
        {
          "states.brightness": brightness,
        }
      );
      states["brightness"] = brightness;
      break;
    }
    // action.devices.traits.CameraStream
    case "action.devices.commands.GetCameraStream": {
      states["cameraStreamAccessUrl"] = "https://fluffysheep.com/baaaaa.mp4";
      break;
    }
    // action.devices.traits.ColorSetting
    case "action.devices.commands.ColorAbsolute": {
      let color = {};
      if (execution.params.color.spectrumRGB) {
        const { spectrumRGB } = execution.params.color;
        await updateDoc(
          doc(collection(db, `users/${userId}/devices`), deviceId),
          {
            "states.color": {
              spectrumRgb: spectrumRGB,
            },
          }
        );

        // await db
        //   .collection("users")
        //   .doc(userId)
        //   .collection("devices")
        //   .doc(deviceId)
        //   .update({
        //     "states.color": {
        //       spectrumRgb: spectrumRGB,
        //     },
        //   });
        color = {
          spectrumRgb: spectrumRGB,
        };
      } else if (execution.params.color.spectrumHSV) {
        const { spectrumHSV } = execution.params.color;
        await updateDoc(
          doc(collection(db, `users/${userId}/devices`), deviceId),
          {
            "states.color": {
              spectrumHsv: spectrumHSV,
            },
          }
        );
        // await db
        //   .collection("users")
        //   .doc(userId)
        //   .collection("devices")
        //   .doc(deviceId)
        //   .update({
        //     "states.color": {
        //       spectrumHsv: spectrumHSV,
        //     },
        //   });
        color = {
          spectrumHsv: spectrumHSV,
        };
      } else if (execution.params.color.temperature) {
        const { temperature } = execution.params.color;

        await updateDoc(
          doc(collection(db, `users/${userId}/devices`), deviceId),
          {
            "states.color": {
              temperatureK: temperature,
            },
          }
        );
        // await db
        //   .collection("users")
        //   .doc(userId)
        //   .collection("devices")
        //   .doc(deviceId)
        //   .update({
        //     "states.color": {
        //       temperatureK: temperature,
        //     },
        //   });
        color = {
          temperatureK: temperature,
        };
      } else {
        throw new Error("notSupported");
      }
      states["color"] = color;
      break;
    }
    // action.devices.traits.Cook
    case "action.devices.commands.Cook": {
      if (execution.params.start) {
        const { cookingMode, foodPreset, quantity, unit } = execution.params;
        // Start cooking
        await updateDoc(
          doc(collection(db, `users/${userId}/devices`), deviceId),
          {
            "states.currentCookingMode": cookingMode,
            "states.currentFoodPreset": foodPreset || "NONE",
            "states.currentFoodQuantity": quantity || 0,
            "states.currentFoodUnit": unit || "NO_UNITS",
          }
        );
        states["currentCookingMode"] = cookingMode;
        states["currentFoodPreset"] = foodPreset;
        states["currentFoodQuantity"] = quantity;
        states["currentFoodUnit"] = unit;
      } else {
        // Done cooking, reset
        await updateDoc(
          doc(collection(db, `users/${userId}/devices`), deviceId),
          {
            "states.currentCookingMode": "NONE",
            "states.currentFoodPreset": "NONE",
            "states.currentFoodQuantity": 0,
            "states.currentFoodUnit": "NO_UNITS",
          }
        );
        states["currentCookingMode"] = "NONE";
        states["currentFoodPreset"] = "NONE";
      }
      break;
    }
    // action.devices.traits.Dispense
    case "action.devices.commands.Dispense": {
      let { amount, unit } = execution.params;
      const { item, presetName } = execution.params;
      if (presetName === "cat food bowl") {
        // Fill in params
        amount = 4;
        unit = "CUPS";
      }
      await updateDoc(
        doc(collection(db, `users/${userId}/devices`), deviceId),
        {
          "states.dispenseItems": [
            {
              itemName: item,
              amountLastDispensed: {
                amount,
                unit,
              },
              isCurrentlyDispensing: presetName !== undefined,
            },
          ],
        }
      );
      states["dispenseItems"] = [
        {
          itemName: item,
          amountLastDispensed: {
            amount,
            unit,
          },
          isCurrentlyDispensing: presetName !== undefined,
        },
      ];
      break;
    }
    // action.devices.traits.Dock
    case "action.devices.commands.Dock": {
      // This has no parameters
      await updateDoc(
        doc(collection(db, `users/${userId}/devices`), deviceId),
        {
          "states.isDocked": true,
        }
      );
      states["isDocked"] = true;
      break;
    }
    // action.devices.traits.EnergyStorage
    case "action.devices.commands.Charge": {
      const { charge } = execution.params;
      await updateDoc(
        doc(collection(db, `users/${userId}/devices`), deviceId),
        {
          "states.isCharging": charge,
        }
      );
      states["isCharging"] = charge;
      break;
    }
    // action.devices.traits.FanSpeed
    case "action.devices.commands.SetFanSpeed": {
      const { fanSpeed, fanSpeedPercent } = execution.params;
      if (fanSpeed) {
        await updateDoc(
          doc(collection(db, `users/${userId}/devices`), deviceId),
          {
            "states.currentFanSpeedSetting": fanSpeed,
          }
        );
        states["currentFanSpeedSetting"] = fanSpeed;
      } else if (fanSpeedPercent) {
        await updateDoc(
          doc(collection(db, `users/${userId}/devices`), deviceId),
          {
            "states.currentFanSpeedPercent": fanSpeedPercent,
          }
        );
        states["currentFanSpeedPercent"] = fanSpeedPercent;
      }
      break;
    }
    case "action.devices.commands.Reverse": {
      await updateDoc(
        doc(collection(db, `users/${userId}/devices`), deviceId),
        {
          "states.currentFanSpeedReverse": true,
        }
      );
      break;
    }
    // action.devices.traits.Fill
    case "action.devices.commands.Fill": {
      const { fill, fillLevel } = execution.params;
      await updateDoc(
        doc(collection(db, `users/${userId}/devices`), deviceId),
        {
          "states.isFilled": fill,
          "states.currentFillLevel": fill ? fillLevel || "half" : "none",
        }
      );
      states["isFilled"] = fill;
      states["currentFillLevel"] = fill ? fillLevel || "half" : "none";
      break;
    }
    // action.devices.traits.HumiditySetting
    case "action.devices.commands.SetHumidity": {
      const { humidity } = execution.params;
      await updateDoc(
        doc(collection(db, `users/${userId}/devices`), deviceId),
        {
          "states.humiditySetpointPercent": humidity,
        }
      );
      states["humiditySetpointPercent"] = humidity;
      break;
    }
    // action.devices.traits.InputSelector
    case "action.devices.commands.SetInput": {
      const { newInput } = execution.params;
      await updateDoc(
        doc(collection(db, `users/${userId}/devices`), deviceId),
        {
          "states.currentInput": newInput,
        }
      );
      states["currentInput"] = newInput;
      break;
    }
    case "action.devices.commands.PreviousInput": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { availableInputs } = data.attributes;
      const { currentInput } = data.states;
      const currentInputIndex = availableInputs.findIndex(
        (input) => input.key === currentInput
      );
      const previousInputIndex = Math.min(currentInputIndex - 1, 0);
      await updateDoc(
        doc(collection(db, `users/${userId}/devices`), deviceId),
        {
          "states.currentInput": availableInputs[previousInputIndex].key,
        }
      );
      states["currentInput"] = availableInputs[previousInputIndex].key;
      break;
    }
    case "action.devices.commands.NextInput": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { availableInputs } = data.attributes;
      const { currentInput } = data.states;
      const currentInputIndex = availableInputs.findIndex(
        (input) => input.key === currentInput
      );
      const nextInputIndex = Math.max(
        currentInputIndex + 1,
        availableInputs.length - 1
      );
      await updateDoc(
        doc(collection(db, `users/${userId}/devices`), deviceId),
        {
          "states.currentInput": availableInputs[nextInputIndex].key,
        }
      );
      states["currentInput"] = availableInputs[nextInputIndex].key;
      break;
    }
    // action.devices.traits.Locator
    case "action.devices.commands.Locate": {
      const { silent } = execution.params;
      await updateDoc(
        doc(collection(db, `users/${userId}/devices`), deviceId),
        {
          "states.silent": silent,
          "states.generatedAlert": true,
        }
      );
      states["generatedAlert"] = true;
      break;
    }
    // action.devices.traits.LockUnlock
    case "action.devices.commands.LockUnlock": {
      const { lock } = execution.params;
      await updateDoc(
        doc(collection(db, `users/${userId}/devices`), deviceId),
        {
          "states.isLocked": lock,
        }
      );
      states["isLocked"] = lock;
      break;
    }
    // action.devices.traits.Modes
    case "action.devices.commands.SetModes": {
      const { updateModeSettings } = execution.params;
      const currentModeSettings = data.states.currentModeSettings;
      for (const mode of Object.keys(updateModeSettings)) {
        const setting = updateModeSettings[mode];
        currentModeSettings[mode] = setting;
      }
      await updateDoc(
        doc(collection(db, `users/${userId}/devices`), deviceId),
        {
          "states.currentModeSettings": currentModeSettings,
        }
      );
      states["currentModeSettings"] = currentModeSettings;
      break;
    }
    // action.devices.traits.NetworkControl
    case "action.devices.commands.EnableDisableGuestNetwork": {
      const { enable } = execution.params;
      await updateDoc(
        doc(collection(db, `users/${userId}/devices`), deviceId),
        {
          "states.guestNetworkEnabled": enable,
        }
      );
      states["guestNetworkEnabled"] = enable;
      break;
    }
    case "action.devices.commands.EnableDisableNetworkProfile": {
      const { profile } = execution.params;
      if (!data.attributes.networkProfiles.includes(profile)) {
        throw new Error("networkProfileNotRecognized");
      }
      // No state change occurs
      break;
    }
    case "action.devices.commands.TestNetworkSpeed": {
      const { testDownloadSpeed, testUploadSpeed } = execution.params;
      const { lastNetworkDownloadSpeedTest, lastNetworkUploadSpeedTest } =
        data.states;
      if (testDownloadSpeed) {
        // Randomly generate new download speed
        lastNetworkDownloadSpeedTest.downloadSpeedMbps = (
          Math.random() * 100
        ).toFixed(1); // To one degree of precision
        lastNetworkDownloadSpeedTest.unixTimestampSec = Math.floor(
          Date.now() / 1000
        );
      }
      if (testUploadSpeed) {
        // Randomly generate new upload speed
        lastNetworkUploadSpeedTest.uploadSpeedMbps = (
          Math.random() * 100
        ).toFixed(1); // To one degree of precision
        lastNetworkUploadSpeedTest.unixTimestampSec = Math.floor(
          Date.now() / 1000
        );
      }
      await updateDoc(
        doc(collection(db, `users/${userId}/devices`), deviceId),
        {
          "states.lastNetworkDownloadSpeedTest": lastNetworkDownloadSpeedTest,
          "states.lastNetworkUploadSpeedTest": lastNetworkUploadSpeedTest,
        }
      );
      // This operation is asynchronous and will be pending
      throw new Error("PENDING");
    }
    case "action.devices.commands.GetGuestNetworkPassword": {
      states["guestNetworkPassword"] = "wifi-password-123";
      break;
    }
    // action.devices.traits.OnOff
    case "action.devices.commands.OnOff": {
      const { on } = execution.params;
      await updateDoc(
        doc(collection(db, `users/${userId}/devices`), deviceId),
        {
          "states.on": on,
        }
      );
      states["on"] = on;
      break;
    }
    // action.devices.traits.OpenClose
    case "action.devices.commands.OpenClose": {
      // Check if the device can open in multiple directions
      if (data.attributes && data.attributes.openDirection) {
        // The device can open in more than one direction
        const { openDirection } = execution.params;
        data.states.openState.forEach((state) => {
          if (state.openDirection === openDirection) {
            state.openPercent = execution.params.openPercent;
          }
        });
        await updateDoc(
          doc(collection(db, `users/${userId}/devices`), deviceId),
          {
            "states.openState": data.states.openState,
          }
        );
      } else {
        const { openPercent } = execution.params;
        // The device can only open in one direction
        await updateDoc(
          doc(collection(db, `users/${userId}/devices`), deviceId),
          {
            "states.openPercent": openPercent,
          }
        );
        states["openPercent"] = openPercent;
      }
      break;
    }
    // action.devices.traits.Reboot
    case "action.devices.commands.Reboot": {
      // When the device reboots, we can make it go offline until the frontend turns it back on
      await updateDoc(
        doc(collection(db, `users/${userId}/devices`), deviceId),
        {
          "states.online": false,
        }
      );
      // Reboot trait is stateless
      break;
    }
    // action.devices.traits.Rotation
    case "action.devices.commands.RotateAbsolute": {
      const { rotationPercent, rotationDegrees } = execution.params;
      if (rotationPercent) {
        await updateDoc(
          doc(collection(db, `users/${userId}/devices`), deviceId),
          {
            "states.rotationPercent": rotationPercent,
          }
        );
        states["rotationPercent"] = rotationPercent;
      } else if (rotationDegrees) {
        await updateDoc(
          doc(collection(db, `users/${userId}/devices`), deviceId),
          {
            "states.rotationDegrees": rotationDegrees,
          }
        );
        states["rotationDegrees"] = rotationDegrees;
      }
      break;
    }
    // action.devices.traits.RunCycle - No execution
    // action.devices.traits.Scene
    case "action.devices.commands.ActivateScene": {
      const { deactivate } = execution.params;
      await updateDoc(
        doc(collection(db, `users/${userId}/devices`), deviceId),
        {
          "states.deactivate": deactivate,
        }
      );
      // Scenes are stateless
      break;
    }
    // action.devices.traits.SoftwareUpdate
    case "action.devices.commands.SoftwareUpdate": {
      // When the device reboots, we can make it go offline until the frontend turns it back on
      await updateDoc(
        doc(collection(db, `users/${userId}/devices`), deviceId),
        {
          "states.lastSoftwareUpdateUnixTimestampSec": Math.floor(
            new Date().getTime() / 1000
          ),
          "states.online": false,
        }
      );
      // SoftwareUpdate trait is stateless
      break;
    }
    // action.devices.traits.StartStop
    case "action.devices.commands.StartStop": {
      const { start } = execution.params;
      await updateDoc(
        doc(collection(db, `users/${userId}/devices`), deviceId),
        {
          "states.isRunning": start,
        }
      );
      states["isRunning"] = start;
      states["isPaused"] = data.states.isPaused;
      break;
    }
    case "action.devices.commands.PauseUnpause": {
      const { pause } = execution.params;
      await updateDoc(
        doc(collection(db, `users/${userId}/devices`), deviceId),
        {
          "states.isPaused": pause,
        }
      );
      states["isPaused"] = pause;
      states["isRunning"] = data.states.isRunning;
      break;
    }
    // action.devices.traits.TemperatureControl
    case "action.devices.commands.SetTemperature": {
      const { temperature } = execution.params;
      await updateDoc(
        doc(collection(db, `users/${userId}/devices`), deviceId),
        {
          "states.temperatureSetpointCelsius": temperature,
        }
      );
      states["temperatureSetpointCelsius"] = temperature;
      states["temperatureAmbientCelsius"] =
        data.states.temperatureAmbientCelsius;
      break;
    }
    // action.devices.traits.TemperatureSetting
    case "action.devices.commands.ThermostatTemperatureSetpoint": {
      const { thermostatTemperatureSetpoint } = execution.params;
      await updateDoc(
        doc(collection(db, `users/${userId}/devices`), deviceId),
        {
          "states.thermostatTemperatureSetpoint": thermostatTemperatureSetpoint,
        }
      );
      states["thermostatTemperatureSetpoint"] = thermostatTemperatureSetpoint;
      states["thermostatMode"] = data.states.thermostatMode;
      states["thermostatTemperatureAmbient"] =
        data.states.thermostatTemperatureAmbient;
      states["thermostatHumidityAmbient"] =
        data.states.thermostatHumidityAmbient;
      break;
    }
    case "action.devices.commands.ThermostatTemperatureSetRange": {
      const {
        thermostatTemperatureSetpointLow,
        thermostatTemperatureSetpointHigh,
      } = execution.params;
      await updateDoc(
        doc(collection(db, `users/${userId}/devices`), deviceId),
        {
          "states.thermostatTemperatureSetpointLow":
            thermostatTemperatureSetpointLow,
          "states.thermostatTemperatureSetpointHigh":
            thermostatTemperatureSetpointHigh,
        }
      );
      states["thermostatTemperatureSetpoint"] =
        data.states.thermostatTemperatureSetpoint;
      states["thermostatMode"] = data.states.thermostatMode;
      states["thermostatTemperatureAmbient"] =
        data.states.thermostatTemperatureAmbient;
      states["thermostatHumidityAmbient"] =
        data.states.thermostatHumidityAmbient;
      break;
    }
    case "action.devices.commands.ThermostatSetMode": {
      const { thermostatMode } = execution.params;
      await updateDoc(
        doc(collection(db, `users/${userId}/devices`), deviceId),
        {
          "states.thermostatMode": thermostatMode,
        }
      );
      states["thermostatMode"] = thermostatMode;
      states["thermostatTemperatureSetpoint"] =
        data.states.thermostatTemperatureSetpoint;
      states["thermostatTemperatureAmbient"] =
        data.states.thermostatTemperatureAmbient;
      states["thermostatHumidityAmbient"] =
        data.states.thermostatHumidityAmbient;
      break;
    }
    // action.devices.traits.Timer
    case "action.devices.commands.TimerStart": {
      const { timerTimeSec } = execution.params;
      await updateDoc(
        doc(collection(db, `users/${userId}/devices`), deviceId),
        {
          "states.timerRemainingSec": timerTimeSec,
        }
      );
      states["timerRemainingSec"] = timerTimeSec;
      break;
    }
    case "action.devices.commands.TimerAdjust": {
      if (data.states.timerRemainingSec === -1) {
        // No timer exists
        throw new Error("noTimerExists");
      }
      const { timerTimeSec } = execution.params;
      const newTimerRemainingSec = data.states.timerRemainingSec + timerTimeSec;
      if (newTimerRemainingSec < 0) {
        throw new Error("valueOutOfRange");
      }
      await updateDoc(
        doc(collection(db, `users/${userId}/devices`), deviceId),
        {
          "states.timerRemainingSec": newTimerRemainingSec,
        }
      );
      states["timerRemainingSec"] = newTimerRemainingSec;
      break;
    }
    case "action.devices.commands.TimerPause": {
      if (data.states.timerRemainingSec === -1) {
        // No timer exists
        throw new Error("noTimerExists");
      }
      await updateDoc(
        doc(collection(db, `users/${userId}/devices`), deviceId),
        {
          "states.timerPaused": true,
        }
      );
      states["timerPaused"] = true;
      break;
    }
    case "action.devices.commands.TimerResume": {
      if (data.states.timerRemainingSec === -1) {
        // No timer exists
        throw new Error("noTimerExists");
      }
      await updateDoc(
        doc(collection(db, `users/${userId}/devices`), deviceId),
        {
          "states.timerPaused": false,
        }
      );
      states["timerPaused"] = false;
      break;
    }
    case "action.devices.commands.TimerCancel": {
      if (data.states.timerRemainingSec === -1) {
        // No timer exists
        throw new Error("noTimerExists");
      }
      await updateDoc(
        doc(collection(db, `users/${userId}/devices`), deviceId),
        {
          "states.timerRemainingSec": -1,
        }
      );
      states["timerRemainingSec"] = 0;
      break;
    }
    // action.devices.traits.Toggles
    case "action.devices.commands.SetToggles": {
      const { updateToggleSettings } = execution.params;
      const currentToggleSettings = data.states.currentToggleSettings;
      for (const toggle of Object.keys(updateToggleSettings)) {
        const enable = updateToggleSettings[toggle];
        currentToggleSettings[toggle] = enable;
      }
      await updateDoc(
        doc(collection(db, `users/${userId}/devices`), deviceId),
        {
          "states.currentToggleSettings": currentToggleSettings,
        }
      );
      states["currentToggleSettings"] = currentToggleSettings;
      break;
    }
    // action.devices.traits.TransportControl
    case "action.devices.commands.mediaPause": {
      await updateDoc(
        doc(collection(db, `users/${userId}/devices`), deviceId),
        {
          "states.playbackState": "PAUSED",
        }
      );
      states["playbackState"] = "PAUSED";
      break;
    }
    case "action.devices.commands.mediaResume": {
      await updateDoc(
        doc(collection(db, `users/${userId}/devices`), deviceId),
        {
          "states.playbackState": "PLAYING",
        }
      );
      states["playbackState"] = "PLAYING";
      break;
    }
    case "action.devices.commands.mediaStop": {
      await updateDoc(
        doc(collection(db, `users/${userId}/devices`), deviceId),
        {
          "states.playbackState": "STOPPED",
        }
      );
      states["playbackState"] = "STOPPED";
      break;
    }
    // Traits are considered no-ops as they have no state
    case "action.devices.commands.mediaSeekRelative": {
      break;
    }
    case "action.devices.commands.mediaSeekToPosition": {
      break;
    }
    // action.devices.traits.Volume
    case "action.devices.commands.setVolume": {
      const { volumeLevel } = execution.params;
      await updateDoc(
        doc(collection(db, `users/${userId}/devices`), deviceId),
        {
          "states.currentVolume": volumeLevel,
        }
      );
      states["currentVolume"] = volumeLevel;
      break;
    }
    case "action.devices.commands.volumeRelative": {
      const { relativeSteps } = execution.params;
      const { currentVolume } = data.states;
      const newVolume = currentVolume + relativeSteps;
      await updateDoc(
        doc(collection(db, `users/${userId}/devices`), deviceId),
        {
          "states.currentVolume": newVolume,
        }
      );
      states["currentVolume"] = newVolume;
      break;
    }
    case "action.devices.commands.mute": {
      const { mute } = execution.params;
      await updateDoc(
        doc(collection(db, `users/${userId}/devices`), deviceId),
        {
          "states.isMuted": mute,
        }
      );
      states["isMuted"] = mute;
      break;
    }
    default:
      throw new Error("actionNotAvailable");
  }
  return states;
}

exports.disconnect = disconnect;
async function disconnect(userId) {
  await setHomegraphEnable(userId, false);
}
//# sourceMappingURL=firestore.js.map
