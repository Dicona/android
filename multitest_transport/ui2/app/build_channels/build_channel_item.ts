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

import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';

import {BuildChannel, isBuildChannelAvailable, isDefaultBuildChannel} from '../services/mtt_models';
import {assertRequiredInput} from '../shared/util';

/** A component for displaying a list of build channels. */
@Component({
  selector: 'build-channel-item',
  styleUrls: ['build_channel_item.css'],
  templateUrl: './build_channel_item.ng.html',
})
export class BuildChannelItem implements OnInit {
  isBuildChannelAvailable = isBuildChannelAvailable;
  columnsToDisplay = ['id', 'provider_name', 'state'];
  isDefault = true;

  @Input() buildChannel!: BuildChannel;
  @Input() edit = true;

  @Output() authorize = new EventEmitter<string>();
  @Output() deleteItem = new EventEmitter<BuildChannel>();

  ngOnInit() {
    assertRequiredInput(
        this.buildChannel, 'buildChannel', 'build_channel_item');
    this.isDefault = isDefaultBuildChannel(this.buildChannel);
  }
}
