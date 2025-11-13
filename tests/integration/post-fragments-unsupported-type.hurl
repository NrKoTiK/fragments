# tests/integration/post-fragments-unsupported-type.hurl
# Confirm that posting an unsupported Content-Type produces a 415 error
POST http://localhost:8080/v1/fragments
Content-Type: application/xml
[BasicAuth]
user1@email.com:password1
```
<data>unsupported</data>
```

HTTP/1.1 415
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 415
jsonpath "$.error.message" exists
