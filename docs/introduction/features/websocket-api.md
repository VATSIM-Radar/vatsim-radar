# Websocket API

The desktop app exposes a websocket at `http://localhost:48073` to read and activate bookmarks and dashboards.

The following messages are supported.

## Requests

The following messages can be sent to the desktop app to request information.

### `activate-bookmark`

Activates a bookmark with the specified id in the desktop app.

The following `data` properties are supported:

| Property | Description                                | Type   |
| -------- | ------------------------------------------ | ------ |
| `id`     | The unique ID of the bookmark to activate. | number |

#### Example `activate-bookmark` message

```json
{
  "type": "activate-bookmark",
  "data": {
    "id": 1
  }
}
```

### `activate-dashboard`

Activates a dashboard with the specified id in the desktop app.

The following `data` properties are supported:

| Property | Description                                 | Type   |
| -------- | ------------------------------------------- | ------ |
| `id`     | The unique ID of the dashboard to activate. | number |

#### Example `activate-dashboard` message

```json
{
  "type": "activate-dashboard",
  "data": {
    "id": 1
  }
}
```

### `get-bookmarks`

Requests the list of current bookmarks for the logged in user. The response is a [`bookmarks`](#bookmarks) message.

#### Example `get-bookmarks` message

```json
{
  "type": "get-bookmarks"
}
```

### `get-dashboards`

Requests the list of current dashboards for the logged in user. The response is a [`dashboards`](#dashboards) message.

#### Example `get-dashboards` message

```json
{
  "type": "get-dashboards"
}
```

## Responses

The following messages are sent by the desktop app to all connected clients in response to request messages.

### `bookmarks`

Sent in response to a [`get-bookmarks`](#get-bookmarks) message to all connected clients. Provides the list of all bookmarks for the logged in user.

The data is returned in a `bookmarks` array with the following properties:

| Property | Description                                                                 | Type   |
| -------- | --------------------------------------------------------------------------- | ------ |
| id       | The unique identifier for the bookmark.                                     | number |
| label    | The display name for the bookmark.                                          | string |
| order    | The sort order for the bookmark, as defined by the user in the desktop app. | number |

#### Example `bookmarks` message

```json
{
  "type": "bookmarks",
  "data": {
    "bookmarks": [
      {
        "id": 5,
        "label": "KSEA",
        "order": 0
      },
      {
        "id": 5,
        "label": "KPDX",
        "order": 0
      }
    ]
  }
}
```

### `dashboards`

Sent in response to a [`get-dashboards`](#get-bookmarks) message to all connected clients. Provides the list of all dashboards for the logged in user.

The data is returned in a `dashboards` array with the following properties:

| Property | Description                              | Type   |
| -------- | ---------------------------------------- | ------ |
| id       | The unique identifier for the dashboard. | number |
| label    | The display name for the dashboard.      | string |

#### Example `dashboards` message

```json
{
  "type": "dashboards",
  "data": {
    "dashboards": [
      {
        "id": 1,
        "label": "SEA TWR"
      },
      {
        "id": 2,
        "label": "S16"
      }
    ]
  }
}
```
