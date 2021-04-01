/**
 * Copyright 2021 Google LLC
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
import {HttpErrorResponse} from '@angular/common/http';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {MatRadioButton, MatRadioChange} from '@angular/material/radio';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {ActivatedRoute, Router} from '@angular/router';
import {of as observableOf, throwError} from 'rxjs';

import {APP_DATA} from '../services';
import {convertToHostUpdateStateSummary} from '../services/mtt_lab_models';
import {Notifier} from '../services/notifier';
import {TfcClient} from '../services/tfc_client';
import {HostConfig, TestHarnessImage} from '../services/tfc_models';
import {ActivatedRouteStub} from '../testing/activated_route_stub';
import {newMockAppData, newMockHostConfig, newMockHostConfigList, newMockHostUpdateStateSummary, newMockTestHarnessImage, newMockTestHarnessImageList} from '../testing/mtt_lab_mocks';

import {HostUpdateDialog, HostUpdateDialogData, UpdateMode} from './host_update_dialog';
import {HostsModule} from './hosts_module';
import {HostsModuleNgSummary} from './hosts_module.ngsummary';

describe('HostUpdateDialog', () => {
  let routerSpy: jasmine.SpyObj<Router>;
  let tfcClient: jasmine.SpyObj<TfcClient>;
  let notifier: jasmine.SpyObj<Notifier>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<HostUpdateDialog>>;
  let hostUpdateDialog: HostUpdateDialog;
  let hostUpdateDialogFixture: ComponentFixture<HostUpdateDialog>;

  const dialogData: HostUpdateDialogData = {selectedLab: 'lab1'};
  const hostConfigs: HostConfig[] = [
    newMockHostConfig('host-1', 'lab1', 'cluster-1', true),
    newMockHostConfig('host-2', 'lab1', 'cluster-1', true),
    newMockHostConfig('host-3', 'lab1', 'cluster-1', true),
    newMockHostConfig('host-4', 'lab1', 'cluster-2', true),
    newMockHostConfig('host-5', 'lab1', 'cluster-2', true),
    newMockHostConfig('host-6', 'lab1', 'cluster-2', true),
  ];
  const testHarnessImages: TestHarnessImage[] = [
    newMockTestHarnessImage(
        undefined, 'digest-1', 'repo', ['tag-1'], undefined, 'v1'),
    newMockTestHarnessImage(
        undefined, 'digest-2', undefined, ['tag-2'], undefined, 'v2'),
    newMockTestHarnessImage(
        undefined, 'digest-3', undefined, ['tag-3'], undefined, 'v3'),
    newMockTestHarnessImage(
        undefined, 'digest-4', undefined, ['tag-4'], undefined, 'v4'),
  ];

  beforeEach((() => {
    dialogRefSpy = jasmine.createSpyObj<MatDialogRef<HostUpdateDialog>>(
        'dialogRefSpy', ['close']);
    notifier = jasmine.createSpyObj<Notifier>(
        'notifier', ['showMessage', 'showError']);
    routerSpy =
        jasmine.createSpyObj<Router>('Router', ['navigate', 'navigateByUrl']);
    const activatedRouteSpy = new ActivatedRouteStub({});
    tfcClient = jasmine.createSpyObj('tfcClient', {
      getLabInfo: observableOf({
        labName: 'lab1',
        owners: ['user1'],
      }),
      getHostConfigs: observableOf({}),
      getTestHarnessImages: observableOf({}),
      batchUpdateHostMetadata: observableOf({}),
    });

    TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        HostsModule,
        HttpClientTestingModule,
      ],
      aotSummaries: HostsModuleNgSummary,
      providers: [
        {provide: MAT_DIALOG_DATA, useValue: dialogData},
        {provide: APP_DATA, useValue: newMockAppData()},
        {provide: MatDialogRef, useValue: dialogRefSpy},
        {provide: Notifier, useValue: notifier},
        {provide: Router, useValue: routerSpy},
        {provide: ActivatedRoute, useValue: activatedRouteSpy},
        {provide: TfcClient, useValue: tfcClient},
      ],
    });
    hostUpdateDialogFixture = TestBed.createComponent(HostUpdateDialog);
    hostUpdateDialog = hostUpdateDialogFixture.componentInstance;
  }));

  it('initializes a component', () => {
    hostUpdateDialogFixture.detectChanges();
    expect(hostUpdateDialog).toBeTruthy();
  });

  it('gets lab info correctly', () => {
    tfcClient.getLabInfo.and.returnValue(observableOf({
      labName: 'lab1',
      owners: ['user1'],
      hostUpdateStateSummary:
          convertToHostUpdateStateSummary(newMockHostUpdateStateSummary()),
    }));
    hostUpdateDialogFixture.detectChanges();
    hostUpdateDialogFixture.whenStable().then(() => {
      expect(hostUpdateDialog.labInfo).toBeTruthy();
      expect(hostUpdateDialog.labInfo?.labName).toEqual('lab1');
      expect(hostUpdateDialog.labInfo?.owners).toEqual(['user1']);
      expect(hostUpdateDialog.labInfo?.hostUpdateStateSummary).toBeTruthy();
    });
  });

  it('calculate HostUpdating count correctly', () => {
    const hostUpdateStateSummary =
        convertToHostUpdateStateSummary(newMockHostUpdateStateSummary(
            '30', '5', '2', '10', '2', '1', '1', '0'));
    expect(hostUpdateDialog.getHostUpdatingCount(hostUpdateStateSummary))
        .toBe(14);
    expect(hostUpdateDialog.getHostUpdatingCount(null)).toBe(0);
  });

  it('calculate NoActiveUpdate count correctly', () => {
    const hostUpdateStateSummary =
        convertToHostUpdateStateSummary(newMockHostUpdateStateSummary(
            '30', '5', '2', '10', '2', '1', '1', '0'));
    expect(hostUpdateDialog.getHostNoActiveUpdateCount(hostUpdateStateSummary))
        .toBe(9);
    expect(hostUpdateDialog.getHostNoActiveUpdateCount(null)).toBe(0);
  });

  it('gets host configs correctly', () => {
    const hostConfigList = newMockHostConfigList(hostConfigs);
    tfcClient.getHostConfigs.and.returnValue(observableOf(hostConfigList));
    hostUpdateDialogFixture.detectChanges();
    hostUpdateDialogFixture.whenStable().then(() => {
      expect(hostUpdateDialog.hostConfigsInLab).toBeTruthy();
      expect(hostUpdateDialog.hostConfigsInLab).toEqual(hostConfigs);
    });
  });

  it('gets candidate host configs when host group is selected', () => {
    hostUpdateDialog.hostConfigsInLab = hostConfigs;
    hostUpdateDialog.selectedHostGroup = 'cluster-2';
    hostUpdateDialog.loadHostConfigsInSelectedHostGroup();
    expect(hostUpdateDialog.candidateHostConfigs).toEqual(hostConfigs.slice(3));
  });

  it('gets candidate host configs when host group is unselected', () => {
    hostUpdateDialog.hostConfigsInLab = hostConfigs;
    hostUpdateDialog.selectedHostGroup = '';
    hostUpdateDialog.loadHostConfigsInSelectedHostGroup();
    expect(hostUpdateDialog.candidateHostConfigs).toEqual(hostConfigs);
  });

  it('selects hosts correctly', () => {
    const hostNames = ['host-1', 'host-2'];
    hostUpdateDialog.setSelectedHosts(hostNames);
    expect(hostUpdateDialog.selectedHosts).toEqual(hostNames);
  });

  it('gets test harness images correctly', () => {
    const testHarnessImageList = newMockTestHarnessImageList(testHarnessImages);
    tfcClient.getTestHarnessImages.and.returnValue(
        observableOf(testHarnessImageList));
    hostUpdateDialogFixture.detectChanges();
    hostUpdateDialogFixture.whenStable().then(() => {
      expect(hostUpdateDialog.testHarnessImages).toBeTruthy();
      expect(hostUpdateDialog.testHarnessImages).toEqual(testHarnessImages);
    });
  });

  it('resets data correctly when select lab update mode', () => {
    hostUpdateDialog.hostConfigsInLab = hostConfigs;
    hostUpdateDialog.selectedHostGroup = 'cluster-2';
    hostUpdateDialog.selectedHosts = ['host-4', 'host-5'];
    hostUpdateDialog.onModeChange(
        new MatRadioChange({} as MatRadioButton, UpdateMode.LAB));
    expect(hostUpdateDialog.selectedHostGroup).toEqual('');
    expect(hostUpdateDialog.selectedHosts).toEqual([]);
  });

  it('resets data correctly when select host group update mode', () => {
    hostUpdateDialog.hostConfigsInLab = hostConfigs;
    hostUpdateDialog.selectedHostGroup = 'cluster-2';
    hostUpdateDialog.selectedHosts = ['host-4', 'host-5'];
    hostUpdateDialog.onModeChange(
        new MatRadioChange({} as MatRadioButton, UpdateMode.HOST_GROUP));
    expect(hostUpdateDialog.selectedHostGroup).toEqual('cluster-2');
    expect(hostUpdateDialog.selectedHosts).toEqual([]);
  });

  describe('getBatchUpdateHostMetadataRequest', () => {
    beforeEach(() => {
      hostUpdateDialog.selectedImage = testHarnessImages[0];
      hostUpdateDialog.hostConfigsInLab = hostConfigs;
    });

    it('throws error when no image is selected', () => {
      hostUpdateDialog.selectedImage = null;

      expect(hostUpdateDialog.getBatchUpdateHostMetadataRequest()).toBeNull();
      expect(notifier.showError)
          .toHaveBeenCalledOnceWith('No test harness image is selected.');
    });

    it('throws error when no host is selected', () => {
      hostUpdateDialog.selectedMode = UpdateMode.HOSTS;
      hostUpdateDialog.selectedHosts = [];

      expect(hostUpdateDialog.getBatchUpdateHostMetadataRequest()).toBeNull();
      expect(notifier.showError)
          .toHaveBeenCalledOnceWith('No host is selected.');
    });

    it('selects an entire lab correctly', () => {
      hostUpdateDialog.selectedMode = UpdateMode.LAB;

      const expectedRequest = {
        test_harness_image: 'repo:v1',
        hostnames: [
          'host-1',
          'host-2',
          'host-3',
          'host-4',
          'host-5',
          'host-6',
        ],
      };

      expect(hostUpdateDialog.getBatchUpdateHostMetadataRequest())
          .toEqual(expectedRequest);
    });

    it('selects an entire host group correctly', () => {
      hostUpdateDialog.selectedMode = UpdateMode.HOST_GROUP;
      hostUpdateDialog.selectedHostGroup = 'cluster-2';
      hostUpdateDialog.loadHostConfigsInSelectedHostGroup();

      const expectedRequest = {
        test_harness_image: 'repo:v1',
        hostnames: [
          'host-4',
          'host-5',
          'host-6',
        ],
      };

      expect(hostUpdateDialog.getBatchUpdateHostMetadataRequest())
          .toEqual(expectedRequest);
    });

    it('selects hosts correctly', () => {
      hostUpdateDialog.selectedMode = UpdateMode.HOSTS;
      hostUpdateDialog.selectedHosts = ['host-1', 'host-4'];

      const expectedRequest = {
        test_harness_image: 'repo:v1',
        hostnames: [
          'host-1',
          'host-4',
        ],
      };

      expect(hostUpdateDialog.getBatchUpdateHostMetadataRequest())
          .toEqual(expectedRequest);
    });
  });

  describe('onConfirmSetImage', () => {
    beforeEach(() => {
      hostUpdateDialog.selectedImage = testHarnessImages[0];
      hostUpdateDialog.selectedMode = UpdateMode.LAB;
    });

    it('reenables confirmation button if no hosts are selected', () => {
      hostUpdateDialog.hostConfigsInLab = [];

      hostUpdateDialog.onConfirmSetImage();

      expect(hostUpdateDialog.disableSetImageButton).toBeFalse();
    });

    it('submits set image confirmation request correctly', () => {
      hostUpdateDialog.hostConfigsInLab = hostConfigs.slice(0, 2);
      const observable = tfcClient.batchUpdateHostMetadata(
          hostUpdateDialog.getBatchUpdateHostMetadataRequest());

      hostUpdateDialog.onConfirmSetImage();

      observable.subscribe(() => {
        expect(notifier.showMessage)
            .toHaveBeenCalledOnceWith(
                'Successfully set image <repo:v1> on hosts: [host-1, host-2]');
      });
    });

    it('submits set image confirmation request correctly', () => {
      hostUpdateDialog.hostConfigsInLab = hostConfigs.slice(0, 2);
      tfcClient.batchUpdateHostMetadata.and.returnValue(
          throwError(new HttpErrorResponse({
            status: 400,
            statusText: 'Bad Request: some error message',
          })));
      const observable = tfcClient.batchUpdateHostMetadata(
          hostUpdateDialog.getBatchUpdateHostMetadataRequest());
      const expectedErrorMessage = 'Error when setting the image: ' +
          'Http failure response for (unknown url): ' +
          '400 Bad Request: some error message';

      hostUpdateDialog.onConfirmSetImage();

      observable.subscribe(() => {}, () => {
        expect(notifier.showError)
            .toHaveBeenCalledOnceWith(expectedErrorMessage);
      });
    });
  });
});
