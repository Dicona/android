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

import {DebugElement} from '@angular/core';
import {ComponentFixture, inject, TestBed} from '@angular/core/testing';
import {MatDialog} from '@angular/material/dialog';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {ActivatedRoute, Router} from '@angular/router';
import {RouterTestingModule} from '@angular/router/testing';
import {of as observableOf} from 'rxjs';

import {APP_DATA} from '../services';
import {TfcClient} from '../services/tfc_client';
import {DEFAULT_PAGE_SIZE} from '../shared/paginator';
import {getTextContent} from '../testing/jasmine_util';
import {newMockAppData, newMockLabHostInfoHistoryList} from '../testing/mtt_lab_mocks';

import {HostDetailsHistory} from './host_details_history';
import {HostsModule} from './hosts_module';
import {HostsModuleNgSummary} from './hosts_module.ngsummary';

describe('HostDetailsHistory', () => {
  const hostInfoHistoryList = newMockLabHostInfoHistoryList();

  let hostDetailsHistory: HostDetailsHistory;
  let hostDetailsHistoryFixture: ComponentFixture<HostDetailsHistory>;
  let tfcClient: jasmine.SpyObj<TfcClient>;
  let routerSpy: jasmine.SpyObj<Router>;

  let el: DebugElement;

  const HOSTNAME = 'Host1';

  beforeEach(() => {
    tfcClient = jasmine.createSpyObj('tfcClient', {
      'getHostHistory': observableOf(hostInfoHistoryList),
      'batchGetHostNotes': observableOf({}),
      'getPredefinedMessages': observableOf({}),
    });
    routerSpy = jasmine.createSpyObj(
        'Router', ['navigateByUrl', 'navigate', 'createUrlTree']);
    routerSpy.createUrlTree.and.returnValue({});

    TestBed.configureTestingModule({
      imports: [
        HostsModule,
        NoopAnimationsModule,
        RouterTestingModule,
      ],
      aotSummaries: HostsModuleNgSummary,
      providers: [
        {provide: APP_DATA, useValue: newMockAppData()},
        {provide: TfcClient, useValue: tfcClient},
        {
          provide: ActivatedRoute,
          useValue: {
            params: observableOf(),
            queryParams: observableOf({}),
          },
        },
        {provide: Router, useValue: routerSpy},
      ],
    });

    hostDetailsHistoryFixture = TestBed.createComponent(HostDetailsHistory);
    el = hostDetailsHistoryFixture.debugElement;
    hostDetailsHistory = hostDetailsHistoryFixture.componentInstance;
    hostDetailsHistory.id = HOSTNAME;
    hostDetailsHistory.historyList = hostInfoHistoryList.histories!;
    hostDetailsHistoryFixture.detectChanges();
  });

  afterEach(() => {
    hostDetailsHistoryFixture.destroy();
  });

  it('should get initialized correctly', () => {
    const textContent = getTextContent(el);
    expect(hostInfoHistoryList).toBeTruthy();
  });

  it('should call the tfc client api method getHostHistory and batchGetHostNotes correctly',
     async () => {
       await hostDetailsHistoryFixture.whenStable();
       expect(tfcClient.getHostHistory).toHaveBeenCalledTimes(1);
       expect(tfcClient.batchGetHostNotes).toHaveBeenCalledTimes(1);
     });

  it('can load previous page of host history', () => {
    hostDetailsHistory.id = HOSTNAME;
    hostDetailsHistory.prevPageToken = 'prev';
    hostDetailsHistory.nextPageToken = 'next';
    hostDetailsHistory.load(true);
    expect(tfcClient.getHostHistory)
        .toHaveBeenCalledWith(HOSTNAME, DEFAULT_PAGE_SIZE, 'prev', true);
  });

  it('can load next page of host history', () => {
    hostDetailsHistory.id = HOSTNAME;
    hostDetailsHistory.prevPageToken = 'prev';
    hostDetailsHistory.nextPageToken = 'next';
    hostDetailsHistory.load(false);
    expect(tfcClient.getHostHistory)
        .toHaveBeenCalledWith(HOSTNAME, DEFAULT_PAGE_SIZE, 'next', false);
  });

  it('can handle page size change', () => {
    hostDetailsHistory.id = HOSTNAME;
    hostDetailsHistory.nextPageToken = 'next';
    hostDetailsHistory.paginator.changePageSize(20);
    expect(tfcClient.getHostHistory)
        .toHaveBeenCalledWith(HOSTNAME, 20, undefined, false);
  });

  it('can update pagination parameters', inject([Router], (router: Router) => {
       tfcClient.getHostHistory.and.returnValue(observableOf(
           {histories: [], prev_cursor: 'prev', next_cursor: 'next'}));
       hostDetailsHistory.loadHistory(HOSTNAME);
       expect(hostDetailsHistory.prevPageToken).toEqual('prev');
       expect(hostDetailsHistory.nextPageToken).toEqual('next');
       expect(hostDetailsHistory.paginator.hasPrevious).toBe(true);
       expect(hostDetailsHistory.paginator.hasNext).toBe(true);
       expect(router.createUrlTree).toHaveBeenCalledWith(['/hosts', HOSTNAME], {
         queryParams: {
           historyPageToken: 'prev',
           historyPageSize: null,
         },
         queryParamsHandling: 'merge'
       });
     }));

  it('should open note dialog on editNote called', () => {
    const noteId = 100;
    const dialog = TestBed.inject(MatDialog);
    spyOn(dialog, 'open').and.callThrough();
    spyOn(hostDetailsHistory, 'editNote').and.callThrough();
    hostDetailsHistory.editNote(noteId);
    expect(dialog.open).toHaveBeenCalled();
    expect(hostDetailsHistory.editNote).toHaveBeenCalledWith(noteId);
  });

  it('should reload after dialog save clicked', () => {
    let dialogSpy: jasmine.Spy;
    const dialogRefSpy =
        jasmine.createSpyObj({afterClosed: observableOf(true), close: null});
    dialogSpy =
        spyOn(TestBed.inject(MatDialog), 'open').and.returnValue(dialogRefSpy);
    hostDetailsHistory.editNote(0);
    expect(dialogSpy).toHaveBeenCalled();
    expect(dialogRefSpy.afterClosed).toHaveBeenCalled();
  });
});
