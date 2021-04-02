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
import {UserService} from '../services/user_service';

/**
 * Checks user is admin or lab owner.
 */
@Pipe({name: 'permissionCheck'})
export class PermissionCheckPipe implements PipeTransform {
  constructor(private readonly userService: UserService) {}

  transform(labName?: string): boolean {
    if (labName) {
      return this.userService.isAdminOrMyLab(labName);
    } else {
      return this.userService.isAdmin;
    }
  }
}
