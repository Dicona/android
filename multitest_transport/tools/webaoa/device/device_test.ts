/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {ADB_PID, AOA_PID, AoaDevice, AoaRequest, GOOGLE_VID, HID, Key, KeyModifier, Point, SystemButton, TouchType} from './device';

/**
 * Set the date returned by new Date() or Date.now() without installing
 * jasmine.clock() which clashes with zone.js.
 * @param timestamp value to set
 */
function mockDate(timestamp: number) {
  jasmine.clock().mockDate(new Date(timestamp));
}

/** Creates a fake USB device for testing. */
function createMockUSBDevice(params: Partial<USBDevice> = {}):
    jasmine.SpyObj<USBDevice> {
  // inbound transfers indicate AOAv2 compatibility by default
  const inTransferResult: USBInTransferResult = {
    status: 'ok',
    data: new DataView(new Int8Array([2]).buffer),
  };
  // outbound transfers are successful by default
  const outTransferResult:
      USBOutTransferResult = {status: 'ok', bytesWritten: 0};
  return jasmine.createSpyObj<USBDevice>(
      {
        open: Promise.resolve(),
        close: Promise.resolve(),
        controlTransferIn: Promise.resolve(inTransferResult),
        controlTransferOut: Promise.resolve(outTransferResult),
      },
      {serialNumber: 'serialNumber', ...params});
}

/** Creates an AOA device for testing. */
async function createMockAoaDevice(delegate: USBDevice): Promise<AoaDevice> {
  const device = await AoaDevice.fromUSBDevice(delegate);
  spyOn(device, 'sleep').and.callFake((millis: number) => {
    mockDate(Date.now() + millis);
  });
  return device;
}

/** Verifies that a USB device sent a sequence of HID events. */
function expectSentHidEvents(
    delegate: jasmine.SpyObj<USBDevice>, hid: HID, data: number[][]) {
  const expectedArgs = data.map(
      datum =>
          [jasmine.objectContaining(
               {request: AoaRequest.SEND_HID_EVENT, value: hid.id}),
           new Uint8Array(datum)]);
  expect(delegate.controlTransferOut.calls.allArgs()).toEqual(expectedArgs);
}

