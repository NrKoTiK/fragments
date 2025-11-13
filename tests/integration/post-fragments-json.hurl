# tests/integration/post-fragments-json.hurl
# Confirm that posting a JSON fragment works
POST http://localhost:8080/v1/fragments
Content-Type: application/json
[BasicAuth]
user1@email.com:password1
```
{"message": "Hello World", "status": "success"}
```

HTTP/1.1 201
[Asserts]
header "Location" matches "^http:\/\/localhost:8080\/v1\/fragments\/[A-Za-z0-9_-]+$"
jsonpath "$.status" == "ok"
jsonpath "$.fragment.id" matches "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
jsonpath "$.fragment.type" == "application/json"
[Captures]
fragment_id: jsonpath "$.fragment.id"

# GET the fragment to confirm the data is preserved
GET http://localhost:8080/v1/fragments/{{fragment_id}}
[BasicAuth]
user1@email.com:password1

HTTP/1.1 200
Content-Type: application/json
[Asserts]
body == "{\"message\": \"Hello World\", \"status\": \"success\"}"
