sendTx

# sendTx

You need to sign the transaction body before sending it to the server. More details can be found here: https://apidocs.lighter.xyz/docs/get-started

# OpenAPI definition

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "",
    "version": ""
  },
  "paths": {
    "/api/v1/sendTx": {
      "post": {
        "summary": "sendTx",
        "operationId": "sendTx",
        "tags": [
          "transaction"
        ],
        "description": "You need to sign the transaction body before sending it to the server. More details can be found here: https://apidocs.lighter.xyz/docs/get-started",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/x-www-form-urlencoded": {
              "schema": {
                "$ref": "#/components/schemas/ReqSendTx"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "A successful response.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/RespSendTx"
                }
              }
            }
          },
          "400": {
            "description": "Bad request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ResultCode"
                }
              }
            }
          }
        }
      }
    }
  },
  "servers": [
    {
      "url": "https://mainnet.zklighter.elliot.ai"
    }
  ],
  "components": {
    "schemas": {
      "ReqSendTx": {
        "type": "object",
        "properties": {
          "tx_type": {
            "type": "integer",
            "format": "uint8"
          },
          "tx_info": {
            "type": "string"
          },
          "price_protection": {
            "type": "boolean",
            "format": "boolean",
            "default": "true"
          }
        },
        "title": "ReqSendTx",
        "required": [
          "tx_type",
          "tx_info"
        ]
      },
      "RespSendTx": {
        "type": "object",
        "properties": {
          "code": {
            "type": "integer",
            "format": "int32",
            "example": "200"
          },
          "message": {
            "type": "string"
          },
          "tx_hash": {
            "type": "string",
            "example": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
          },
          "predicted_execution_time_ms": {
            "type": "integer",
            "format": "int64",
            "example": "1751465474"
          },
          "volume_quota_remaining": {
            "type": "integer",
            "format": "int64"
          }
        },
        "title": "RespSendTx",
        "required": [
          "code",
          "tx_hash",
          "predicted_execution_time_ms",
          "volume_quota_remaining"
        ]
      },
      "ResultCode": {
        "type": "object",
        "properties": {
          "code": {
            "type": "integer",
            "format": "int32",
            "example": "200"
          },
          "message": {
            "type": "string"
          }
        },
        "title": "ResultCode",
        "required": [
          "code"
        ]
      }
    }
  }
}
```
sendTxBatch

# sendTxBatch

You need to sign the transaction body before sending it to the server. More details can be found here: https://apidocs.lighter.xyz/docs/get-started

# OpenAPI definition

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "",
    "version": ""
  },
  "paths": {
    "/api/v1/sendTxBatch": {
      "post": {
        "summary": "sendTxBatch",
        "operationId": "sendTxBatch",
        "tags": [
          "transaction"
        ],
        "description": "You need to sign the transaction body before sending it to the server. More details can be found here: https://apidocs.lighter.xyz/docs/get-started",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/x-www-form-urlencoded": {
              "schema": {
                "$ref": "#/components/schemas/ReqSendTxBatch"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "A successful response.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/RespSendTxBatch"
                }
              }
            }
          },
          "400": {
            "description": "Bad request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ResultCode"
                }
              }
            }
          }
        }
      }
    }
  },
  "servers": [
    {
      "url": "https://mainnet.zklighter.elliot.ai"
    }
  ],
  "components": {
    "schemas": {
      "ReqSendTxBatch": {
        "type": "object",
        "properties": {
          "tx_types": {
            "type": "string"
          },
          "tx_infos": {
            "type": "string"
          }
        },
        "title": "ReqSendTxBatch",
        "required": [
          "tx_types",
          "tx_infos"
        ]
      },
      "RespSendTxBatch": {
        "type": "object",
        "properties": {
          "code": {
            "type": "integer",
            "format": "int32",
            "example": "200"
          },
          "message": {
            "type": "string"
          },
          "tx_hash": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "predicted_execution_time_ms": {
            "type": "integer",
            "format": "int64",
            "example": "1751465474"
          },
          "volume_quota_remaining": {
            "type": "integer",
            "format": "int64"
          }
        },
        "title": "RespSendTxBatch",
        "required": [
          "code",
          "tx_hash",
          "predicted_execution_time_ms",
          "volume_quota_remaining"
        ]
      },
      "ResultCode": {
        "type": "object",
        "properties": {
          "code": {
            "type": "integer",
            "format": "int32",
            "example": "200"
          },
          "message": {
            "type": "string"
          }
        },
        "title": "ResultCode",
        "required": [
          "code"
        ]
      }
    }
  }
}
```
tx

