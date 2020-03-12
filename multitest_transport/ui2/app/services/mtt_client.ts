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

import {HttpClient, HttpParams} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {EMPTY, fromEvent, Observable, throwError} from 'rxjs';
import {first, map, switchMap} from 'rxjs/operators';

import {AnalyticsParams} from './analytics_service';
import {AuthService, REDIRECT_URI} from './auth_service';
import * as model from './mtt_models';

/** URL for MTT API methods */
export const MTT_API_URL = '/_ah/api/mtt/v1';

/** Client for MTT API access */
@Injectable({
  providedIn: 'root',
})
export class MttClient {
  readonly testRunActions: TestRunActionClient;

  constructor(
      private readonly http: HttpClient, private readonly auth: AuthService) {
    // TODO: Reorganize MttClient methods
    this.testRunActions = new TestRunActionClient(http, auth);
  }

  /**
   * Authorizes a build channel using an authorization code.
   * @param buildChannelId: build channel to authorize
   */
  authorizeBuildChannel(buildChannelId: string): Observable<void> {
    return this.getBuildChannelAuthorizationInfo(buildChannelId)
        .pipe(switchMap(authInfo => this.auth.getAuthorizationCode(authInfo)))
        .pipe(switchMap(code => {
          if (!code) {
            return EMPTY;
          }
          return this.sendBuildChannelAuthorizationCode(buildChannelId, code);
        }));
  }

  /** Sends build channel authorization code to complete flow. */
  private sendBuildChannelAuthorizationCode(
      buildChannelId: string, code: string): Observable<void> {
    const params = new AnalyticsParams('build_channels', 'authorize');
    return this.http.post<void>(
        `${MTT_API_URL}/build_channels/${
            encodeURIComponent(buildChannelId)}/auth_return`,
        {'redirect_uri': REDIRECT_URI, 'code': code}, {params});
  }

  /** Fetches a build channel's authorization information to start flow. */
  private getBuildChannelAuthorizationInfo(buildChannelId: string):
      Observable<model.AuthorizationInfo> {
    const params = new HttpParams().set('redirect_uri', REDIRECT_URI);
    return this.http.get<model.AuthorizationInfo>(
        `${MTT_API_URL}/build_channels/${
            encodeURIComponent(buildChannelId)}/auth`,
        {params});
  }

  listBuildItems(id: string, path: string, pageToken?: string):
      Observable<model.BuildItemList> {
    let params = new HttpParams().set('build_channel_id', id).set('path', path);
    if (pageToken) {
      params = params.set('page_token', pageToken);
    }
    return this.http.get<model.BuildItemList>(
        `${MTT_API_URL}/build_channels/${encodeURIComponent(id)}/build_items`,
        {params});
  }

  deleteBuildItem(id: string, path: string) {
    const params = new AnalyticsParams('build_channels', 'delete_build_item');
    return this.http.post(
        `${MTT_API_URL}/build_channels/${
            encodeURIComponent(id)}/build_items/delete`,
        {path}, {params});
  }

  getBuildChannelProviders(): Observable<model.BuildChannelProviderList> {
    return this.http.get<model.BuildChannelProviderList>(
        `${MTT_API_URL}/build_channel_providers`);
  }

  getBuildChannelProvider(id: string) {
    return this.http.get(
        `${MTT_API_URL}/build_channel_providers/${encodeURIComponent(id)}`);
  }

  createBuildChannel(buildChannelConfig: model.BuildChannelConfig) {
    const params = new AnalyticsParams('build_channels', 'create');
    return this.http.post(
        `${MTT_API_URL}/build_channels`, buildChannelConfig, {params});
  }

  getBuildChannel(id: string) {
    return this.http.get<model.BuildChannelConfig>(
        `${MTT_API_URL}/build_channels/${encodeURIComponent(id)}`);
  }

  getBuildChannels(): Observable<model.BuildChannelList> {
    return this.http.get<model.BuildChannelList>(
        `${MTT_API_URL}/build_channels`);
  }

