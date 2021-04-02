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

import {ComponentFixture, TestBed} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';

import {RecoveryModule} from './recovery_module';
import {RecoveryModuleNgSummary} from './recovery_module.ngsummary';
import {RecoverySettingPage} from './recovery_setting_page';

describe('SettingPage', () => {
  let recoverySettingPage: RecoverySettingPage;
  let recoverySettingPageFixture: ComponentFixture<RecoverySettingPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        RecoveryModule,
      ],
      aotSummaries: RecoveryModuleNgSummary,
    });
    recoverySettingPageFixture = TestBed.createComponent(RecoverySettingPage);
    recoverySettingPage = recoverySettingPageFixture.componentInstance;
    recoverySettingPageFixture.detectChanges();
  });

  it('initializes a component', () => {
    expect(recoverySettingPage).toBeTruthy();
  });
});