# tx

Get transaction by hash or sequence index

# OpenAPI definition

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "",
    "version": ""
  },
  "paths": {
    "/api/v1/tx": {
      "get": {
        "summary": "tx",
        "operationId": "tx",
        "tags": [
          "transaction"
        ],
        "description": "Get transaction by hash or sequence index",
        "parameters": [
          {
            "name": "by",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string",
              "enum": [
                "hash",
                "sequence_index"
              ]
            }
          },
          {
            "name": "value",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "A successful response.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/EnrichedTx"
                }
              }
            }
          },
          "400": {
            "description": "Bad request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ResultCode"
                }
              }
            }
          }
        }
      }
    }
  },
  "servers": [
    {
      "url": "https://mainnet.zklighter.elliot.ai"
    }
  ],
  "components": {
    "schemas": {
      "EnrichedTx": {
        "type": "object",
        "properties": {
          "code": {
            "type": "integer",
            "format": "int32",
            "example": "200"
          },
          "message": {
            "type": "string"
          },
          "hash": {
            "type": "string",
            "example": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
          },
          "type": {
            "type": "integer",
            "format": "uint8",
            "example": "1",
            "maximum": 64,
            "minimum": 1
          },
          "info": {
            "type": "string",
            "example": "{}"
          },
          "event_info": {
            "type": "string",
            "example": "{}"
          },
          "status": {
            "type": "integer",
            "format": "int64",
            "example": "1"
          },
          "transaction_index": {
            "type": "integer",
            "format": "int64",
            "example": "8761"
          },
          "l1_address": {
            "type": "string",
            "example": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
          },
          "account_index": {
            "type": "integer",
            "format": "int64",
            "example": "1"
          },
          "nonce": {
            "type": "integer",
            "format": "int64",
            "example": "722"
          },
          "expire_at": {
            "type": "integer",
            "format": "int64",
            "example": "1640995200"
          },
          "block_height": {
            "type": "integer",
            "format": "int64",
            "example": "45434"
          },
          "queued_at": {
            "type": "integer",
            "format": "int64",
            "example": "1640995200"
          },
          "executed_at": {
            "type": "integer",
            "format": "int64",
            "example": "1640995200"
          },
          "sequence_index": {
            "type": "integer",
            "format": "int64",
            "example": "8761"
          },
          "parent_hash": {
            "type": "string",
            "example": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
          },
          "api_key_index": {
            "type": "integer",
            "format": "uint8",
            "example": "0"
          },
          "transaction_time": {
            "type": "integer",
            "format": "int64",
            "example": "1257894000000000"
          },
          "committed_at": {
            "type": "integer",
            "format": "int64",
            "example": "1640995200"
          },
          "verified_at": {
            "type": "integer",
            "format": "int64",
            "example": "1640995200"
          }
        },
        "title": "EnrichedTx",
        "required": [
          "code",
          "hash",
          "type",
          "info",
          "event_info",
          "status",
          "transaction_index",
          "l1_address",
          "account_index",
          "nonce",
          "expire_at",
          "block_height",
          "queued_at",
          "executed_at",
          "sequence_index",
          "parent_hash",
          "api_key_index",
          "transaction_time",
          "committed_at",
          "verified_at"
        ]
      },
      "ResultCode": {
        "type": "object",
        "properties": {
          "code": {
            "type": "integer",
            "format": "int32",
            "example": "200"
          },
          "message": {
            "type": "string"
          }
        },
        "title": "ResultCode",
        "required": [
          "code"
        ]
      }
    }
  }
}
```
txFromL1TxHash

# txFromL1TxHash

Get L1 transaction by L1 transaction hash

# OpenAPI definition

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "",
    "version": ""
  },
  "paths": {
    "/api/v1/txFromL1TxHash": {
      "get": {
        "summary": "txFromL1TxHash",
        "operationId": "txFromL1TxHash",
        "tags": [
          "transaction"
        ],
        "description": "Get L1 transaction by L1 transaction hash",
        "parameters": [
          {
            "name": "hash",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "A successful response.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/EnrichedTx"
                }
              }
            }
          },
          "400": {
            "description": "Bad request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ResultCode"
                }
              }
            }
          }
        }
      }
    }
  },
  "servers": [
    {
      "url": "https://mainnet.zklighter.elliot.ai"
    }
  ],
  "components": {
    "schemas": {
      "EnrichedTx": {
        "type": "object",
        "properties": {
          "code": {
            "type": "integer",
            "format": "int32",
            "example": "200"
          },
          "message": {
            "type": "string"
          },
          "hash": {
            "type": "string",
            "example": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
          },
          "type": {
            "type": "integer",
            "format": "uint8",
            "example": "1",
            "maximum": 64,
            "minimum": 1
          },
          "info": {
            "type": "string",
            "example": "{}"
          },
          "event_info": {
            "type": "string",
            "example": "{}"
          },
          "status": {
            "type": "integer",
            "format": "int64",
            "example": "1"
          },
          "transaction_index": {
            "type": "integer",
            "format": "int64",
            "example": "8761"
          },
          "l1_address": {
            "type": "string",
            "example": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
          },
          "account_index": {
            "type": "integer",
            "format": "int64",
            "example": "1"
          },
          "nonce": {
            "type": "integer",
            "format": "int64",
            "example": "722"
          },
          "expire_at": {
            "type": "integer",
            "format": "int64",
            "example": "1640995200"
          },
          "block_height": {
            "type": "integer",
            "format": "int64",
            "example": "45434"
          },
          "queued_at": {
            "type": "integer",
            "format": "int64",
            "example": "1640995200"
          },
          "executed_at": {
            "type": "integer",
            "format": "int64",
            "example": "1640995200"
          },
          "sequence_index": {
            "type": "integer",
            "format": "int64",
            "example": "8761"
          },
          "parent_hash": {
            "type": "string",
            "example": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
          },
          "api_key_index": {
            "type": "integer",
            "format": "uint8",
            "example": "0"
          },
          "transaction_time": {
            "type": "integer",
            "format": "int64",
            "example": "1257894000000000"
          },
          "committed_at": {
            "type": "integer",
            "format": "int64",
            "example": "1640995200"
          },
          "verified_at": {
            "type": "integer",
            "format": "int64",
            "example": "1640995200"
          }
        },
        "title": "EnrichedTx",
        "required": [
          "code",
          "hash",
          "type",
          "info",
          "event_info",
          "status",
          "transaction_index",
          "l1_address",
          "account_index",
          "nonce",
          "expire_at",
          "block_height",
          "queued_at",
          "executed_at",
          "sequence_index",
          "parent_hash",
          "api_key_index",
          "transaction_time",
          "committed_at",
          "verified_at"
        ]
      },
      "ResultCode": {
        "type": "object",
        "properties": {
          "code": {
            "type": "integer",
            "format": "int32",
            "example": "200"
          },
          "message": {
            "type": "string"
          }
        },
        "title": "ResultCode",
        "required": [
          "code"
        ]
      }
    }
  }
}
```
deposit_history

