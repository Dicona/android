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

import {AoaDevice} from './device';
import {DeviceManager} from './device_manager';

describe('DeviceManager', () => {
  let usb: jasmine.SpyObj<USB>;
  let manager: DeviceManager;

  beforeEach(() => {
    usb = jasmine.createSpyObj<USB>([
      'addEventListener', 'getDevices', 'requestDevice', 'removeEventListener'
    ]);
    spyOnProperty(window, 'navigator').and.returnValue({usb});
    manager = new DeviceManager();
  });

  describe('getDevices', () => {
    beforeEach(() => {
      usb.getDevices.and.resolveTo([{}]);  // one paired device
    });

    it('should return compatible devices', async () => {
      spyOn(AoaDevice, 'fromUSBDevice').and.resolveTo({});
      const devices = await manager.getDevices();
      expect(devices.length).toEqual(1);
    });

    it('should ignore incompatible devices', async () => {
      spyOn(AoaDevice, 'fromUSBDevice').and.rejectWith('Incompatible');
      const devices = await manager.getDevices();
      expect(devices.length).toEqual(0);
    });
  });

  describe('requestDevice', () => {
    beforeEach(() => {
      // requested device is compatible
      spyOn(AoaDevice, 'fromUSBDevice').and.resolveTo({});
    });

    it('should request any device if serial number not provided', async () => {
      await manager.requestDevice();
      expect(usb.requestDevice).toHaveBeenCalledWith({filters: []});
    });

    it('should request specific device if serial number provided', async () => {
      await manager.requestDevice('serial');
      expect(usb.requestDevice).toHaveBeenCalledWith({
        filters: [{serialNumber: 'serial'}]
      });
    });
  });
});
