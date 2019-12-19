/**
 * Copyright 2019 Google LLC
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

import {DebugElement} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {ActivatedRoute} from '@angular/router';
import {RouterTestingModule} from '@angular/router/testing';
import {of as observableOf} from 'rxjs';

import {MttClient} from '../services/mtt_client';
import {getEl} from '../testing/jasmine_util';
import {getTextContent} from '../testing/jasmine_util';
import {newMockTest} from '../testing/test_util';

import {TestEditPage} from './test_edit_page';
import {TestModule} from './test_module';
import {TestModuleNgSummary} from './test_module.ngsummary';

describe('TestEditPage', () => {
  const TEST = newMockTest('testId', 'testName');

  let testEditPage: TestEditPage;
  let testEditPageFixture: ComponentFixture<TestEditPage>;
  let mttClient: jasmine.SpyObj<MttClient>;
  let el: DebugElement;

  beforeEach(() => {
    mttClient =
        jasmine.createSpyObj('mttClient', ['getTest', 'getBuildChannels']);
    mttClient.getTest.and.returnValue(observableOf(TEST));
    mttClient.getBuildChannels.and.returnValue(observableOf([]));
    TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        TestModule,
        RouterTestingModule,
      ],
      aotSummaries: TestModuleNgSummary,
      providers: [
        {provide: MttClient, useValue: mttClient},
        {
          provide: ActivatedRoute,
          useValue: {
            params: observableOf({'id': '123'}),
          },
        },
      ],
    });
    testEditPageFixture = TestBed.createComponent(TestEditPage);
    testEditPageFixture.detectChanges();
    el = testEditPageFixture.debugElement;
    testEditPage = testEditPageFixture.componentInstance;
  });

  it('gets initialized correctly', () => {
    expect(testEditPage).toBeTruthy();
  });

  it('calls API correctly', () => {
    expect(mttClient.getTest).toHaveBeenCalled();
  });

  it('displays texts correctly', () => {
    const textContent = getTextContent(el);
    expect(textContent).toContain('Environment Variables');
    expect(textContent).toContain('Runner Sharding Args');
    expect(textContent).toContain('Retry Command Line');
    expect(textContent).toContain('Context File Pattern');
    expect(textContent).toContain('Test Resource Defs');
    expect(textContent).toContain('Setup Scripts');
  });

  describe('back button', () => {
    it('should display correct aria-label and tooltip', () => {
      const backButton = getEl(el, '#back-button');
      expect(backButton).toBeTruthy();
      expect(backButton.getAttribute('aria-label'))
          .toBe('Return to test suites page');
      expect(backButton.getAttribute('mattooltip'))
          .toBe('Return to test suites page');
    });
  });
});