# deposit_history

Get deposit history

# OpenAPI definition

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "",
    "version": ""
  },
  "paths": {
    "/api/v1/deposit/history": {
      "get": {
        "summary": "deposit_history",
        "operationId": "deposit_history",
        "tags": [
          "transaction"
        ],
        "description": "Get deposit history",
        "parameters": [
          {
            "name": "authorization",
            "in": "header",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "account_index",
            "in": "query",
            "required": true,
            "schema": {
              "type": "integer",
              "format": "int64"
            }
          },
          {
            "name": "l1_address",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "cursor",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "filter",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string",
              "enum": [
                "all",
                "pending",
                "claimable"
              ]
            }
          }
        ],
        "responses": {
          "200": {
            "description": "A successful response.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/DepositHistory"
                }
              }
            }
          },
          "400": {
            "description": "Bad request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ResultCode"
                }
              }
            }
          }
        }
      }
    }
  },
  "servers": [
    {
      "url": "https://mainnet.zklighter.elliot.ai"
    }
  ],
  "components": {
    "schemas": {
      "DepositHistory": {
        "type": "object",
        "properties": {
          "code": {
            "type": "integer",
            "format": "int32",
            "example": "200"
          },
          "message": {
            "type": "string"
          },
          "deposits": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/DepositHistoryItem"
            }
          },
          "cursor": {
            "type": "string"
          }
        },
        "title": "DepositHistory",
        "required": [
          "code",
          "deposits",
          "cursor"
        ]
      },
      "DepositHistoryItem": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "amount": {
            "type": "string",
            "example": "0.1"
          },
          "timestamp": {
            "type": "integer",
            "format": "int64",
            "example": "1640995200"
          },
          "status": {
            "type": "string",
            "enum": [
              "failed",
              "pending",
              "completed",
              "claimable"
            ]
          },
          "l1_tx_hash": {
            "type": "string",
            "example": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
          },
          "asset_id": {
            "type": "integer",
            "format": "int16"
          }
        },
        "title": "DepositHistoryItem",
        "required": [
          "id",
          "amount",
          "timestamp",
          "status",
          "l1_tx_hash",
          "asset_id"
        ]
      },
      "ResultCode": {
        "type": "object",
        "properties": {
          "code": {
            "type": "integer",
            "format": "int32",
            "example": "200"
          },
          "message": {
            "type": "string"
          }
        },
        "title": "ResultCode",
        "required": [
          "code"
        ]
      }
    }
  }
}
```
transfer_history

# transfer_history

Get transfer history. To fetch an account index, you will need to `auth` the request, unless it's a public pool.

# OpenAPI definition

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "",
    "version": ""
  },
  "paths": {
    "/api/v1/transfer/history": {
      "get": {
        "summary": "transfer_history",
        "operationId": "transfer_history",
        "tags": [
          "transaction"
        ],
        "description": "Get transfer history. To fetch an account index, you will need to `auth` the request, unless it's a public pool.",
        "parameters": [
          {
            "name": "authorization",
            "in": "header",
            "required": false,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "account_index",
            "in": "query",
            "required": true,
            "schema": {
              "type": "integer",
              "format": "int64"
            }
          },
          {
            "name": "cursor",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "type",
            "in": "query",
            "required": false,
            "schema": {
              "type": "array",
              "items": {
                "type": "string",
                "enum": [
                  "all",
                  "L2Transfer",
                  "L2MintShares",
                  "L2BurnShares",
                  "L2StakeAssets",
                  "L2UnstakeAssets"
                ]
              }
            }
          }
        ],
        "responses": {
          "200": {
            "description": "A successful response.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/TransferHistory"
                }
              }
            }
          },
          "400": {
            "description": "Bad request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ResultCode"
                }
              }
            }
          }
        }
      }
    }
  },
  "servers": [
    {
      "url": "https://mainnet.zklighter.elliot.ai"
    }
  ],
  "components": {
    "schemas": {
      "ResultCode": {
        "type": "object",
        "properties": {
          "code": {
            "type": "integer",
            "format": "int32",
            "example": "200"
          },
          "message": {
            "type": "string"
          }
        },
        "title": "ResultCode",
        "required": [
          "code"
        ]
      },
      "TransferHistory": {
        "type": "object",
        "properties": {
          "code": {
            "type": "integer",
            "format": "int32",
            "example": "200"
          },
          "message": {
            "type": "string"
          },
          "transfers": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/TransferHistoryItem"
            }
          },
          "cursor": {
            "type": "string"
          }
        },
        "title": "TransferHistory",
        "required": [
          "code",
          "transfers",
          "cursor"
        ]
      },
      "TransferHistoryItem": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "amount": {
            "type": "string",
            "example": "0.1"
          },
          "timestamp": {
            "type": "integer",
            "format": "int64",
            "example": "1640995200"
          },
          "type": {
            "type": "string",
            "enum": [
              "L2TransferInflow",
              "L2TransferOutflow",
              "L2BurnSharesInflow",
              "L2BurnSharesOutflow",
              "L2MintSharesInflow",
              "L2MintSharesOutflow",
              "L2SelfTransfer",
              "L2StakeAssetInflow",
              "L2StakeAssetOutflow",
              "L2UnstakeAssetInflow",
              "L2UnstakeAssetOutflow",
              "L2ForceBurnSharesInflow",
              "L2ForceBurnSharesOutflow"
            ]
          },
          "from_l1_address": {
            "type": "string",
            "example": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
          },
          "to_l1_address": {
            "type": "string",
            "example": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
          },
          "from_account_index": {
            "type": "integer",
            "format": "int64",
            "example": "1"
          },
          "to_account_index": {
            "type": "integer",
            "format": "int64",
            "example": "1"
          },
          "tx_hash": {
            "type": "string",
            "example": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
          },
          "asset_id": {
            "type": "integer",
            "format": "int16"
          },
          "fee": {
            "type": "string"
          },
          "from_route": {
            "type": "string",
            "enum": [
              "spot",
              "perps"
            ]
          },
          "to_route": {
            "type": "string",
            "enum": [
              "spot",
              "perps"
            ]
          }
        },
        "title": "TransferHistoryItem",
        "required": [
          "id",
          "amount",
          "timestamp",
          "type",
          "from_l1_address",
          "to_l1_address",
          "from_account_index",
          "to_account_index",
          "tx_hash",
          "asset_id",
          "fee",
          "from_route",
          "to_route"
        ]
      }
    }
  }
}
```
withdraw_history

