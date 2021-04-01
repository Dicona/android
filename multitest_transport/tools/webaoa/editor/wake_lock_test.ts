/**
 * @license
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

import {ExecutionWakeLock} from './wake_lock';

describe('ExecutionWakeLock', () => {
  let audioContext: jasmine.SpyObj<AudioContext>;
  let gainNode: jasmine.SpyObj<GainNode>;
  let oscillator: jasmine.SpyObj<OscillatorNode>;

  let wakeLock: ExecutionWakeLock;

  beforeEach(() => {
    gainNode = jasmine.createSpyObj<GainNode>(
        ['connect'], {gain: {value: 0} as AudioParam});
    oscillator = jasmine.createSpyObj<OscillatorNode>(
        ['connect', 'disconnect', 'start'],
        {frequency: {value: 0} as AudioParam});
    audioContext = jasmine.createSpyObj<AudioContext>(
        {createGain: gainNode, createOscillator: oscillator}, ['destination']);
    spyOn(window, 'AudioContext').and.returnValue(audioContext);
    wakeLock = new ExecutionWakeLock();
  });

  it('should initialize and play audio when acquired', () => {
    wakeLock.acquire();
    expect(gainNode.connect).toHaveBeenCalledWith(audioContext.destination);
    expect(oscillator.start).toHaveBeenCalled();
    expect(oscillator.connect).toHaveBeenCalledWith(gainNode);
  });

  it('should not re-initialize when acquired multiple times', () => {
    wakeLock.acquire();
    wakeLock.acquire();  // acquiring again doesn't re-start audio
    expect(oscillator.start).toHaveBeenCalledTimes(1);
  });

  it('should stop audio when released', () => {
    wakeLock.acquire();
    expect(oscillator.disconnect).not.toHaveBeenCalled();
    wakeLock.release();
    expect(oscillator.disconnect).toHaveBeenCalled();
  });
});
