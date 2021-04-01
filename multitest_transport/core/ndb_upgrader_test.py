# Copyright 2020 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Unit tests for ndb_upgrader."""

from absl.testing import absltest
from tradefed_cluster.util import ndb_test_lib

from multitest_transport.core import ndb_upgrader
from multitest_transport.models import messages as mtt_messages
from multitest_transport.models import ndb_models


class NdbUpgraderTest(ndb_test_lib.NdbWithContextTest):

  # Mocking functions
  def _CreateMockTest(self, test_id='test.id', name='test name'):
    """Creates a mock ndb_models.Test object."""
    test = ndb_models.Test(name=name, command='command')
    test.key = mtt_messages.ConvertToKey(ndb_models.Test, test_id)
    test.put()
    return test

  def _CreateMockDeviceAction(self, action_id='action.id',
                              name='device action name'):
    """Creates a mock ndb_models.DeviceAction object."""
    device_action = ndb_models.DeviceAction(name=name)
    device_action.key = mtt_messages.ConvertToKey(ndb_models.DeviceAction,
                                                  action_id)
    device_action.put()
    return device_action

  def _CreateMockTestResourcePipe(self, name='resource_name',
                                  url='test.resource/url'):
    return ndb_models.TestResourcePipe(name=name, url=url)

  def _CreateMockTestResourceObj(self, name='resource_name',
                                 url='test.resource/url'):
    return ndb_models.TestResourceObj(name=name, url=url)

  def _CreateMockTestRunConfig(self, test, device_action_keys=None):
    """Creates a mock ndb_models.TestRunConfig object."""
    config = ndb_models.TestRunConfig(
        test_key=test.key, before_device_action_keys=device_action_keys,
        cluster='cluster', run_target='run_target')
    return config

  def _CreateMockTestPlan(self, configs, device_action_keys=None,
                          test_resource_pipes=None):
    """Creates a mock ndb_models.TestPlan object."""
    test_plan = ndb_models.TestPlan(
        test_run_configs=configs, name='name',
        before_device_action_keys=device_action_keys,
        test_resource_pipes=test_resource_pipes)
    test_plan.put()
    return test_plan

  # Update function tests
  def testUpdate12001(self):
    test = self._CreateMockTest()
    config_1 = self._CreateMockTestRunConfig(test, [])
    config_2 = self._CreateMockTestRunConfig(test, [])
    device_action_1 = self._CreateMockDeviceAction(action_id='action.1')
    device_action_2 = self._CreateMockDeviceAction(action_id='action.2')
    device_action_keys = [device_action_1.key, device_action_2.key]
    pipe_1 = self._CreateMockTestResourcePipe(name='resource_1')
    pipe_2 = self._CreateMockTestResourcePipe(name='resource_2')
    test_plan = self._CreateMockTestPlan(configs=[config_1, config_2],
                                         device_action_keys=device_action_keys,
                                         test_resource_pipes=[pipe_1, pipe_2])

    ndb_upgrader.Update12001()

    updated_test_plan = test_plan.key.get()
    obj_1 = self._CreateMockTestResourceObj(pipe_1.name)
    obj_2 = self._CreateMockTestResourceObj(pipe_2.name)
    for config in updated_test_plan.test_run_configs:
      self.assertEqual(config.before_device_action_keys, device_action_keys)
      self.assertEqual(config.test_resource_objs, [obj_1, obj_2])


if __name__ == '__main__':
  absltest.main()
