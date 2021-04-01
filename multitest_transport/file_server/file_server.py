# Lint as: python3
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

"""Android Test Station local file server."""
import enum
import hashlib
import http
import logging
import os
import re
import shutil
import stat
import tempfile
from typing import List

from absl import app as absl_app
from absl import flags
import attr
import flask

DEFAULT_CHUNK_SIZE = 4 * 1024  # Default chunk size when writing to file (4 MB)

flask_app = flask.Flask(__name__, static_folder=None)


@flask_app.errorhandler(Exception)
def HandleException(error):
  """Converts all exceptions into JSON error responses."""
  flask_app.logger.error(error)
  code = getattr(error, 'code', http.HTTPStatus.INTERNAL_SERVER_ERROR)
  message = getattr(error, 'description', None)
  return flask.jsonify({'code': code, 'message': message}), code


@flask_app.route('/file/<path:path>', methods=['GET'])
def DownloadFile(path: str) -> flask.Response:
  """Retrieve file content."""
  resolved_path = flask.safe_join(flask.current_app.root_path, path)
  if not os.path.isfile(resolved_path):
    flask.abort(http.HTTPStatus.NOT_FOUND, 'File \'%s\' not found' % path)
  return flask.send_file(resolved_path, conditional=True)


def _GetContentRange():
  """Parse headers to determine offset and whether there are more chunks."""
  content_range = flask.request.headers.get('content-range')
  if content_range is None:
    # No Content-Range found, assume this is all the content
    return 0, True
  # Parse header parts and determine whether this is the final request
  match = re.match('bytes ([0-9]+)-([0-9]+)/(\\*|[0-9]+)', content_range)
  if not match:
    return flask.abort(http.HTTPStatus.BAD_REQUEST,
                       'Invalid content range %s' % content_range)
  start_byte = int(match.group(1))
  end_byte = int(match.group(2))
  total_size = int(match.group(3)) if match.group(3) != '*' else None
  return start_byte, total_size == end_byte + 1


def _WriteStreamToFile(file, chunk_size=DEFAULT_CHUNK_SIZE):
  """Write a data stream to a file-like object."""
  while True:
    chunk = flask.request.stream.read(chunk_size)
    if not chunk:
      break
    file.write(chunk)


@flask_app.route('/file/<path:path>', methods=['PUT', 'POST'])
def UploadFile(path: str) -> flask.Response:
  """Upload a file to a path."""
  resolved_path = flask.safe_join(flask.current_app.root_path, path)
  # Find or create a temporary upload file
  tmp_name = hashlib.sha512(resolved_path.encode()).hexdigest()
  tmp_path = os.path.join(flask.current_app.tmp_upload_dir, tmp_name)

  # Write or append the content to the temporary file
  start_byte, is_final_chunk = _GetContentRange()
  if start_byte == 0:
    # Start new upload, overwrite any existing content
    with open(tmp_path, mode='wb') as tmp_file:
      _WriteStreamToFile(tmp_file)
  else:
    # Resume existing upload, append content if the offsets match
    try:
      next_byte = os.path.getsize(tmp_path)
    except OSError as e:
      flask_app.logger.warning('Failed to calculate offset: %s', e)
      next_byte = 0
    if start_byte != next_byte:
      flask.abort(http.HTTPStatus.BAD_REQUEST,
                  'Invalid offset %d (expected %d)' % (start_byte, next_byte))
    with open(tmp_path, mode='ab') as tmp_file:
      _WriteStreamToFile(tmp_file)

  # If this is the last chunk, then move the file to its final destination
  if is_final_chunk:
    flask_app.logger.info('Finished uploading \'%s\'', resolved_path)
    os.makedirs(os.path.dirname(resolved_path), exist_ok=True)
    shutil.move(tmp_path, resolved_path)
    return flask.Response(status=http.HTTPStatus.CREATED)
  return flask.Response(status=http.HTTPStatus.PARTIAL_CONTENT)


@flask_app.route('/file/<path:path>', methods=['DELETE'])
def DeleteFile(path: str) -> flask.Response:
  """Delete a file if it exists."""
  resolved_path = flask.safe_join(flask.current_app.root_path, path)
  if os.path.isfile(resolved_path):
    os.remove(resolved_path)
  return flask.Response(status=http.HTTPStatus.NO_CONTENT)


class FileType(str, enum.Enum):
  """File node type."""
  DIRECTORY = 'DIRECTORY'  # Directory
  FILE = 'FILE'  # Regular file
  OTHER = 'OTHER'  # Other type (e.g. symlink, special device)

  @classmethod
  def FromStatInfo(cls, stat_info: os.stat_result):
    """Determine file type from file stat information."""
    mode = stat_info.st_mode
    if stat.S_ISDIR(mode):
      return FileType.DIRECTORY
    if stat.S_ISREG(mode):
      return FileType.FILE
    return FileType.OTHER


@attr.s(frozen=True, order=False)
class FileNode(object):
  """File node information."""
  path = attr.ib()  # Relative path
  name = attr.ib()  # File name
  type = attr.ib()  # File type
  size = attr.ib()  # File size (bytes)
  access_time = attr.ib()  # Last access timestamp (epoch millis)
  update_time = attr.ib()  # Last update timestamp (epoch millis)

  @classmethod
  def FromPath(cls, path: str):
    """Construct node object from a resolved file path."""
    try:
      root_path = flask.current_app.root_path
      stat_info = os.stat(path)
      return FileNode(
          path=os.path.relpath(path, root_path),
          name=os.path.basename(path),
          type=FileType.FromStatInfo(stat_info),
          size=stat_info.st_size,
          access_time=int(stat_info.st_atime * 1000),
          update_time=int(stat_info.st_mtime * 1000))
    except IOError:
      return None

  def __lt__(self, other):
    """Compares file paths, giving precedence to directories."""
    if self.type != other.type:
      if self.type == FileType.DIRECTORY:
        return True
      if other.type == FileType.DIRECTORY:
        return False
    return self.path < other.path


@flask_app.route('/dir', strict_slashes=False, methods=['GET'])
@flask_app.route('/dir/<path:path>', methods=['GET'])
def ListDirectory(path: str = '') -> flask.Response:
  """List all nodes in a directory."""
  resolved_path = flask.safe_join(flask.current_app.root_path, path)
  if not os.path.isdir(resolved_path):
    flask.abort(http.HTTPStatus.NOT_FOUND, 'Directory \'%s\' not found' % path)
  # Convert all nested files into nodes
  nodes = []
  for filename in os.listdir(resolved_path):
    node = FileNode.FromPath(os.path.join(resolved_path, filename))
    if node:
      nodes.append(node)
  return flask.jsonify([child.__dict__ for child in sorted(nodes)])


# Development server flags
FLAGS = flags.FLAGS
flags.DEFINE_boolean('debug', False, 'Run server in debug mode (live reload).')
flags.DEFINE_integer('port', 8006, 'File server\'s port.')
flags.DEFINE_string('root_path', None, 'File server\'s base directory.')


def main(_: List[str]):
  """Initializes the application and starts the development server."""
  with tempfile.TemporaryDirectory() as tmp_upload_dir:
    flask_app.logger = logging
    flask_app.root_path = FLAGS.root_path
    flask_app.tmp_upload_dir = tmp_upload_dir
    flask_app.run(host='0.0.0.0', port=FLAGS.port, debug=FLAGS.debug)


if __name__ == '__main__':
  # Entrypoint for the development server.
  flags.mark_flag_as_required('root_path')
  absl_app.run(main)