  updateBuildChannel(
      buildChannelId: string, buildChannelConfig: model.BuildChannelConfig) {
    const params = new AnalyticsParams('build_channels', 'update');
    return this.http.put(
        `${MTT_API_URL}/build_channels/${encodeURIComponent(buildChannelId)}`,
        buildChannelConfig, {params});
  }

  deleteBuildChannel(id: string) {
    const params = new AnalyticsParams('build_channels', 'delete');
    return this.http.post(
        `${MTT_API_URL}/build_channels/${encodeURIComponent(id)}/delete`, null,
        {params});
  }

  getConfigSetBuildChannels(): Observable<model.BuildChannelList> {
    return this.http.get(`${MTT_API_URL}/config_sets/build_channels`);
  }

  getConfigSetInfos(
      includeRemote = false, statuses: model.ConfigSetStatus[] = []):
      Observable<model.ConfigSetInfoList> {
    const params = new HttpParams({
      fromObject: {
        'include_remote': `${includeRemote}`,
        'statuses': statuses,
      }
    });
    return this.http.get<model.ConfigSetInfoList>(
        `${MTT_API_URL}/config_sets`, {params});
  }

  importConfigSet(url = '', content = ''): Observable<model.ConfigSetInfo> {
    const params = new AnalyticsParams('config_sets', 'import');
    return this.http.post<model.ConfigSetInfo>(
        `${MTT_API_URL}/config_sets/import`, {'url': url, 'content': content},
        {params});
  }

  getDeviceAction(id: string): Observable<model.DeviceAction> {
    return this.http.get<model.DeviceAction>(
        `${MTT_API_URL}/device_actions/${encodeURIComponent(id)}`);
  }

  getDeviceActionList(): Observable<model.DeviceActionList> {
    return this.http.get<model.DeviceActionList>(
        `${MTT_API_URL}/device_actions`);
  }

  createDeviceAction(deviceAction: model.DeviceAction) {
    const params = new AnalyticsParams('device_actions', 'create');
    return this.http.post(
        `${MTT_API_URL}/device_actions`, deviceAction, {params});
  }

  updateDeviceAction(id: string, deviceAction: model.DeviceAction) {
    const params = new AnalyticsParams('device_actions', 'update');
    return this.http.post(
        `${MTT_API_URL}/device_actions/${encodeURIComponent(id)}`, deviceAction,
        {params});
  }

  deleteDeviceAction(id: string) {
    const params = new AnalyticsParams('device_actions', 'delete');
    return this.http.post(
        `${MTT_API_URL}/device_actions/${encodeURIComponent(id)}/delete`, null,
        {params});
  }

  createNewTestRunRequest(newtestRun: model.NewTestRunRequest):
      Observable<model.TestRun> {
    const params = new AnalyticsParams('test_runs', 'create');
    return this.http.post<model.TestRun>(
        `${MTT_API_URL}/test_runs`, newtestRun, {params});
  }

  getNodeConfig(): Observable<model.NodeConfig> {
    return this.http.get<model.NodeConfig>(`${MTT_API_URL}/node_config`);
  }

  updateNodeConfig(nodeConfig: model.NodeConfig) {
    const params = new AnalyticsParams('node_config', 'update');
    return this.http.post(`${MTT_API_URL}/node_config`, nodeConfig, {params});
  }

  exportNodeConfig(): Observable<model.SimpleMessage> {
    const params = new AnalyticsParams('node_config', 'export');
    return this.http.get<model.SimpleMessage>(
        `${MTT_API_URL}/node_config/export`, {params});
  }

  importNodeConfig(value: string): Observable<void> {
    const params = new AnalyticsParams('node_config', 'import');
    return this.http.post<void>(
        `${MTT_API_URL}/node_config/import`, {'value': value}, {params});
  }

  getPrivateNodeConfig(): Observable<model.PrivateNodeConfig> {
    return this.http.get<model.PrivateNodeConfig>(
        `${MTT_API_URL}/private_node_config`);
  }

