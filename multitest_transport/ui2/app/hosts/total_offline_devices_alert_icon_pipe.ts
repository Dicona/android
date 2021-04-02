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

import {Pipe, PipeTransform} from '@angular/core';

/**
 * Gets a mat-icon name for total offline devices.
 * We use the 'error' icon here with yellow color and the 'warning' icon with
 * red color.
 */
@Pipe({name: 'totalOfflineDevicesAlertIcon'})
export class TotalOfflineDevicesAlertIconPipe implements PipeTransform {
  transform(offlineDevices: number, allDevices: number, highlightRatio: number):
      string {
    if (offlineDevices === 0 && allDevices >= 0) {
      return 'disabled';
    } else if (
        offlineDevices > 0 && offlineDevices > highlightRatio * allDevices) {
      return 'warning';
    }

    return 'error';
  }
}