describe('AoaDevice', () => {
  let usb: jasmine.SpyObj<USB>;

  beforeEach(() => {
    mockDate(Date.now());
    usb = jasmine.createSpyObj<USB>(['getDevices']);
    spyOnProperty(window, 'navigator').and.returnValue({usb});
  });

  describe('properties', () => {
    it('should fetch properties from underlying USB device', async () => {
      const device = await AoaDevice.fromUSBDevice(createMockUSBDevice({
        vendorId: 123,
        productId: 456,
        manufacturerName: 'manufacturer',
        productName: 'product',
        opened: true,
      }));
      expect(device.vendorId).toEqual(123);
      expect(device.productId).toEqual(456);
      expect(device.manufacturerName).toEqual('manufacturer');
      expect(device.productName).toEqual('product');
      expect(device.isConnected()).toBeTruthy();
    });

    it('should determine accessory and ADB status from IDs', async () => {
      // Unknown IDs indicates accessory mode and ADB are disabled
      const unknownDevice = await AoaDevice.fromUSBDevice(
          createMockUSBDevice({vendorId: 123, productId: 456}));
      expect(unknownDevice.isAccessoryMode()).toBeFalsy();
      expect(unknownDevice.isAdbEnabled()).toBeFalsy();

      // Google/AOA IDs indicates accessory mode is enabled
      const accessoryDevice = await AoaDevice.fromUSBDevice(
          createMockUSBDevice({vendorId: GOOGLE_VID, productId: AOA_PID[0]}));
      expect(accessoryDevice.isAccessoryMode()).toBeTruthy();
      expect(accessoryDevice.isAdbEnabled()).toBeFalsy();

      // Google/ADB IDs indicates accessory mode and ADB are enabled
      const debuggingDevice = await AoaDevice.fromUSBDevice(
          createMockUSBDevice({vendorId: GOOGLE_VID, productId: ADB_PID[0]}));
      expect(debuggingDevice.isAccessoryMode()).toBeTruthy();
      expect(debuggingDevice.isAdbEnabled()).toBeTruthy();
    });
  });

  describe('fromUSBDevice', () => {
    it('should construct an AoaDevice instance', async () => {
      const delegate = createMockUSBDevice();
      await expectAsync(AoaDevice.fromUSBDevice(delegate)).toBeResolved();
    });

    it('should fail if the device serial number is missing', async () => {
      const device = createMockUSBDevice({serialNumber: ''});
      await expectAsync(AoaDevice.fromUSBDevice(device)).toBeRejected();
    });

    it('should fail if supported protocol version is too low', async () => {
      const device = createMockUSBDevice();
      device.controlTransferIn.and.resolveTo(
          {status: 'ok', data: new DataView(new Int8Array([1]).buffer)});
      await expectAsync(AoaDevice.fromUSBDevice(device)).toBeRejected();
    });

    it('should leave connection open if it was initially open', async () => {
      const device = createMockUSBDevice({opened: true});
      device.controlTransferIn.and.rejectWith('Transfer error');
      await expectAsync(AoaDevice.fromUSBDevice(device)).toBeRejected();
      expect(device.close).not.toHaveBeenCalled();
    });

    it('should close connection if it was initially closed', async () => {
      const device = createMockUSBDevice({opened: false});
      device.controlTransferIn.and.rejectWith('Transfer error');
      await expectAsync(AoaDevice.fromUSBDevice(device)).toBeRejected();
      expect(device.close).toHaveBeenCalled();
    });
  });

  describe('open', () => {
    it('should open the connection and registers HIDs', async () => {
      const delegate =
          createMockUSBDevice({vendorId: GOOGLE_VID, productId: AOA_PID[0]});
      const device = await createMockAoaDevice(delegate);
      // Open device and verify that the connection was opened
      await device.open(0);
      expect(delegate.open).toHaveBeenCalled();
      expect(delegate.controlTransferOut)
          .toHaveBeenCalledWith(
              jasmine.objectContaining({request: AoaRequest.REGISTER_HID}),
              jasmine.falsy());
      expect(delegate.controlTransferOut)
          .toHaveBeenCalledWith(
              jasmine.objectContaining(
                  {request: AoaRequest.SET_HID_REPORT_DESC}),
              jasmine.notEmpty());
    });

    it('should start accessory mode if necessary', async () => {
      const delegate = createMockUSBDevice({vendorId: 123, productId: 456});
      const device = await createMockAoaDevice(delegate);
      const accessory =
          createMockUSBDevice({vendorId: GOOGLE_VID, productId: AOA_PID[0]});
      // Device in accessory mode found when reconnecting
      usb.getDevices.and.resolveTo([accessory]);
      // Open device and verify that it was restarted in accessory mode
      await device.open(0);
      expect(delegate.controlTransferOut)
          .toHaveBeenCalledWith(
              jasmine.objectContaining({request: AoaRequest.START}),
              jasmine.falsy());
      expect(device.vendorId).toEqual(GOOGLE_VID);
      expect(device.productId).toEqual(AOA_PID[0]);
    });

    it('should fail if accessory is not found', async () => {
      const device = await createMockAoaDevice(
          createMockUSBDevice({vendorId: 123, productId: 456}));
      // No devices found when reconnecting
      usb.getDevices.and.resolveTo([]);
      await expectAsync(device.open(0)).toBeRejected();
    });
  });

  describe('close', () => {
    it('should close the connection and unregister HIDs', async () => {
      const delegate = createMockUSBDevice(
          {vendorId: GOOGLE_VID, productId: AOA_PID[0], opened: true});
      const device = await createMockAoaDevice(delegate);
      await device.close();
      expect(delegate.controlTransferOut)
          .toHaveBeenCalledWith(
              jasmine.objectContaining({request: AoaRequest.UNREGISTER_HID}),
              jasmine.falsy());
      expect(delegate.close).toHaveBeenCalled();
    });

    it('should do nothing if the connection is not open', async () => {
      const delegate = createMockUSBDevice(
          {vendorId: GOOGLE_VID, productId: AOA_PID[0], opened: false});
      const device = await createMockAoaDevice(delegate);
      await device.close();
      expect(delegate.controlTransferOut).not.toHaveBeenCalled();
      expect(delegate.close).not.toHaveBeenCalled();
    });
  });

  describe('operations', () => {
    let delegate: jasmine.SpyObj<USBDevice>;
    let device: AoaDevice;

    beforeEach(async () => {
      delegate = createMockUSBDevice();
      device = await createMockAoaDevice(delegate);
    });

    it('should touch a point when clicking', async () => {
      await device.click(new Point(123, 456));
      expectSentHidEvents(delegate, HID.TOUCH_SCREEN, [
        [TouchType.DOWN, 123, 0, 200, 1],
        [TouchType.UP, 123, 0, 200, 1],
      ]);
    });

    it('should touch multiple points when swiping', async () => {
      await device.swipe(new Point(20, 0), new Point(70, 100), 50);
      expectSentHidEvents(delegate, HID.TOUCH_SCREEN, [
        [TouchType.DOWN, 20, 0, 0, 0],
        [TouchType.DOWN, 30, 0, 20, 0],
        [TouchType.DOWN, 40, 0, 40, 0],
        [TouchType.DOWN, 50, 0, 60, 0],
        [TouchType.DOWN, 60, 0, 80, 0],
        [TouchType.DOWN, 70, 0, 100, 0],
        [TouchType.UP, 70, 0, 100, 0],
      ]);
    });

    it('should send HID usages when pressing keys', async () => {
      await device.pressKeys([Key.get('A')!, Key.get('1')!, Key.get('ENTER')!]);
      expectSentHidEvents(delegate, HID.KEYBOARD, [
        [KeyModifier.SHIFT, 0x04],
        [0, 0],
        [0, 0x1E],
        [0, 0],
        [0, 0x28],
        [0, 0],
      ]);
    });

    it('should send BACK bit when pressing the back button', async () => {
      await device.goBack();
      expectSentHidEvents(delegate, HID.SYSTEM, [[SystemButton.BACK]]);
    });

    it('should send HOME bit when pressing the home button', async () => {
      await device.goHome();
      expectSentHidEvents(delegate, HID.SYSTEM, [[SystemButton.HOME]]);
    });

    it('should send WAKE bit when pressing the power button', async () => {
      await device.wakeUp();
      expectSentHidEvents(delegate, HID.SYSTEM, [[SystemButton.WAKE]]);
    });
  });
});