  updatePrivateNodeConfig(privateNodeConfig: model.PrivateNodeConfig) {
    const params = new AnalyticsParams('private_node_config', 'update');
    return this.http.post(
        `${MTT_API_URL}/private_node_config`, privateNodeConfig, {params});
  }

  createTest(test: model.Test) {
    const params = new AnalyticsParams('tests', 'create');
    return this.http.post(`${MTT_API_URL}/tests`, test, {params});
  }

  getTest(id: string): Observable<model.Test> {
    return this.http.get<model.Test>(
        `${MTT_API_URL}/tests/${encodeURIComponent(id)}`);
  }

  getTests(): Observable<model.TestList> {
    return this.http.get<model.TestList>(`${MTT_API_URL}/tests`);
  }

  updateTest(testId: string, test: model.Test) {
    const params = new AnalyticsParams('tests', 'update');
    return this.http.post(
        `${MTT_API_URL}/tests/${encodeURIComponent(testId)}`, test, {params});
  }

  deleteTest(id: string) {
    const params = new AnalyticsParams('tests', 'delete');
    return this.http.post(
        `${MTT_API_URL}/tests/${encodeURIComponent(id)}/delete`, null,
        {params});
  }

  createTestPlan(testPlan: model.TestPlan) {
    const params = new AnalyticsParams('test_plans', 'create');
    return this.http.post<model.TestPlan>(
        `${MTT_API_URL}/test_plans`, testPlan, {params});
  }

  updateTestPlan(testPlanId: string, testPlan: model.TestPlan) {
    const params = new AnalyticsParams('test_plans', 'update');
    return this.http.post<model.TestPlan>(
        `${MTT_API_URL}/test_plans/${encodeURIComponent(testPlanId)}`, testPlan,
        {params});
  }

  getTestPlan(id: string): Observable<model.TestPlan> {
    return this.http.get<model.TestPlan>(
        `${MTT_API_URL}/test_plans/${encodeURIComponent(id)}`);
  }

  getTestPlans(): Observable<model.TestPlanList> {
    return this.http.get<model.TestPlanList>(`${MTT_API_URL}/test_plans`);
  }

  runTestPlan(id: string) {
    const params = new AnalyticsParams('test_plans', 'run');
    return this.http.post(
        `${MTT_API_URL}/test_plans/${encodeURIComponent(id)}/run`, null,
        {params});
  }

  deleteTestPlan(id: string) {
    const params = new AnalyticsParams('test_plans', 'delete');
    return this.http.post(
        `${MTT_API_URL}/test_plans/${encodeURIComponent(id)}/delete`, null,
        {params});
  }

  getTestRun(id: string): Observable<model.TestRun> {
    return this.http.get<model.TestRun>(
        `${MTT_API_URL}/test_runs/${encodeURIComponent(id)}`);
  }

  cancelTestRun(id: string) {
    const params = new AnalyticsParams('test_runs', 'cancel');
    return this.http.post(
        `${MTT_API_URL}/test_runs/${encodeURIComponent(id)}/cancel`, null,
        {params});
  }

  getTestRuns(
      maxResults?: number, pageToken?: string, backwards = false,
      filterQueries: string[] = [],
      state: model.TestRunState[] = []): Observable<model.TestRunSummaryList> {
    const params = new HttpParams({
      fromObject: {
        'max_results': maxResults ? String(maxResults) : '',
        'page_token': pageToken || '',
        'backwards': String(backwards),
        'filter_query': filterQueries,
        'state': state,
      }
    });

    return this.http.get<model.TestRunSummaryList>(
        `${MTT_API_URL}/test_runs`, {params});
  }

  getTestRunOutput(
      testRunId: string, attemptId: string, path: string,
      offset?: number): Observable<model.TestRunOutput> {
    let params =
        new HttpParams().set('attempt_id', attemptId).set('path', path);
    if (typeof offset !== 'undefined') {
      params = params.set('offset', String(offset));
    }

    return this.http.get<model.TestRunOutput>(
        `${MTT_API_URL}/test_runs/${encodeURIComponent(testRunId)}/output`,
        {params});
  }
}

