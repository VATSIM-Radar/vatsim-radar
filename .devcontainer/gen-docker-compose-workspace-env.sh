#!/usr/bin/env bash
# Copyright 2022 Hal Blackburn. MIT License.
VERSION="gen-docker-compose-workspace-env.sh version 1.0.1

https://github.com/h4l/dev-container-docker-compose-volume-or-bind/tree/v1.0.1

Tested with Remote Containers plugin version 0.232.3 - 0.232.6.
Future updates may break compatability."

set -eu -o pipefail
if [[ ${DEVCONTAINER_DEBUG:-} == true ]]; then
  set -x
fi

HELP="$(cat << "EOF"
Generate envars for devcontainer Docker Compose files

This program enables Docker Compose devcontainer services to be configured
consistently whether the devcontainer is using a local filesystem bind mount,
or a named container volume. It generates envars that can be referenced in the
Compose file.

Usage: gen-docker-compose-workspace-env.sh [options]

Options:

  --container-workspace-folder
    The value of the ${containerWorkspaceFolder} devcontainer.json placeholder

  --local-workspace-folder
    The value of the ${localWorkspaceFolder} devcontainer.json placeholders

  --user-id
    The user ID to own the .env,.env.d,.env.d/*.env files if running as root.
    Default: 1000

  --group-id
    The group ID to own the .env,.env.d,.env.d/*.env files if running as root.
    Default: 1000

  --env-dir
    The path of the directory to create .env and .env.d in.
    Default: . (the workspace root)

  --no-write
    Donʼt create .env,.env.d,.env.d/*.env (just print the envars)

  --version
    Show version info.

  --help
    Show this message.

Environment Variables:

The following envars are printed on stdout and written to a .env file:

  WORKSPACE_CONTAINER_VOLUME_SOURCE
    Only set for container volume workspaces. Typical value: vscode-projects
  WORKSPACE_CONTAINER_VOLUME_TARGET
    Only set for container volume workspaces. The mount point for the container
    volume in the devcontainer. Typical value: /workspaces
  WORKSPACE_BIND_MOUNT_SOURCE
    Only set for bind mount workspaces. The path of the workspace code on the
    host filesystem. Typical value: /home/name/projects/foo
  WORKSPACE_BIND_MOUNT_TARGET
    Only set for bind mount workspaces. The mount point for
    WORKSPACE_BIND_MOUNT_SOURCE, set to the value of the devcontainer.json
    "workspaceFolder" property. Typical value: /workspace
  WORKSPACE_SOURCE
    The source side of a "<source>:<target>" Compose file `volumes` entry which
    provides access to the workspace content. For container volume workspaces,
    this is the constant value "devcontainer-volume" (see the example compose
    file below). For bind mount workspaces, this is the
    WORKSPACE_BIND_MOUNT_SOURCE.
  WORKSPACE_TARGET
    The WORKSPACE_*_TARGET value for the current workspace type.
  WORKSPACE_ROOT
    The path of the workspace code in the devcontainer.
    - For volume workspaces this is an absolute path inside
      WORKSPACE_CONTAINER_VOLUME_TARGET.
    - For bind mount workspaces, this is the same as
      WORKSPACE_BIND_MOUNT_TARGET.

The .env file is created in the dir specified by --env-dir (default: project
root) by creating .env.d/50_workspace.env and then concattenating .env.d/*.env
into .env. This allows the .env file to contain envars generated elsewhere.

Dev Container Configuration:

Use this script by calling it from "initializeCommand" in your devcontainer.json
and including references to the envars it generates in your docker-compose.yaml:

  # .devcontainer/devcontainer.json
  {
      "dockerComposeFile": "docker-compose.yml",
      "service": "example-devcontainer",
      "workspaceFolder": "/workspace",
      // Generate .devcontainer/.env containing WORKSPACE_* envars for docker-compose.yml
      "initializeCommand": ".devcontainer/gen-docker-compose-workspace-env.sh --container-workspace-folder '${containerWorkspaceFolder}' --local-workspace-folder '${localWorkspaceFolder}'",
      // ...
  }

  # .devcontainer/docker-compose.yml
  version: "3.9"
  services:
    # vscode will connect to this service as the dev container
    devcontainer:
      build:
        context: .
        dockerfile: Dockerfile
      volumes:
        - ${WORKSPACE_SOURCE:?}:${WORKSPACE_TARGET:?}
      command: sleep infinity
      depends_on:
        - extra-service-container
      user: vscode
      env_file:
        # if you want to access the WORKSPACE_* envars in the container
        - .env

    # another container with access to the workspace files
    extra-service-container:
      image: alpine
      working_dir: ${WORKSPACE_ROOT:?}
      volumes:
        - ${WORKSPACE_SOURCE:?}:${WORKSPACE_TARGET:?}
      command: sleep infinity

  volumes:
    devcontainer-volume:
      name: ${WORKSPACE_CONTAINER_VOLUME_SOURCE:-not-used-in-bind-mount-workspace}
      external: ${WORKSPACE_IS_CONTAINER_VOLUME:?}
EOF
)"

while [[ $# -gt 0 ]]; do
  case $1 in
    --container-workspace-folder)
      CONTAINER_WORKSPACE_FOLDER="$2"
      shift; shift # shift past argument & value
      ;;
    --local-workspace-folder)
      LOCAL_WORKSPACE_FOLDER="$2"
      shift; shift
      ;;
    --user-id)
      USERID="$2"
      shift; shift
      ;;
    --group-id)
      GROUPID="$2"
      shift; shift
      ;;
    --env-dir)
      ENV_FILE_DIR="$2"
      shift; shift
      ;;
    --no-write)
      NO_WRITE="true"
      shift
      ;;
    --version)
      echo "$VERSION"
      exit 0
      ;;
    --help)
      echo "$HELP"
      exit 0
      ;;
    -*)
      echo "$0: Unknown option $1" >&2
      exit 1
      ;;
    *)
      echo "$0: Unexpected positional argument: $1" >&2
      exit 1
      ;;
  esac
done

ENV_FILE_DIR="${ENV_FILE_DIR:-.devcontainer}"
NO_WRITE="${NO_WRITE:-false}"
USERID="${USERID:-1000}"
GROUPID="${GROUPID:-1000}"
if [[ ${CONTAINER_WORKSPACE_FOLDER:-} == '' ]]; then
  echo "$0: --container-workspace-folder option or CONTAINER_WORKSPACE_FOLDER envar must be set" >&2
  exit 1
fi
CONTAINER_WORKSPACE_FOLDER="${CONTAINER_WORKSPACE_FOLDER:?}"
if [[ ${LOCAL_WORKSPACE_FOLDER:-} == '' ]]; then
  echo "$0: --local-workspace-folder option or LOCAL_WORKSPACE_FOLDER envar must be set" >&2
  exit 1
fi
LOCAL_WORKSPACE_FOLDER="${LOCAL_WORKSPACE_FOLDER:?}"

function workspace_is_in_container_volume() {
    # If we're able to determine a container volume using workspace_volume_name
    # then it should be safe to assume we are setting up a container volume
    # workspace.
    test "$(workspace_volume_name)" != ""
}

# Get the name of the Docker volume that contains the workspace code.
#
# (Only applicable when the workspace is in a container volume, not opened from
# a local filesystem bind mount.) VSCode doesn't provide a way to access this
# value, so we have to get it from daemon in a somewhat brittle manner.
function workspace_volume_name() {
    # This script is run from devcontainer.json#initializeCommand which is run
    # in a bootstrap container by VSCode, prior to the actual devcontainer being
    # started. This bootstrap container has the workspace's named container
    # volume mounted at /workspaces
    local CONTAINER_ID
    CONTAINER_ID="$(hostname)"
    # shellcheck disable=SC2016
    local WORKSPACE_MOUNT_SOURCE_FMT='
    {{- $source := "" }}
    {{- range .HostConfig.Mounts }}
      {{- if (and (eq .Type "volume") (eq .Target "/workspaces")) }}
        {{- $source = .Source }}
      {{- end }}
    {{- end }}
    {{- $source }}'
    docker container inspect "$CONTAINER_ID" \
        --format="$WORKSPACE_MOUNT_SOURCE_FMT" 2>/dev/null
}

if workspace_is_in_container_volume; then
  # With container volume workspaces:
  # - LOCAL_WORKSPACE_FOLDER is the path of the workspace dir in the mounted
  #     container volume (e.g. /workspaces/myproject), and this same path is
  #     also the path of the workspace in the devcontainer (container volume
  #     workspaces ignore the value of "workspaceFolder" in devcontainer.json).
  # - CONTAINER_WORKSPACE_FOLDER is the same as LOCAL_WORKSPACE_FOLDER
  #     (e.g. /workspaces/myproject).

  # The name of a container volume, typically vscode-projects
  WORKSPACE_CONTAINER_VOLUME_SOURCE="$(workspace_volume_name)" || {
    echo "Error: failed to determine workspace's container volume name" >&2;
    exit 1;
  }

  WORKSPACE_CONTAINER_VOLUME_TARGET="$(dirname "${LOCAL_WORKSPACE_FOLDER:?}")"
  # The 'devcontainer-volume' volume is defined in docker-compose.yml
  # as an external volume using the value of WORKSPACE_CONTAINER_VOLUME_SOURCE.
  WORKSPACE_SOURCE="devcontainer-volume"
  WORKSPACE_TARGET="$WORKSPACE_CONTAINER_VOLUME_TARGET"
  WORKSPACE_ROOT="${LOCAL_WORKSPACE_FOLDER:?}"
  WORKSPACE_IS_CONTAINER_VOLUME=true
  WORKSPACE_IS_BIND_MOUNT=false
else
  # With bind mount workspaces:
  # - LOCAL_WORKSPACE_FOLDER is the path of the project's code on the host
  #     (e.g. /home/me/projects/myproject).
  # - CONTAINER_WORKSPACE_FOLDER is the value of "workspaceFolder" in
  #     devcontainer.json (e.g. /workspace).

  WORKSPACE_BIND_MOUNT_SOURCE="${LOCAL_WORKSPACE_FOLDER:?}"
  WORKSPACE_BIND_MOUNT_TARGET="${CONTAINER_WORKSPACE_FOLDER:?}"
  WORKSPACE_SOURCE="$WORKSPACE_BIND_MOUNT_SOURCE"
  WORKSPACE_TARGET="$WORKSPACE_BIND_MOUNT_TARGET"
  WORKSPACE_ROOT="$WORKSPACE_BIND_MOUNT_TARGET"
  WORKSPACE_IS_CONTAINER_VOLUME=false
  WORKSPACE_IS_BIND_MOUNT=true
fi

ENVARS="$(
env -i WORKSPACE_CONTAINER_VOLUME_SOURCE="${WORKSPACE_CONTAINER_VOLUME_SOURCE:-}" \
       WORKSPACE_CONTAINER_VOLUME_TARGET="${WORKSPACE_CONTAINER_VOLUME_TARGET:-}" \
       WORKSPACE_BIND_MOUNT_SOURCE="${WORKSPACE_BIND_MOUNT_SOURCE:-}" \
       WORKSPACE_BIND_MOUNT_TARGET="${WORKSPACE_BIND_MOUNT_TARGET:-}" \
       WORKSPACE_SOURCE="${WORKSPACE_SOURCE:?}" \
       WORKSPACE_TARGET="${WORKSPACE_TARGET:?}" \
       WORKSPACE_ROOT="${WORKSPACE_ROOT:?}" \
       WORKSPACE_IS_CONTAINER_VOLUME="${WORKSPACE_IS_CONTAINER_VOLUME:?}" \
       WORKSPACE_IS_BIND_MOUNT="${WORKSPACE_IS_BIND_MOUNT:?}" \
       env
)"
echo "$ENVARS"
if [[ $NO_WRITE == false ]]; then
  mkdir -p "${ENV_FILE_DIR:?}"/.env.d
  {
    echo "# Generated by $0 - do not modify by hand";
    echo "$ENVARS";
  } > "${ENV_FILE_DIR:?}"/.env.d/50_workspace.env
  cat "${ENV_FILE_DIR:?}"/.env.d/*.env > "${ENV_FILE_DIR:?}"/.env

  # We are run as root for container volume workspaces
  if [[ "$(id -u)" -eq 0 ]]; then
      chown -R "${USERID:?}:${GROUPID:?}" "${ENV_FILE_DIR:?}"/{.env,.env.d}
  fi
fi
