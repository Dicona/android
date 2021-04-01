/**
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

import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {beforeEach, bootstrapTemplate, describe, it, setupModule} from 'google3/javascript/angular2/testing/catalyst';
import {DevicesModule} from 'google3/third_party/py/multitest_transport/ui2/app/devices/devices_module';
import {DevicesModuleNgSummary} from 'google3/third_party/py/multitest_transport/ui2/app/devices/devices_module.ngsummary';
import {newMockLabDeviceInfo} from 'google3/third_party/py/multitest_transport/ui2/app/testing/mtt_lab_mocks';
import {KarmaTestEnv} from 'google3/third_party/py/multitest_transport/ui2/scuba_tests/testing/karma_env';

describe('DeviceDetailsExtraInfos', () => {
  const env = new KarmaTestEnv(module, {
    scuba: true,
    axe: true,
  });
  beforeEach(() => {
    setupModule({
      imports: [
        DevicesModule,
        NoopAnimationsModule,
      ],
      summaries: [DevicesModuleNgSummary],
    });
  });

  it.async('can render device extra infos', async () => {
    const serial = 'device1';
    const mockDeviceInfo = newMockLabDeviceInfo(serial);
    const mockDeviceExtraInfo = mockDeviceInfo.flatedExtraInfo;

    bootstrapTemplate(
        `<device-details-extra-infos [extraInfos]="mockDeviceExtraInfo"></device-details-extra-infos>`,
        {mockDeviceExtraInfo});
    await env.verifyState(
        `device-details-extra-infos_with_item`, 'device-details-extra-infos');
  });
});