/** Provides access to the test run action API. */
export class TestRunActionClient {
  /** Backend path which serves test run action data. */
  static readonly PATH = `${MTT_API_URL}/test_run_actions`;

  constructor(
      private readonly http: HttpClient, private readonly auth: AuthService) {}

  /** Lists all test run actions. */
  list(): Observable<model.TestRunAction[]> {
    return this.http.get<model.TestRunActionList>(TestRunActionClient.PATH)
        .pipe(map(result => result.actions || []));
  }

  /** Returns a test run action using its ID. */
  get(id: string): Observable<model.TestRunAction> {
    return this.http.get<model.TestRunAction>(
        `${TestRunActionClient.PATH}/${encodeURIComponent(id)}`);
  }

  /** Creates a new test run action. */
  create(data: model.TestRunAction): Observable<model.TestRunAction> {
    const params = new AnalyticsParams('test_run_actions', 'create');
    return this.http.post<model.TestRunAction>(
        TestRunActionClient.PATH, data, {params});
  }

  /** Updates an existing test run action. */
  update(id: string, data: model.TestRunAction):
      Observable<model.TestRunAction> {
    const params = new AnalyticsParams('test_run_actions', 'update');
    return this.http.put<model.TestRunAction>(
        `${TestRunActionClient.PATH}/${encodeURIComponent(id)}`, data, {params});
  }

  /** Deletes a test run action. */
  delete(id: string): Observable<void> {
    const params = new AnalyticsParams('test_run_actions', 'delete');
    return this.http.delete<void>(
        `${TestRunActionClient.PATH}/${encodeURIComponent(id)}`, {params});
  }

  /** Authorizes a test run action. */
  authorize(id: string): Observable<void> {
    return this.getAuthorizationInfo(id)
        .pipe(switchMap(authInfo => this.auth.getAuthorizationCode(authInfo)))
        .pipe(switchMap(
            code => code ? this.sendAuthorizationCode(id, code) : EMPTY));
  }

  /** Authorizes a test run action with a service account JSON key. */
  authorizeWithServiceAccount(id: string, key: Blob): Observable<void> {
    const reader = new FileReader();
    const uploadObs =
        fromEvent(reader, 'loadend').pipe(first()).pipe(switchMap(() => {
          if (reader.error) {
            return throwError(reader.error);
          }
          const params = new AnalyticsParams('test_run_actions', 'authorize');
          return this.http.put<void>(
              `${TestRunActionClient.PATH}/${encodeURIComponent(id)}/auth`,
              {value: reader.result}, {params});
        }));
    reader.readAsBinaryString(key);
    return uploadObs;
  }

  /** Revokes a test run action's authorization. */
  unauthorize(id: string): Observable<void> {
    const params = new AnalyticsParams('test_run_actions', 'unauthorize');
    return this.http.delete<void>(
        `${TestRunActionClient.PATH}/${encodeURIComponent(id)}/auth`, {params});
  }

  // Fetches authorization information to start authorization flow.
  private getAuthorizationInfo(id: string):
      Observable<model.AuthorizationInfo> {
    const params = new HttpParams().set('redirect_uri', REDIRECT_URI);
    return this.http.get<model.AuthorizationInfo>(
        `${TestRunActionClient.PATH}/${encodeURIComponent(id)}/auth`, {params});
  }

  // Sends authorization code to complete authorization flow.
  private sendAuthorizationCode(id: string, code: string): Observable<void> {
    const params = new AnalyticsParams('test_run_actions', 'authorize');
    return this.http.post<void>(
        `${TestRunActionClient.PATH}/${encodeURIComponent(id)}/auth`,
        {'redirect_uri': REDIRECT_URI, 'code': code}, {params});
  }
}