# withdraw_history

Get withdraw history. Secure withdrawals are only set to `claimable` when ready. You should only expect the `completed` status on fast withdrawals via Arbitrum.

To verify whether a secure withdrawal has been completed, you can read Lighter's mainnet contract `getPendingBalance()` method. While we do claim on behalf of the user most of the times, that might not be the case when gas is too high. In that case, you can call the `withdrawPendingBalance()` method, or claim in-app.

# OpenAPI definition

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "",
    "version": ""
  },
  "paths": {
    "/api/v1/withdraw/history": {
      "get": {
        "summary": "withdraw_history",
        "operationId": "withdraw_history",
        "tags": [
          "transaction"
        ],
        "description": "Get withdraw history. Secure withdrawals are only set to `claimable` when ready. You should only expect the `completed` status on fast withdrawals via Arbitrum.",
        "parameters": [
          {
            "name": "authorization",
            "in": "header",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "account_index",
            "in": "query",
            "required": true,
            "schema": {
              "type": "integer",
              "format": "int64"
            }
          },
          {
            "name": "cursor",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "filter",
            "in": "query",
            "required": false,
            "schema": {
              "type": "string",
              "enum": [
                "all",
                "pending",
                "claimable"
              ]
            }
          }
        ],
        "responses": {
          "200": {
            "description": "A successful response.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/WithdrawHistory"
                }
              }
            }
          },
          "400": {
            "description": "Bad request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ResultCode"
                }
              }
            }
          }
        }
      }
    }
  },
  "servers": [
    {
      "url": "https://mainnet.zklighter.elliot.ai"
    }
  ],
  "components": {
    "schemas": {
      "ResultCode": {
        "type": "object",
        "properties": {
          "code": {
            "type": "integer",
            "format": "int32",
            "example": "200"
          },
          "message": {
            "type": "string"
          }
        },
        "title": "ResultCode",
        "required": [
          "code"
        ]
      },
      "WithdrawHistory": {
        "type": "object",
        "properties": {
          "code": {
            "type": "integer",
            "format": "int32",
            "example": "200"
          },
          "message": {
            "type": "string"
          },
          "withdraws": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/WithdrawHistoryItem"
            }
          },
          "cursor": {
            "type": "string"
          }
        },
        "title": "WithdrawHistory",
        "required": [
          "code",
          "withdraws",
          "cursor"
        ]
      },
      "WithdrawHistoryItem": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "amount": {
            "type": "string",
            "example": "0.1"
          },
          "timestamp": {
            "type": "integer",
            "format": "int64",
            "example": "1640995200"
          },
          "status": {
            "type": "string",
            "enum": [
              "failed",
              "pending",
              "claimable",
              "refunded",
              "completed"
            ]
          },
          "type": {
            "type": "string",
            "enum": [
              "secure",
              "fast"
            ]
          },
          "l1_tx_hash": {
            "type": "string",
            "example": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
          },
          "asset_id": {
            "type": "integer",
            "format": "int16"
          }
        },
        "title": "WithdrawHistoryItem",
        "required": [
          "id",
          "amount",
          "timestamp",
          "status",
          "type",
          "l1_tx_hash",
          "asset_id"
        ]
      }
    }
  }
}
```

