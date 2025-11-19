# tests/integration/lab-9-s3.hurl
# Integration test for S3 storage functionality

# 1. POST a new text fragment
POST http://localhost:8080/v1/fragments
Content-Type: text/plain
[BasicAuth]
user1@email.com:password1
`Hello S3!`

# Confirm 201 response and capture Location header
HTTP/1.1 201
[Asserts]
header "Location" matches "^http:\/\/localhost:8080\/v1\/fragments\/[A-Za-z0-9_-]+$"
jsonpath "$.status" == "ok"
jsonpath "$.fragment.type" == "text/plain"
[Captures]
url: header "Location"

# 2. GET the fragment using the captured URL
GET {{url}}
[BasicAuth]
user1@email.com:password1

# Confirm 200 response with correct type and body
HTTP/1.1 200
[Asserts]
header "Content-Type" matches "^text/plain"
body == "Hello S3!"

# 3. DELETE the fragment using the URL
DELETE {{url}}
[BasicAuth]
user1@email.com:password1

# Confirm 200 response
HTTP/1.1 200

# 4. Try to GET the deleted fragment
GET {{url}}
[BasicAuth]
user1@email.com:password1

# Confirm 404 response since fragment should be deleted
HTTP/1.1 404
[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.code" == 404
