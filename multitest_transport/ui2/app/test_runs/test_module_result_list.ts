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

import {Component, Input, OnInit} from '@angular/core';
import {finalize} from 'rxjs/operators';

import {MttClient} from '../services/mtt_client';
import * as mttModels from '../services/mtt_models';
import {Notifier} from '../services/notifier';
import {InvocationStatus} from '../services/tfc_models';
import {assertRequiredInput, buildApiErrorMessage} from '../shared/util';

/**
 * Information for displaying the module results and its corresponding testcases
 */
interface ModuleResultNode {
  expanded: boolean;
  isLoading: boolean;
  moduleResult: mttModels.TestModuleResult;
  testCaseResults: mttModels.TestCaseResult[];
  nextPageToken?: string;
}

/**
 * Displays a list of test suite modules from the test results.
 */
@Component({
  selector: 'test-module-result-list',
  styleUrls: ['test_module_result_list.css'],
  templateUrl: './test_module_result_list.ng.html',
})
export class TestModuleResultList implements OnInit {
  @Input() testRunId!: string;
  @Input() invocationStatus?: InvocationStatus;  // Used if no sql data

  moduleResultNodes: ModuleResultNode[] = [];
  modulePageToken?: string;

  isModulesLoading = false;
  showOldView = false;

  constructor(
      private readonly notifier: Notifier,
      private readonly mttClient: MttClient,
  ) {}

  ngOnInit() {
    assertRequiredInput(this.testRunId, 'testRunId', 'test-result-module-list');
    this.loadModules();
  }

  loadModules(loadNextPage = false) {
    if (loadNextPage && !this.modulePageToken) {
      // Ignore if there are no more items to load
      return;
    }

    this.isModulesLoading = true;
    this.mttClient.testResults.listModules(this.testRunId, this.modulePageToken)
        .pipe(finalize(() => {
          this.isModulesLoading = false;
        }))
        .subscribe(
            res => {
              for (const module of (res.results || [])) {
                this.moduleResultNodes.push(
                    this.createModuleResultNode(module));
                this.modulePageToken = res.next_page_token;
              }
            },
            error => {
              // TODO: Show old view if no data available
              this.showOldView = true;
              console.log(
                  'No parsed results available. Showing invocation status results instead.');
            },
        );
  }

  expandModule(moduleIndex: number) {
    if (this.moduleResultNodes[moduleIndex].expanded) {
      this.moduleResultNodes[moduleIndex].expanded = false;
      return;
    }
    this.moduleResultNodes[moduleIndex].expanded = true;
    this.loadTestCases(moduleIndex);
  }

  loadTestCases(moduleIndex: number) {
    if (this.moduleResultNodes[moduleIndex].testCaseResults.length) {
      // Only load items the first time the node is expanded
      return;
    }

    this.moduleResultNodes[moduleIndex].isLoading = true;
    const moduleId = this.moduleResultNodes[moduleIndex].moduleResult.id;
    this.mttClient.testResults.listTestCases(moduleId)
        .pipe(finalize(() => {
          this.moduleResultNodes[moduleIndex].isLoading = false;
        }))
        .subscribe(
            res => {
              this.moduleResultNodes[moduleIndex].testCaseResults =
                  res.results || [];
              this.moduleResultNodes[moduleIndex].nextPageToken =
                  res.next_page_token;
            },
            error => {
              this.notifier.showError(
                  `Failed to load test cases for module '${
                      this.moduleResultNodes[moduleIndex].moduleResult.name}'`,
                  buildApiErrorMessage(error));
            },
        );
  }

  loadMoreTestCases(moduleIndex: number) {
    if (!this.moduleResultNodes[moduleIndex].nextPageToken) {
      // Ignore if there are no more items to load
      return;
    }

    this.moduleResultNodes[moduleIndex].isLoading = true;
    const moduleNode = this.moduleResultNodes[moduleIndex];
    this.mttClient.testResults
        .listTestCases(moduleNode.moduleResult.id, moduleNode.nextPageToken)
        .pipe(finalize(() => {
          this.moduleResultNodes[moduleIndex].isLoading = false;
        }))
        .subscribe(
            res => {
              this.moduleResultNodes[moduleIndex].testCaseResults =
                  this.moduleResultNodes[moduleIndex].testCaseResults.concat(
                      res.results || []);
              this.moduleResultNodes[moduleIndex].nextPageToken =
                  res.next_page_token;
            },
            error => {
              this.notifier.showError(
                  `Failed to load test cases for module '${
                      moduleNode.moduleResult.name}'`,
                  buildApiErrorMessage(error));
            },
        );
  }

  getStatusString(testCaseResult: mttModels.TestCaseResult): string {
    if (testCaseResult.status === mttModels.TestStatus.ASSUMPTION_FAILURE ||
        testCaseResult.status === mttModels.TestStatus.IGNORED) {
      return 'SKIPPED';
    }
    return testCaseResult.status;
  }

  showStackTrace(testCaseResult: mttModels.TestCaseResult) {
    // TODO: Switch to sidenav view later
    this.notifier.showError(
        testCaseResult.name, {
          message: testCaseResult.error_message,
          stacktrace: testCaseResult.stack_trace,
        },
        'Error message');
  }

  createModuleResultNode(module: mttModels.TestModuleResult): ModuleResultNode {
    return {
      expanded: false,
      isLoading: false,
      moduleResult: module,
      testCaseResults: [],
    } as ModuleResultNode;
  }
}
