# Copyright 2019 Google LLC
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

"""Web hook implementation."""
import logging
import string
from six.moves import urllib

from google.appengine.api import modules

from multitest_transport.plugins import base


class WebHook(base.TestRunHook):
  """Hook which makes HTTP requests during a test run."""
  name = 'Web'

  def __init__(self, url=None, http_method=None, data=None, **_):
    self.url = url
    self.http_method = http_method or 'GET'
    self.data = data

  def Execute(self, test_run, phase):
    """Make HTTP request according to test run context."""
    context = test_run.GetContext()
    url = string.Template(self.url).safe_substitute(context)
    data = None
    if self.data:
      data = string.Template(self.data).safe_substitute(context)
    hostname = modules.get_hostname('default')
    logging.info('Invoking a webhook: url=%s, method=%s, data=%s',
                 url, self.http_method, data)
    request = urllib.request.Request(
        url=url, data=data, headers={'X-MTT-HOST': hostname})
    request.get_method = lambda: self.http_method
    response = urllib.request.urlopen(request)
    logging.info('Response: %s', response.read())
