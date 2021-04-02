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

/** Renders a file size as a human-friendly format. */
@Pipe({name: 'fileSize'})
export class FileSizePipe implements PipeTransform {
  transform(value?: number): string {
    if (value === undefined) {
      return '-';
    }
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const index = Math.min(
        value > 0 ? Math.floor(Math.log(value) / Math.log(1024)) : 0,
        units.length - 1);
    value = value / (1024 ** index);
    return value.toFixed(1) + ' ' + units[index];
  }
}
